import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SignOutButton } from '@/components/sign-out-button';
import { requireSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/rbac';
import { getDatabaseSnapshot } from '@/lib/product-core/db-store';
import { verifyAuditHashChain } from '@/lib/product-core/audit-integrity';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


function actionBadge(action: string) {
  const base = 'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold';

  if (action.includes('VALIDATION')) {
    return `${base} border border-cyan-500/30 bg-cyan-500/10 text-cyan-400`;
  }

  if (action.includes('SEEDED')) {
    return `${base} border border-emerald-500/30 bg-emerald-500/10 text-emerald-400`;
  }

  if (action.includes('FAILED')) {
    return `${base} border border-red-500/30 bg-red-500/10 text-red-400`;
  }

  return `${base} border border-muted bg-muted/30 text-muted-foreground`;
}

export default async function AuditPage() {
  const session = await requireSession();
  if (!hasPermission(session.role, 'audit.read')) redirect('/sign-in');

  const snapshot = await getDatabaseSnapshot(session.tenantId);
  const integrity = await verifyAuditHashChain(session.tenantId);

  return (
    <main className="min-h-screen bg-background text-foreground p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <Link href="/admin" className="text-sm text-cyan-400 hover:underline">
              ← Back to Admin
            </Link>
            <SignOutButton />
          </div>

          <p className="mt-4 text-sm text-muted-foreground">Audit Logging</p>
          <h1 className="text-3xl font-bold">Persistent Security Audit Trail</h1>

          <p className="mt-2 max-w-4xl text-muted-foreground">
            Review persistent administrative actions, validation updates, export events, and knowledge update
            activity. Events are loaded from PostgreSQL and provide a traceable operational history.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-border bg-card/60 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Audit Events</div>
            <div className="mt-2 text-3xl font-bold">{snapshot.auditLogs.length}</div>
            <div className="mt-1 text-xs text-muted-foreground">Persistent security trail</div>
          </div>

          <div className="rounded-lg border border-border bg-card/60 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Tenant Scope</div>
            <div className="mt-2 text-3xl font-bold">{snapshot.tenants[0]?.slug ?? '—'}</div>
            <div className="mt-1 text-xs text-muted-foreground">Loaded from PostgreSQL</div>
          </div>

          <div className="rounded-lg border border-border bg-card/60 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Latest Action</div>
            <div className="mt-2 text-lg font-semibold">{snapshot.auditLogs[0]?.action ?? 'No events'}</div>
            <div className="mt-1 text-xs text-muted-foreground">Most recent recorded activity</div>
          </div>

          <div className="rounded-lg border border-border bg-card/60 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Integrity Chain</div>
            <div className={integrity.valid ? "mt-2 text-lg font-semibold text-emerald-400" : "mt-2 text-lg font-semibold text-red-400"}>
              {integrity.valid ? 'Valid' : 'Review'}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Checked {integrity.checked} logs · {integrity.failures.length} issue(s)
            </div>
          </div>
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
                <tr key={log.id} className="border-t border-border/70 align-top">
                  <td className="whitespace-nowrap p-3 text-muted-foreground">{log.createdAt}</td>
                  <td className="p-3">
                    <span className={actionBadge(log.action)}>{log.action}</span>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {[log.targetType, log.targetId].filter(Boolean).join(' / ') || '—'}
                  </td>
                  <td className="max-w-[520px] p-3 text-muted-foreground">
                    <code className="break-all rounded bg-muted/30 px-2 py-1 text-xs">
                      {JSON.stringify(log.metadata ?? {})}
                    </code>
                    {log.integrityHash ? (
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        hash: <code>{log.integrityHash.slice(0, 16)}…</code>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
          <strong>Database mode active:</strong> audit events are persisted in PostgreSQL/Neon through Prisma.
          Validation updates and future admin actions are recorded as traceable audit events.
        </div>
      </div>
    </main>
  );
}