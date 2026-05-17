import { DEMO_SESSION } from '@/lib/product-core/security';
import { getTenantScopedSnapshot, summarizeReadiness } from '@/lib/product-core/store';

export default function ValidationAdminPage() {
  const snapshot = getTenantScopedSnapshot(DEMO_SESSION.tenantId);
  const readiness = summarizeReadiness(DEMO_SESSION.tenantId);
  return (
    <main className="min-h-screen bg-background p-8 text-foreground">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Tenant Validation Center</p>
          <h1 className="text-3xl font-bold">Persistent Validation Results</h1>
          <p className="mt-2 text-muted-foreground">These records are the production model for connector checks, UAT paths, rollback evidence, and runtime readiness.</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <div className="text-sm text-muted-foreground">Tenant Runtime Confidence</div>
          <div className="text-4xl font-bold">{readiness.tenantRuntimeConfidence}%</div>
          <div className="text-sm text-muted-foreground">Passed: {readiness.passed} · Failed: {readiness.failed} · Pending: {readiness.pending}</div>
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Item</th>
                <th className="p-3">Type</th>
                <th className="p-3">Owner</th>
                <th className="p-3">Status</th>
                <th className="p-3">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.validationResults.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="p-3 font-medium">{item.itemName}</td>
                  <td className="p-3 text-muted-foreground">{item.itemType}</td>
                  <td className="p-3 text-muted-foreground">{item.owner}</td>
                  <td className="p-3"><span className="rounded-full bg-muted px-2 py-1 text-xs">{item.status}</span></td>
                  <td className="p-3 text-muted-foreground">{item.evidence || 'Pending evidence'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
          API: <code>/api/validation-results</code> and <code>/api/validation-results/update</code>. Production UI can update these statuses and audit every change.
        </div>
      </div>
    </main>
  );
}
