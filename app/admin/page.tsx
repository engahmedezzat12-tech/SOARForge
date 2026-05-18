import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SignOutButton } from '@/components/sign-out-button';
import { requireSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/rbac';
import { getDatabaseSnapshot, summarizeDatabaseReadiness } from '@/lib/product-core/db-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  const session = await requireSession();
  if (!hasPermission(session.role, 'admin.read')) redirect('/sign-in');

  const snapshot = await getDatabaseSnapshot(session.tenantId);
  const readiness = await summarizeDatabaseReadiness(session.tenantId);

  return (
    <main className="min-h-screen bg-background p-8 text-foreground">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">SOARForge Production Core</p>
            <h1 className="text-3xl font-bold">Admin Console</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Phase 8-10 security hardened foundation for tenancy, RBAC, audit logging, validation persistence,
              protected APIs, deployment packaging, and commercial readiness.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-xs text-muted-foreground">
              <div>{session.email}</div>
              <div>{session.role}</div>
            </div>
            <SignOutButton />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Metric label="Tenants" value={snapshot.tenants.length} note="Loaded from PostgreSQL" />
          <Metric label="Users" value={snapshot.users.length} note="RBAC users loaded from database" />
          <Metric
            label="Validation Confidence"
            value={`${readiness.tenantRuntimeConfidence}%`}
            note="Calculated from persistent validation evidence"
          />
          <Metric label="Audit Events" value={snapshot.auditLogs.length} note="Persistent security trail" />
        </div>

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
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
            <h2 className="font-semibold">Security Checklist</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Track authentication, RBAC, protected APIs, rate limits, and deployment hardening.
            </p>
          </Link>

          <Link className="rounded-lg border border-border p-5 hover:bg-muted/40" href="/admin/offline-bundles">
            <h2 className="font-semibold">Offline Bundle Imports</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Stage air-gapped update bundles safely. Imports require manual review before use.
            </p>
          </Link>

          <Link className="rounded-lg border border-border p-5 hover:bg-muted/40" href="/admin/users">
            <h2 className="font-semibold">Users & Roles</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Review tenant users, RBAC roles, lockout state, and login posture.
            </p>
          </Link>

          <Link className="rounded-lg border border-border p-5 hover:bg-muted/40" href="/admin/tenants">
            <h2 className="font-semibold">Tenant Workspace</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Inspect tenant-scoped workspace boundaries and object counts.
            </p>
          </Link>
        </div>

        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
          <strong>Security mode active:</strong> this admin overview is protected by session auth, RBAC,
          tenant-scoped database reads, and persistent audit/security event logging.
        </div>
      </div>
    </main>
  );
}
