'use client';

import { useState } from 'react';

const ROLES = ['SUPER_ADMIN', 'TENANT_ADMIN', 'SOC_MANAGER', 'SOC_ENGINEER', 'AUDITOR', 'VIEWER'] as const;

type AccountRequestRow = {
  id: string;
  email: string;
  name: string;
  reason: string | null;
  status: string;
  approvedRole: string | null;
  inviteLink: string | null;
  expiresAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export function AccountRequestsManager({ requests }: { requests: AccountRequestRow[] }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [roleById, setRoleById] = useState<Record<string, string>>({});
  const [expiryById, setExpiryById] = useState<Record<string, string>>({});

  async function approve(requestId: string) {
    setMessage('');
    setError('');

    const role = roleById[requestId] || 'VIEWER';
    const expiresAtInput = expiryById[requestId];

    if (!expiresAtInput) {
      setError('Please choose an expiry date.');
      return;
    }

    const expiresAt = new Date(expiresAtInput).toISOString();

    const response = await fetch('/api/admin/account-requests/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, role, expiresAt }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error || 'Approval failed');
      return;
    }

    setMessage(`Approved. Invite link: ${data.inviteLink}`);
    setTimeout(() => window.location.reload(), 1200);
  }

  async function reject(requestId: string) {
    setMessage('');
    setError('');

    const response = await fetch('/api/admin/account-requests/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error || 'Rejection failed');
      return;
    }

    setMessage('Request rejected.');
    setTimeout(() => window.location.reload(), 700);
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-md border border-cyan-500/40 bg-cyan-500/10 p-3 text-sm text-cyan-200">
          <div className="break-all">{message}</div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="p-3">Requester</th>
              <th className="p-3">Reason</th>
              <th className="p-3">Status</th>
              <th className="p-3">Role</th>
              <th className="p-3">Expiry</th>
              <th className="p-3">Invite</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {requests.map((request) => (
              <tr key={request.id} className="border-t border-border/70 align-top">
                <td className="p-3">
                  <div className="font-medium">{request.name}</div>
                  <div className="text-xs text-muted-foreground">{request.email}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{request.createdAt}</div>
                </td>

                <td className="max-w-xs p-3 text-muted-foreground">
                  {request.reason || '—'}
                </td>

                <td className="p-3 font-semibold">
                  {request.status}
                </td>

                <td className="p-3">
                  {request.status === 'PENDING' ? (
                    <select
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                      value={roleById[request.id] || 'VIEWER'}
                      onChange={(event) =>
                        setRoleById((prev) => ({ ...prev, [request.id]: event.target.value }))
                      }
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-muted-foreground">{request.approvedRole ?? '—'}</span>
                  )}
                </td>

                <td className="p-3">
                  {request.status === 'PENDING' ? (
                    <input
                      type="datetime-local"
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                      value={expiryById[request.id] || ''}
                      onChange={(event) =>
                        setExpiryById((prev) => ({ ...prev, [request.id]: event.target.value }))
                      }
                    />
                  ) : (
                    <span className="text-muted-foreground">{request.expiresAt ?? '—'}</span>
                  )}
                </td>

                <td className="max-w-xs p-3">
                  {request.inviteLink ? (
                    <div>
                      <div className="break-all font-mono text-xs text-cyan-300">{request.inviteLink}</div>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(request.inviteLink || '')}
                        className="mt-2 rounded-md border border-cyan-500/40 px-2 py-1 text-xs text-cyan-300 hover:bg-cyan-500/10"
                      >
                        Copy
                      </button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>

                <td className="p-3">
                  {request.status === 'PENDING' ? (
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => approve(request.id)}
                        className="rounded-md bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500"
                      >
                        Approve
                      </button>

                      <button
                        type="button"
                        onClick={() => reject(request.id)}
                        className="rounded-md border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Reviewed</span>
                  )}
                </td>
              </tr>
            ))}

            {requests.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  No account requests yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}