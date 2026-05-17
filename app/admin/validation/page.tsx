import Link from 'next/link';
import { AdminValidationUpdater } from '@/components/admin-validation-updater';

import { getDatabaseSnapshot, summarizeDatabaseReadiness } from '@/lib/product-core/db-store';

const TENANT_ID = 'tenant_internal_lab';

function statusClass(status: string) {
  if (status === 'PASSED') return 'text-emerald-400';
  if (status === 'FAILED') return 'text-red-400';
  if (status === 'NOT_APPLICABLE') return 'text-muted-foreground';
  return 'text-yellow-400';
}

export default async function ValidationPage() {
  const snapshot = await getDatabaseSnapshot(TENANT_ID);
  const readiness = await summarizeDatabaseReadiness(TENANT_ID);

  return (
    <main className="min-h-screen bg-background text-foreground p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <Link href="/admin" className="text-sm text-cyan-400 hover:underline">
            ← Back to Admin
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">Tenant Validation Center</p>
          <h1 className="text-3xl font-bold">Persistent Validation Results</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            These records are loaded from PostgreSQL and represent connector checks, UAT paths,
            rollback evidence, and runtime readiness.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card/60 p-5">
          <div className="text-sm text-muted-foreground">Tenant Runtime Confidence</div>
          <div className="mt-2 text-4xl font-bold">{readiness.tenantRuntimeConfidence}%</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Passed: {readiness.passed} · Failed: {readiness.failed} · Pending: {readiness.pending}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
  <tr>
    <th className="p-3">Item</th>
    <th className="p-3">Type</th>
    <th className="p-3">Owner</th>
    <th className="p-3">Status</th>
    <th className="p-3">Evidence</th>
    <th className="p-3">Validated By</th>
    <th className="p-3">Update</th>
  </tr>
</thead>
<tbody>
  {snapshot.validationResults.map((item) => (
    <tr key={item.id} className="border-t border-border/70 align-top">
      <td className="p-3 font-medium">{item.itemName}</td>
      <td className="p-3 text-muted-foreground">{item.itemType}</td>
      <td className="p-3 text-muted-foreground">{item.owner}</td>
      <td className={`p-3 font-semibold ${statusClass(item.status)}`}>{item.status}</td>
      <td className="p-3 text-muted-foreground">{item.evidence || 'Pending evidence'}</td>
      <td className="p-3 text-muted-foreground">{item.validatedBy || '—'}</td>
      <td className="p-3 min-w-[360px]">
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
          <strong>Database mode active:</strong> validation results and tenant runtime confidence are loaded from PostgreSQL/Neon.
          Updates are handled through <code>/api/validation-results/update</code>.
        </div>
      </div>
    </main>
  );
}