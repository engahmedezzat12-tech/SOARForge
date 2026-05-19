import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SignOutButton } from '@/components/sign-out-button';
import { AdminUsersManager } from '@/components/admin-users-manager';
import { AccountRequestsManager } from '@/components/account-requests-manager';
import { hasPermission } from '@/lib/auth/rbac';
import { requireSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { AdminInvitesManager } from '@/components/admin-invites-manager';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function UsersPage() {
  const session = await requireSession();

  if (!hasPermission(session.role, 'user.manage')) {
    redirect('/access-denied');
  }
  const accountRequests = await prisma.accountRequest.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const invites = await prisma.userInvite.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
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
  const serializedRequests = accountRequests.map((request) => ({
    id: request.id,
    email: request.email,
    name: request.name,
    reason: request.reason,
    status: request.status,
    approvedRole: request.approvedRole,
    inviteLink: request.inviteLink,
    expiresAt: request.expiresAt?.toISOString() ?? null,
    reviewedAt: request.reviewedAt?.toISOString() ?? null,
    createdAt: request.createdAt.toISOString(),
  }));
  const serializedInvites = invites.map((invite) => ({
    id: invite.id,
    email: invite.email,
    name: invite.name,
    role: invite.role,
    acceptedAt: invite.acceptedAt?.toISOString() ?? null,
    expiresAt: invite.expiresAt.toISOString(),
    createdAt: invite.createdAt.toISOString(),
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

<div className="rounded-xl border border-border bg-card/40 p-5">
  <div className="mb-5">
    <p className="text-sm text-muted-foreground">Access Governance</p>
    <h2 className="text-2xl font-bold">Account Requests</h2>
    <p className="mt-2 text-sm text-muted-foreground">
      Review access requests, approve users, assign roles, set invite expiry dates, or reject requests.
    </p>
  </div>

  <AccountRequestsManager requests={serializedRequests} />
</div>

<div className="rounded-xl border border-border bg-card/40 p-5">
  <div className="mb-5">
    <p className="text-sm text-muted-foreground">Invite Governance</p>
    <h2 className="text-2xl font-bold">Pending / Accepted / Expired Invites</h2>
    <p className="mt-2 text-sm text-muted-foreground">
      Review generated invite links, expiry dates, acceptance state, and revoke pending invites.
    </p>
  </div>

  <AdminInvitesManager invites={serializedInvites} />
</div>
      </div>
    </main>
  );
}