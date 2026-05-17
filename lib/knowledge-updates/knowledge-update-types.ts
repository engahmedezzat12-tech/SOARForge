// ============================================================
// SOARForge — Live Knowledge Update Engine Types
// Online/offline source updates, diffs, impact analysis, and
// approval workflow. Safe by design: no production playbook is
// modified automatically.
// ============================================================

export type KnowledgeSourceKind =
  | 'mitre_attack'
  | 'mitre_d3fend'
  | 'sigma'
  | 'cisa_kev'
  | 'lolbas'
  | 'atomic_tests'
  | 'capec_cwe'
  | 'nvd_cve'
  | 'framework_mapping'
  | 'platform_matrix';

export type KnowledgeUpdateMode = 'local_only' | 'online' | 'offline_bundle' | 'hybrid' | 'future_connector';
export type KnowledgeDataFormat = 'stix_21' | 'json' | 'yaml' | 'csv' | 'json_ld' | 'rdf_ttl' | 'mixed';
export type KnowledgeTrustLevel = 'official' | 'trusted_community' | 'internal_curated' | 'reference_only';
export type KnowledgeDiffType = 'added' | 'modified' | 'deprecated' | 'revoked' | 'removed' | 'mapping_changed' | 'unchanged';
export type KnowledgeImpactLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

// Required 10-state customer-facing approval flow.
export type KnowledgeApprovalQueueState =
  | 'no_update'
  | 'update_available'
  | 'staged'
  | 'review_required'
  | 'approved'
  | 'partially_approved'
  | 'rejected'
  | 'applied'
  | 'rolled_back'
  | 'failed';

export type InternalIngestionState =
  | 'pending_ingestion'
  | 'signature_verified'
  | 'schema_validated'
  | 'impact_analysis_pending'
  | 'impact_analyzed'
  | 'conflict_detected'
  | 'quarantine_review'
  | 'pending_admin_approval'
  | 'staged_for_deployment'
  | 'committed_successfully'
  | 'rejected_or_rolled_back';

export interface KnowledgeSourceDefinition {
  id: string;
  name: string;
  kind: KnowledgeSourceKind;
  customerLabel: string;
  purpose: string;
  updateMode: KnowledgeUpdateMode;
  localVersion: string;
  officialUrl?: string;
  dataFormat: KnowledgeDataFormat;
  authenticationRequired: boolean;
  recommendedFrequency: 'daily' | 'weekly' | 'monthly' | 'manual' | 'per_release';
  trustLevel: KnowledgeTrustLevel;
  approvalRequired: boolean;
  supportsOfflineBundle: boolean;
  fieldsToExtract: string[];
  parserStrategy: string;
  diffStrategy: string;
  safetyNotes: string[];
  customerStatusWording: string;
}

export interface KnowledgeSourceHealth {
  sourceId: string;
  displayName: string;
  status: 'not_checked' | 'reachable' | 'offline_ready' | 'proxy_required' | 'failed' | 'disabled';
  lastChecked?: string;
  latestKnownVersion?: string;
  localVersion: string;
  mode: KnowledgeUpdateMode;
  message: string;
}

export interface KnowledgeObjectIdentity {
  sourceId: string;
  objectId: string;
  objectType: 'technique' | 'tactic' | 'data_source' | 'detection_rule' | 'kev_cve' | 'lolbas_entry' | 'atomic_test' | 'd3fend_countermeasure' | 'framework_control' | 'unknown';
  name: string;
  version?: string;
  modified?: string;
}

export interface KnowledgeDiffItem {
  id: string;
  sourceId: string;
  type: KnowledgeDiffType;
  objectId: string;
  objectType?: KnowledgeObjectIdentity['objectType'];
  title: string;
  summary: string;
  oldValue?: unknown;
  newValue?: unknown;
  affectedFields: string[];
  affectedIncidentTypes: string[];
  affectedTemplates: string[];
  recommendedAction: string;
  impactLevel: KnowledgeImpactLevel;
  risk: 'low' | 'medium' | 'high'; // backwards compatible alias
  confidence: 'low' | 'medium' | 'high' | 'very_high';
  requiresApproval: boolean;
  safeToApply: boolean;
  customerFacingChange: string;
  technicalDetails?: string;
}

export interface TemplateImpactResult {
  templateId: string;
  templateName: string;
  incidentType?: string;
  impact: KnowledgeImpactLevel;
  reason: string;
  affectedTechniques: string[];
  affectedDetectionReferences: string[];
  affectedResponseRecommendations: string[];
  recommendedAction: string;
  reviewRecommended: boolean;
  customerExportNote?: string;
}

export interface KnowledgeVersionSourceState {
  sourceId: string;
  activeVersion: string;
  stagedVersion?: string;
  latestAvailableVersion?: string;
  lastChecked?: string;
  lastApplied?: string;
  approvedBy?: string;
  rollbackPoint?: string;
  checksum?: string;
}

export interface KnowledgeVersionTimelineEvent {
  id: string;
  timestamp: string;
  sourceId: string;
  state: KnowledgeApprovalQueueState;
  title: string;
  description: string;
  actor: 'system' | 'admin' | 'demo';
}

export interface KnowledgeApprovalQueueItem {
  id: string;
  reviewId: string;
  state: KnowledgeApprovalQueueState;
  internalState: InternalIngestionState;
  sourceIds: string[];
  title: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
  requiresAdminApproval: boolean;
  approvedBy?: string;
  rejectedReason?: string;
  diffCount: number;
  affectedTemplateCount: number;
  safetySummary: string;
}

export interface KnowledgeUpdateReview {
  reviewId: string;
  generatedAt: string;
  mode: 'demo' | 'online' | 'offline_bundle';
  sourceIds: string[];
  status: KnowledgeApprovalQueueState;
  summary: string;
  diffItems: KnowledgeDiffItem[];
  templateImpacts: TemplateImpactResult[];
  adminApprovalRequired: boolean;
  sourceHealth: KnowledgeSourceHealth[];
  approvalQueue: KnowledgeApprovalQueueItem[];
  versionTimeline: KnowledgeVersionTimelineEvent[];
  sourceVersions: KnowledgeVersionSourceState[];
  globalKnowledgeSeparated: boolean;
  tenantLearningSeparated: boolean;
  safetyRules: string[];
  nextRecommendedAction: string;
}

export interface OfflineKnowledgeBundleManifest {
  bundleId: string;
  createdAt: string;
  createdBy: string;
  sources: string[];
  signatureStatus: 'not_checked' | 'valid' | 'invalid' | 'not_required_for_demo';
  checksum: string;
  mode: 'demo' | 'signed_bundle';
  objectCount: number;
}

export interface GlobalKnowledgeRecord {
  globalId: string;
  sourceId: string;
  objectId: string;
  objectType: KnowledgeObjectIdentity['objectType'];
  activeVersion: string;
  deprecated: boolean;
  revoked: boolean;
  rawSummary: Record<string, unknown>;
}

export interface TenantLearningRecord {
  tenantId: string;
  recordId: string;
  category: 'connector_validation' | 'recommendation_outcome' | 'runtime_test' | 'customer_constraint';
  relatedObjectId?: string;
  outcome: 'passed' | 'failed' | 'accepted' | 'rejected' | 'not_applicable';
  notes: string;
  capturedAt: string;
}
