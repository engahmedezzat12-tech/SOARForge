// ============================================================
// SOARForge — Normalized / Vendor-Neutral Playbook Types
// ============================================================

import type { SoarPlatformId } from '../soar-platforms';

// ── Step Types ──────────────────────────────────────────────
export type NormalizedStepType =
  | 'trigger'
  | 'context'
  | 'entity_extraction'
  | 'enrichment'
  | 'scoring'
  | 'decision'
  | 'approval'
  | 'action'
  | 'notification'
  | 'ticket'
  | 'manual'
  | 'comment'
  | 'rollback'
  | 'final';

// ── Trigger ──────────────────────────────────────────────────
export interface NormalizedTrigger {
  type: 'alert' | 'incident' | 'webhook' | 'scheduled' | 'manual' | 'email' | 'custom';
  sourcePlatform?: string;
  filters?: Record<string, string>;
  description?: string;
}

// ── Entity ───────────────────────────────────────────────────
export interface NormalizedEntity {
  id: string;
  label: string;
  type: 'hostname' | 'ip' | 'user' | 'hash' | 'url' | 'email' | 'domain' | 'process' | 'file' | 'custom';
  required: boolean;
  extractedFrom?: string;
}

// ── Artifact ─────────────────────────────────────────────────
export interface NormalizedArtifact {
  id: string;
  label: string;
  cefField?: string;
  required: boolean;
}

// ── Condition ────────────────────────────────────────────────
export interface NormalizedCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'not_contains' | 'exists';
  value: string | number | boolean;
}

// ── Step ─────────────────────────────────────────────────────
export interface NormalizedStep {
  id: string;
  name: string;
  type: NormalizedStepType;
  description?: string;
  normalizedAction?: string;      // e.g. "edr.device.isolate"
  connectorCategory?: string;     // e.g. "edr"
  parameters?: Record<string, string>;
  outputs?: Record<string, string>;
  conditions?: NormalizedCondition[];
  isDestructive?: boolean;
  approvalRequired?: boolean;
  rollbackSupported?: boolean;
  verifyInTenant?: boolean;
}

// ── Route ────────────────────────────────────────────────────
export interface NormalizedRoute {
  sourceStepId: string;
  targetStepId: string;
  condition?: 'success' | 'failure' | 'true' | 'false' | 'always' | string;
  label?: string;
}

// ── Action (in registry) ─────────────────────────────────────
export interface NormalizedAction {
  category: string;
  normalizedCommand: string;
  connectorRef: string;
  parameters: Record<string, string>;
  isDestructive: boolean;
  approvalRecommended: boolean;
  rollbackSupported: boolean;
  tenantRequirements?: string;
}

// ── Connector Requirement ────────────────────────────────────
export interface NormalizedConnectorRequirement {
  id: string;
  category: string;
  displayName: string;
  required: boolean;
  supportedPlatforms: SoarPlatformId[];
  verifyInTenant: boolean;
}

// ── Scoring ──────────────────────────────────────────────────
export interface NormalizedScoringModel {
  type: string;
  rules: Array<{ label: string; points: number; condition?: string }>;
  thresholds: Array<{ label: string; minScore: number; maxScore: number; action: string }>;
}

// ── Approval ─────────────────────────────────────────────────
export interface NormalizedApproval {
  id: string;
  stepId: string;
  approverRole: string;
  timeoutHours: number;
  onTimeout: 'escalate' | 'deny' | 'auto_approve';
}

// ── Fallback ─────────────────────────────────────────────────
export interface NormalizedFallback {
  enabled: boolean;
  onError: 'notify' | 'ticket' | 'stop' | 'rollback';
  notifyChannel?: string;
}

// ── Testing ──────────────────────────────────────────────────
export interface NormalizedTestingPlan {
  uatScenarios: string[];
  rollbackSteps: string[];
  acceptanceCriteria: string[];
}

// ── Documentation ────────────────────────────────────────────
export interface NormalizedDocumentation {
  summary: string;
  connectorMatrix: string[];
  deploymentNotes: string[];
  tenantChecklist: string[];
}

// ── Playbook (root) ──────────────────────────────────────────
export interface NormalizedPlaybook {
  id: string;
  name: string;
  description: string;
  version: string;
  templateId: string;
  targetPlatform: SoarPlatformId;
  trigger: NormalizedTrigger;
  entities: NormalizedEntity[];
  artifacts: NormalizedArtifact[];
  connectors: NormalizedConnectorRequirement[];
  scoringModel: NormalizedScoringModel;
  steps: NormalizedStep[];
  routes: NormalizedRoute[];
  approvals: NormalizedApproval[];
  fallback: NormalizedFallback;
  testing: NormalizedTestingPlan;
  documentation: NormalizedDocumentation;
}
