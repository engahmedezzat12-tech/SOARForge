'use client';

import { CheckCircle, Lock } from 'lucide-react';
import type { AutoHardeningPatch } from '@/lib/intelligence/intelligence-types';

export function ApplyEnhancementPreview({ patches }: { patches: AutoHardeningPatch[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div>
        <h3 className="font-semibold">Safe Auto-Hardening Patch Plan</h3>
        <p className="text-sm text-muted-foreground mt-1">
          SOARForge prepares a dry-run patch plan for documentation, metadata, checklist, testing, and readiness updates. Production behavior changes still require explicit approval.
        </p>
      </div>
      {patches.length === 0 ? (
        <p className="text-sm text-muted-foreground">No safe auto-hardening patch plan is currently available.</p>
      ) : (
        <div className="space-y-2">
          {patches.slice(0, 6).map((patch) => (
            <div key={patch.patchId} className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3">
              {patch.safeToApply ? <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" /> : <Lock className="w-4 h-4 text-yellow-400 mt-0.5" />}
              <div className="min-w-0">
                <p className="text-sm font-medium">{patch.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{patch.preview}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Patch target: {patch.affectedOutput.replace(/_/g, ' ')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
