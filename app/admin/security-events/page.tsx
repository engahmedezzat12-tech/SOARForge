import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SignOutButton } from '@/components/sign-out-button';
import { hasPermission } from '@/lib/auth/rbac';
import { requireSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function severityClass(severity: string) {
  if (severity === 'CRITICAL') return 'border-red-500/50 bg-red-500/10 text-red-300';
  if (severity === 'HIGH') return 'border-orange-500/50 bg-orange-500/10 text-orange-300';
  if (severity === 'MEDIUM') return 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300';
  if (severity === 'LOW') return 'border-blue-500/50 bg-blue-500/10 text-blue-300';
  return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300';
}

export default async function SecurityEventsPage() {
  const session = await requireSession();

  if (!hasPermission(session.role, 'security.read')) {
    redirect('/access-denied');
  }

  const events = await prisma.securityEvent.findMany({
    where: {
      tenantId: session.tenantId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 100,
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
          <p className="text-sm text-muted-foreground">Security Monitoring</p>
          <h1 className="text-3xl font-bold">Security Events</h1>
          <p className="mt-2 max-w-4xl text-muted-foreground">
            Review authentication, RBAC, user-management, invite, password, and rate-limit events.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-border bg-card/60 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Total Events</div>
            <div className="mt-2 text-2xl font-semibold">{events.length}</div>
          </div>

          <div className="rounded-lg border border-border bg-card/60 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">High/Critical</div>
            <div className="mt-2 text-2xl font-semibold">
              {events.filter((event) => event.severity === 'HIGH' || event.severity === 'CRITICAL').length}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card/60 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Login Failures</div>
            <div className="mt-2 text-2xl font-semibold">
              {events.filter((event) => event.eventType === 'LOGIN_FAILURE').length}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card/60 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">User Changes</div>
            <div className="mt-2 text-2xl font-semibold">
              {events.filter((event) => event.eventType.startsWith('USER_')).length}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">Severity</th>
                <th className="p-3">Event</th>
                <th className="p-3">User ID</th>
                <th className="p-3">IP</th>
                <th className="p-3">Metadata</th>
              </tr>
            </thead>

            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-t border-border/70 align-top">
                  <td className="whitespace-nowrap p-3 text-muted-foreground">
                    {event.createdAt.toISOString()}
                  </td>

                  <td className="p-3">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${severityClass(event.severity)}`}>
                      {event.severity}
                    </span>
                  </td>

                  <td className="p-3 font-medium">
                    {event.eventType}
                  </td>

                  <td className="p-3 text-muted-foreground">
                    {event.userId ?? '—'}
                  </td>

                  <td className="p-3 text-muted-foreground">
                    {event.ipAddress ?? '—'}
                  </td>

                  <td className="max-w-xl p-3">
                    <pre className="max-h-32 overflow-auto rounded-md bg-background/70 p-2 text-xs text-muted-foreground">
                      {JSON.stringify(event.metadata ?? {}, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}

              {events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    No security events recorded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}