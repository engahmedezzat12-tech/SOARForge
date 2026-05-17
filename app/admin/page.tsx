import Link from 'next/link';
import { getTenantScopedSnapshot, summarizeReadiness } from '@/lib/product-core/store';
import { DEMO_SESSION } from '@/lib/product-core/security';

function Metric({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-card/60 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{note}</div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const snapshot = getTenantScopedSnapshot(DEMO_SESSION.tenantId);
  const readiness = summarizeReadiness(DEMO_SESSION.tenantId);
  return (
    <main className="min-h-screen bg-background text-foreground p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">SOARForge Production Core</p>
          <h1 className="text-3xl font-bold">Admin Console</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Phase 1-6 foundation for database-backed tenancy, authentication/RBAC model, audit logging,
            validation persistence, secure API patterns, deployment packaging, and commercial readiness.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Tenants" value={snapshot.tenants.length} note="Tenant-scoped data model active" />
          <Metric label="Users" value={snapshot.users.length} note="RBAC roles seeded" />
          <Metric label="Validation Confidence" value={`${readiness.tenantRuntimeConfidence}%`} note="Updates as validation evidence is recorded" />
          <Metric label="Audit Events" value={snapshot.auditLogs.length} note="Security trail foundation" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link className="rounded-lg border border-border p-5 hover:bg-muted/40" href="/admin/validation">
            <h2 className="font-semibold">Tenant Validation Center</h2>
            <p className="mt-2 text-sm text-muted-foreground">Record connector/UAT/rollback outcomes and recalculate tenant runtime confidence.</p>
          </Link>
          <Link className="rounded-lg border border-border p-5 hover:bg-muted/40" href="/admin/audit">
            <h2 className="font-semibold">Audit Logs</h2>
            <p className="mt-2 text-sm text-muted-foreground">Review administrative, export, validation, and knowledge update actions.</p>
          </Link>
          <Link className="rounded-lg border border-border p-5 hover:bg-muted/40" href="/admin/security">
            <h2 className="font-semibold">Security & Deployment Checklist</h2>
            <p className="mt-2 text-sm text-muted-foreground">Track API security, deployment, Docker, backup, support, and sales packaging readiness.</p>
          </Link>
        </div>

        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm">
          <strong>Production note:</strong> this build includes a no-dependency demo persistence layer so Vercel builds remain stable.
          Replace the store adapter with PostgreSQL/Prisma using the included schema and deployment guides before customer production.
        </div>
      </div>
    </main>
  );
}
