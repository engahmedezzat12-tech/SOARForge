// ============================================================
// SOARForge — Threat Knowledge Engine Types
// Defensive-first, customer-friendly MITRE/D3FEND coverage model.
// ============================================================

import type { SoarPlatformId } from '@/lib/soar-platforms';

export type ThreatKnowledgeConfidence = 'high' | 'medium' | 'low';
export type ThreatCoverageStatus = 'strong' | 'ready_with_review' | 'recommended_enhancement' | 'limited';
export type KnowledgeRecordStatus = 'Approved_For_Production' | 'Review_Recommended' | 'Reference_Only' | 'Deprecated';
export type DetectionLanguage = 'sigma' | 'kql' | 'spl' | 'elastic' | 'aql' | 'generic';

export interface MitreTechniqueRecord {
  techniqueId: string;
  name: string;
  description: string;
  tactics: string[];
  platforms: string[];
  dataSources: string[];
  isSubTechnique: boolean;
  parentTechniqueId?: string;
  defensiveFocus: string[];
  recommendedEntities: string[];
  recommendedDetections: string[];
  recommendedResponses: string[];
  falsePositiveNotes: string[];
  version: string;
  status: KnowledgeRecordStatus;
  customerLabel: string;
}

export interface IncidentMitreMapping {
  incidentTypeId: string;
  displayName: string;
  category: 'endpoint' | 'email' | 'identity' | 'network' | 'web' | 'cloud' | 'vulnerability' | 'data_protection' | 'operations' | 'threat_intel';
  description: string;
  requiredTechniques: string[];
  optionalTechniques: string[];
  primaryTactics: string[];
  dataSources: string[];
  requiredEntities: string[];
  recommendedEnrichment: string[];
  recommendedResponses: string[];
  approvalPoints: string[];
  rollbackActions: string[];
  falsePositiveChecks: string[];
  testScenarios: string[];
  confidence: ThreatKnowledgeConfidence;
}

export interface DetectionLogicRecord {
  detectionId: string;
  title: string;
  description: string;
  techniqueIds: string[];
  incidentTypeIds: string[];
  logSources: string[];
  requiredFields: string[];
  severity: 'informational' | 'low' | 'medium' | 'high' | 'critical';
  falsePositiveFilters: string[];
  tuningNotes: string[];
  queries: Partial<Record<DetectionLanguage, string>>;
  status: KnowledgeRecordStatus;
}

export interface DefensiveCountermeasureMapping {
  d3fendId: string;
  name: string;
  tactic: 'Model' | 'Harden' | 'Detect' | 'Isolate' | 'Deceive' | 'Evict' | 'Restore';
  definition: string;
  mappedAttackTechniques: string[];
  responseActions: string[];
  enrichmentActions: string[];
  documentationNotes: string[];
  status: KnowledgeRecordStatus;
}

export interface EntityDataSourceMapping {
  entityId: string;
  displayName: string;
  type: 'endpoint' | 'identity' | 'network' | 'file' | 'process' | 'email' | 'cloud' | 'web' | 'custom';
  description: string;
  vendorAliases: string[];
  ecsField?: string;
  ocsfField?: string;
  usedByTechniques: string[];
  usedByIncidentTypes: string[];
  usedByActions: string[];
}

export interface ResponseRecommendationMapping {
  recommendationId: string;
  title: string;
  rationale: string;
  techniqueIds: string[];
  incidentTypeIds: string[];
  enrichmentActions: string[];
  investigationActions: string[];
  containmentActions: string[];
  recoveryActions: string[];
  notificationActions: string[];
  rollbackActions: string[];
  approvalRequired: boolean;
  safetyGuardrails: string[];
  riskReductionScore: number;
}

export interface SafeTestScenario {
  scenarioId: string;
  name: string;
  description: string;
  incidentTypeIds: string[];
  techniqueIds: string[];
  syntheticPayload: Record<string, unknown>;
  expectedEntities: string[];
  expectedDecisionPath: string;
  expectedApprovalBehavior: string;
  expectedRollbackBehavior: string;
  validationStatus: KnowledgeRecordStatus;
}

export interface ThreatKnowledgeUpdateSource {
  sourceId: string;
  sourceName: 'MITRE_ATTACK' | 'MITRE_D3FEND' | 'SIGMA_HQ' | 'CISA_KEV' | 'LOLBAS' | 'ATOMIC_RED_TEAM';
  customerFacingName: string;
  fetchUrl: string;
  format: 'STIX_JSON' | 'JSON' | 'YAML' | 'CSV' | 'GITHUB_RELEASE';
  recommendedFrequencyHours: number;
  approvalRequired: boolean;
  updateBehavior: 'fetch_compare_propose_only';
  notes: string[];
}

export interface ThreatCoverageResult {
  playbookId: string;
  playbookName: string;
  incidentTypeId: string;
  incidentDisplayName: string;
  score: number;
  status: ThreatCoverageStatus;
  customerFacingLabel: 'Threat Coverage' | 'Detection Coverage' | 'Recommended Enhancement';
  coveredRequiredTechniques: string[];
  coverageGaps: string[];
  coveredOptionalTechniques: string[];
  optionalEnhancements: string[];
  deprecatedOrReviewRecommended: string[];
  detectionCoverage: string[];
  responseCoverage: string[];
  dataSourceCoverage: string[];
  testCoverage: string[];
  recommendedEnhancements: string[];
  defensiveCountermeasures: DefensiveCountermeasureMapping[];
  relatedDetections: DetectionLogicRecord[];
  responseRecommendations: ResponseRecommendationMapping[];
  platformNotes: Partial<Record<SoarPlatformId, string[]>>;
}
