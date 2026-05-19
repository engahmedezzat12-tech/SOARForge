import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import type { Role } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { requireSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/rbac';
import { assertSameOrigin } from '@/lib/security/origin-protection';
import { recordSecurityEvent } from '@/lib/product-core/security-events';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ApproveSchema = z.object({
  requestId: z.string().min(1),
  role: z.enum(['SUPER_ADMIN', 'TENANT_ADMIN', 'SOC_MANAGER', 'SOC_ENGINEER', 'AUDITOR', 'VIEWER']),
  expiresAt: z.string().datetime(),
});

function hashInviteToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const session = await requireSession();

  if (!hasPermission(session.role, 'user.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => undefined);
  const parsed = ApproveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid approval payload' }, { status: 422 });
  }

  const accessRequest = await prisma.accountRequest.findFirst({
    where: {
      id: parsed.data.requestId,
      tenantId: session.tenantId,
      status: 'PENDING',
    },
  });

  if (!accessRequest) {
    return NextResponse.json({ error: 'Pending request not found' }, { status: 404 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: accessRequest.email },
  });

  if (existingUser) {
    return NextResponse.json({ error: 'User already exists' }, { status: 409 });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(parsed.data.expiresAt);

  await prisma.userInvite.create({
    data: {
      tenantId: session.tenantId,
      email: accessRequest.email,
      name: accessRequest.name,
      role: parsed.data.role as Role,
      tokenHash,
      invitedById: session.userId,
      expiresAt,
    },
  });

  const origin = new URL(request.url).origin;
  const inviteLink = `${origin}/sign-up?token=${token}`;

  await prisma.accountRequest.update({
    where: { id: accessRequest.id },
    data: {
      status: 'APPROVED',
      approvedRole: parsed.data.role as Role,
      reviewedById: session.userId,
      reviewedAt: new Date(),
      expiresAt,
      inviteLink,
    },
  });

  await recordSecurityEvent({
    tenantId: session.tenantId,
    userId: session.userId,
    eventType: 'ACCOUNT_REQUEST_APPROVED',
    severity: 'INFO',
    metadata: {
      requestId: accessRequest.id,
      email: accessRequest.email,
      role: parsed.data.role,
      expiresAt: expiresAt.toISOString(),
    },
  });

  return NextResponse.json({ ok: true, inviteLink });
}