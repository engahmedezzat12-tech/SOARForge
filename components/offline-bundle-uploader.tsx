'use client';

import { useState } from 'react';

export function OfflineBundleUploader() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setLoading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch('/api/offline-bundles/stage', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(result.error || 'Upload failed');
        return;
      }
      setMessage('Bundle staged for manual review. No production changes were applied.');
      setTimeout(() => window.location.reload(), 800);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={upload} className="rounded-lg border border-border bg-card/60 p-4">
      <h2 className="font-semibold">Stage Offline Bundle</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Upload .json or .zip bundles for validation only. Bundles are never auto-applied.
      </p>
      <input name="bundle" type="file" accept=".json,.zip,application/json,application/zip" className="mt-4 block w-full text-sm" required />
      <textarea
        name="signature"
        placeholder="Optional detached RSA-SHA256 signature (base64). Required only when SOARFORGE_REQUIRE_BUNDLE_SIGNATURE=true."
        className="mt-3 min-h-[72px] w-full rounded-md border border-border bg-background px-3 py-2 text-xs"
      />
      <button
        disabled={loading}
        className="mt-4 rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
      >
        {loading ? 'Staging...' : 'Stage bundle'}
      </button>
      {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
    </form>
  );
}
