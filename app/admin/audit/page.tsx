import { DEMO_SESSION } from '@/lib/product-core/security';
import { getTenantScopedSnapshot } from '@/lib/product-core/store';

export default function AuditPage() {
  const snapshot = getTenantScopedSnapshot(DEMO_SESSION.tenantId);
  return (
    <main className="min-h-screen bg-background p-8 text-foreground">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Audit Logging</p>
          <h1 className="text-3xl font-bold">Security Audit Trail</h1>
          <p className="mt-2 text-muted-foreground">Every production action should create an immutable audit record with tenant, user, target, and metadata.</p>
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">Action</th>
                <th className="p-3">Target</th>
                <th className="p-3">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.auditLogs.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="p-3 text-muted-foreground">{item.createdAt}</td>
                  <td className="p-3 font-medium">{item.action}</td>
                  <td className="p-3 text-muted-foreground">{item.targetType ?? '-'} / {item.targetId ?? '-'}</td>
                  <td className="p-3 text-muted-foreground"><code>{JSON.stringify(item.metadata)}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
