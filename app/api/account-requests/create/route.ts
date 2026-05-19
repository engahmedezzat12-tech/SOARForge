import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db/prisma';
import { assertSameOrigin } from '@/lib/security/origin-protection';
import { recordSecurityEvent } from '@/lib/product-core/security-events';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const RequestSchema = z.object({
  email: z.string().email().max(200).transform((value) => value.toLowerCase()),
  name: z.string().min(1).max(120),
  reason: z.string().max(1000).optional(),
});

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const body = await request.json().catch(() => undefined);
  const parsed = RequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 422 });
  }

  const tenant = await prisma.tenant.findFirst({
    where: { slug: 'internal-lab' },
  });

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 500 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existingUser) {
    return NextResponse.json({ error: 'An account already exists for this email' }, { status: 409 });
  }

  const existingPending = await prisma.accountRequest.findFirst({
    where: {
      tenantId: tenant.id,
      email: parsed.data.email,
      status: 'PENDING',
    },
  });

  if (existingPending) {
    return NextResponse.json({ error: 'A pending request already exists for this email' }, { status: 409 });
  }

  const accountRequest = await prisma.accountRequest.create({
    data: {
      tenantId: tenant.id,
      email: parsed.data.email,
      name: parsed.data.name,
      reason: parsed.data.reason,
      status: 'PENDING',
    },
  });

  await recordSecurityEvent({
    tenantId: tenant.id,
    eventType: 'ACCOUNT_REQUEST_CREATED',
    severity: 'INFO',
    metadata: {
      requestId: accountRequest.id,
      email: accountRequest.email,
    },
  });

  return NextResponse.json({ ok: true });
}
