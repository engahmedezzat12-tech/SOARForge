type Bucket = { count: number; resetAt: number };
type LimitOptions = { windowMs: number; max: number };

const buckets = new Map<string, Bucket>();

type LimitResult = { allowed: boolean; remaining: number; resetAt: number; provider: 'memory' | 'upstash' };

function localLimitByKey(key: string, options: LimitOptions): LimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: Math.max(0, options.max - 1), resetAt, provider: 'memory' };
  }

  if (existing.count >= options.max) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt, provider: 'memory' };
  }

  existing.count += 1;
  buckets.set(key, existing);
  return { allowed: true, remaining: Math.max(0, options.max - existing.count), resetAt: existing.resetAt, provider: 'memory' };
}

async function upstashLimitByKey(key: string, options: LimitOptions): Promise<LimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redisKey = `soarforge:rl:${key}`;
  const resetAt = Date.now() + options.windowMs;

  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', redisKey],
        ['PEXPIRE', redisKey, options.windowMs],
      ]),
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = (await response.json()) as Array<{ result?: number | string }>;
    const count = Number(data?.[0]?.result ?? 0);
    if (!Number.isFinite(count) || count <= 0) return null;

    return {
      allowed: count <= options.max,
      remaining: Math.max(0, options.max - count),
      resetAt,
      provider: 'upstash',
    };
  } catch (error) {
    console.warn('Upstash rate limit failed, falling back to in-memory limiter:', error);
    return null;
  }
}

export async function limitByKey(key: string, options: LimitOptions): Promise<LimitResult> {
  const remote = await upstashLimitByKey(key, options);
  return remote ?? localLimitByKey(key, options);
}

export const RateLimitProfiles = {
  login: { windowMs: 15 * 60 * 1000, max: 5 },
  validationUpdate: { windowMs: 60 * 1000, max: 30 },
  auditRead: { windowMs: 60 * 1000, max: 120 },
  generalApi: { windowMs: 60 * 1000, max: 100 },
  offlineBundleUpload: { windowMs: 60 * 60 * 1000, max: 5 },
} as const;
