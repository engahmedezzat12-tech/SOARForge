'use client';

import { useState } from 'react';
import { SOARForgeLogo } from '@/components/soarforge-logo';

export default function SignInPage() {
  const [email, setEmail] = useState('admin@soarforge.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || 'Invalid email or password');
        return;
      }

      window.location.href = data.mustChangePassword ? '/account/security' : '/app';
    } catch {
      setError('Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function ssoComingSoon(provider: string) {
    setError('');
    setNotice(
      `${provider} SSO is ready for enterprise integration. Configure OAuth credentials, callback URL, tenant mapping, and allowed domains before enabling it.`
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="relative grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />

        <section className="hidden border-r border-border/70 bg-card/30 p-12 lg:flex lg:flex-col lg:justify-between">
          <div>
            <SOARForgeLogo />

            <div className="mt-16 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-cyan-300">
                Secure SOAR Workspace
              </p>

              <h1 className="mt-5 text-5xl font-black leading-[1.05] tracking-[-0.05em]">
                Build trusted automation before it reaches production.
              </h1>

              <p className="mt-6 max-w-xl text-sm leading-7 text-muted-foreground">
                SOARForge helps security teams design response workflows, validate tenant readiness,
                track audit evidence, and prepare enterprise-grade automation packages with protected
                access controls.
              </p>
            </div>

            <div className="mt-10 grid max-w-2xl gap-3 text-sm">
              <div className="rounded-xl border border-border/70 bg-background/40 p-5">
                <div className="font-semibold">Playbook Workspace</div>
                <div className="mt-1 text-muted-foreground">
                  Guided workflow building for trigger, entities, enrichment, scoring, actions, fallback, and approvals.
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-background/40 p-5">
                <div className="font-semibold">Validation Evidence</div>
                <div className="mt-1 text-muted-foreground">
                  PostgreSQL-backed readiness, UAT outcomes, rollback evidence, and runtime confidence.
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-background/40 p-5">
                <div className="font-semibold">Enterprise Trust Layer</div>
                <div className="mt-1 text-muted-foreground">
                  Session authentication, RBAC, audit integrity, protected APIs, and tenant-scoped data boundaries.
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Protected access · RBAC · Audit trail</span>
            <span>Phase 11 Enterprise Trust</span>
          </div>
        </section>

        <section className="relative flex items-center justify-center p-6">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-[450px] rounded-3xl border border-border/80 bg-card/75 p-8 shadow-2xl backdrop-blur"
          >
            <div className="mb-8">
              <SOARForgeLogo />
            </div>

            <p className="text-sm font-semibold text-cyan-300">Tenant Admin Portal</p>
            <h2 className="mt-2 text-4xl font-black tracking-[-0.05em]">Welcome back</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Sign in to open your protected SOARForge workspace.
            </p>

            <div className="mt-7 grid gap-3">
              <button
                type="button"
                onClick={() => ssoComingSoon('Google')}
                className="w-full rounded-lg border border-border bg-background/60 px-4 py-3 text-sm font-semibold transition hover:bg-muted"
              >
                Continue with Google
              </button>

              <button
                type="button"
                onClick={() => ssoComingSoon('GitHub')}
                className="w-full rounded-lg border border-border bg-background/60 px-4 py-3 text-sm font-semibold transition hover:bg-muted"
              >
                Continue with GitHub
              </button>
            </div>

            <div className="my-7 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or use local admin credentials</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-semibold">Email</span>
                <input
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none transition focus:border-cyan-400"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold">Password</span>
                <input
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none transition focus:border-cyan-400"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>

              {error ? (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                  {error}
                </div>
              ) : null}

              {notice ? (
                <div className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 p-3 text-sm leading-6 text-cyan-200">
                  {notice}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-cyan-600 px-4 py-3 font-bold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>

            <div className="mt-6 rounded-xl border border-border/70 bg-background/50 p-4 text-sm">
              <div className="font-semibold">Need access?</div>
              <p className="mt-1 text-muted-foreground">
                Public sign-up is disabled to protect tenant workspaces.
              </p>
              <a
  href="/request-access"
  className="mt-3 inline-block text-sm font-bold text-cyan-300 hover:underline"
>
  Request access
</a>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}