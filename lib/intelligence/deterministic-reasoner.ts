// ============================================================
// SOARForge — Deterministic Reasoner
// Combines graph analysis, incident brains, coverage gaps, and safety validation.
// ============================================================

import type { PlaybookIntelligenceContext, IntelligenceRecommendation } from './intelligence-types';
import { analyzePlaybookGraph } from './playbook-graph-analyzer';
import { validateSafetyGuardrails } from './safety-validator';
import { runIncidentBrain } from './incident-brains';

let counter = 0;
function id(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

function coverageRecommendations(context: PlaybookIntelligenceContext): IntelligenceRecommendation[] {
  const recs: IntelligenceRecommendation[] = [];
  if (context.threatCoverage.recommendedEnhancements.length > 0) {
    recs.push({
      id: id('coverage'),
      ruleId: 'threat_coverage_enhancements_available',
      title: 'Apply threat-informed coverage enhancements',
      category: 'mitre_coverage',
      incidentTypes: [context.incidentType],
      platforms: ['any'],
      severity: context.threatCoverage.coverageGaps.length > 0 ? 'high' : 'medium',
      confidence: 'high',
      conditionSummary: 'Threat Coverage Analyzer identified recommended enhancements.',
      observed: context.threatCoverage.recommendedEnhancements.slice(0, 3).join('; '),
      customerFacingText: 'Add recommended threat coverage improvements to the playbook package.',
      whyItMatters: 'Threat-informed design helps analysts understand why the playbook exists and how it maps to expected adversary behavior.',
      suggestedChange: 'Include the recommended coverage improvements in documentation, detection references, and testing guidance.',
      expectedBenefit: 'Improves transparency, analyst confidence, and customer trust.',
      safetyImpact: 'Documentation-only enhancements do not modify production execution.',
      affectedSections: ['Threat Coverage', 'Documentation', 'Testing'],
      safeToAutoApply: true,
      autoApplyStatus: 'safe_auto_apply',
      acceptanceCriteria: ['Threat coverage section includes recommendations', 'Customer documentation explains coverage and tenant validation'],
      evidence: [{ source: 'threat_coverage', label: 'Recommended Enhancements', detail: context.threatCoverage.recommendedEnhancements.join(', ') }],
      tenantValidationRequired: false,
      adminApprovalRequired: false,
      priority: 70,
    });
  }

  if (context.detectionReferences.length === 0) {
    recs.push({
      id: id('coverage'),
      ruleId: 'missing_detection_references',
      title: 'Add detection reference coverage',
      category: 'detection_coverage',
      incidentTypes: [context.incidentType],
      platforms: ['any'],
      severity: 'medium',
      confidence: 'high',
      conditionSummary: 'No mapped detection references were found.',
      observed: 'Detection coverage is not represented in the playbook intelligence context.',
      customerFacingText: 'Add detection logic references for the selected incident type.',
      whyItMatters: 'Detection references explain what evidence should trigger or support the playbook.',
      suggestedChange: 'Add SIEM/EDR query references and log-source prerequisites to the implementation guide.',
      expectedBenefit: 'Improves handoff between detection engineering and SOC automation.',
      safetyImpact: 'Clarifies evidence requirements before response actions are trusted.',
      affectedSections: ['Detection Coverage', 'Customer Documentation'],
      safeToAutoApply: true,
      autoApplyStatus: 'safe_auto_apply',
      acceptanceCriteria: ['Detection references exist', 'False-positive filters are documented'],
      evidence: [{ source: 'threat_coverage', label: 'Detection Coverage', detail: 'No detection references' }],
      tenantValidationRequired: true,
      adminApprovalRequired: false,
      priority: 68,
    });
  }

  return recs;
}

function documentationRecommendations(context: PlaybookIntelligenceContext): IntelligenceRecommendation[] {
  const recs: IntelligenceRecommendation[] = [];
  if (context.exportReadiness.requiresTenantVerification) {
    recs.push({
      id: id('docs'),
      ruleId: 'tenant_validation_note_required',
      title: 'Keep tenant validation clearly visible',
      category: 'documentation',
      incidentTypes: ['any'],
      platforms: ['any'],
      severity: 'informational',
      confidence: 'very_high',
      conditionSummary: 'Target platform requires tenant verification.',
      observed: 'The export is format-valid, but runtime certification depends on tenant configuration.',
      customerFacingText: 'Keep tenant validation requirements visible in all customer-facing outputs.',
      whyItMatters: 'Customers trust the package more when it clearly separates design readiness from tenant runtime validation.',
      suggestedChange: 'Include the tenant validation note in the Intelligence Review, documentation, and deployment checklist.',
      expectedBenefit: 'Improves transparency and avoids over-claiming readiness.',
      safetyImpact: 'Prevents premature production activation.',
      affectedSections: ['Export Center', 'Customer Documentation', 'Deployment Checklist'],
      safeToAutoApply: true,
      autoApplyStatus: 'safe_auto_apply',
      acceptanceCriteria: ['Tenant validation note visible', 'Connector placeholders remain clearly identified'],
      evidence: [{ source: 'export_readiness', label: 'Tenant Verification', detail: 'Required' }],
      tenantValidationRequired: true,
      adminApprovalRequired: false,
      priority: 40,
    });
  }
  return recs;
}

function dedupe(recs: IntelligenceRecommendation[]): IntelligenceRecommendation[] {
  const byRule = new Map<string, IntelligenceRecommendation>();
  for (const rec of recs) {
    const existing = byRule.get(rec.ruleId);
    if (!existing || rec.priority > existing.priority) byRule.set(rec.ruleId, rec);
  }
  return [...byRule.values()].sort((a, b) => b.priority - a.priority);
}

export function runDeterministicReasoning(context: PlaybookIntelligenceContext): IntelligenceRecommendation[] {
  return dedupe([
    ...analyzePlaybookGraph(context),
    ...validateSafetyGuardrails(context),
    ...runIncidentBrain(context),
    ...coverageRecommendations(context),
    ...documentationRecommendations(context),
  ]);
}
