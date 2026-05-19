import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Role } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { requireSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/rbac';
import { recordSecurityEvent } from '@/lib/product-core/security-events';
import { assertSameOrigin } from '@/lib/security/origin-protection';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UpdateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['SUPER_ADMIN', 'TENANT_ADMIN', 'SOC_MANAGER', 'SOC_ENGINEER', 'AUDITOR', 'VIEWER']),
});

export async function POST(request: Request) {
    const originError = assertSameOrigin(request);
    if (originError) return originError;
  const session = await requireSession();

  if (!hasPermission(session.role, 'user.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => undefined);
  const parsed = UpdateRoleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid role payload' },
      { status: 422 }
    );
  }

  if (parsed.data.userId === session.userId && parsed.data.role !== session.role) {
    return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 });
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
    data: { role: parsed.data.role as Role },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  await recordSecurityEvent({
    tenantId: session.tenantId,
    userId: session.userId,
    eventType: 'USER_ROLE_CHANGED',
    severity: 'HIGH',
    metadata: {
      targetUserId: target.id,
      targetEmail: target.email,
      oldRole: target.role,
      newRole: updated.role,
    },
  });

  return NextResponse.json({ ok: true, user: updated });
}