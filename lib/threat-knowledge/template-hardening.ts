// ============================================================
// SOARForge — Template Threat-Knowledge Hardening
// Applies MITRE/data-source/test/approval guidance to predefined templates
// without auto-changing destructive actions.
// ============================================================

import type { PlaybookState, PlaybookTemplate, ScoringModel } from '@/lib/soar-types';
import { getIncidentMapping } from './incident-mitre-mappings';
import { getSafeTestsForIncident } from './safe-test-scenario-library';
import { getDetectionLogicForIncident } from './detection-logic-library';
import { getCountermeasuresForTechniques } from './defensive-countermeasure-mappings';
import { getResponseRecommendations } from './response-recommendation-mappings';

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean).map((v) => v.trim()).filter(Boolean))];
}

function appendSection(base: string, title: string, items: string[]): string {
  const clean = unique(items);
  if (clean.length === 0) return base;
  const block = `${title}\n${clean.map((i) => `- ${i}`).join('\n')}`;
  if (!base || base.trim() === '') return block;
  if (base.includes(title)) return base;
  return `${base.trim()}\n\n${block}`;
}


const SUPPORTING_SCORING_TECHNIQUES: Record<string, string[]> = {
  // Only add selected optional techniques as low-weight supporting evidence.
  // Remaining optional techniques stay visible as Recommended Enhancements so the score remains honest.
  ransomware: ['T1059.001', 'T1048'],
  phishing: ['T1566.001', 'T1566.002'],
  suspicious_login: ['T1110.003'],
  malware_hash: ['T1562.001'],
};

function getScoringTechniques(incidentTypeId: string, required: string[]): string[] {
  return unique([...required, ...(SUPPORTING_SCORING_TECHNIQUES[incidentTypeId] ?? [])]);
}

function techniqueRuleExists(model: ScoringModel, techniqueId: string): boolean {
  const text = [
    ...(model.mitreMapping ?? []),
    ...(model.rules ?? []).flatMap((r) => [r.mitre ?? '', r.label ?? '', r.condition ?? '']),
  ].join(' ');
  return text.includes(techniqueId);
}

function buildCoverageRules(model: ScoringModel, techniques: string[]): ScoringModel {
  const existingIds = new Set((model.rules ?? []).map((r) => r.id));
  const extraRules = techniques
    .filter((id) => !techniqueRuleExists(model, id))
    .map((id, index) => {
      const ruleIdBase = `tk_${id.toLowerCase().replace('.', '_')}`;
      const ruleId = existingIds.has(ruleIdBase) ? `${ruleIdBase}_${index + 1}` : ruleIdBase;
      existingIds.add(ruleId);
      return {
        id: ruleId,
        label: `Threat coverage indicator ${id}`,
        condition: `Alert metadata, detection tags, or enrichment context references ${id}. Use as supporting evidence only; do not trigger destructive response from this signal alone.`,
        points: 1,
        mitre: id,
      };
    });

  return {
    ...model,
    rules: [...(model.rules ?? []), ...extraRules],
    mitreMapping: unique([...(model.mitreMapping ?? []), ...techniques]),
  };
}

export function hardenTemplateWithThreatKnowledge(
  template: PlaybookTemplate,
  playbook: PlaybookState,
): PlaybookState {
  const mapping = getIncidentMapping(template.id, template.generatorType, template.name);
  const relevantTechniques = unique([...mapping.requiredTechniques, ...mapping.optionalTechniques]);
  const safeTests = getSafeTestsForIncident(mapping.incidentTypeId);
  const detections = getDetectionLogicForIncident(mapping.incidentTypeId);
  const countermeasures = getCountermeasuresForTechniques(relevantTechniques);
  const recommendations = getResponseRecommendations(mapping.incidentTypeId, relevantTechniques);

  const scoringTechniques = getScoringTechniques(mapping.incidentTypeId, mapping.requiredTechniques);
  const hardenedScoring = buildCoverageRules(playbook.scoringModel, scoringTechniques);

  const approvalGuidance = [
    ...mapping.approvalPoints,
    ...recommendations.flatMap((r) => r.approvalRequired ? r.safetyGuardrails : []),
  ];

  const responseGuidance = unique([
    ...mapping.recommendedResponses,
    ...recommendations.flatMap((r) => [
      ...r.enrichmentActions,
      ...r.investigationActions,
      ...r.containmentActions,
      ...r.recoveryActions,
      ...r.notificationActions,
    ]),
  ]);

  const detectionGuidance = detections.map((d) => `${d.title} — ${d.severity} severity; log sources: ${d.logSources.join(', ')}`);
  const countermeasureGuidance = countermeasures.map((c) => `${c.name} (${c.tactic})`);

  return {
    ...playbook,
    description: playbook.description.includes('Threat-informed coverage')
      ? playbook.description
      : `${playbook.description}\n\nThreat-informed coverage: mapped to ${mapping.displayName} using ${relevantTechniques.join(', ')} with defensive recommendations, safe testing, and coverage validation.`,
    entities: unique([...(playbook.entities ?? []), ...mapping.requiredEntities]),
    scoringModel: {
      ...hardenedScoring,
      approvalRecommendation: appendSection(
        hardenedScoring.approvalRecommendation,
        'Threat-informed approval points:',
        approvalGuidance,
      ),
      actionRecommendation: appendSection(
        hardenedScoring.actionRecommendation,
        'Recommended response alignment:',
        responseGuidance,
      ),
      decisionLogic: appendSection(
        hardenedScoring.decisionLogic,
        'Threat coverage decision notes:',
        [
          `Required coverage: ${mapping.requiredTechniques.join(', ') || 'No required ATT&CK techniques for this operational template'}.`,
          `Optional enhancements: ${mapping.optionalTechniques.join(', ') || 'None currently defined'}.`,
          'Coverage signals should strengthen confidence but must not bypass safety gates, approval requirements, or rollback checks.',
        ],
      ),
    },
    fallbackProcedure: {
      ...playbook.fallbackProcedure,
      manualSteps: appendSection(
        appendSection(
          appendSection(
            playbook.fallbackProcedure.manualSteps,
            'Threat-informed false-positive checks:',
            mapping.falsePositiveChecks,
          ),
          'Recommended rollback actions:',
          mapping.rollbackActions,
        ),
        'Defensive countermeasures to verify:',
        countermeasureGuidance,
      ),
      communicationTemplate: playbook.fallbackProcedure.communicationTemplate,
      escalationPath: playbook.fallbackProcedure.escalationPath,
    },
    testingPlan: {
      ...playbook.testingPlan,
      scenarios: appendSection(
        appendSection(
          playbook.testingPlan.scenarios,
          'Threat-informed safe validation scenarios:',
          [...mapping.testScenarios, ...safeTests.map((t) => t.name)],
        ),
        'Detection references for validation:',
        detectionGuidance,
      ),
      successCriteria: appendSection(
        playbook.testingPlan.successCriteria,
        'Threat coverage success criteria:',
        [
          'Required techniques are represented in scoring metadata and documentation.',
          'Detection references, false-positive checks, and rollback behavior are documented.',
          'Safe validation payloads follow non-destructive testing guidance.',
        ],
      ),
      performanceTargets: playbook.testingPlan.performanceTargets,
    },
    updatedAt: new Date().toISOString(),
  };
}
