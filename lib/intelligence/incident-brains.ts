// ============================================================
// SOARForge — Incident-Specific Intelligence Brains
// Focused domain logic for high-value SOC playbooks.
// ============================================================

import type { PlaybookIntelligenceContext, IntelligenceRecommendation } from './intelligence-types';

interface BrainRecommendationTemplate {
  ruleId: string;
  title: string;
  category: IntelligenceRecommendation['category'];
  severity: IntelligenceRecommendation['severity'];
  confidence: IntelligenceRecommendation['confidence'];
  condition: (context: PlaybookIntelligenceContext) => boolean;
  observed: (context: PlaybookIntelligenceContext) => string;
  customerFacingText: string;
  whyItMatters: string;
  suggestedChange: string;
  expectedBenefit: string;
  safetyImpact: string;
  affectedSections: string[];
  safeToAutoApply: boolean;
  autoApplyStatus: IntelligenceRecommendation['autoApplyStatus'];
  tenantValidationRequired: boolean;
  adminApprovalRequired: boolean;
  priority: number;
}

function text(context: PlaybookIntelligenceContext): string {
  return [
    context.playbookName,
    context.incidentType,
    context.entities.join(' '),
    context.actions.map((a) => a.label).join(' '),
    context.detectionReferences.join(' '),
    context.optionalEnhancements.join(' '),
  ].join(' ').toLowerCase();
}

function hasAny(context: PlaybookIntelligenceContext, terms: string[]): boolean {
  const t = text(context);
  return terms.some((term) => t.includes(term.toLowerCase()));
}

const COMMON_ACCEPTANCE = ['Recommendation is documented', 'Tenant validation impact is clear', 'No production behavior changes without approval'];

const BRAINS: Record<string, BrainRecommendationTemplate[]> = {
  ransomware: [
    {
      ruleId: 'ransomware_critical_asset_exclusion',
      title: 'Add critical asset exclusion before containment',
      category: 'safety_guardrail',
      severity: 'high',
      confidence: 'high',
      condition: (c) => hasAny(c, ['isolate', 'disable']) && !hasAny(c, ['domain controller', 'critical asset', 'backup server']),
      observed: () => 'Containment actions exist, but critical asset exclusions are not visible.',
      customerFacingText: 'Add a critical asset and domain controller exclusion check before automated containment.',
      whyItMatters: 'Ransomware containment is valuable, but isolating domain controllers, backup servers, or core infrastructure can disrupt recovery.',
      suggestedChange: 'Add asset criticality lookup and require approval for domain controllers, backup servers, and critical application servers.',
      expectedBenefit: 'Keeps response fast while protecting business-critical recovery infrastructure.',
      safetyImpact: 'Reduces risk of self-inflicted outage during containment.',
      affectedSections: ['Safety Gates', 'Response Actions', 'Deployment Checklist'],
      safeToAutoApply: true,
      autoApplyStatus: 'safe_auto_apply',
      tenantValidationRequired: true,
      adminApprovalRequired: false,
      priority: 94,
    },
    {
      ruleId: 'ransomware_recovery_validation',
      title: 'Add recovery validation before final closure',
      category: 'testing',
      severity: 'medium',
      confidence: 'high',
      condition: (c) => !hasAny(c, ['backup validation', 'recovery validation', 'restore']),
      observed: () => 'Recovery validation is not clearly represented in the playbook context.',
      customerFacingText: 'Add a recovery validation checkpoint before marking containment complete.',
      whyItMatters: 'Containment confirms spread control, but recovery validation confirms the business can restore operations safely.',
      suggestedChange: 'Document backup validation, affected host review, and recovery owner sign-off.',
      expectedBenefit: 'Improves audit readiness and post-incident confidence.',
      safetyImpact: 'Avoids premature closure after containment-only success.',
      affectedSections: ['Finalize', 'Testing', 'Customer Documentation'],
      safeToAutoApply: true,
      autoApplyStatus: 'safe_auto_apply',
      tenantValidationRequired: false,
      adminApprovalRequired: false,
      priority: 71,
    },
  ],
  phishing: [
    {
      ruleId: 'phishing_message_id_guardrail',
      title: 'Validate unique message ID before mailbox remediation',
      category: 'safety_guardrail',
      severity: 'high',
      confidence: 'very_high',
      condition: (c) => hasAny(c, ['quarantine', 'delete', 'purge']) && !hasAny(c, ['message_id', 'message id', 'unique message']),
      observed: () => 'Mailbox remediation exists, but unique message identity guardrail is not visible.',
      customerFacingText: 'Use unique message ID validation before quarantine or purge actions.',
      whyItMatters: 'Campaign remediation without unique message identity can affect unrelated messages with similar subjects or URLs.',
      suggestedChange: 'Require message_id or equivalent platform identifier before mailbox-wide remediation.',
      expectedBenefit: 'Reduces false-positive mailbox impact.',
      safetyImpact: 'Prevents excessive email deletion/quarantine scope.',
      affectedSections: ['Entity Extraction', 'Email Remediation', 'Safety Guardrails'],
      safeToAutoApply: true,
      autoApplyStatus: 'safe_auto_apply',
      tenantValidationRequired: true,
      adminApprovalRequired: false,
      priority: 96,
    },
    {
      ruleId: 'phishing_authentication_context',
      title: 'Add sender authentication context',
      category: 'enrichment',
      severity: 'medium',
      confidence: 'high',
      condition: (c) => !hasAny(c, ['spf', 'dkim', 'dmarc', 'sender authentication']),
      observed: () => 'SPF, DKIM, and DMARC context is not visible in the phishing design.',
      customerFacingText: 'Add sender authentication results to phishing enrichment and documentation.',
      whyItMatters: 'Authentication context helps distinguish spoofing, compromised sender, and legitimate bulk mail scenarios.',
      suggestedChange: 'Add SPF/DKIM/DMARC fields to entity extraction and scoring explanation.',
      expectedBenefit: 'Improves classification accuracy and reduces analyst review time.',
      safetyImpact: 'Avoids over-remediation of legitimate senders.',
      affectedSections: ['Enrichment', 'Scoring', 'Documentation'],
      safeToAutoApply: true,
      autoApplyStatus: 'safe_auto_apply',
      tenantValidationRequired: true,
      adminApprovalRequired: false,
      priority: 66,
    },
  ],
  suspicious_login: [
    {
      ruleId: 'identity_session_revocation_guardrail',
      title: 'Add privileged-user guardrail for session actions',
      category: 'safety_guardrail',
      severity: 'high',
      confidence: 'high',
      condition: (c) => hasAny(c, ['revoke', 'disable', 'reset']) && !hasAny(c, ['privileged', 'admin approval']),
      observed: () => 'Identity response action exists without visible privileged-user guardrail.',
      customerFacingText: 'Add privileged-user and service-account checks before identity containment.',
      whyItMatters: 'Identity containment can interrupt administrators, service accounts, or automated jobs.',
      suggestedChange: 'Require approval or emergency override for privileged accounts and service accounts.',
      expectedBenefit: 'Improves identity response safety.',
      safetyImpact: 'Prevents accidental lockout of critical operations.',
      affectedSections: ['Identity Response', 'Approval Flow'],
      safeToAutoApply: true,
      autoApplyStatus: 'safe_auto_apply',
      tenantValidationRequired: true,
      adminApprovalRequired: false,
      priority: 90,
    },
  ],
  waf: [
    {
      ruleId: 'waf_cdn_guardrail',
      title: 'Add CDN and shared-IP guardrail',
      category: 'safety_guardrail',
      severity: 'high',
      confidence: 'high',
      condition: (c) => hasAny(c, ['block', 'waf']) && !hasAny(c, ['cdn', 'asn', 'cloud provider']),
      observed: () => 'WAF or block action exists without visible CDN/shared-IP validation.',
      customerFacingText: 'Validate CDN/shared infrastructure before permanent WAF or firewall blocks.',
      whyItMatters: 'Web traffic often comes through shared infrastructure; blocking too broadly can affect legitimate customers.',
      suggestedChange: 'Add ASN/CDN lookup and approval before permanent blocking.',
      expectedBenefit: 'Reduces customer-impacting network changes.',
      safetyImpact: 'Prevents over-blocking shared web infrastructure.',
      affectedSections: ['WAF Response', 'Safety Guardrails'],
      safeToAutoApply: true,
      autoApplyStatus: 'safe_auto_apply',
      tenantValidationRequired: true,
      adminApprovalRequired: false,
      priority: 88,
    },
  ],
};

function inferBrainKey(context: PlaybookIntelligenceContext): string {
  const t = `${context.incidentType} ${context.playbookName}`.toLowerCase();
  if (t.includes('ransom')) return 'ransomware';
  if (t.includes('phish') || t.includes('email')) return 'phishing';
  if (t.includes('login') || t.includes('identity') || t.includes('password') || t.includes('mfa')) return 'suspicious_login';
  if (t.includes('waf') || t.includes('web') || t.includes('sql') || t.includes('xss')) return 'waf';
  return 'ransomware';
}

let counter = 0;
function id(): string {
  counter += 1;
  return `brain-${counter}`;
}

export function runIncidentBrain(context: PlaybookIntelligenceContext): IntelligenceRecommendation[] {
  const brainKey = inferBrainKey(context);
  const templates = BRAINS[brainKey] ?? [];
  return templates
    .filter((template) => template.condition(context))
    .map((template) => ({
      ...template,
      id: id(),
      incidentTypes: [brainKey],
      platforms: ['any'],
      conditionSummary: 'Incident-specific best-practice check matched current playbook context.',
      observed: template.observed(context),
      acceptanceCriteria: COMMON_ACCEPTANCE,
      evidence: [{ source: 'deterministic_rule', label: 'Incident Brain', detail: brainKey }],
    }));
}
