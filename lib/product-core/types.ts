// ============================================================
// SOARForge Product Core — Phase 1-6 Types
// Production-core contracts for tenants, auth, RBAC, audit,
// validation persistence, deployment, and commercial packaging.
// ============================================================

export type ProductRole =
  | 'SUPER_ADMIN'
  | 'TENANT_ADMIN'
  | 'SOC_MANAGER'
  | 'SOC_ENGINEER'
  | 'VIEWER'
  | 'AUDITOR';

export type ValidationStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'NOT_APPLICABLE';

export type KnowledgeUpdateState =
  | 'NO_UPDATE'
  | 'UPDATE_AVAILABLE'
  | 'STAGED'
  | 'REVIEW_REQUIRED'
  | 'APPROVED'
  | 'PARTIALLY_APPROVED'
  | 'REJECTED'
  | 'APPLIED'
  | 'ROLLED_BACK'
  | 'FAILED';

export interface TenantRecord {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PILOT';
  createdAt: string;
  updatedAt: string;
}

export interface UserRecord {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: ProductRole;
  status: 'ACTIVE' | 'INVITED' | 'DISABLED';
  createdAt: string;
  updatedAt: string;
}

export interface PlaybookRecord {
  id: string;
  tenantId: string;
  name: string;
  incidentType: string;
  platform: string;
  status: 'draft' | 'ready_with_review' | 'validated' | 'archived';
  data: Record<string, unknown>;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExportRecord {
  id: string;
  tenantId: string;
  playbookId: string;
  exportType: string;
  platform: string;
  fileName: string;
  readinessScore?: number;
  threatCoverageScore?: number;
  intelligenceScore?: number;
  createdById?: string;
  createdAt: string;
}

export interface ValidationResultRecord {
  id: string;
  tenantId: string;
  playbookId?: string;
  itemType: 'connector' | 'action' | 'uat' | 'rollback' | 'knowledge' | 'security';
  itemName: string;
  status: ValidationStatus;
  owner: string;
  evidence?: string;
  validatedBy?: string;
  validatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeUpdateRecord {
  id: string;
  tenantId?: string;
  source: string;
  localVersion: string;
  stagedVersion?: string;
  status: KnowledgeUpdateState;
  diff: unknown[];
  affectedTemplates: unknown[];
  approvedBy?: string;
  approvedAt?: string;
  appliedAt?: string;
  rollbackPoint?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogRecord {
  id: string;
  tenantId?: string;
  userId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  ipAddress?: string;
  metadata: Record<string, unknown>;
  previousHash?: string;
  integrityHash?: string;
  integrityVersion?: number;
  createdAt: string;
}

export interface TenantLearningRecord {
  id: string;
  tenantId: string;
  signalType: 'recommendation_accepted' | 'recommendation_rejected' | 'import_succeeded' | 'import_failed' | 'connector_passed' | 'connector_failed' | 'uat_passed' | 'uat_failed';
  signalKey: string;
  confidenceDelta: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ProductCoreSnapshot {
  tenants: TenantRecord[];
  users: UserRecord[];
  playbooks: PlaybookRecord[];
  exports: ExportRecord[];
  validationResults: ValidationResultRecord[];
  knowledgeUpdates: KnowledgeUpdateRecord[];
  auditLogs: AuditLogRecord[];
  tenantLearning: TenantLearningRecord[];
}
