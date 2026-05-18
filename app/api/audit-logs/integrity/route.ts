import { NextResponse } from 'next/server';

import { verifyAuditHashChain } from '@/lib/product-core/audit-integrity';
import { withSecureApi } from '@/lib/security/api-wrapper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = withSecureApi({
  permission: 'audit.read',
  rateLimit: 'auditRead',
  async handler({ session }) {
    const integrity = await verifyAuditHashChain(session.tenantId);
    return NextResponse.json({ mode: 'database', tenantId: session.tenantId, integrity });
  },
});
