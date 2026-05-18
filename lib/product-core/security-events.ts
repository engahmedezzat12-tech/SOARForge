import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

export const SecurityEvents = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  AUTH_REQUIRED_DENIED: 'AUTH_REQUIRED_DENIED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RATE_LIMIT_HIT: 'RATE_LIMIT_HIT',
  VALIDATION_RESULT_UPDATED: 'VALIDATION_RESULT_UPDATED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  OFFLINE_BUNDLE_STAGED: 'OFFLINE_BUNDLE_STAGED',
  OFFLINE_BUNDLE_REJECTED: 'OFFLINE_BUNDLE_REJECTED',
  KNOWLEDGE_UPDATE_APPROVED: 'KNOWLEDGE_UPDATE_APPROVED',
  KNOWLEDGE_UPDATE_APPLIED: 'KNOWLEDGE_UPDATE_APPLIED',
  KNOWLEDGE_UPDATE_ROLLED_BACK: 'KNOWLEDGE_UPDATE_ROLLED_BACK',
} as const;

export type SecurityEventType = (typeof SecurityEvents)[keyof typeof SecurityEvents];

export async function recordSecurityEvent(input: {
  tenantId?: string | null;
  userId?: string | null;
  eventType: SecurityEventType | string;
  severity?: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    return await prisma.securityEvent.create({
      data: {
        tenantId: input.tenantId ?? null,
        userId: input.userId ?? null,
        eventType: input.eventType,
        severity: input.severity ?? 'INFO',
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    console.error('Security event write failed:', error);
    return undefined;
  }
}
