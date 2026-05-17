// ============================================================
// SOARForge — Auto-Hardening Planner
// Produces safe dry-run patches only. No destructive automation changes.
// ============================================================

import type { AutoHardeningPatch, IntelligenceRecommendation } from './intelligence-types';

function affectedOutputFor(r: IntelligenceRecommendation): AutoHardeningPatch['affectedOutput'] {
  if (r.category === 'testing') return 'testing';
  if (r.category === 'scoring') return 'scoring_explanation';
  if (r.category === 'platform_readiness' || r.category === 'tenant_validation' || r.category === 'connector_readiness') return 'readiness_notes';
  if (r.category === 'safety_guardrail') return 'metadata';
  return 'documentation';
}

function buildPatchPreview(r: IntelligenceRecommendation): string {
  const base = r.customerFacingText.replace(/\.$/, '');

  if (r.category === 'safety_guardrail') {
    return [
      `Patch Plan — Safety Metadata: add guardrail marker for "${r.title}".`,
      `Checklist Patch: add validation item for the affected response path.`,
      `Documentation Patch: explain that ${base.toLowerCase()}.`,
      r.tenantValidationRequired ? 'Readiness Patch: keep tenant validation required until the control is verified.' : 'Readiness Patch: mark as review recommended until verified.',
    ].join(' ');
  }

  if (r.category === 'tenant_validation' || r.category === 'connector_readiness' || r.category === 'platform_readiness') {
    return [
      'Patch Plan — Tenant Readiness: add a validation resolution plan to the deployment checklist.',
      'Connector Checklist Patch: highlight connector UUIDs, operation names, permissions, and non-production test execution.',
      `Documentation Patch: explain that ${base.toLowerCase()}.`,
    ].join(' ');
  }

  if (r.category === 'testing') {
    return [
      'Patch Plan — Validation Evidence: add a safe UAT checkpoint and expected-result criteria.',
      `Documentation Patch: include ${base.toLowerCase()}.`,
      'Audit Patch: record owner sign-off before closure.',
    ].join(' ');
  }

  if (r.category === 'mitre_coverage' || r.category === 'detection_coverage') {
    return [
      'Patch Plan — Threat Coverage: add detection references, technique rationale, and false-positive tuning notes.',
      `Documentation Patch: include ${base.toLowerCase()}.`,
      'Testing Patch: link the coverage item to safe validation scenarios.',
    ].join(' ');
  }

  return [
    'Patch Plan — Documentation/Metadata: add the recommendation to customer guidance and implementation notes.',
    `Documentation Patch: include ${base.toLowerCase()}.`,
    'Readiness Patch: keep customer-facing validation wording transparent.',
  ].join(' ');
}

export function buildAutoHardeningPlan(recommendations: IntelligenceRecommendation[]): AutoHardeningPatch[] {
  return recommendations
    .filter((r) => r.safeToAutoApply)
    .slice(0, 8)
    .map((r) => ({
      patchId: `patch-${r.id}`,
      title: r.title,
      category: r.category,
      safeToApply: r.autoApplyStatus === 'safe_auto_apply',
      requiresApproval: r.adminApprovalRequired || r.autoApplyStatus === 'requires_approval',
      description: r.suggestedChange,
      preview: buildPatchPreview(r),
      affectedOutput: affectedOutputFor(r),
    }));
}
