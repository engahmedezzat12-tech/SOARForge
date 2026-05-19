import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SignOutButton } from '@/components/sign-out-button';
import { hasPermission } from '@/lib/auth/rbac';
import { requireSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { AccountRequestsManager } from '@/components/account-requests-manager';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AccountRequestsPage() {
  const session = await requireSession();

  if (!hasPermission(session.role, 'user.manage')) {
    redirect('/access-denied');
  }

  const requests = await prisma.accountRequest.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const serializedRequests = requests.map((request) => ({
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
          <p className="text-sm text-muted-foreground">Access Governance</p>
          <h1 className="text-3xl font-bold">Account Requests</h1>
          <p className="mt-2 max-w-4xl text-muted-foreground">
            Approve or reject account requests. Approved requests generate invite links with an assigned role and expiry date.
          </p>
        </div>

        <AccountRequestsManager requests={serializedRequests} />
      </div>
    </main>
  );
}