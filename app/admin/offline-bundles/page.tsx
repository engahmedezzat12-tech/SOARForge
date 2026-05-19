import Link from 'next/link';
import { redirect } from 'next/navigation';

import { OfflineBundleUploader } from '@/components/offline-bundle-uploader';
import { SignOutButton } from '@/components/sign-out-button';
import { requireSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OfflineBundlesPage() {
  const session = await requireSession();
  if (!hasPermission(session.role, 'offline_bundle.upload')) redirect('/access-denied');
  const imports = await prisma.offlineBundleImport.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <main className="min-h-screen bg-background p-8 text-foreground">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/admin" className="text-sm text-cyan-400 hover:underline">← Back to Admin</Link>
          <SignOutButton />
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Secure Offline Bundle Import</p>
          <h1 className="text-3xl font-bold">Offline Bundle Staging</h1>
          <p className="mt-2 max-w-4xl text-muted-foreground">
            Stage air-gapped threat intelligence or knowledge bundles safely. SOARForge validates file metadata,
            records a SHA-256 hash, and requires manual review before any operational use.
          </p>
        </div>

        <OfflineBundleUploader />

        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">File</th>
                <th className="p-3">Size</th>
                <th className="p-3">Hash</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {imports.map((item) => (
                <tr key={item.id} className="border-t border-border/70">
                  <td className="p-3 text-muted-foreground">{item.createdAt.toISOString()}</td>
                  <td className="p-3 font-medium">{item.fileName}</td>
                  <td className="p-3 text-muted-foreground">{item.fileSize} bytes</td>
                  <td className="max-w-[360px] p-3 text-muted-foreground"><code className="break-all">{item.fileHash}</code></td>
                  <td className="p-3 text-cyan-400">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
