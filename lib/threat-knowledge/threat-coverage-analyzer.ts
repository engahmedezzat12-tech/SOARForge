// ============================================================
// SOARForge — Threat Coverage Analyzer
// Customer wording: Threat Coverage, Coverage Gap, Recommended Enhancement.
// ============================================================

import type { NormalizedPlaybook } from '@/lib/normalized/normalized-types';
import type { PlaybookState } from '@/lib/soar-types';
import type { SoarPlatformId } from '@/lib/soar-platforms';
import type { ThreatCoverageResult, ThreatCoverageStatus } from './threat-knowledge-types';
import { getIncidentMapping } from './incident-mitre-mappings';
import { getTechniques } from './mitre-technique-registry';
import { getDetectionLogicForIncident, getDetectionLogicForTechniques } from './detection-logic-library';
import { getCountermeasuresForTechniques } from './defensive-countermeasure-mappings';
import { getEntityMappings } from './entity-data-source-mappings';
import { getResponseRecommendations } from './response-recommendation-mappings';
import { getSafeTestsForIncident } from './safe-test-scenario-library';

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

const ENTITY_ALIASES: Record<string, string[]> = {
  source_ip: ['source_ip', 'src_ip', 'client_ip', 'ip'],
  destination_ip: ['destination_ip', 'dest_ip', 'dst_ip'],
  domain: ['domain', 'domain_name'],
  url: ['url', 'target_url', 'uri'],
  uri: ['uri', 'url', 'target_url'],
  client_ip: ['client_ip', 'source_ip', 'src_ip'],
  username: ['username', 'user', 'sam_account_name', 'upn'],
  upn: ['upn', 'username', 'email'],
  geo: ['geo', 'login_country', 'country'],
  asn: ['asn', 'source_asn'],
  mfa_status: ['mfa_status', 'auth_method'],
  hostname: ['hostname', 'host', 'affected_host', 'computer_name'],
  machine_id: ['machine_id', 'asset_id', 'device_id', 'endpoint_id'],
  file_hash: ['file_hash', 'hash', 'sha256', 'attachment_hash'],
  cve_id: ['cve_id', 'cve'],
  asset_id: ['asset_id', 'affected_host', 'hostname'],
  business_owner: ['business_owner', 'owner', 'assignee'],
  exposure_status: ['exposure_status', 'patch_available'],
};

function normalizeEntities(entities: string[]): string[] {
  const out = new Set<string>();
  for (const e of entities) {
    out.add(e);
    for (const [canonical, aliases] of Object.entries(ENTITY_ALIASES)) {
      if (canonical === e || aliases.includes(e)) {
        out.add(canonical);
        for (const a of aliases) out.add(a);
      }
    }
  }
  return [...out];
}

function uniqueById<T>(items: T[], getId: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const id = getId(item);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}

function intersection(a: string[], b: string[]): string[] {
  const bs = new Set(b);
  return unique(a.filter((x) => bs.has(x)));
}

function diff(a: string[], b: string[]): string[] {
  const bs = new Set(b);
  return unique(a.filter((x) => !bs.has(x)));
}

function statusFromScore(score: number): ThreatCoverageStatus {
  if (score >= 85) return 'strong';
  if (score >= 70) return 'ready_with_review';
  if (score >= 50) return 'recommended_enhancement';
  return 'limited';
}

function extractPlaybookTechniqueIds(playbook: PlaybookState, normalized?: NormalizedPlaybook): string[] {
  const fromScoring = playbook.scoringModel?.mitreMapping ?? [];
  const fromRules = (playbook.scoringModel?.rules ?? []).map((r) => r.mitre ?? '').filter(Boolean);
  const fromName = `${playbook.name} ${playbook.description}`;
  const directMatches = fromName.match(/T\d{4}(?:\.\d{3})?/g) ?? [];
  const fromNormalized = (normalized?.scoringModel?.rules ?? [])
    .flatMap((r) => `${r.label} ${r.condition ?? ''}`.match(/T\d{4}(?:\.\d{3})?/g) ?? []);
  return unique([...fromScoring, ...fromRules, ...directMatches, ...fromNormalized]);
}


const SEVERITY_RANK: Record<string, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  informational: 1,
};

function rankDetections<T extends { incidentTypeIds: string[]; severity: string; title: string }>(items: T[], incidentTypeId: string): T[] {
  return [...items].sort((a, b) => {
    const ai = a.incidentTypeIds.includes(incidentTypeId) ? 1 : 0;
    const bi = b.incidentTypeIds.includes(incidentTypeId) ? 1 : 0;
    if (ai !== bi) return bi - ai;
    const as = SEVERITY_RANK[a.severity] ?? 0;
    const bs = SEVERITY_RANK[b.severity] ?? 0;
    if (as !== bs) return bs - as;
    return a.title.localeCompare(b.title);
  });
}

function techniqueName(id: string): string {
  return getTechniques([id])[0]?.name ?? id;
}

function scoreRatio(covered: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((covered / total) * 100);
}

export function analyzeThreatCoverage(
  playbook: PlaybookState,
  normalized?: NormalizedPlaybook,
  targetPlatform?: SoarPlatformId,
): ThreatCoverageResult {
  const mapping = getIncidentMapping(playbook.templateId, playbook.generatorType, playbook.name);
  const currentTechniques = extractPlaybookTechniqueIds(playbook, normalized);

  const coveredRequired = intersection(mapping.requiredTechniques, currentTechniques);
  const gaps = diff(mapping.requiredTechniques, currentTechniques);
  const coveredOptional = intersection(mapping.optionalTechniques, currentTechniques);
  const optionalEnhancements = diff(mapping.optionalTechniques, currentTechniques);

  const allRelevant = unique([...mapping.requiredTechniques, ...mapping.optionalTechniques]);
  const allCoveredRelevant = intersection(allRelevant, currentTechniques);

  const currentEntities = normalizeEntities(unique([...(playbook.entities ?? []), ...(normalized?.entities ?? []).map((e) => e.id)]));
  const coveredEntities = intersection(mapping.requiredEntities, currentEntities);
  const entityEnhancements = diff(mapping.requiredEntities, currentEntities);

  const relatedDetections = rankDetections(
    uniqueById(
      [...getDetectionLogicForIncident(mapping.incidentTypeId), ...getDetectionLogicForTechniques(allRelevant)],
      (d) => d.detectionId,
    ),
    mapping.incidentTypeId,
  );
  const currentActions = unique([
    ...(playbook.actions ?? []),
    ...(normalized?.steps ?? []).map((s) => s.normalizedAction ?? s.name),
    playbook.scoringModel?.actionRecommendation ?? '',
    playbook.scoringModel?.approvalRecommendation ?? '',
    playbook.fallbackProcedure?.manualSteps ?? '',
  ]).map((s) => s.toLowerCase());
  const responseRecommendations = getResponseRecommendations(mapping.incidentTypeId, allRelevant);
  const recommendedActionTerms = unique(responseRecommendations.flatMap((r) => [
    ...r.enrichmentActions,
    ...r.investigationActions,
    ...r.containmentActions,
    ...r.recoveryActions,
  ]));
  const responseCoverage = recommendedActionTerms.filter((term) => {
    const words = term.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
    return currentActions.some((a) => words.some((w) => a.includes(w)));
  });

  const safeTests = getSafeTestsForIncident(mapping.incidentTypeId);
  const testText = `${playbook.testingPlan?.scenarios ?? ''} ${playbook.testingPlan?.successCriteria ?? ''}`.toLowerCase();
  const testCoverage = safeTests.filter((t) => t.techniqueIds.some((id) => currentTechniques.includes(id)) || testText.includes(t.incidentTypeIds[0]));

  // Score formula: required technique 30%, detection 20%, response 20%, data source/entity 10%, false-positive 10%, testing 10%.
  const requiredScore = scoreRatio(coveredRequired.length, mapping.requiredTechniques.length);
  const detectionScore = relatedDetections.length > 0 && allCoveredRelevant.length > 0 ? 100 : relatedDetections.length > 0 ? 60 : 30;
  const responseScore = responseRecommendations.length > 0 ? Math.min(100, 50 + responseCoverage.length * 10) : 60;
  const entityScore = scoreRatio(coveredEntities.length, mapping.requiredEntities.length);
  const falsePositiveScore = (playbook.scoringModel?.approvalRecommendation || playbook.fallbackProcedure?.manualSteps || '').toLowerCase().includes('false') ? 100 : 70;
  const testingScore = testCoverage.length > 0 || (playbook.testingPlan?.scenarios ?? '').trim().length > 20 ? 100 : 50;

  const score = Math.round(
    requiredScore * 0.3 +
    detectionScore * 0.2 +
    responseScore * 0.2 +
    entityScore * 0.1 +
    falsePositiveScore * 0.1 +
    testingScore * 0.1,
  );

  const techniques = getTechniques(allRelevant);
  const deprecatedOrReviewRecommended = techniques
    .filter((t) => t.status === 'Deprecated' || t.status === 'Review_Recommended')
    .map((t) => `${t.techniqueId} ${t.name}`);

  const dataSourceCoverage = getEntityMappings(coveredEntities).map((e) => `${e.displayName} → ${e.ecsField ?? e.ocsfField ?? e.entityId}`);
  const detectionCoverage = relatedDetections.map((d) => `${d.title} (${d.severity})`);

  const recommendedEnhancements = [
    ...gaps.map((id) => `Add coverage for ${id}${techniques.find((t) => t.techniqueId === id)?.name ? ` — ${techniques.find((t) => t.techniqueId === id)?.name}` : ''}.`),
    ...optionalEnhancements.slice(0, 4).map((id) => `Consider optional enhancement for ${id} — ${techniqueName(id)}.`),
    ...entityEnhancements.slice(0, 4).map((e) => `Add normalized entity mapping for ${e}.`),
    ...(relatedDetections.length > 0 ? ['Add detection logic references to the customer implementation guide.'] : []),
  ];

  return {
    playbookId: playbook.id,
    playbookName: playbook.name,
    incidentTypeId: mapping.incidentTypeId,
    incidentDisplayName: mapping.displayName,
    score,
    status: statusFromScore(score),
    customerFacingLabel: score >= 70 ? 'Threat Coverage' : 'Recommended Enhancement',
    coveredRequiredTechniques: coveredRequired,
    coverageGaps: gaps,
    coveredOptionalTechniques: coveredOptional,
    optionalEnhancements,
    deprecatedOrReviewRecommended,
    detectionCoverage,
    responseCoverage: responseCoverage.length > 0 ? responseCoverage : responseRecommendations.map((r) => r.title),
    dataSourceCoverage,
    testCoverage: testCoverage.map((t) => t.name),
    recommendedEnhancements: unique(recommendedEnhancements),
    defensiveCountermeasures: getCountermeasuresForTechniques(allRelevant),
    relatedDetections,
    responseRecommendations,
    platformNotes: targetPlatform ? {
      [targetPlatform]: [
        'Threat coverage analysis is advisory and does not modify exported playbooks automatically.',
        'Tenant-specific detection deployment and connector permissions must be validated before production use.',
      ],
    } : {},
  };
}

export function exportThreatCoverageMarkdown(result: ThreatCoverageResult): string {
  const lines: string[] = [];
  lines.push(`# Threat Coverage Report — ${result.playbookName}`);
  lines.push('');
  lines.push(`**Incident Type:** ${result.incidentDisplayName}`);
  lines.push(`**Threat Coverage Score:** ${result.score}%`);
  lines.push(`**Status:** ${result.status.replace(/_/g, ' ')}`);
  lines.push('');
  lines.push('## Technique Coverage');
  lines.push(`- Covered Required Techniques: ${result.coveredRequiredTechniques.join(', ') || 'None configured yet'}`);
  lines.push(`- Covered Optional Techniques: ${result.coveredOptionalTechniques.join(', ') || 'No optional techniques covered yet'}`);
  lines.push(`- Coverage Gaps: ${result.coverageGaps.join(', ') || 'No required technique gaps identified'}`);
  lines.push(`- Optional Enhancements: ${result.optionalEnhancements.join(', ') || 'No optional enhancements identified'}`);
  lines.push('');
  lines.push('## Detection Coverage');
  for (const item of result.detectionCoverage.slice(0, 8)) lines.push(`- ${item}`);
  if (result.detectionCoverage.length === 0) lines.push('- No detection references mapped yet.');
  lines.push('');
  lines.push('## Defensive Countermeasures');
  for (const item of result.defensiveCountermeasures.slice(0, 8)) lines.push(`- ${item.name} (${item.tactic})`);
  if (result.defensiveCountermeasures.length === 0) lines.push('- No defensive countermeasures mapped yet.');
  lines.push('');
  lines.push('## Recommended Enhancements');
  for (const item of result.recommendedEnhancements.slice(0, 10)) lines.push(`- ${item}`);
  if (result.recommendedEnhancements.length === 0) lines.push('- No immediate enhancements recommended.');
  lines.push('');
  lines.push('## Notes');
  lines.push('- This report uses professional threat coverage terminology and is intended for review, not automatic playbook modification.');
  lines.push('- Knowledge-base updates must be approved before changing local datasets or production playbooks.');
  return lines.join('\n');
}
