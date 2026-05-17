import { addAuditLog } from './store';

export async function writeAuditLog(input: {
  tenantId?: string;
  userId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}) {
  return addAuditLog({
    tenantId: input.tenantId,
    userId: input.userId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    ipAddress: input.ipAddress,
    metadata: input.metadata ?? {},
  });
}
