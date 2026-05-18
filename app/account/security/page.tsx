'use client';

import { useState } from 'react';

export default function AccountSecurityPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || 'Password change failed');
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Password changed successfully. Other sessions were revoked.');
    } catch {
      setError('Password change failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-8">
      <div className="mx-auto max-w-xl">
        <a href="/app" className="text-sm text-cyan-300 hover:underline">
          ← Back to App
        </a>

        <div className="mt-6 rounded-2xl border border-border bg-card/70 p-6 shadow-xl">
          <p className="text-sm font-semibold text-cyan-300">Account Security</p>
          <h1 className="mt-2 text-3xl font-bold">Change password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Update your local SOARForge password. Other active sessions will be revoked.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold">Current password</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:border-cyan-400"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold">New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:border-cyan-400"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold">Confirm new password</span>
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
              {loading ? 'Updating...' : 'Change password'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}