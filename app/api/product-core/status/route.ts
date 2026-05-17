import { NextResponse } from 'next/server';

import { getDatabaseSnapshot, summarizeDatabaseReadiness } from '@/lib/product-core/db-store';

const TENANT_ID = 'tenant_internal_lab';

export async function GET() {
  try {
    const snapshot = await getDatabaseSnapshot(TENANT_ID);
    const readiness = await summarizeDatabaseReadiness(TENANT_ID);

    return NextResponse.json({
      mode: 'database',
      tenantId: TENANT_ID,
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
  } catch (error) {
    console.error('Product core DB status failed:', error);

    return NextResponse.json(
      {
        mode: 'database',
        error: 'Failed to load product core status from database',
      },
      { status: 500 },
    );
  }
}