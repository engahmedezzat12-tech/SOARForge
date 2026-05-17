import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

import type {
  AuditLogRecord,
  KnowledgeUpdateRecord,
  PlaybookRecord,
  ProductCoreSnapshot,
  TenantLearningRecord,
  TenantRecord,
  UserRecord,
  ValidationResultRecord,
  ValidationStatus,
} from './types';

function toIso(value: Date | null | undefined): string | undefined {
  return value ? value.toISOString() : undefined;
}

function toJsonRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toJsonArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export async function getDatabaseSnapshot(tenantId = 'tenant_internal_lab'): Promise<ProductCoreSnapshot> {
  let tenant = await prisma.tenant.findFirst({
    where: { slug: 'internal-lab' },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        id: 'tenant_internal_lab',
        name: 'SOARForge Internal Lab',
        slug: 'internal-lab',
        status: 'PILOT',
      },
    });
  }

  const effectiveTenantId = tenantId === 'tenant_internal_lab' ? tenant.id : tenantId;

  const [tenants, users, playbooks, exports, validationResults, knowledgeUpdates, auditLogs, tenantLearning] =
    await Promise.all([
      prisma.tenant.findMany({
        where: { id: effectiveTenantId },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.user.findMany({
        where: { tenantId: effectiveTenantId },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.playbook.findMany({
        where: { tenantId: effectiveTenantId },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.export.findMany({
        where: { tenantId: effectiveTenantId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.validationResult.findMany({
        where: { tenantId: effectiveTenantId },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.knowledgeUpdate.findMany({
        where: {
          OR: [{ tenantId: effectiveTenantId }, { tenantId: null }],
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.findMany({
        where: {
          OR: [{ tenantId: effectiveTenantId }, { tenantId: null }],
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.tenantLearningProfile.findMany({
        where: { tenantId: effectiveTenantId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

  return {
    tenants: tenants.map<TenantRecord>((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      status: t.status as TenantRecord['status'],
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
    users: users.map<UserRecord>((u) => ({
      id: u.id,
      tenantId: u.tenantId,
      email: u.email,
      name: u.name ?? '',
      role: u.role as UserRecord['role'],
      status: u.status as UserRecord['status'],
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    })),
    playbooks: playbooks.map<PlaybookRecord>((p) => ({
      id: p.id,
      tenantId: p.tenantId,
      name: p.name,
      incidentType: p.incidentType ?? '',
      platform: p.platform ?? '',
      status: p.status as PlaybookRecord['status'],
      data: toJsonRecord(p.data),
      createdById: p.createdById ?? undefined,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
    exports: exports.map((e) => ({
      id: e.id,
      tenantId: e.tenantId,
      playbookId: e.playbookId,
      exportType: e.exportType,
      platform: e.platform,
      fileName: e.fileName ?? '',
      readinessScore: e.readinessScore ?? undefined,
      threatCoverageScore: e.threatCoverageScore ?? undefined,
      intelligenceScore: e.intelligenceScore ?? undefined,
      createdById: e.createdById ?? undefined,
      createdAt: e.createdAt.toISOString(),
    })),
    validationResults: validationResults.map<ValidationResultRecord>((v) => ({
      id: v.id,
      tenantId: v.tenantId,
      playbookId: v.playbookId ?? undefined,
      itemType: v.itemType as ValidationResultRecord['itemType'],
      itemName: v.itemName,
      owner: v.owner,
      status: v.status as ValidationResultRecord['status'],
      evidence: v.evidence ?? '',
      validatedBy: v.validatedBy ?? undefined,
      validatedAt: toIso(v.validatedAt),
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    })),
    knowledgeUpdates: knowledgeUpdates.map<KnowledgeUpdateRecord>((k) => ({
      id: k.id,
      tenantId: k.tenantId ?? undefined,
      source: k.source,
      localVersion: k.localVersion ?? '',
      stagedVersion: k.stagedVersion ?? undefined,
      status: k.status as KnowledgeUpdateRecord['status'],
      diff: toJsonArray(k.diff),
      affectedTemplates: toJsonArray(k.affectedTemplates),
      approvedBy: k.approvedBy ?? undefined,
      approvedAt: toIso(k.approvedAt),
      appliedAt: toIso(k.appliedAt),
      rollbackPoint: k.rollbackPoint ?? undefined,
      createdAt: k.createdAt.toISOString(),
      updatedAt: k.updatedAt.toISOString(),
    })),
    auditLogs: auditLogs.map<AuditLogRecord>((a) => ({
      id: a.id,
      tenantId: a.tenantId ?? undefined,
      userId: a.userId ?? undefined,
      action: a.action,
      targetType: a.targetType ?? undefined,
      targetId: a.targetId ?? undefined,
      ipAddress: a.ipAddress ?? undefined,
      metadata: toJsonRecord(a.metadata),
      createdAt: a.createdAt.toISOString(),
    })),
    tenantLearning: tenantLearning.map<TenantLearningRecord>((l) => ({
      id: l.id,
      tenantId: l.tenantId,
      signalType: l.signalType as TenantLearningRecord['signalType'],
      signalKey: l.signalKey,
      confidenceDelta: l.confidenceDelta,
      metadata: toJsonRecord(l.metadata),
      createdAt: l.createdAt.toISOString(),
    })),
  };
}

export async function updateDatabaseValidationResult(input: {
  id: string;
  tenantId: string;
  status: ValidationStatus;
  evidence?: string;
  validatedBy?: string;
}): Promise<ValidationResultRecord | undefined> {
  const updated = await prisma.validationResult.update({
    where: { id: input.id },
    data: {
      status: input.status,
      evidence: input.evidence,
      validatedBy: input.validatedBy,
      validatedAt: input.status === 'PASSED' || input.status === 'FAILED' ? new Date() : undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: input.tenantId,
      userId: 'user_demo_admin',
      action: 'VALIDATION_RESULT_UPDATED',
      targetType: 'validation_result',
      targetId: updated.id,
      metadata: {
        status: input.status,
        evidenceProvided: Boolean(input.evidence),
      },
    },
  });

  return {
    id: updated.id,
    tenantId: updated.tenantId,
    playbookId: updated.playbookId ?? undefined,
    itemType: updated.itemType as ValidationResultRecord['itemType'],
    itemName: updated.itemName,
    owner: updated.owner,
    status: updated.status as ValidationResultRecord['status'],
    evidence: updated.evidence ?? '',
    validatedBy: updated.validatedBy ?? undefined,
    validatedAt: toIso(updated.validatedAt),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function writeDatabaseAuditLog(input: Omit<AuditLogRecord, 'id' | 'createdAt'>): Promise<AuditLogRecord> {
  const created = await prisma.auditLog.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      ipAddress: input.ipAddress,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });

  return {
    id: created.id,
    tenantId: created.tenantId ?? undefined,
    userId: created.userId ?? undefined,
    action: created.action,
    targetType: created.targetType ?? undefined,
    targetId: created.targetId ?? undefined,
    ipAddress: created.ipAddress ?? undefined,
    metadata: toJsonRecord(created.metadata),
    createdAt: created.createdAt.toISOString(),
  };
}

export async function summarizeDatabaseReadiness(tenantId = 'tenant_internal_lab') {
  const snapshot = await getDatabaseSnapshot(tenantId);
  const validations = snapshot.validationResults;
  const passed = validations.filter((v) => v.status === 'PASSED').length;
  const failed = validations.filter((v) => v.status === 'FAILED').length;
  const pending = validations.filter((v) => v.status === 'PENDING').length;
  const applicableTotal = validations.filter((v) => v.status !== 'NOT_APPLICABLE').length || 1;
  const validationConfidence = Math.round((passed / applicableTotal) * 100);
  const riskPenalty = failed * 10;
  const tenantRuntimeConfidence = Math.max(0, Math.min(100, validationConfidence - riskPenalty));

  return { passed, failed, pending, applicableTotal, tenantRuntimeConfidence };
}