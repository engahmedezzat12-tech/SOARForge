import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SignOutButton } from '@/components/sign-out-button';
import { hasPermission } from '@/lib/auth/rbac';
import { requireSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function StatusCard({
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
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{note}</div>
    </div>
  );
}

export default async function SystemStatusPage() {
  const session = await requireSession();

  if (!hasPermission(session.role, 'security.read')) {
    redirect('/access-denied');
  }

  let databaseStatus = 'connected';

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    databaseStatus = 'disconnected';
  }

  const [usersCount, tenantsCount, eventsCount, invitesCount, requestsCount, auditCount] =
    await Promise.all([
      prisma.user.count({ where: { tenantId: session.tenantId } }),
      prisma.tenant.count(),
      prisma.securityEvent.count({ where: { tenantId: session.tenantId } }),
      prisma.userInvite.count({ where: { tenantId: session.tenantId } }),
      prisma.accountRequest.count({ where: { tenantId: session.tenantId } }),
      prisma.auditLog.count({ where: { tenantId: session.tenantId } }),
    ]);

  const lastSecurityEvent = await prisma.securityEvent.findFirst({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="min-h-screen bg-background p-8 text-foreground">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/admin" className="text-sm text-cyan-400 hover:underline">
            ← Back to Admin
          </Link>
          <SignOutButton />
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Platform Operations</p>
          <h1 className="text-3xl font-bold">System Status</h1>
          <p className="mt-2 max-w-4xl text-muted-foreground">
            Runtime health, database connectivity, tenant object counts, and recent security activity.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatusCard label="Database" value={databaseStatus} note="PostgreSQL connectivity" />
          <StatusCard label="Users" value={usersCount} note="Tenant-scoped users" />
          <StatusCard label="Tenants" value={tenantsCount} note="Workspace records" />
          <StatusCard label="Security Events" value={eventsCount} note="Security event trail" />
          <StatusCard label="Invites" value={invitesCount} note="Invite governance records" />
          <StatusCard label="Requests" value={requestsCount} note="Access request records" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card/60 p-5">
            <h2 className="font-semibold">Current Session</h2>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
              <div>Email: {session.email}</div>
              <div>Role: {session.role}</div>
              <div>Tenant ID: {session.tenantId}</div>
              <div>User ID: {session.userId}</div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card/60 p-5">
            <h2 className="font-semibold">Audit Summary</h2>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
              <div>Audit Records: {auditCount}</div>
              <div>Environment: {process.env.NODE_ENV}</div>
              <div>Version: pilot-ready</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card/60 p-5">
          <h2 className="font-semibold">Latest Security Event</h2>

          {lastSecurityEvent ? (
            <pre className="mt-3 overflow-auto rounded-md bg-background/70 p-3 text-xs text-muted-foreground">
              {JSON.stringify(
                {
                  eventType: lastSecurityEvent.eventType,
                  severity: lastSecurityEvent.severity,
                  createdAt: lastSecurityEvent.createdAt.toISOString(),
                  metadata: lastSecurityEvent.metadata,
                },
                null,
                2
              )}
            </pre>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No security events recorded yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}