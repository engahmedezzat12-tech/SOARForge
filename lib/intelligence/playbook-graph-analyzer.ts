// ============================================================
// SOARForge — Playbook Graph Analyzer
// Looks for dependency, routing, and execution design signals.
// ============================================================

import type { PlaybookIntelligenceContext, IntelligenceRecommendation } from './intelligence-types';

let counter = 0;
function id(): string {
  counter += 1;
  return `graph-${counter}`;
}

export function analyzePlaybookGraph(context: PlaybookIntelligenceContext): IntelligenceRecommendation[] {
  const recs: IntelligenceRecommendation[] = [];

  if (context.entities.length === 0) {
    recs.push({
      id: id(),
      ruleId: 'missing_entity_extraction',
      title: 'Add normalized entity extraction',
      category: 'entity_extraction',
      incidentTypes: ['any'],
      platforms: ['any'],
      severity: 'high',
      confidence: 'very_high',
      conditionSummary: 'No normalized entities were found.',
      observed: 'The playbook does not expose normalized entities for downstream actions.',
      customerFacingText: 'Add normalized entity extraction before enrichment and response.',
      whyItMatters: 'Response actions depend on reliable entities such as hostname, user, IP, URL, message ID, or file hash.',
      suggestedChange: 'Add entity extraction and validation before enrichment actions execute.',
      expectedBenefit: 'Improves connector success rate and reduces failed action executions.',
      safetyImpact: 'Prevents actions from running against missing or incorrect targets.',
      affectedSections: ['Entities', 'Build Context', 'Connector Parameters'],
      safeToAutoApply: true,
      autoApplyStatus: 'safe_auto_apply',
      acceptanceCriteria: ['Required entities are listed', 'Empty entity path degrades gracefully'],
      evidence: [{ source: 'playbook', label: 'Entities', detail: 'No entities detected' }],
      tenantValidationRequired: false,
      adminApprovalRequired: false,
      priority: 92,
    });
  }

  if (context.enrichmentSteps.length === 0 && context.connectors.length > 0) {
    recs.push({
      id: id(),
      ruleId: 'connectors_without_enrichment_sequence',
      title: 'Clarify enrichment sequence',
      category: 'enrichment',
      incidentTypes: ['any'],
      platforms: ['any'],
      severity: 'medium',
      confidence: 'medium',
      conditionSummary: 'Connectors exist but enrichment sequence is not visible in the normalized graph.',
      observed: `${context.connectors.length} connector requirements are present, but enrichment steps are not clearly represented.`,
      customerFacingText: 'Document the enrichment order and expected evidence returned by each connector.',
      whyItMatters: 'SOC analysts need to understand which evidence is collected before scoring and response.',
      suggestedChange: 'Add enrichment sequence notes and expected output fields to the deployment guide.',
      expectedBenefit: 'Improves auditability and troubleshooting during tenant validation.',
      safetyImpact: 'Avoids acting on incomplete enrichment context.',
      affectedSections: ['Enrichment', 'Documentation'],
      safeToAutoApply: true,
      autoApplyStatus: 'safe_auto_apply',
      acceptanceCriteria: ['Enrichment order is documented', 'Connector outputs are listed'],
      evidence: [{ source: 'normalized_blueprint', label: 'Connectors', detail: context.connectors.map((c) => c.label).join(', ') }],
      tenantValidationRequired: true,
      adminApprovalRequired: false,
      priority: 62,
    });
  }

  if (context.exportBlockers.length > 0) {
    recs.push({
      id: id(),
      ruleId: 'tenant_blockers_require_resolution_plan',
      title: 'Create tenant validation resolution plan',
      category: 'tenant_validation',
      incidentTypes: ['any'],
      platforms: ['any'],
      severity: 'high',
      confidence: 'very_high',
      conditionSummary: 'Export readiness returned production blockers.',
      observed: context.exportBlockers.join('; '),
      customerFacingText: 'Resolve tenant validation blockers before enabling production execution.',
      whyItMatters: 'Format-valid exports still require real tenant connector IDs, permissions, and action names before production activation.',
      suggestedChange: 'Use the Connector/Action Checklist and validate each action in a non-production tenant.',
      expectedBenefit: 'Improves import reliability and reduces deployment risk.',
      safetyImpact: 'Prevents incomplete exports from being activated against production alerts.',
      affectedSections: ['Export Readiness', 'Connector Checklist', 'Deployment Checklist'],
      safeToAutoApply: true,
      autoApplyStatus: 'safe_auto_apply',
      acceptanceCriteria: ['Connector UUIDs are configured', 'Action names validated', 'Non-production test execution completed'],
      evidence: [{ source: 'export_readiness', label: 'Blockers', detail: context.exportBlockers.join(', ') }],
      tenantValidationRequired: true,
      adminApprovalRequired: false,
      priority: 88,
    });
  }

  return recs;
}
