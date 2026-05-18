import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SignOutButton } from '@/components/sign-out-button';
import { hasPermission } from '@/lib/auth/rbac';
import { requireSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function roleBadge(role: string) {
  const base = 'rounded-full border px-2.5 py-1 text-xs font-semibold';
  if (role === 'SUPER_ADMIN' || role === 'TENANT_ADMIN') return `${base} border-cyan-500/30 bg-cyan-500/10 text-cyan-400`;
  if (role === 'AUDITOR') return `${base} border-yellow-500/30 bg-yellow-500/10 text-yellow-400`;
  return `${base} border-muted bg-muted/30 text-muted-foreground`;
}

export default async function UsersPage() {
  const session = await requireSession();
  if (!hasPermission(session.role, 'user.manage')) redirect('/admin');

  const users = await prisma.user.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      lastLoginAt: true,
      failedLoginCount: true,
      lockedUntil: true,
      createdAt: true,
    },
  });

  return (
    <main className="min-h-screen bg-background p-8 text-foreground">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/admin" className="text-sm text-cyan-400 hover:underline">← Back to Admin</Link>
          <SignOutButton />
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Tenant User Management</p>
          <h1 className="text-3xl font-bold">Users & Roles</h1>
          <p className="mt-2 max-w-4xl text-muted-foreground">
            Review tenant-scoped users, roles, lockout state, and login activity. User invite/change workflows are prepared as the next commercial SaaS step.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Last Login</th>
                <th className="p-3">Failed Logins</th>
                <th className="p-3">Lockout</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-border/70">
                  <td className="p-3">
                    <div className="font-medium">{user.name ?? user.email}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </td>
                  <td className="p-3"><span className={roleBadge(user.role)}>{user.role}</span></td>
                  <td className="p-3 text-muted-foreground">{user.status}</td>
                  <td className="p-3 text-muted-foreground">{user.lastLoginAt?.toISOString() ?? '—'}</td>
                  <td className="p-3 text-muted-foreground">{user.failedLoginCount}</td>
                  <td className="p-3 text-muted-foreground">{user.lockedUntil ? user.lockedUntil.toISOString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
