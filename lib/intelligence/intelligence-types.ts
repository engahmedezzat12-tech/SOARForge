import type { KnowledgeUpdateReview } from '@/lib/knowledge-updates/knowledge-update-types';
// ============================================================
// SOARForge — Hybrid Intelligence Engine Types
// Deterministic-first intelligence with optional AI boundaries.
// ============================================================

import type { SoarPlatformId } from '@/lib/soar-platforms';
import type { ThreatCoverageResult } from '@/lib/threat-knowledge/threat-knowledge-types';
import type { ExportReadinessResult } from '@/lib/evidence/evidence-types';

export type IntelligenceLayer = 'knowledge' | 'deterministic_reasoning' | 'feedback_learning' | 'ai_assisted';

export type RecommendationCategory =
  | 'entity_extraction'
  | 'enrichment'
  | 'scoring'
  | 'mitre_coverage'
  | 'detection_coverage'
  | 'response_action'
  | 'approval_gate'
  | 'rollback'
  | 'safety_guardrail'
  | 'platform_readiness'
  | 'connector_readiness'
  | 'documentation'
  | 'testing'
  | 'false_positive_handling'
  | 'tenant_validation';

export type RecommendationSeverity = 'critical' | 'high' | 'medium' | 'low' | 'informational';
export type RecommendationConfidence = 'very_high' | 'high' | 'medium' | 'low';
export type AutoApplyStatus = 'safe_auto_apply' | 'preview_only' | 'requires_approval' | 'restricted';

export interface IntelligenceEvidenceRef {
  source: 'playbook' | 'normalized_blueprint' | 'threat_coverage' | 'export_readiness' | 'platform_profile' | 'tenant_profile' | 'deterministic_rule';
  label: string;
  detail: string;
}

export interface PlaybookActionContext {
  id: string;
  label: string;
  category: string;
  destructive: boolean;
  approvalRecommended: boolean;
  rollbackSupported: boolean;
  source: 'playbook' | 'normalized_step' | 'recommendation';
}

export interface PlaybookConnectorContext {
  id: string;
  label: string;
  category: string;
  required: boolean;
  tenantVerificationRequired: boolean;
}

export interface PlaybookIntelligenceContext {
  playbookId: string;
  playbookName: string;
  incidentType: string;
  incidentCategory: string;
  targetPlatform: SoarPlatformId;
  triggerType: string;
  entities: string[];
  requiredEntities: string[];
  connectors: PlaybookConnectorContext[];
  enrichmentSteps: string[];
  scoringRules: string[];
  thresholds: string[];
  actions: PlaybookActionContext[];
  approvals: string[];
  rollbackActions: string[];
  notifications: string[];
  ticketing: string[];
  mitreTechniques: string[];
  detectionReferences: string[];
  defensiveCountermeasures: string[];
  safeTestScenarios: string[];
  readinessWarnings: string[];
  exportBlockers: string[];
  manualRequirements: string[];
  tenantRequirements: string[];
  riskIndicators: string[];
  destructiveActions: PlaybookActionContext[];
  missingFields: string[];
  optionalEnhancements: string[];
  threatCoverage: ThreatCoverageResult;
  exportReadiness: ExportReadinessResult;
}

export interface RecommendationRule {
  ruleId: string;
  title: string;
  category: RecommendationCategory;
  incidentTypes: string[];
  platforms: Array<SoarPlatformId | 'any'>;
  severity: RecommendationSeverity;
  confidence: RecommendationConfidence;
  conditionSummary: string;
  customerFacingText: string;
  whyItMatters: string;
  suggestedChange: string;
  expectedBenefit: string;
  safetyImpact: string;
  affectedSections: string[];
  safeToAutoApply: boolean;
  autoApplyStatus: AutoApplyStatus;
  acceptanceCriteria: string[];
}

export interface IntelligenceRecommendation extends RecommendationRule {
  id: string;
  observed: string;
  evidence: IntelligenceEvidenceRef[];
  tenantValidationRequired: boolean;
  adminApprovalRequired: boolean;
  priority: number;
}

export interface IntelligenceScoreBreakdown {
  bestPracticeAlignment: number;
  threatCoverage: number;
  detectionCoverage: number;
  responseSafety: number;
  platformReadiness: number;
  documentationQuality: number;
  testCoverage: number;
  overall: number;
  appliedCaps: string[];
}

export interface AutoHardeningPatch {
  patchId: string;
  title: string;
  category: RecommendationCategory;
  safeToApply: boolean;
  requiresApproval: boolean;
  description: string;
  preview: string;
  affectedOutput: 'documentation' | 'metadata' | 'testing' | 'scoring_explanation' | 'readiness_notes' | 'workflow_logic';
}

export interface FeedbackEvent {
  eventId: string;
  tenantId: string;
  playbookId: string;
  recommendationId?: string;
  eventType: 'accepted' | 'rejected' | 'export_success' | 'export_failed' | 'connector_validated' | 'runtime_test_passed' | 'runtime_test_failed' | 'false_positive_reported' | 'safety_override_requested';
  timestamp: string;
  note?: string;
}

export interface TenantLearningProfile {
  tenantId: string;
  displayName: string;
  acceptedPatterns: string[];
  rejectedPatterns: string[];
  connectorOutcomes: Record<string, 'unknown' | 'validated' | 'failed' | 'not_configured'>;
  runtimeValidation: Record<string, 'not_tested' | 'passed' | 'failed' | 'review_recommended'>;
  safetyPreferences: string[];
  confidenceAdjustments: Record<string, number>;
}

export interface IntelligenceMemoryRecord {
  id: string;
  scope: 'global_reviewed_pattern' | 'tenant_specific';
  tenantId?: string;
  patternKey: string;
  summary: string;
  confidenceDelta: number;
  lastObserved: string;
  approvedForGlobalUse: boolean;
}

export interface LlmAssistantBoundary {
  enabled: boolean;
  mode: 'disabled' | 'draft_only' | 'summary_only' | 'recommendation_explanation';
  allowedTasks: string[];
  restrictedTasks: string[];
  redactionRequired: boolean;
  deterministicValidationRequired: boolean;
}


export interface PlaybookLogicAnalysis {
  summary: string;
  detectedPaths: string[];
  positiveObservations: string[];
  potentialConcerns: string[];
}

export interface ActionRiskMatrixItem {
  action: string;
  category: string;
  riskLevel: 'low' | 'medium' | 'medium_high' | 'high' | 'critical';
  requiredGuardrail: string;
  rollbackPath: string;
  tenantValidation: string;
}

export interface TenantValidationChecklistItem {
  id: string;
  label: string;
  status: 'pending' | 'passed' | 'failed' | 'not_applicable';
  owner: string;
  validationEvidence: string;
}

export interface TestCaseRecommendation {
  id: string;
  scenario: string;
  expectedPath: string;
  expectedEvidence: string[];
  approvalExpected: boolean;
  rollbackExpected: boolean;
}

export interface DetectionQueryPackItem {
  name: string;
  logSource: string;
  requiredFields: string[];
  sigmaIdea: string;
  kqlHint: string;
  splHint: string;
  falsePositiveFilters: string[];
}

export interface ConnectorPermissionAdvisorItem {
  connector: string;
  category: string;
  requiredPermissions: string[];
  validationMethod: string;
  commonFailureModes: string[];
}

export interface PlatformCapabilityWarning {
  platform: string;
  capability: string;
  warning: string;
  recommendation: string;
}

export interface EnvironmentProfileInsight {
  capability: string;
  observed: boolean;
  recommendation: string;
}

export interface ComplianceMappingItem {
  framework: string;
  control: string;
  alignment: string;
}

export interface AskSoarForgeItem {
  question: string;
  answer: string;
}

export interface CustomerDeliveryPackItem {
  file: string;
  purpose: string;
  included: boolean;
}

export interface IntelligenceKnowledgeBaseVersion {
  threatKnowledge: string;
  platformCompatibility: string;
  recommendationRules: string;
  generatedAt: string;
}



export interface WhatSoarForgeAnalyzedItem {
  area: string;
  analyzed: string;
  customerValue: string;
}

export interface AnalysisTraceStep {
  step: number;
  label: string;
  detail: string;
  layer: IntelligenceLayer;
}

export interface IntelligenceDepthItem {
  area: string;
  level: 'strong' | 'good' | 'needs_validation' | 'review_recommended';
  summary: string;
}

export interface KnowledgeSourceStatusItem {
  source: string;
  purpose: string;
  status: 'loaded' | 'configured' | 'review_recommended' | 'not_configured';
  version: string;
  lastChecked: string;
  updateMode: 'local' | 'manual_import' | 'api_ready' | 'future_connector';
}

export interface KnowledgeUpdateInsight {
  status: 'up_to_date' | 'review_recommended' | 'not_checked';
  summary: string;
  affectedTemplates: string[];
  recommendedAction: string;
}

export interface IntelligenceViewSummary {
  view: 'executive' | 'analyst' | 'engineer';
  title: string;
  focus: string;
  summary: string;
  keyPoints: string[];
}

export interface IntelligenceReviewResult {
  context: PlaybookIntelligenceContext;
  summary: string;
  status: 'excellent' | 'strong' | 'ready_with_review' | 'needs_attention';
  whatWasUnderstood: string[];
  designStrengths: string[];
  recommendations: IntelligenceRecommendation[];
  safetyGuardrails: string[];
  autoHardeningPlan: AutoHardeningPatch[];
  score: IntelligenceScoreBreakdown;
  tenantLearningNotes: string[];
  llmBoundary: LlmAssistantBoundary;
  executiveSummary?: string;
  playbookLogicAnalysis?: PlaybookLogicAnalysis;
  actionRiskMatrix?: ActionRiskMatrixItem[];
  whyNotPerfect?: string[];
  tenantValidationChecklist?: TenantValidationChecklistItem[];
  testCaseRecommendations?: TestCaseRecommendation[];
  detectionQueryPack?: DetectionQueryPackItem[];
  connectorPermissionAdvisor?: ConnectorPermissionAdvisorItem[];
  platformCapabilityWarnings?: PlatformCapabilityWarning[];
  environmentProfile?: EnvironmentProfileInsight[];
  complianceMapping?: ComplianceMappingItem[];
  askSoarForge?: AskSoarForgeItem[];
  customerDeliveryPackManifest?: CustomerDeliveryPackItem[];
  knowledgeBaseVersion?: IntelligenceKnowledgeBaseVersion;
  whatSoarForgeAnalyzed?: WhatSoarForgeAnalyzedItem[];
  analysisTrace?: AnalysisTraceStep[];
  intelligenceDepth?: IntelligenceDepthItem[];
  knowledgeSources?: KnowledgeSourceStatusItem[];
  knowledgeUpdateInsight?: KnowledgeUpdateInsight;
  liveKnowledgeUpdateReview?: KnowledgeUpdateReview;
  intelligenceViews?: IntelligenceViewSummary[];
  topPriorityFix?: string;
  primaryBlocker?: string;
  riskLevel?: 'controlled' | 'elevated' | 'high' | 'critical';
}
