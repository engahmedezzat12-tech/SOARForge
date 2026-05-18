import { NextResponse } from 'next/server';
import { getDatabaseSnapshot } from '@/lib/product-core/db-store';
import { withSecureApi } from '@/lib/security/api-wrapper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = withSecureApi({
  permission: 'knowledge.read',
  rateLimit: 'generalApi',
  async handler({ session }) {
    const snapshot = await getDatabaseSnapshot(session.tenantId);
    return NextResponse.json({ ok: true, knowledgeUpdates: snapshot.knowledgeUpdates });
  },
});
