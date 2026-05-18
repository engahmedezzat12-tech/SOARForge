import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db/prisma';
import { requireSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/rbac';
import { hashPassword } from '@/lib/auth/password';
import { recordSecurityEvent } from '@/lib/product-core/security-events';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ResetPasswordSchema = z.object({
  userId: z.string().min(1),
  temporaryPassword: z.string().min(10).max(500),
});

export async function POST(request: Request) {
  const session = await requireSession();

  if (!hasPermission(session.role, 'user.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => undefined);
  const parsed = ResetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid reset password payload' },
      { status: 422 }
    );
  }

  const target = await prisma.user.findFirst({
    where: {
      id: parsed.data.userId,
      tenantId: session.tenantId,
    },
  });

  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const passwordHash = await hashPassword(parsed.data.temporaryPassword);

  await prisma.user.update({
    where: { id: target.id },
    data: {
      passwordHash,
      failedLoginCount: 0,
      lockedUntil: null,
      mustChangePassword: true,
      lastPasswordChangeAt: new Date(),
    },
  });

  await prisma.session.updateMany({
    where: {
      userId: target.id,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  await recordSecurityEvent({
    tenantId: session.tenantId,
    userId: session.userId,
    eventType: 'USER_PASSWORD_RESET',
    severity: 'HIGH',
    metadata: {
      targetUserId: target.id,
      targetEmail: target.email,
      sessionsRevoked: true,
    },
  });

  return NextResponse.json({ ok: true });
}