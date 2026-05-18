import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db/prisma';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { createSession, getRequestFingerprint } from '@/lib/auth/session';
import { limitByKey, RateLimitProfiles } from '@/lib/security/rate-limit';
import { recordSecurityEvent, SecurityEvents } from '@/lib/product-core/security-events';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SignInSchema = z.object({
  email: z.string().email().max(200).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(500),
});

export async function POST(request: Request) {
  const fingerprint = await getRequestFingerprint(request);
  const ipKey = fingerprint.ipAddress || 'unknown';
  const limit = await limitByKey(`login:${ipKey}`, RateLimitProfiles.login);

  if (!limit.allowed) {
    await recordSecurityEvent({
      eventType: SecurityEvents.RATE_LIMIT_HIT,
      severity: 'HIGH',
      ipAddress: fingerprint.ipAddress,
      userAgent: fingerprint.userAgent,
      metadata: { route: '/api/auth/sign-in', resetAt: limit.resetAt },
    });
    return NextResponse.json({ error: 'Too many sign-in attempts. Try again later.' }, { status: 429 });
  }

  const body = await request.json().catch(() => undefined);
  const parsed = SignInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid sign-in payload' }, { status: 422 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  const now = new Date();

  if (!user || user.status !== 'ACTIVE') {
    await recordSecurityEvent({
      eventType: SecurityEvents.LOGIN_FAILURE,
      severity: 'MEDIUM',
      ipAddress: fingerprint.ipAddress,
      userAgent: fingerprint.userAgent,
      metadata: { email: parsed.data.email, reason: 'user_not_found_or_inactive' },
    });
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  if (user.lockedUntil && user.lockedUntil > now) {
    await recordSecurityEvent({
      tenantId: user.tenantId,
      userId: user.id,
      eventType: SecurityEvents.LOGIN_FAILURE,
      severity: 'HIGH',
      ipAddress: fingerprint.ipAddress,
      userAgent: fingerprint.userAgent,
      metadata: { reason: 'account_locked', lockedUntil: user.lockedUntil.toISOString() },
    });
    return NextResponse.json({ error: 'Account temporarily locked. Try again later.' }, { status: 423 });
  }

  let passwordHash = user.passwordHash;
  const bootstrapPassword = process.env.SOARFORGE_ADMIN_PASSWORD;
  if (!passwordHash && user.email === 'admin@soarforge.local' && bootstrapPassword && parsed.data.password === bootstrapPassword) {
    passwordHash = await hashPassword(bootstrapPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, lastPasswordChangeAt: now },
    });
  }

  const valid = await verifyPassword(parsed.data.password, passwordHash);
  if (!valid) {
    const failedLoginCount = user.failedLoginCount + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount,
        lockedUntil: failedLoginCount >= 5 ? new Date(now.getTime() + 15 * 60 * 1000) : null,
      },
    });
    await recordSecurityEvent({
      tenantId: user.tenantId,
      userId: user.id,
      eventType: SecurityEvents.LOGIN_FAILURE,
      severity: failedLoginCount >= 5 ? 'HIGH' : 'MEDIUM',
      ipAddress: fingerprint.ipAddress,
      userAgent: fingerprint.userAgent,
      metadata: { failedLoginCount },
    });
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now },
  });

  await createSession(user, request);
  await recordSecurityEvent({
    tenantId: user.tenantId,
    userId: user.id,
    eventType: SecurityEvents.LOGIN_SUCCESS,
    severity: 'INFO',
    ipAddress: fingerprint.ipAddress,
    userAgent: fingerprint.userAgent,
  });

  return NextResponse.json({ ok: true });
}
