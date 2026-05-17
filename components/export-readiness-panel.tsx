'use client';

// ============================================================
// SOARForge — Export Readiness Panel
// Customer-facing only. Does NOT mention repositories/GitHub.
// ============================================================

import type { ExportReadinessResult } from '@/lib/evidence/evidence-types';
import { Card } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Info, ShieldCheck, XCircle } from 'lucide-react';

function statusLabel(status: ExportReadinessResult['status']): string {
  switch (status) {
    case 'production_ready':
      return 'Production Ready';
    case 'ready_with_review':
      return 'Ready with Review';
    case 'guided_build':
      return 'Guided Build';
    case 'blocked':
      return 'Blocked';
    case 'not_recommended':
      return 'Not Recommended';
    default:
      return 'Review Required';
  }
}

function statusClasses(status: ExportReadinessResult['status']): string {
  switch (status) {
    case 'production_ready':
      return 'border-emerald-700/40 bg-emerald-900/20 text-emerald-300';
    case 'ready_with_review':
      return 'border-blue-700/40 bg-blue-900/20 text-blue-300';
    case 'guided_build':
      return 'border-yellow-700/40 bg-yellow-900/20 text-yellow-300';
    case 'blocked':
    case 'not_recommended':
      return 'border-red-700/40 bg-red-900/20 text-red-300';
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
}

function statusIcon(status: ExportReadinessResult['status']) {
  if (status === 'production_ready') return CheckCircle;
  if (status === 'blocked' || status === 'not_recommended') return XCircle;
  if (status === 'guided_build') return AlertTriangle;
  return ShieldCheck;
}

export function ExportReadinessPanel({ result }: { result: ExportReadinessResult }) {
  const StatusIcon = statusIcon(result.status);

  return (
    <Card className="p-5 border border-border bg-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`p-2 rounded-lg border ${statusClasses(result.status)}`}>
            <StatusIcon className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-foreground">
              {result.platformName} Export Readiness
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {result.customerFacingValidationLabel} · {statusLabel(result.status)}
            </p>
          </div>
        </div>

        <div className={`rounded-full border px-3 py-1 text-sm font-semibold ${statusClasses(result.status)}`}>
          {result.score}%
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Validation</div>
          <div className="font-medium text-foreground mt-1">{result.customerFacingValidationLabel}</div>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Runtime Certified</div>
          <div className="font-medium text-foreground mt-1">
            {result.runtimeCertified ? 'Yes' : 'Requires tenant validation'}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Tenant Verification</div>
          <div className="font-medium text-foreground mt-1">
            {result.requiresTenantVerification ? 'Required' : 'Not required'}
          </div>
        </div>
      </div>

      {result.blockers.length > 0 && (
        <div className="mt-4 rounded-lg border border-red-800/40 bg-red-900/20 p-3">
          <div className="flex items-center gap-2 font-semibold text-red-300 mb-2">
            <XCircle className="w-4 h-4" />
            Blocking Issues
          </div>
          <ul className="list-disc pl-5 text-sm text-red-100/90 space-y-1">
            {result.blockers.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="mt-4 rounded-lg border border-yellow-800/40 bg-yellow-900/20 p-3">
          <div className="flex items-center gap-2 font-semibold text-yellow-300 mb-2">
            <AlertTriangle className="w-4 h-4" />
            Warnings
          </div>
          <ul className="list-disc pl-5 text-sm text-yellow-100/90 space-y-1">
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {result.manualRequirements.length > 0 && (
        <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-2 font-semibold text-foreground mb-2">
            <Info className="w-4 h-4 text-accent" />
            Manual Requirements
          </div>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            {result.manualRequirements.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {result.safeToGenerate.length > 0 && (
        <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
          <div className="font-semibold text-foreground mb-2">SOARForge Can Generate</div>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            {result.safeToGenerate.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
