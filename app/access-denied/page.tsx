import Link from 'next/link';
import { getCurrentSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AccessDeniedPage() {
  const session = await getCurrentSession();

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card/70 p-8 shadow-xl">
        <p className="text-sm font-semibold text-red-300">Access denied</p>
        <h1 className="mt-2 text-3xl font-bold">You do not have permission to open this area.</h1>

        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          This section is restricted by RBAC. Your current role does not include the required
          admin permission.
        </p>

        {session ? (
          <div className="mt-5 rounded-lg border border-border bg-background/50 p-4 text-sm">
            <div>Email: {session.email}</div>
            <div>Role: {session.role}</div>
          </div>
        ) : null}

        <div className="mt-6 flex gap-3">
          <Link
            href="/app"
            className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
          >
            Back to App
          </Link>

          <Link
            href="/sign-in"
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
          >
            Sign in again
          </Link>
        </div>
      </div>
    </main>
  );
}