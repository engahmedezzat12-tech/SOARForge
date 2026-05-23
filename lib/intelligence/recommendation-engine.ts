// ============================================================
// SOARForge — Hybrid Intelligence Recommendation Engine
// Knowledge + deterministic reasoning + feedback-safe learning + optional AI boundary.
// ============================================================

import type { PlaybookState } from '@/lib/soar-types';
import type { NormalizedPlaybook } from '@/lib/normalized/normalized-types';
import type { SoarPlatformId } from '@/lib/soar-platforms';
import type { ThreatCoverageResult } from '@/lib/threat-knowledge/threat-knowledge-types';
import type { ExportReadinessResult } from '@/lib/evidence/evidence-types';
import type { IntelligenceReviewResult } from './intelligence-types';
import { buildPlaybookIntelligenceContext } from './playbook-context-builder';
import { runDeterministicReasoning } from './deterministic-reasoner';
import { buildAutoHardeningPlan } from './auto-hardening-planner';
import { calculateIntelligenceScore } from './intelligence-score-engine';
import { DEFAULT_LLM_ASSISTANT_BOUNDARY } from './llm-assistant-boundary';
import { getDefaultTenantLearningProfile } from './tenant-learning-profile';
import { getTenantLearningNotes } from './feedback-learning-engine';
import { applyIntelligencePlus } from './intelligence-plus';
import { getVisibleActionIds, getVisibleConnectorKeys } from '@/lib/capability-contract';

function statusFromScore(score: number): IntelligenceReviewResult['status'] {
  if (score >= 92) return 'excellent';
  if (score >= 82) return 'strong';
  if (score >= 68) return 'ready_with_review';
  return 'needs_attention';
}

function incidentNarrative(c: IntelligenceReviewResult['context']): string {
  const t = `${c.incidentType} ${c.playbookName}`.toLowerCase();

  if (t.includes('ransom')) {
    return 'SOARForge recognized a ransomware containment design focused on encryption behavior, recovery-control alteration, scripting context, endpoint containment, and recovery assurance.';
  }

  if (t.includes('phish') || t.includes('email')) {
    return 'SOARForge recognized a phishing response design built around sender validation, URL and attachment enrichment, unique message identity, campaign-scope mailbox remediation, and user-impact control.';
  }

  if (t.includes('login') || t.includes('identity') || t.includes('password') || t.includes('mfa')) {
    return 'SOARForge recognized an identity response design that should correlate user risk, login location, ASN change, MFA behavior, session state, and privileged-user safety boundaries.';
  }

  if (t.includes('waf') || t.includes('web') || t.includes('sql') || t.includes('xss')) {
    return 'SOARForge recognized a web application response design that should validate request context, client IP reputation, URI and payload evidence, WAF rule mapping, and shared-infrastructure impact before blocking.';
  }

  return `SOARForge identified this playbook as ${c.incidentType} targeting ${c.targetPlatform} and evaluated its trigger, entities, enrichment, scoring, actions, safety controls, and export readiness together.`;
}

function buildWhatWasUnderstood(result: IntelligenceReviewResult): string[] {
  const c = result.context;
  const items = [
    incidentNarrative(c),
    `The playbook currently maps ${c.mitreTechniques.length || 'no'} technique${c.mitreTechniques.length === 1 ? '' : 's'} and ${c.detectionReferences.length} detection reference${c.detectionReferences.length === 1 ? '' : 's'} into the response package.`,
    `SOARForge correlated ${c.connectors.length} connector requirement${c.connectors.length === 1 ? '' : 's'}, ${c.enrichmentSteps.length} enrichment step${c.enrichmentSteps.length === 1 ? '' : 's'}, ${c.actions.length} response action${c.actions.length === 1 ? '' : 's'}, ${c.approvals.length} approval control${c.approvals.length === 1 ? '' : 's'}, and ${c.rollbackActions.length} rollback reference${c.rollbackActions.length === 1 ? '' : 's'}.`,
  ];
  if (c.destructiveActions.length > 0) items.push(`SOARForge classified ${c.destructiveActions.length} high-impact response action${c.destructiveActions.length === 1 ? '' : 's'} that must remain governed by safety guardrails and tenant validation.`);
  if (c.exportReadiness.requiresTenantVerification) items.push('The export is format-aware, but runtime confidence depends on customer-specific connector UUIDs, permissions, action names, and non-production validation.');
  return items;
}

function buildStrengths(result: IntelligenceReviewResult): string[] {
  const c = result.context;
  const strengths: string[] = [];
  if (c.threatCoverage.score >= 85) strengths.push('Strong threat-informed coverage for the selected incident type.');
  if (c.approvals.length > 0) strengths.push('Approval flow is represented for analyst-controlled response.');
  if (c.rollbackActions.length > 0) strengths.push('Rollback or reversal guidance is present.');
  if (c.detectionReferences.length > 0) strengths.push('Detection references are mapped to the playbook package.');
  if (c.safeTestScenarios.length > 0 || c.threatCoverage.testCoverage.length > 0) strengths.push('Safe validation scenarios are available for UAT planning.');
  if (strengths.length === 0) strengths.push('The normalized playbook structure is available for improvement and platform export review.');
  return strengths;
}

function buildSafetyGuardrails(result: IntelligenceReviewResult): string[] {
  const guardrails = [
    'No production playbook is modified automatically by the intelligence layer.',
    'High-impact response changes require human review before production use.',
    'Tenant-specific connector values and permissions must be validated in the customer environment.',
  ];
  if (result.context.destructiveActions.some((a) => /isolate/i.test(a.label))) guardrails.push('Endpoint isolation should exclude critical assets and domain controllers unless explicitly approved.');
  if (result.context.destructiveActions.some((a) => /disable|account/i.test(a.label))) guardrails.push('User disable actions should include privileged-user and service-account checks.');
  if (result.context.destructiveActions.some((a) => /block/i.test(a.label))) guardrails.push('Network blocking should validate CDN, cloud, and shared infrastructure context.');
  return guardrails;
}

export function analyzePlaybookIntelligence(args: {
  playbook: PlaybookState;
  normalized: NormalizedPlaybook;
  targetPlatform: SoarPlatformId;
  threatCoverage: ThreatCoverageResult;
  exportReadiness: ExportReadinessResult;
}): IntelligenceReviewResult {
  const contractPlaybook = {
    ...args.playbook,
    enrichmentConnectors: (args.playbook.enrichmentConnectors || []).filter((c) => new Set(getVisibleConnectorKeys(args.playbook)).has(c)),
    actions: (args.playbook.actions || []).filter((a) => new Set(getVisibleActionIds(args.playbook)).has(a)),
  };
  const context = buildPlaybookIntelligenceContext({ ...args, playbook: contractPlaybook });
  const recommendations = runDeterministicReasoning(context);
  const autoHardeningPlan = buildAutoHardeningPlan(recommendations);
  const score = calculateIntelligenceScore(context, recommendations);

  const result: IntelligenceReviewResult = {
    context,
    summary: '',
    status: statusFromScore(score.overall),
    whatWasUnderstood: [],
    designStrengths: [],
    recommendations,
    safetyGuardrails: [],
    autoHardeningPlan,
    score,
    tenantLearningNotes: getTenantLearningNotes(getDefaultTenantLearningProfile()),
    llmBoundary: DEFAULT_LLM_ASSISTANT_BOUNDARY,
  };

  result.whatWasUnderstood = buildWhatWasUnderstood(result);
  result.designStrengths = buildStrengths(result);
  result.safetyGuardrails = buildSafetyGuardrails(result);
  result.summary = buildExecutiveSummary(result);
  return applyIntelligencePlus(result);
}

function buildExecutiveSummary(result: IntelligenceReviewResult): string {
  const c = result.context;
  const status = result.status.replace(/_/g, ' ');
  const validationClause = c.exportReadiness.requiresTenantVerification
    ? ' Tenant connector validation is still required before production activation.'
    : ' Runtime validation evidence is currently available for this package.';

  if (result.score.overall >= 82) {
    return `SOARForge identified a strong threat-informed design for ${c.incidentType}. The playbook is suitable for controlled deployment review, with ${result.recommendations.length} targeted enhancement${result.recommendations.length === 1 ? '' : 's'} recommended to improve operational trust.${validationClause}`;
  }

  if (result.score.overall >= 68) {
    return `SOARForge completed an intelligence assessment for ${c.incidentType}. The playbook is currently classified as ${status} because production confidence depends on resolving the highlighted recommendations and tenant validation items.${validationClause}`;
  }

  return `SOARForge identified important readiness gaps for ${c.incidentType}. Treat this playbook as an improvement candidate until safety, validation, and tenant-readiness findings are addressed.${validationClause}`;
}
