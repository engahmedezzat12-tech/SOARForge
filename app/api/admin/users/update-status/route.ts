import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db/prisma';
import { requireSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/rbac';
import { recordSecurityEvent } from '@/lib/product-core/security-events';
import { assertSameOrigin } from '@/lib/security/origin-protection';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UpdateStatusSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(['ACTIVE', 'DISABLED']),
});

export async function POST(request: Request) {
    const originError = assertSameOrigin(request);
    if (originError) return originError;
  const session = await requireSession();

  if (!hasPermission(session.role, 'user.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => undefined);
  const parsed = UpdateStatusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid status payload' },
      { status: 422 }
    );
  }

  if (parsed.data.userId === session.userId && parsed.data.status === 'DISABLED') {
    return NextResponse.json({ error: 'You cannot disable your own account' }, { status: 400 });
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

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: {
      status: parsed.data.status,
      failedLoginCount: 0,
      lockedUntil: null,
    },
    select: {
      id: true,
      email: true,
      status: true,
    },
  });

  if (parsed.data.status === 'DISABLED') {
    await prisma.session.updateMany({
      where: {
        userId: target.id,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  await recordSecurityEvent({
    tenantId: session.tenantId,
    userId: session.userId,
    eventType: parsed.data.status === 'ACTIVE' ? 'USER_ENABLED' : 'USER_DISABLED',
    severity: 'HIGH',
    metadata: {
      targetUserId: target.id,
      targetEmail: target.email,
      newStatus: updated.status,
    },
  });

  return NextResponse.json({ ok: true, user: updated });
}