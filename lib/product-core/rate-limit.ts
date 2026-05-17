const memoryBucket = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit = 60, windowMs = 60_000): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const existing = memoryBucket.get(key);
  if (!existing || existing.resetAt < now) {
    const resetAt = now + windowMs;
    memoryBucket.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }
  if (existing.count >= limit) return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  existing.count += 1;
  return { allowed: true, remaining: Math.max(0, limit - existing.count), resetAt: existing.resetAt };
}
