// ============================================================
// SOARForge — Safety Validator
// Deterministic guardrails for destructive response actions.
// ============================================================

import type { PlaybookIntelligenceContext, IntelligenceRecommendation } from './intelligence-types';

let counter = 0;
function id(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export function validateSafetyGuardrails(context: PlaybookIntelligenceContext): IntelligenceRecommendation[] {
  const recs: IntelligenceRecommendation[] = [];
  const hasApproval = context.approvals.length > 0;
  const rollbackText = context.rollbackActions.join(' ').toLowerCase();

  for (const action of context.destructiveActions) {
    if (!hasApproval && action.approvalRecommended) {
      recs.push({
        id: id('safety'),
        ruleId: 'destructive_action_requires_approval',
        title: 'Add approval before high-impact response action',
        category: 'approval_gate',
        incidentTypes: ['any'],
        platforms: ['any'],
        severity: 'critical',
        confidence: 'very_high',
        conditionSummary: 'A destructive response action exists without a visible approval gate.',
        observed: `${action.label} is configured, but no approval step was identified.`,
        customerFacingText: `Add an analyst approval checkpoint before ${action.label}.`,
        whyItMatters: 'High-impact actions can disrupt business services if executed against a critical asset or false positive alert.',
        suggestedChange: 'Insert an approval gate with SOC lead override before executing this action in production.',
        expectedBenefit: 'Reduces operational risk while preserving response speed for confirmed incidents.',
        safetyImpact: 'Prevents accidental disruption from automated response.',
        affectedSections: ['Approval Flow', 'Response Actions', 'Safety Guardrails'],
        safeToAutoApply: true,
        autoApplyStatus: 'preview_only',
        acceptanceCriteria: ['Approval step exists before high-impact action', 'Reject branch leads to no containment action'],
        evidence: [{ source: 'playbook', label: 'Action Risk', detail: action.label }],
        tenantValidationRequired: true,
        adminApprovalRequired: true,
        priority: 100,
      });
    }

    if (action.destructive && !action.rollbackSupported && !rollbackText.includes('rollback')) {
      recs.push({
        id: id('safety'),
        ruleId: 'destructive_action_requires_rollback',
        title: 'Define rollback for high-impact response action',
        category: 'rollback',
        incidentTypes: ['any'],
        platforms: ['any'],
        severity: 'high',
        confidence: 'high',
        conditionSummary: 'A destructive response action lacks a visible rollback path.',
        observed: `${action.label} does not have an explicit rollback path in the playbook context.`,
        customerFacingText: `Add rollback guidance for ${action.label}.`,
        whyItMatters: 'Rollback procedures are required to recover quickly if containment affects a legitimate system or business user.',
        suggestedChange: 'Add reversal steps, owner, expected validation, and success criteria for this response action.',
        expectedBenefit: 'Improves recovery confidence and auditability.',
        safetyImpact: 'Reduces time to restore after an incorrect or emergency containment action.',
        affectedSections: ['Rollback Plan', 'Response Actions'],
        safeToAutoApply: true,
        autoApplyStatus: 'safe_auto_apply',
        acceptanceCriteria: ['Rollback section exists', 'Responsible team and validation criteria are documented'],
        evidence: [{ source: 'playbook', label: 'Rollback Coverage', detail: action.label }],
        tenantValidationRequired: false,
        adminApprovalRequired: false,
        priority: 85,
      });
    }
  }

  const actionText = context.actions.map((a) => a.label.toLowerCase()).join(' ');
  if (actionText.includes('block') && !context.optionalEnhancements.join(' ').toLowerCase().includes('cdn')) {
    recs.push({
      id: id('safety'),
      ruleId: 'network_block_requires_shared_ip_guardrail',
      title: 'Add shared infrastructure guardrail before network blocking',
      category: 'safety_guardrail',
      incidentTypes: ['waf_attack', 'malicious_ip', 'c2'],
      platforms: ['any'],
      severity: 'high',
      confidence: 'high',
      conditionSummary: 'Network block action exists and should be protected by CDN/cloud/shared-IP checks.',
      observed: 'A network blocking action is present in the design.',
      customerFacingText: 'Validate CDN, cloud-provider, and shared infrastructure ownership before permanent blocking.',
      whyItMatters: 'Shared IP addresses can host legitimate services; blocking them without context can impact business traffic.',
      suggestedChange: 'Add ASN/CDN lookup, business ownership check, and approval for permanent blocks.',
      expectedBenefit: 'Reduces false-positive network disruption.',
      safetyImpact: 'Prevents broad service impact from shared infrastructure blocks.',
      affectedSections: ['Safety Guardrails', 'Response Actions'],
      safeToAutoApply: true,
      autoApplyStatus: 'safe_auto_apply',
      acceptanceCriteria: ['CDN/cloud check is documented', 'Permanent block requires validation'],
      evidence: [{ source: 'playbook', label: 'Network Action', detail: actionText }],
      tenantValidationRequired: true,
      adminApprovalRequired: false,
      priority: 82,
    });
  }

  return recs;
}
