import Link from 'next/link';

import { getDatabaseSnapshot } from '@/lib/product-core/db-store';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
const TENANT_ID = 'tenant_internal_lab';

export default async function AuditPage() {
  const snapshot = await getDatabaseSnapshot(TENANT_ID);

  return (
    <main className="min-h-screen bg-background text-foreground p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <Link href="/admin" className="text-sm text-cyan-400 hover:underline">
            ← Back to Admin
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">Audit Logging</p>
          <h1 className="text-3xl font-bold">Persistent Security Audit Trail</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            These audit events are loaded from PostgreSQL and should track tenant, user, target,
            and action metadata for production governance.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">Action</th>
                <th className="p-3">Target</th>
                <th className="p-3">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.auditLogs.map((log) => (
                <tr key={log.id} className="border-t border-border/70">
                  <td className="p-3 text-muted-foreground">{log.createdAt}</td>
                  <td className="p-3 font-medium">{log.action}</td>
                  <td className="p-3 text-muted-foreground">
                    {[log.targetType, log.targetId].filter(Boolean).join(' / ') || '—'}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    <code className="break-all">{JSON.stringify(log.metadata ?? {})}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
          <strong>Database mode active:</strong> audit events are loaded from PostgreSQL/Neon.
          Validation updates and future admin actions should create persistent audit records.
        </div>
      </div>
    </main>
  );
}