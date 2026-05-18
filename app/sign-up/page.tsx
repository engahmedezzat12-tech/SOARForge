'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SOARForgeLogo } from '@/components/soarforge-logo';

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || 'Invite sign-up failed');
        return;
      }

      setMessage('Account created successfully. Redirecting to sign in...');
      setTimeout(() => {
        window.location.href = '/sign-in';
      }, 1000);
    } catch {
      setError('Invite sign-up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-border bg-card/70 p-8 shadow-xl">
        <div className="mb-8">
          <SOARForgeLogo />
        </div>

        <p className="text-sm font-semibold text-cyan-300">Invite-only Sign-up</p>
        <h1 className="mt-2 text-3xl font-bold">Create your account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page only works with a valid invite token.
        </p>

        {!token ? (
          <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            Missing invite token.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:border-cyan-400"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold">Confirm password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:border-cyan-400"
                required
              />
            </label>

            {error ? (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </div>
            ) : null}

            {message ? (
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                {message}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-cyan-600 px-4 py-3 font-bold text-white hover:bg-cyan-500 disabled:opacity-60"
            >
              {loading ? 'Creating...' : 'Create account'}
            </button>
          </div>
        )}
      </form>
    </main>
  );
}