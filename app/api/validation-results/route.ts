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
      validationResults: snapshot.validationResults,
      readiness,
    });
  } catch (error) {
    console.error('Validation results DB load failed:', error);

    return NextResponse.json(
      {
        mode: 'database',
        error: 'Failed to load validation results from database',
      },
      { status: 500 },
    );
  }
}