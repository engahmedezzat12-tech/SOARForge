import type { GlobalKnowledgeRecord, TenantLearningRecord } from './knowledge-update-types';

export interface MergedKnowledgeRecord extends GlobalKnowledgeRecord {
  tenantOverlay?: TenantLearningRecord[];
  separationNotice: string;
}

export function mergeGlobalKnowledgeWithTenantLearning(args: {
  global: GlobalKnowledgeRecord;
  tenantLearning: TenantLearningRecord[];
}): MergedKnowledgeRecord {
  return {
    ...args.global,
    tenantOverlay: args.tenantLearning.filter((record) => record.relatedObjectId === args.global.objectId),
    separationNotice: 'Global knowledge remains immutable. Tenant learning is applied as a local overlay and is not promoted globally without review.',
  };
}

export function assertNoCrossTenantLearningLeakage(records: TenantLearningRecord[]): boolean {
  const tenantIds = new Set(records.map((record) => record.tenantId));
  return tenantIds.size <= 1;
}
