import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db/prisma';
import { requireSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/rbac';
import { assertSameOrigin } from '@/lib/security/origin-protection';
import { recordSecurityEvent } from '@/lib/product-core/security-events';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const RejectSchema = z.object({
  requestId: z.string().min(1),
});

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const session = await requireSession();

  if (!hasPermission(session.role, 'user.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => undefined);
  const parsed = RejectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid rejection payload' }, { status: 422 });
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

  await prisma.accountRequest.update({
    where: { id: accessRequest.id },
    data: {
      status: 'REJECTED',
      reviewedById: session.userId,
      reviewedAt: new Date(),
    },
  });

  await recordSecurityEvent({
    tenantId: session.tenantId,
    userId: session.userId,
    eventType: 'ACCOUNT_REQUEST_REJECTED',
    severity: 'INFO',
    metadata: {
      requestId: accessRequest.id,
      email: accessRequest.email,
    },
  });

  return NextResponse.json({ ok: true });
}