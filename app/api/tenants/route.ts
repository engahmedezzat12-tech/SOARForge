import { NextRequest, NextResponse } from 'next/server';
import { TenantCreateSchema } from '@/lib/product-core/input-validation';
import { jsonError, requirePermission, securityHeaders } from '@/lib/product-core/security';
import { addTenant, getProductCoreStore } from '@/lib/product-core/store';
import { writeAuditLog } from '@/lib/product-core/audit';

export async function GET(request: NextRequest) {
  try {
    const session = requirePermission(request, 'tenant:manage');
    const store = getProductCoreStore();
    return securityHeaders(NextResponse.json({ ok: true, tenants: store.tenants, session }));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requirePermission(request, 'tenant:manage');
    const body = TenantCreateSchema.parse(await request.json());
    const tenant = addTenant(body);
    await writeAuditLog({ tenantId: session.tenantId, userId: session.userId, action: 'TENANT_CREATED', targetType: 'tenant', targetId: tenant.id, metadata: body });
    return securityHeaders(NextResponse.json({ ok: true, tenant }));
  } catch (error) {
    return jsonError(error);
  }
}
