import type { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { prisma } from '@/lib/db/prisma';

export type HashChainedAuditInput = {
  tenantId?: string | null;
  userId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
};

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(object[key])}`)
    .join(',')}}`;
}

function hashAuditPayload(input: {
  previousHash: string;
  tenantId?: string | null;
  userId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}) {
  const payload = {
    previousHash: input.previousHash,
    tenantId: input.tenantId ?? null,
    userId: input.userId ?? null,
    action: input.action,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    ipAddress: input.ipAddress ?? null,
    metadata: input.metadata ?? {},
    createdAt: input.createdAt.toISOString(),
    integrityVersion: 1,
  };

  return createHash('sha256').update(canonicalize(payload)).digest('hex');
}

export async function createHashChainedAuditLog(input: HashChainedAuditInput) {
  const tenantId = input.tenantId ?? null;
  const previous = await prisma.auditLog.findFirst({
    where: { tenantId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { integrityHash: true },
  });

  const createdAt = new Date();
  const previousHash = previous?.integrityHash ?? 'GENESIS';
  const metadata = input.metadata ?? {};
  const integrityHash = hashAuditPayload({ ...input, previousHash, metadata, createdAt });

  return prisma.auditLog.create({
    data: {
      tenantId,
      userId: input.userId ?? null,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      ipAddress: input.ipAddress ?? null,
      metadata: metadata as Prisma.InputJsonValue,
      previousHash,
      integrityHash,
      integrityVersion: 1,
      createdAt,
    },
  });
}

export async function verifyAuditHashChain(tenantId?: string | null) {
  const logs = await prisma.auditLog.findMany({
    where: { tenantId: tenantId ?? null },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  let previousHash = 'GENESIS';
  let hashChainStarted = false;
  let legacyWithoutHash = 0;
  const failures: Array<{ id: string; reason: string }> = [];

  for (const log of logs) {
    if (!log.integrityHash) {
      if (!hashChainStarted) {
        legacyWithoutHash += 1;
        continue;
      }
      failures.push({ id: log.id, reason: 'missing_integrity_hash_after_chain_started' });
      continue;
    }

    hashChainStarted = true;

    if ((log.previousHash ?? 'GENESIS') !== previousHash) {
      failures.push({ id: log.id, reason: 'previous_hash_mismatch' });
    }

    const expected = hashAuditPayload({
      previousHash,
      tenantId: log.tenantId,
      userId: log.userId,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      ipAddress: log.ipAddress,
      metadata: (log.metadata ?? {}) as Record<string, unknown>,
      createdAt: log.createdAt,
    });

    if (expected !== log.integrityHash) {
      failures.push({ id: log.id, reason: 'integrity_hash_mismatch' });
    }

    previousHash = log.integrityHash;
  }

  return {
    checked: logs.length,
    valid: failures.length === 0,
    legacyWithoutHash,
    hashed: logs.length - legacyWithoutHash,
    failures,
  };
}
