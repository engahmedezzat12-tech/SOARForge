import { NextRequest, NextResponse } from 'next/server';
import { getRequestSession, securityHeaders } from '@/lib/product-core/security';
import { getTenantScopedSnapshot, summarizeReadiness } from '@/lib/product-core/store';

export async function GET(request: NextRequest) {
  const session = getRequestSession(request);
  const snapshot = getTenantScopedSnapshot(session.tenantId);
  const readiness = summarizeReadiness(session.tenantId);
  return securityHeaders(NextResponse.json({
    ok: true,
    phase: 'phase-1-to-6-production-foundation',
    mode: 'demo-persistent-foundation',
    session,
    counts: {
      tenants: snapshot.tenants.length,
      users: snapshot.users.length,
      playbooks: snapshot.playbooks.length,
      exports: snapshot.exports.length,
      validationResults: snapshot.validationResults.length,
      knowledgeUpdates: snapshot.knowledgeUpdates.length,
      auditLogs: snapshot.auditLogs.length,
      tenantLearning: snapshot.tenantLearning.length,
    },
    readiness,
    capabilities: [
      'tenant-scoped storage abstraction',
      'RBAC permission model',
      'audit logging',
      'persistent validation result model',
      'knowledge update history model',
      'secure API route pattern',
      'deployment packaging docs',
      'commercial packaging docs',
    ],
  }));
}
