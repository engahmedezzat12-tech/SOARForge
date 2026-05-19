'use client';

import { useState } from 'react';

type InviteRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  acceptedAt: string | null;
  expiresAt: string;
  createdAt: string;
};

function inviteStatus(invite: InviteRow) {
  if (invite.acceptedAt) return 'USED / REVOKED';
  if (new Date(invite.expiresAt) <= new Date()) return 'EXPIRED';
  return 'PENDING';
}

export function AdminInvitesManager({ invites }: { invites: InviteRow[] }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function revokeInvite(inviteId: string) {
    setMessage('');
    setError('');

    const response = await fetch('/api/admin/invites/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteId }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error || 'Revoke failed');
      return;
    }

    setMessage('Invite revoked successfully.');
    setTimeout(() => window.location.reload(), 700);
  }

  return (
    <div className="space-y-4">
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

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="p-3">Invitee</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Expires</th>
              <th className="p-3">Created</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {invites.map((invite) => {
              const status = inviteStatus(invite);
              const canRevoke = status === 'PENDING';

              return (
                <tr key={invite.id} className="border-t border-border/70 align-top">
                  <td className="p-3">
                    <div className="font-medium">{invite.name || invite.email}</div>
                    <div className="text-xs text-muted-foreground">{invite.email}</div>
                  </td>

                  <td className="p-3 text-muted-foreground">{invite.role}</td>
                  <td className="p-3 font-semibold">{status}</td>
                  <td className="p-3 text-muted-foreground">{invite.expiresAt}</td>
                  <td className="p-3 text-muted-foreground">{invite.createdAt}</td>

                  <td className="p-3">
                    {canRevoke ? (
                      <button
                        type="button"
                        onClick={() => revokeInvite(invite.id)}
                        className="rounded-md border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10"
                      >
                        Revoke
                      </button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {invites.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  No invites found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}