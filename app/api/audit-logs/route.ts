import { NextResponse } from 'next/server';

import { getDatabaseSnapshot } from '@/lib/product-core/db-store';

const TENANT_ID = 'tenant_internal_lab';

export async function GET() {
  try {
    const snapshot = await getDatabaseSnapshot(TENANT_ID);

    return NextResponse.json({
      mode: 'database',
      tenantId: TENANT_ID,
      auditLogs: snapshot.auditLogs,
    });
  } catch (error) {
    console.error('Audit logs DB load failed:', error);

    return NextResponse.json(
      {
        mode: 'database',
        error: 'Failed to load audit logs from database',
      },
      { status: 500 },
    );
  }
}