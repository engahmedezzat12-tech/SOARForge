import type {
  AuditLogRecord,
  ExportRecord,
  KnowledgeUpdateRecord,
  PlaybookRecord,
  ProductCoreSnapshot,
  TenantLearningRecord,
  TenantRecord,
  UserRecord,
  ValidationResultRecord,
  ValidationStatus,
} from './types';

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;

declare global {
  var __SOARFORGE_PRODUCT_CORE__: ProductCoreSnapshot | undefined;
}

function seed(): ProductCoreSnapshot {
  const timestamp = now();
  const tenant: TenantRecord = {
    id: 'tenant_internal_lab',
    name: 'SOARForge Internal Lab',
    slug: 'internal-lab',
    status: 'PILOT',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const user: UserRecord = {
    id: 'user_demo_admin',
    tenantId: tenant.id,
    email: 'admin@soarforge.local',
    name: 'SOARForge Demo Admin',
    role: 'TENANT_ADMIN',
    status: 'ACTIVE',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const playbook: PlaybookRecord = {
    id: 'pb_ransomware_auto_containment',
    tenantId: tenant.id,
    name: 'Ransomware Auto Containment',
    incidentType: 'Ransomware Behavior',
    platform: 'fortisoar',
    status: 'ready_with_review',
    data: { templateId: 'ransomware-auto-containment', source: 'demo-seed' },
    createdById: user.id,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const validationNames: Array<[ValidationResultRecord['itemType'], string, string, ValidationStatus]> = [
    ['connector', 'Group-IB EDR connector instance', 'SOAR Administrator', 'PENDING'],
    ['connector', 'Active Directory connector instance', 'SOAR Administrator', 'PENDING'],
    ['connector', 'Email / Notification connector instance', 'SOAR Administrator', 'PENDING'],
    ['action', 'Isolate Endpoint non-production validation', 'SOC Automation Engineer', 'PENDING'],
    ['action', 'Disable AD User non-production validation', 'SOC Automation Engineer', 'PENDING'],
    ['uat', 'End-to-end non-production UAT alert', 'SOC Lead', 'PENDING'],
    ['rollback', 'Rollback / reversal procedure', 'SOC Automation Engineer', 'PENDING'],
  ];
  return {
    tenants: [tenant],
    users: [user],
    playbooks: [playbook],
    exports: [],
    validationResults: validationNames.map(([itemType, itemName, owner, status]) => ({
      id: id('val'),
      tenantId: tenant.id,
      playbookId: playbook.id,
      itemType,
      itemName,
      owner,
      status,
      evidence: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
    knowledgeUpdates: [
      {
        id: 'ku_demo_mitre_2026_06',
        tenantId: tenant.id,
        source: 'MITRE ATT&CK',
        localVersion: '2026.05-local',
        stagedVersion: '2026.06-demo',
        status: 'REVIEW_REQUIRED',
        diff: [
          { diffId: 'diff_t1490_metadata', objectId: 'T1490', changeType: 'modified', impact: 'medium' },
          { diffId: 'diff_sigma_phishing_url', objectId: 'sigma-demo-phishing-url-click-context', changeType: 'added', impact: 'low' },
        ],
        affectedTemplates: [{ templateId: playbook.id, templateName: playbook.name, impact: 'medium' }],
        rollbackPoint: '2026.05-local',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    auditLogs: [
      {
        id: id('audit'),
        tenantId: tenant.id,
        userId: user.id,
        action: 'PRODUCT_CORE_INITIALIZED',
        targetType: 'tenant',
        targetId: tenant.id,
        metadata: { phase: 'phase-1-production-core' },
        createdAt: timestamp,
      },
    ],
    tenantLearning: [],
  };
}

export function getProductCoreStore(): ProductCoreSnapshot {
  if (!globalThis.__SOARFORGE_PRODUCT_CORE__) {
    globalThis.__SOARFORGE_PRODUCT_CORE__ = seed();
  }
  return globalThis.__SOARFORGE_PRODUCT_CORE__;
}

export function getTenantScopedSnapshot(tenantId: string): ProductCoreSnapshot {
  const store = getProductCoreStore();
  return {
    tenants: store.tenants.filter((t) => t.id === tenantId),
    users: store.users.filter((u) => u.tenantId === tenantId),
    playbooks: store.playbooks.filter((p) => p.tenantId === tenantId),
    exports: store.exports.filter((e) => e.tenantId === tenantId),
    validationResults: store.validationResults.filter((v) => v.tenantId === tenantId),
    knowledgeUpdates: store.knowledgeUpdates.filter((k) => !k.tenantId || k.tenantId === tenantId),
    auditLogs: store.auditLogs.filter((a) => !a.tenantId || a.tenantId === tenantId),
    tenantLearning: store.tenantLearning.filter((l) => l.tenantId === tenantId),
  };
}

export function addAuditLog(input: Omit<AuditLogRecord, 'id' | 'createdAt'>): AuditLogRecord {
  const store = getProductCoreStore();
  const record: AuditLogRecord = {
    id: id('audit'),
    createdAt: now(),
    ...input,
    metadata: input.metadata ?? {},
  };

  store.auditLogs.unshift(record);
  return record;
}

export function addTenant(input: Pick<TenantRecord, 'name' | 'slug'>): TenantRecord {
  const store = getProductCoreStore();
  const timestamp = now();
  const record: TenantRecord = {
    id: id('tenant'),
    name: input.name,
    slug: input.slug,
    status: 'PILOT',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  store.tenants.push(record);
  return record;
}

export function updateValidationResult(input: {
  id: string;
  tenantId: string;
  status: ValidationStatus;
  evidence?: string;
  validatedBy?: string;
}): ValidationResultRecord | undefined {
  const store = getProductCoreStore();
  const record = store.validationResults.find((v) => v.id === input.id && v.tenantId === input.tenantId);
  if (!record) return undefined;
  record.status = input.status;
  record.evidence = input.evidence ?? record.evidence;
  record.validatedBy = input.validatedBy ?? record.validatedBy;
  record.validatedAt = input.status === 'PASSED' || input.status === 'FAILED' ? now() : record.validatedAt;
  record.updatedAt = now();
  return record;
}

export function addExportRecord(input: Omit<ExportRecord, 'id' | 'createdAt'>): ExportRecord {
  const store = getProductCoreStore();
  const record: ExportRecord = { id: id('export'), createdAt: now(), ...input };
  store.exports.unshift(record);
  return record;
}

export function addTenantLearning(input: Omit<TenantLearningRecord, 'id' | 'createdAt'>): TenantLearningRecord {
  const store = getProductCoreStore();
  const record: TenantLearningRecord = { id: id('learn'), createdAt: now(), ...input };
  store.tenantLearning.unshift(record);
  return record;
}

export function summarizeReadiness(tenantId: string) {
  const scoped = getTenantScopedSnapshot(tenantId);
  const validations = scoped.validationResults;
  const passed = validations.filter((v) => v.status === 'PASSED').length;
  const failed = validations.filter((v) => v.status === 'FAILED').length;
  const pending = validations.filter((v) => v.status === 'PENDING').length;
  const applicableTotal = validations.filter((v) => v.status !== 'NOT_APPLICABLE').length || 1;
  const validationConfidence = Math.round((passed / applicableTotal) * 100);
  const riskPenalty = failed * 10;
  const tenantRuntimeConfidence = Math.max(0, Math.min(100, validationConfidence - riskPenalty));
  return { passed, failed, pending, applicableTotal, tenantRuntimeConfidence };
}
