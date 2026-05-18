'use client';

import { useState } from 'react';

export default function SignInPage() {
  const [email, setEmail] = useState('admin@soarforge.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || 'Sign-in failed');
        return;
      }

      window.location.href = '/admin';
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-border bg-card/70 p-6 shadow-xl">
        <p className="text-sm text-muted-foreground">SOARForge Secure Access</p>
        <h1 className="mt-2 text-3xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use your SOARForge admin account to access protected tenant validation, audit, and security workflows.
        </p>

        <label className="mt-6 block text-sm font-medium">Email</label>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2"
          type="email"
          autoComplete="email"
          required
        />

        <label className="mt-4 block text-sm font-medium">Password</label>
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2"
          type="password"
          autoComplete="current-password"
          required
        />

        {error ? <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div> : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
