import Link from 'next/link';

import { getDatabaseSnapshot, summarizeDatabaseReadiness } from '@/lib/product-core/db-store';

const TENANT_ID = 'tenant_internal_lab';

function Metric({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-card/60 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{note}</div>
    </div>
  );
}

export default async function AdminOverviewPage() {
  const snapshot = await getDatabaseSnapshot(TENANT_ID);
  const readiness = await summarizeDatabaseReadiness(TENANT_ID);

  return (
    <main className="min-h-screen bg-background text-foreground p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">SOARForge Production Core</p>
          <h1 className="text-3xl font-bold">Admin Console</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Phase 7 database-backed foundation for tenancy, RBAC model, audit logging,
            validation persistence, secure API patterns, deployment packaging, and commercial readiness.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Tenants" value={snapshot.tenants.length} note="Loaded from PostgreSQL" />
          <Metric label="Users" value={snapshot.users.length} note="RBAC users loaded from database" />
          <Metric
            label="Validation Confidence"
            value={`${readiness.tenantRuntimeConfidence}%`}
            note="Calculated from persistent validation evidence"
          />
          <Metric label="Audit Events" value={snapshot.auditLogs.length} note="Persistent security trail" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link className="rounded-lg border border-border p-5 hover:bg-muted/40" href="/admin/validation">
            <h2 className="font-semibold">Tenant Validation Center</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Record connector/UAT/rollback outcomes and recalculate tenant runtime confidence.
            </p>
          </Link>

          <Link className="rounded-lg border border-border p-5 hover:bg-muted/40" href="/admin/audit">
            <h2 className="font-semibold">Audit Logs</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Review persistent administrative, export, validation, and knowledge update actions.
            </p>
          </Link>

          <Link className="rounded-lg border border-border p-5 hover:bg-muted/40" href="/admin/security">
            <h2 className="font-semibold">Security & Deployment Checklist</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Track API security, deployment, Docker, backup, support, and sales packaging readiness.
            </p>
          </Link>
        </div>

        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
          <strong>Database mode active:</strong> this admin overview is reading tenants, users,
          validation confidence, and audit events from PostgreSQL/Neon through Prisma.
        </div>
      </div>
    </main>
  );
}