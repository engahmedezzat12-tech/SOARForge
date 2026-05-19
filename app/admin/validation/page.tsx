import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AdminValidationUpdater } from '@/components/admin-validation-updater';
import { SignOutButton } from '@/components/sign-out-button';

import { requireSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/rbac';
import { getDatabaseSnapshot, summarizeDatabaseReadiness } from '@/lib/product-core/db-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


function statusBadge(status: string) {
  const base = 'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold';

  if (status === 'PASSED') {
    return `${base} border border-emerald-500/30 bg-emerald-500/10 text-emerald-400`;
  }

  if (status === 'FAILED') {
    return `${base} border border-red-500/30 bg-red-500/10 text-red-400`;
  }

  if (status === 'NOT_APPLICABLE') {
    return `${base} border border-muted bg-muted/30 text-muted-foreground`;
  }

  return `${base} border border-yellow-500/30 bg-yellow-500/10 text-yellow-400`;
}

function SummaryCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{note}</div>
    </div>
  );
}

export default async function ValidationPage() {
  const session = await requireSession();
  if (!hasPermission(session.role, 'validation.read')) redirect('/access-denied');

  const snapshot = await getDatabaseSnapshot(session.tenantId);
  const readiness = await summarizeDatabaseReadiness(session.tenantId);

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

          <p className="mt-4 text-sm text-muted-foreground">Tenant Validation Center</p>
          <h1 className="text-3xl font-bold">Persistent Validation Results</h1>

          <p className="mt-2 max-w-4xl text-muted-foreground">
            Track connector readiness, UAT outcomes, rollback evidence, and runtime validation status.
            All updates are stored in PostgreSQL and logged in the audit trail.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard
            label="Runtime Confidence"
            value={`${readiness.tenantRuntimeConfidence}%`}
            note="Calculated from persistent validation evidence"
          />
          <SummaryCard label="Passed" value={readiness.passed} note="Validated successfully" />
          <SummaryCard label="Failed" value={readiness.failed} note="Requires remediation or retest" />
          <SummaryCard label="Pending" value={readiness.pending} note="Awaiting evidence or review" />
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-3">Validation Item</th>
                <th className="p-3">Type</th>
                <th className="p-3">Owner</th>
                <th className="p-3">Status</th>
                <th className="p-3">Evidence</th>
                <th className="p-3">Validated By</th>
                <th className="p-3">Update Evidence</th>
              </tr>
            </thead>

            <tbody>
              {snapshot.validationResults.map((item) => (
                <tr key={item.id} className="border-t border-border/70 align-top">
                  <td className="p-3 font-medium">{item.itemName}</td>
                  <td className="p-3 text-muted-foreground">{item.itemType}</td>
                  <td className="p-3 text-muted-foreground">{item.owner}</td>
                  <td className="p-3">
                    <span className={statusBadge(item.status)}>{item.status}</span>
                  </td>
                  <td className="max-w-[260px] p-3 text-muted-foreground">
                    {item.evidence || 'Pending evidence'}
                  </td>
                  <td className="p-3 text-muted-foreground">{item.validatedBy || '—'}</td>
                  <td className="min-w-[420px] p-3">
                    <AdminValidationUpdater
                      id={item.id}
                      currentStatus={item.status}
                      currentEvidence={item.evidence}
                      currentValidatedBy={item.validatedBy}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
          <strong>Database mode active:</strong> validation evidence, runtime confidence, and audit events
          are persisted in PostgreSQL/Neon through Prisma.
        </div>
      </div>
    </main>
  );
}