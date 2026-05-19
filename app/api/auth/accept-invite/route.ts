import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';

import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { recordSecurityEvent } from '@/lib/product-core/security-events';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const AcceptInviteSchema = z
  .object({
    token: z.string().min(20).max(200),
    password: z.string().min(10).max(500),
    confirmPassword: z.string().min(10).max(500),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Password and confirmation do not match',
    path: ['confirmPassword'],
  });

function hashInviteToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(request: Request) {
    const originError = assertSameOrigin(request);
    if (originError) return originError;
  
    const body = await request.json().catch(() => undefined);
    const parsed = AcceptInviteSchema.safeParse(body);
  
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid invite request' },
        { status: 422 }
      );
    }
  const invite = await prisma.userInvite.findUnique({
    where: { tokenHash: hashInviteToken(parsed.data.token) },
  });

  if (!invite) {
    return NextResponse.json({ error: 'Invalid invite token' }, { status: 404 });
  }

  if (invite.acceptedAt) {
    return NextResponse.json({ error: 'Invite already accepted' }, { status: 409 });
  }

  if (invite.expiresAt <= new Date()) {
    return NextResponse.json({ error: 'Invite has expired' }, { status: 410 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: invite.email },
  });

  if (existingUser) {
    return NextResponse.json({ error: 'User already exists' }, { status: 409 });
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const user = await prisma.user.create({
    data: {
      tenantId: invite.tenantId,
      email: invite.email,
      name: invite.name,
      role: invite.role,
      status: 'ACTIVE',
      passwordHash,
      failedLoginCount: 0,
      lockedUntil: null,
      mustChangePassword: false,
      lastPasswordChangeAt: new Date(),
    },
  });

  await prisma.userInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  await recordSecurityEvent({
    tenantId: invite.tenantId,
    userId: user.id,
    eventType: 'INVITE_ACCEPTED',
    severity: 'INFO',
    metadata: {
      email: invite.email,
      role: invite.role,
    },
  });

  return NextResponse.json({ ok: true });
}