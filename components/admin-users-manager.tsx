'use client';

import { useState } from 'react';

const ROLES = ['SUPER_ADMIN', 'TENANT_ADMIN', 'SOC_MANAGER', 'SOC_ENGINEER', 'AUDITOR', 'VIEWER'] as const;

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  lastLoginAt: string | null;
  failedLoginCount: number;
  lockedUntil: string | null;
  mustChangePassword?: boolean;
};

export function AdminUsersManager({ users }: { users: UserRow[] }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createName, setCreateName] = useState('');
  const [createRole, setCreateRole] = useState('VIEWER');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  async function postJson(url: string, body: unknown) {
    setMessage('');
    setError('');

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error || 'Action failed');
      return false;
    }

    setMessage('Action completed successfully.');
    setTimeout(() => window.location.reload(), 600);
    return true;
  }

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const ok = await postJson('/api/admin/users/create', {
      email: createEmail,
      name: createName,
      role: createRole,
      temporaryPassword,
    });

    if (ok) {
      setCreateEmail('');
      setCreateName('');
      setTemporaryPassword('');
      setCreateRole('VIEWER');
    }
  }
  async function createInvite() {
    setMessage('');
    setError('');
    setInviteLink('');
  
    const response = await fetch('/api/admin/users/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: createEmail,
        name: createName,
        role: createRole,
      }),
    });
  
    const data = await response.json().catch(() => ({}));
  
    if (!response.ok) {
      setError(data.error || 'Invite failed');
      return;
    }
  
    setInviteLink(data.inviteLink);
    setMessage('Invite link created successfully.');
  }

  async function resetPassword(userId: string) {
    const password = window.prompt('Enter a new temporary password, minimum 10 characters:');
    if (!password) return;

    await postJson('/api/admin/users/reset-password', {
      userId,
      temporaryPassword: password,
    });
  }

  async function updateRole(userId: string, role: string) {
    await postJson('/api/admin/users/update-role', { userId, role });
  }

  async function updateStatus(userId: string, status: string) {
    await postJson('/api/admin/users/update-status', { userId, status });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createUser} className="rounded-xl border border-border bg-card/60 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Add User</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a tenant-scoped user with a temporary password. The user must change it after first login.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="email@company.com"
            value={createEmail}
            onChange={(event) => setCreateEmail(event.target.value)}
            type="email"
            required
          />

          <input
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="Full name"
            value={createName}
            onChange={(event) => setCreateName(event.target.value)}
            required
          />

          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={createRole}
            onChange={(event) => setCreateRole(event.target.value)}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          <input
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="Set password"
            value={temporaryPassword}
            onChange={(event) => setTemporaryPassword(event.target.value)}
            type="password"
            required={false}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
  <button
    type="submit"
    className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
  >
    Create User
  </button>

  <button
    type="button"
    onClick={createInvite}
    className="rounded-md border border-cyan-500/40 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/10"
  >
    Create Invite Link
  </button>
</div>
      </form>

      {error ? (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          {message}
        </div>
      ) : null}
      {inviteLink ? (
  <div className="rounded-md border border-cyan-500/40 bg-cyan-500/10 p-3 text-sm text-cyan-200">
    <div className="font-semibold">Invite Link</div>
    <div className="mt-2 break-all font-mono text-xs">{inviteLink}</div>
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(inviteLink)}
      className="mt-3 rounded-md border border-cyan-500/40 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/10"
    >
      Copy Link
    </button>
  </div>
) : null}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Must Change Password</th>
              <th className="p-3">Last Login</th>
              <th className="p-3">Failed</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-border/70 align-top">
                <td className="p-3">
                  <div className="font-medium">{user.name ?? user.email}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </td>

                <td className="p-3">
                  <select
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                    value={user.role}
                    onChange={(event) => updateRole(user.id, event.target.value)}
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>

                <td className="p-3">
                  <select
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                    value={user.status}
                    onChange={(event) => updateStatus(user.id, event.target.value)}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DISABLED">DISABLED</option>
                  </select>
                </td>

                <td className="p-3 text-muted-foreground">
                  {user.mustChangePassword ? 'YES' : 'NO'}
                </td>

                <td className="p-3 text-muted-foreground">
                  {user.lastLoginAt ?? '—'}
                </td>

                <td className="p-3 text-muted-foreground">
                  {user.failedLoginCount}
                </td>

                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => resetPassword(user.id)}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
                  >
                    Reset Password
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}