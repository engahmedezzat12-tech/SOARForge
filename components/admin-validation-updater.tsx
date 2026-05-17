'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type ValidationStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'NOT_APPLICABLE';

type Props = {
  id: string;
  currentStatus: ValidationStatus;
  currentEvidence?: string;
  currentValidatedBy?: string;
};

export function AdminValidationUpdater({
  id,
  currentStatus,
  currentEvidence = '',
  currentValidatedBy = '',
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<ValidationStatus>(currentStatus);
  const [evidence, setEvidence] = useState(currentEvidence);
  const [validatedBy, setValidatedBy] = useState(currentValidatedBy || 'Ahmed Ezzat');
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  async function saveValidation() {
    setMessage('');

    try {
      const response = await fetch('/api/validation-results/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          status,
          evidence,
          validatedBy,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result?.error || 'Failed to update validation result');
        return;
      }

      setMessage('Saved');

setTimeout(() => {
  window.location.href = `${window.location.pathname}?refresh=${Date.now()}`;
}, 500);

    } catch (error) {
      console.error('Validation save failed:', error);
      setMessage('Failed to save update');
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2 md:grid-cols-3">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as ValidationStatus)}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
        >
          <option value="PENDING">PENDING</option>
          <option value="PASSED">PASSED</option>
          <option value="FAILED">FAILED</option>
          <option value="NOT_APPLICABLE">NOT APPLICABLE</option>
        </select>

        <input
          value={validatedBy}
          onChange={(event) => setValidatedBy(event.target.value)}
          placeholder="Validated by"
          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
        />

        <button
          type="button"
          onClick={saveValidation}
          disabled={isPending}
          className="rounded-md bg-cyan-600 px-3 py-1 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save'}
        </button>
      </div>

      <textarea
        value={evidence}
        onChange={(event) => setEvidence(event.target.value)}
        placeholder="Evidence / validation note"
        className="min-h-[64px] w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
      />

      {message ? <div className="text-xs text-muted-foreground">{message}</div> : null}
    </div>
  );
}