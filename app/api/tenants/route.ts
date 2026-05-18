import { NextResponse } from 'next/server';
import { TenantCreateSchema } from '@/lib/product-core/input-validation';
import { prisma } from '@/lib/db/prisma';
import { withSecureApi } from '@/lib/security/api-wrapper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = withSecureApi({
  permission: 'tenant.manage',
  rateLimit: 'generalApi',
  async handler() {
    const tenants = await prisma.tenant.findMany({ orderBy: { createdAt: 'asc' } });
    return NextResponse.json({ ok: true, tenants });
  },
});

export const POST = withSecureApi({
  permission: 'tenant.manage',
  schema: TenantCreateSchema,
  rateLimit: 'generalApi',
  async handler({ body }) {
    const tenant = await prisma.tenant.create({ data: body });
    return NextResponse.json({ ok: true, tenant });
  },
});
