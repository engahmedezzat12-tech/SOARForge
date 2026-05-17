import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requirePermission, securityHeaders } from '@/lib/product-core/security';
import { getTenantScopedSnapshot, summarizeReadiness } from '@/lib/product-core/store';

export async function GET(request: NextRequest) {
  try {
    const session = requirePermission(request, 'validation:read');
    const snapshot = getTenantScopedSnapshot(session.tenantId);
    return securityHeaders(NextResponse.json({
      ok: true,
      validationResults: snapshot.validationResults,
      readiness: summarizeReadiness(session.tenantId),
    }));
  } catch (error) {
    return jsonError(error);
  }
}
