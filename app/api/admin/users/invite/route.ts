import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import type { Role } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { requireSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/rbac';
import { recordSecurityEvent } from '@/lib/product-core/security-events';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const InviteSchema = z.object({
  email: z.string().email().max(200).transform((value) => value.toLowerCase()),
  name: z.string().min(1).max(120).optional(),
  role: z.enum(['SUPER_ADMIN', 'TENANT_ADMIN', 'SOC_MANAGER', 'SOC_ENGINEER', 'AUDITOR', 'VIEWER']),
});

function hashInviteToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(request: Request) {
  const session = await requireSession();

  if (!hasPermission(session.role, 'user.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => undefined);
  const parsed = InviteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid invite payload' },
      { status: 422 }
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existingUser) {
    return NextResponse.json({ error: 'User already exists' }, { status: 409 });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashInviteToken(token);

  await prisma.userInvite.create({
    data: {
      tenantId: session.tenantId,
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role as Role,
      tokenHash,
      invitedById: session.userId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  await recordSecurityEvent({
    tenantId: session.tenantId,
    userId: session.userId,
    eventType: 'USER_INVITED',
    severity: 'INFO',
    metadata: {
      invitedEmail: parsed.data.email,
      role: parsed.data.role,
      expiresInHours: 24,
    },
  });

  const origin = new URL(request.url).origin;
  const inviteLink = `${origin}/sign-up?token=${token}`;

  return NextResponse.json({
    ok: true,
    inviteLink,
    expiresInHours: 24,
  });
}