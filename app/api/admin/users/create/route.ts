import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Role } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { requireSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/rbac';
import { hashPassword } from '@/lib/auth/password';
import { recordSecurityEvent } from '@/lib/product-core/security-events';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CreateUserSchema = z.object({
  email: z.string().email().max(200).transform((value) => value.toLowerCase()),
  name: z.string().min(1).max(120),
  role: z.enum(['SUPER_ADMIN', 'TENANT_ADMIN', 'SOC_MANAGER', 'SOC_ENGINEER', 'AUDITOR', 'VIEWER']),
  temporaryPassword: z.string().min(10).max(500),
});

export async function POST(request: Request) {
  const session = await requireSession();

  if (!hasPermission(session.role, 'user.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => undefined);
  const parsed = CreateUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid user payload' },
      { status: 422 }
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existing) {
    return NextResponse.json({ error: 'User already exists' }, { status: 409 });
  }

  const passwordHash = await hashPassword(parsed.data.temporaryPassword);

  const user = await prisma.user.create({
    data: {
      tenantId: session.tenantId,
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role as Role,
      status: 'ACTIVE',
      passwordHash,
      failedLoginCount: 0,
      lockedUntil: null,
      mustChangePassword: true,
      lastPasswordChangeAt: new Date(),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      mustChangePassword: true,
    },
  });

  await recordSecurityEvent({
    tenantId: session.tenantId,
    userId: session.userId,
    eventType: 'USER_CREATED',
    severity: 'INFO',
    metadata: {
      createdUserId: user.id,
      createdEmail: user.email,
      role: user.role,
    },
  });

  return NextResponse.json({ ok: true, user });
}