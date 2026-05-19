import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db/prisma';
import { requireSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/rbac';
import { assertSameOrigin } from '@/lib/security/origin-protection';
import { recordSecurityEvent } from '@/lib/product-core/security-events';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const RevokeInviteSchema = z.object({
  inviteId: z.string().min(1),
});

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const session = await requireSession();

  if (!hasPermission(session.role, 'user.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => undefined);
  const parsed = RevokeInviteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid revoke payload' }, { status: 422 });
  }

  const invite = await prisma.userInvite.findFirst({
    where: {
      id: parsed.data.inviteId,
      tenantId: session.tenantId,
    },
  });

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }

  if (invite.acceptedAt) {
    return NextResponse.json({ error: 'Accepted invite cannot be revoked' }, { status: 409 });
  }

  await prisma.userInvite.update({
    where: { id: invite.id },
    data: {
      acceptedAt: new Date(),
    },
  });

  await recordSecurityEvent({
    tenantId: session.tenantId,
    userId: session.userId,
    eventType: 'INVITE_REVOKED',
    severity: 'HIGH',
    metadata: {
      inviteId: invite.id,
      email: invite.email,
      role: invite.role,
    },
  });

  return NextResponse.json({ ok: true });
}