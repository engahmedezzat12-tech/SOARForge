import { NextResponse } from 'next/server';

import { getDatabaseSnapshot, summarizeDatabaseReadiness } from '@/lib/product-core/db-store';
import { withSecureApi } from '@/lib/security/api-wrapper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = withSecureApi({
  permission: 'validation.read',
  rateLimit: 'generalApi',
  async handler({ session }) {
    const snapshot = await getDatabaseSnapshot(session.tenantId);
    const readiness = await summarizeDatabaseReadiness(session.tenantId);

    return NextResponse.json({
      mode: 'database',
      tenantId: session.tenantId,
      validationResults: snapshot.validationResults,
      readiness,
    });
  },
});
