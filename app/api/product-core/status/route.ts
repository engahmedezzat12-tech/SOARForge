import { NextResponse } from 'next/server';

import { getDatabaseSnapshot, summarizeDatabaseReadiness } from '@/lib/product-core/db-store';
import { withSecureApi } from '@/lib/security/api-wrapper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = withSecureApi({
  permission: 'admin.read',
  rateLimit: 'generalApi',
  async handler({ session }) {
    const snapshot = await getDatabaseSnapshot(session.tenantId);
    const readiness = await summarizeDatabaseReadiness(session.tenantId);

    return NextResponse.json({
      mode: 'database',
      tenantId: session.tenantId,
      summary: {
        tenants: snapshot.tenants.length,
        users: snapshot.users.length,
        playbooks: snapshot.playbooks.length,
        validationResults: snapshot.validationResults.length,
        knowledgeUpdates: snapshot.knowledgeUpdates.length,
        auditLogs: snapshot.auditLogs.length,
        tenantLearning: snapshot.tenantLearning.length,
        validationConfidence: readiness.tenantRuntimeConfidence,
      },
      readiness,
      snapshot,
    });
  },
});
