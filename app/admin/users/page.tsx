import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SignOutButton } from '@/components/sign-out-button';
import { AdminUsersManager } from '@/components/admin-users-manager';
import { hasPermission } from '@/lib/auth/rbac';
import { requireSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function UsersPage() {
  const session = await requireSession();

  if (!hasPermission(session.role, 'user.manage')) {
    redirect('/access-denied');
  }

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
      mustChangePassword: true,
      createdAt: true,
    },
  });

  const serializedUsers = users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    failedLoginCount: user.failedLoginCount,
    lockedUntil: user.lockedUntil?.toISOString() ?? null,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt.toISOString(),
  }));

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
          <p className="text-sm text-muted-foreground">Tenant User Management</p>
          <h1 className="text-3xl font-bold">User Management</h1>
<p className="mt-2 max-w-4xl text-muted-foreground">
  Create tenant users, assign RBAC roles, reset temporary passwords, disable risky accounts,
  and enforce password changes on next login.
</p>
        </div>

        <AdminUsersManager users={serializedUsers} />
      </div>
    </main>
  );
}