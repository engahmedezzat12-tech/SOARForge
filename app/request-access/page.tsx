'use client';

import { useState } from 'react';
import { SOARForgeLogo } from '@/components/soarforge-logo';

export default function RequestAccessPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/account-requests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, reason }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || 'Request failed');
        return;
      }

      setEmail('');
      setName('');
      setReason('');
      setMessage('Your access request was submitted. An administrator will review it.');
    } catch {
      setError('Request failed. Please try again.');
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

        <p className="text-sm font-semibold text-cyan-300">Request Access</p>
        <h1 className="mt-2 text-3xl font-bold">Request a SOARForge account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Submit your details. An administrator will approve or reject the request.
        </p>

        <div className="mt-6 space-y-4">
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:border-cyan-400"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:border-cyan-400"
            placeholder="Full name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          <textarea
            className="min-h-28 w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:border-cyan-400"
            placeholder="Reason / team / business justification"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />

          {error ? <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div> : null}
          {message ? <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</div> : null}

          <button
            disabled={loading}
            className="w-full rounded-lg bg-cyan-600 px-4 py-3 font-bold text-white hover:bg-cyan-500 disabled:opacity-60"
          >
            {loading ? 'Submitting...' : 'Submit request'}
          </button>
        </div>
      </form>
    </main>
  );
}