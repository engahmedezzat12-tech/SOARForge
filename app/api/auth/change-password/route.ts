import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db/prisma';
import { requireSession } from '@/lib/auth/session';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { recordSecurityEvent, SecurityEvents } from '@/lib/product-core/security-events';
import { assertSameOrigin } from '@/lib/security/origin-protection';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(500),
    newPassword: z.string().min(10).max(500),
    confirmPassword: z.string().min(10).max(500),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New password and confirmation do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });
  
export async function POST(request: Request) {
    const originError = assertSameOrigin(request);
    if (originError) return originError;

    const session = await requireSession();

 

  const body = await request.json().catch(() => undefined);
  const parsed = ChangePasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid password change request' },
      { status: 422 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: 'User password is not configured' }, { status: 400 });
  }

  const currentPasswordOk = await verifyPassword(
    parsed.data.currentPassword,
    user.passwordHash
  );

  if (!currentPasswordOk) {
    await recordSecurityEvent({
      tenantId: session.tenantId,
      userId: session.userId,
      eventType: SecurityEvents.LOGIN_FAILURE,
      severity: 'MEDIUM',
      metadata: { reason: 'change_password_invalid_current_password' },
    });

    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
  }

  const newPasswordHash = await hashPassword(parsed.data.newPassword);

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      passwordHash: newPasswordHash,
      failedLoginCount: 0,
      lockedUntil: null,
      mustChangePassword: false,
      lastPasswordChangeAt: new Date(),
    },
  });

  await prisma.session.updateMany({
    where: {
      userId: session.userId,
      id: { not: session.sessionId },
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  await recordSecurityEvent({
    tenantId: session.tenantId,
    userId: session.userId,
    eventType: 'PASSWORD_CHANGED',
    severity: 'INFO',
    metadata: { otherSessionsRevoked: true },
  });

  return NextResponse.json({ ok: true });
}