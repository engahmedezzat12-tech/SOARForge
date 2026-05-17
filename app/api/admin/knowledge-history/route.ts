import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requirePermission, securityHeaders } from '@/lib/product-core/security';
import { getTenantScopedSnapshot } from '@/lib/product-core/store';

export async function GET(request: NextRequest) {
  try {
    const session = requirePermission(request, 'knowledge:read');
    const snapshot = getTenantScopedSnapshot(session.tenantId);
    return securityHeaders(NextResponse.json({ ok: true, knowledgeUpdates: snapshot.knowledgeUpdates }));
  } catch (error) {
    return jsonError(error);
  }
}
