import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SignOutButton } from '@/components/sign-out-button';
import { hasPermission } from '@/lib/auth/rbac';
import { requireSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TenantsPage() {
  const session = await requireSession();
  if (!hasPermission(session.role, 'tenant.manage')) redirect('/admin');

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    include: {
      _count: {
        select: {
          users: true,
          playbooks: true,
          validation: true,
          auditLogs: true,
          offlineBundles: true,
        },
      },
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
          <p className="text-sm text-muted-foreground">Customer Workspace Isolation</p>
          <h1 className="text-3xl font-bold">Tenant Workspace</h1>
          <p className="mt-2 max-w-4xl text-muted-foreground">
            View the active tenant boundary used by RBAC, validation, audit, and offline bundle workflows. All operational data is scoped to this tenant context.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card/60 p-5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Tenant</div>
          <div className="mt-2 text-3xl font-bold">{tenant?.name ?? 'Unknown tenant'}</div>
          <div className="mt-1 text-sm text-muted-foreground">slug: {tenant?.slug ?? '—'} · status: {tenant?.status ?? '—'}</div>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <Metric label="Users" value={tenant?._count.users ?? 0} />
          <Metric label="Playbooks" value={tenant?._count.playbooks ?? 0} />
          <Metric label="Validation Items" value={tenant?._count.validation ?? 0} />
          <Metric label="Audit Logs" value={tenant?._count.auditLogs ?? 0} />
          <Metric label="Bundles" value={tenant?._count.offlineBundles ?? 0} />
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
