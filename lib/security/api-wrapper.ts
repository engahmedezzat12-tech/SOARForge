import { NextResponse } from 'next/server';
import type { z } from 'zod';

import { getCurrentSession, getRequestFingerprint, type CurrentSession } from '@/lib/auth/session';
import { hasPermission, type Permission } from '@/lib/auth/rbac';
import { limitByKey, RateLimitProfiles } from '@/lib/security/rate-limit';
import { recordSecurityEvent, SecurityEvents } from '@/lib/product-core/security-events';

type SecureApiContext<T> = {
  request: Request;
  session: CurrentSession;
  body: T;
};

type SecureApiOptions<T> = {
  permission: Permission;
  schema?: z.ZodType<T>;
  rateLimit?: keyof typeof RateLimitProfiles;
  handler: (ctx: SecureApiContext<T>) => Promise<Response>;
};

export function withSecureApi<T = undefined>(options: SecureApiOptions<T>) {
  return async function secureHandler(request: Request) {
    const fingerprint = await getRequestFingerprint(request);

    try {
      const session = await getCurrentSession();
      if (!session) {
        await recordSecurityEvent({
          eventType: SecurityEvents.AUTH_REQUIRED_DENIED,
          severity: 'MEDIUM',
          ipAddress: fingerprint.ipAddress,
          userAgent: fingerprint.userAgent,
          metadata: { path: new URL(request.url).pathname },
        });
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      if (!hasPermission(session.role, options.permission)) {
        await recordSecurityEvent({
          tenantId: session.tenantId,
          userId: session.userId,
          eventType: SecurityEvents.PERMISSION_DENIED,
          severity: 'HIGH',
          ipAddress: fingerprint.ipAddress,
          userAgent: fingerprint.userAgent,
          metadata: { permission: options.permission, path: new URL(request.url).pathname },
        });
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const profile = RateLimitProfiles[options.rateLimit ?? 'generalApi'];
      const limit = await limitByKey(`${options.rateLimit ?? 'api'}:${session.userId}`, profile);
      if (!limit.allowed) {
        await recordSecurityEvent({
          tenantId: session.tenantId,
          userId: session.userId,
          eventType: SecurityEvents.RATE_LIMIT_HIT,
          severity: 'MEDIUM',
          ipAddress: fingerprint.ipAddress,
          userAgent: fingerprint.userAgent,
          metadata: { resetAt: limit.resetAt, path: new URL(request.url).pathname },
        });
        return NextResponse.json(
          { error: 'Too many requests', resetAt: limit.resetAt },
          { status: 429, headers: { 'X-RateLimit-Reset': String(limit.resetAt) } },
        );
      }

      let body = undefined as T;
      if (options.schema) {
        const raw = await request.json().catch(() => undefined);
        const parsed = options.schema.safeParse(raw);
        if (!parsed.success) {
          return NextResponse.json(
            { error: 'Invalid payload', details: parsed.error.flatten() },
            { status: 422 },
          );
        }
        body = parsed.data;
      }

      return await options.handler({ request, session, body });
    } catch (error) {
      console.error('Secure API failure:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}
