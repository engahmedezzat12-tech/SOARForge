import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SignOutButton } from '@/components/sign-out-button';
import { requireSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const sections = [
  ['Authentication', 'Implemented', 'HttpOnly session cookies, secure password hashing, login throttling, account lockout, and sign-out invalidation.'],
  ['RBAC', 'Implemented', 'Server-side role to permission checks protect admin pages and API routes.'],
  ['API Protection', 'Implemented', 'Secure API wrapper enforces auth, RBAC, Zod validation, rate limits, safe errors, and denied-request events.'],
  ['Tenant Isolation', 'Implemented', 'Sensitive updates use tenantId from session context and reject cross-tenant IDOR paths. PostgreSQL RLS remains an enterprise enhancement.'],
  ['Security Headers', 'Implemented', 'next.config.mjs applies CSP, HSTS, frame denial, MIME sniffing protection, referrer policy, and permissions policy.'],
  ['Rate Limiting', 'Implemented', 'Hybrid limiter uses Upstash Redis REST when configured and falls back to local memory for demos.'],
  ['Audit Logging', 'Implemented', 'Persistent audit events include hash-chain integrity fields for tamper-evident review.'],
  ['Offline Bundle Safety', 'Implemented foundation', 'Uploads are staged only, metadata and magic bytes are validated, optional RSA signatures are checked, and imports never auto-apply.'],
  ['Vercel Hardening', 'Partially implemented', 'Environment variables, security headers, production/preview separation, and WAF settings are documented for deployment.'],
  ['Secrets Hygiene', 'Implemented baseline', 'No secrets are committed; .env and .env.local remain ignored. NEXT_PUBLIC is avoided for sensitive values.'],
  ['Testing Pack', 'Documented', 'Manual and automated test plans are included for auth, RBAC, tenant isolation, headers, rate limits, and offline bundle staging.'],
  ['Audit Integrity', 'Implemented', 'Audit logs are hash-chained with previousHash and integrityHash to detect tampering.'],
  ['Tenant/User Workspace', 'Implemented foundation', 'Tenant and user posture pages provide workspace isolation evidence for commercial pilots.'],
  ['PostgreSQL RLS', 'Planned enterprise enhancement', 'DBA-reviewed RLS SQL template is included but intentionally not auto-enabled until tenant-context staging tests pass.'],
] as const;

function badge(status: string) {
  const base = 'rounded-full px-2.5 py-1 text-xs font-semibold';
  if (status === 'Implemented') return `${base} border border-emerald-500/30 bg-emerald-500/10 text-emerald-400`;
  if (status === 'Implemented foundation') return `${base} border border-cyan-500/30 bg-cyan-500/10 text-cyan-400`;
  if (status === 'Partially implemented') return `${base} border border-yellow-500/30 bg-yellow-500/10 text-yellow-400`;
  return `${base} border border-muted bg-muted/30 text-muted-foreground`;
}

export default async function SecurityPage() {
  const session = await requireSession();
  if (!hasPermission(session.role, 'security.read')) redirect('/sign-in');

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
          <p className="text-sm text-muted-foreground">Phase 8-10 Security Hardening</p>
          <h1 className="text-3xl font-bold">Security, Deployment & Commercial Checklist</h1>
          <p className="mt-2 max-w-4xl text-muted-foreground">
            Enterprise security controls for authentication, authorization, protected APIs, tenant isolation,
            offline bundle safety, Vercel hardening, and commercial pilot readiness.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {sections.map(([title, status, body]) => (
            <div key={title} className="rounded-lg border border-border bg-card/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">{title}</h2>
                <span className={badge(status)}>{status}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
