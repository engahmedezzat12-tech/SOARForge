'use client';

import { AlertTriangle, CheckCircle, Info, ShieldCheck, Wrench } from 'lucide-react';
import type { IntelligenceRecommendation } from '@/lib/intelligence/intelligence-types';

function severityClass(severity: IntelligenceRecommendation['severity']): string {
  switch (severity) {
    case 'critical': return 'bg-red-900/30 text-red-300 border-red-800/40';
    case 'high': return 'bg-orange-900/30 text-orange-300 border-orange-800/40';
    case 'medium': return 'bg-yellow-900/20 text-yellow-300 border-yellow-800/40';
    case 'low': return 'bg-blue-900/20 text-blue-300 border-blue-800/40';
    default: return 'bg-slate-800/60 text-slate-300 border-slate-700/40';
  }
}

function iconFor(severity: IntelligenceRecommendation['severity']) {
  if (severity === 'critical' || severity === 'high') return AlertTriangle;
  if (severity === 'medium') return Info;
  return CheckCircle;
}

function suggestedImplementationSteps(recommendation: IntelligenceRecommendation): string[] {
  const t = recommendation.title.toLowerCase();
  const category = recommendation.category;

  if (t.includes('critical asset') || t.includes('domain controller')) {
    return [
      'Add a pre-containment decision step for asset criticality, domain controller status, backup role, and core application tags.',
      'Route critical assets to analyst approval instead of automatic containment.',
      'Record the decision reason in the case timeline and deployment checklist.',
    ];
  }

  if (t.includes('tenant validation') || category === 'tenant_validation' || category === 'connector_readiness' || category === 'platform_readiness') {
    return [
      'Replace connector placeholders with tenant connector UUIDs and validate operation names.',
      'Run each enrichment and response action in a non-production tenant.',
      'Attach validation evidence to the deployment checklist before production activation.',
    ];
  }

  if (t.includes('recovery validation')) {
    return [
      'Add a recovery validation checkpoint before final closure.',
      'Document backup availability, affected-host review, and recovery-owner sign-off.',
      'Keep the case open until recovery evidence is attached or referenced.',
    ];
  }

  if (t.includes('shared') || t.includes('cdn') || t.includes('network blocking')) {
    return [
      'Add ASN/CDN/cloud-provider lookup before permanent network blocking.',
      'Require approval when the target belongs to shared infrastructure or customer-owned cloud ranges.',
      'Prefer temporary containment or monitoring when business ownership cannot be confirmed.',
    ];
  }

  if (category === 'mitre_coverage' || category === 'detection_coverage') {
    return [
      'Add detection references and log-source prerequisites to the customer implementation guide.',
      'Map each detection reference to the expected evidence fields and technique coverage.',
      'Add false-positive tuning notes and safe validation scenarios.',
    ];
  }

  return [
    'Add the recommendation to the implementation guide and readiness checklist.',
    'Keep production execution unchanged until the customer approves runtime behavior changes.',
    'Capture acceptance criteria in the deployment package.',
  ];
}

export function RecommendationCard({ recommendation }: { recommendation: IntelligenceRecommendation }) {
  const Icon = iconFor(recommendation.severity);
  const steps = suggestedImplementationSteps(recommendation);

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Icon className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h4 className="font-semibold text-sm text-foreground">{recommendation.title}</h4>
            <p className="text-xs text-muted-foreground mt-1">{recommendation.customerFacingText}</p>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap justify-end shrink-0">
          <span className={`px-2 py-0.5 rounded border text-[11px] ${severityClass(recommendation.severity)}`}>
            {recommendation.severity.replace(/_/g, ' ')}
          </span>
          <span className="px-2 py-0.5 rounded border text-[11px] bg-emerald-900/20 text-emerald-300 border-emerald-800/40">
            {recommendation.confidence.replace(/_/g, ' ')} confidence
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg border border-border bg-background/50 p-3">
          <p className="font-medium text-foreground mb-1">What was observed</p>
          <p className="text-muted-foreground">{recommendation.observed}</p>
        </div>
        <div className="rounded-lg border border-border bg-background/50 p-3">
          <p className="font-medium text-foreground mb-1">Why this matters</p>
          <p className="text-muted-foreground">{recommendation.whyItMatters}</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background/50 p-3 text-xs">
        <p className="font-medium text-foreground mb-1">Suggested improvement</p>
        <p className="text-muted-foreground">{recommendation.suggestedChange}</p>
      </div>

      <div className="rounded-lg border border-accent/20 bg-accent/5 p-3 text-xs">
        <p className="font-medium text-foreground mb-2 flex items-center gap-2"><Wrench className="w-3.5 h-3.5 text-accent" /> Suggested implementation</p>
        <ul className="space-y-1 text-muted-foreground list-disc pl-4">
          {steps.map((step, idx) => <li key={idx}>{step}</li>)}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 rounded border border-blue-800/40 bg-blue-900/20 text-blue-300 px-2 py-0.5">
          <ShieldCheck className="w-3 h-3" />
          {recommendation.autoApplyStatus.replace(/_/g, ' ')}
        </span>
        {recommendation.tenantValidationRequired && (
          <span className="rounded border border-yellow-800/40 bg-yellow-900/20 text-yellow-300 px-2 py-0.5">Tenant validation required</span>
        )}
        {recommendation.adminApprovalRequired && (
          <span className="rounded border border-red-800/40 bg-red-900/20 text-red-300 px-2 py-0.5">Admin approval required</span>
        )}
      </div>
    </div>
  );
}
