// ============================================================
// SOARForge — Feedback Learning Engine
// Safe tenant-specific learning model. No cross-tenant leakage.
// ============================================================

import type { FeedbackEvent, IntelligenceMemoryRecord, TenantLearningProfile } from './intelligence-types';

export const DEFAULT_TENANT_PROFILE: TenantLearningProfile = {
  tenantId: 'local-demo-tenant',
  displayName: 'Local SOARForge Workspace',
  acceptedPatterns: [],
  rejectedPatterns: [],
  connectorOutcomes: {},
  runtimeValidation: {},
  safetyPreferences: ['Require review for high-impact response changes'],
  confidenceAdjustments: {},
};

export function applyFeedbackEvent(profile: TenantLearningProfile, event: FeedbackEvent): TenantLearningProfile {
  const next: TenantLearningProfile = {
    ...profile,
    acceptedPatterns: [...profile.acceptedPatterns],
    rejectedPatterns: [...profile.rejectedPatterns],
    connectorOutcomes: { ...profile.connectorOutcomes },
    runtimeValidation: { ...profile.runtimeValidation },
    confidenceAdjustments: { ...profile.confidenceAdjustments },
  };

  if (event.recommendationId && event.eventType === 'accepted') {
    next.acceptedPatterns.push(event.recommendationId);
    next.confidenceAdjustments[event.recommendationId] = (next.confidenceAdjustments[event.recommendationId] ?? 0) + 3;
  }
  if (event.recommendationId && event.eventType === 'rejected') {
    next.rejectedPatterns.push(event.recommendationId);
    next.confidenceAdjustments[event.recommendationId] = (next.confidenceAdjustments[event.recommendationId] ?? 0) - 5;
  }
  if (event.eventType === 'runtime_test_passed') next.runtimeValidation[event.playbookId] = 'passed';
  if (event.eventType === 'runtime_test_failed') next.runtimeValidation[event.playbookId] = 'failed';

  return next;
}

export function buildMemoryRecord(event: FeedbackEvent): IntelligenceMemoryRecord {
  return {
    id: `mem-${event.eventId}`,
    scope: 'tenant_specific',
    tenantId: event.tenantId,
    patternKey: event.recommendationId ?? event.eventType,
    summary: event.note ?? `Observed ${event.eventType} for ${event.playbookId}`,
    confidenceDelta: event.eventType === 'accepted' || event.eventType === 'runtime_test_passed' ? 3 : -3,
    lastObserved: event.timestamp,
    approvedForGlobalUse: false,
  };
}

export function getTenantLearningNotes(profile: TenantLearningProfile): string[] {
  const notes = [
    'Tenant-specific learning is isolated to this workspace and is not promoted globally without review.',
    'Accepted recommendations increase local confidence; rejected recommendations reduce local confidence.',
  ];
  const validatedConnectors = Object.entries(profile.connectorOutcomes).filter(([, v]) => v === 'validated').map(([k]) => k);
  if (validatedConnectors.length > 0) notes.push(`Validated connectors: ${validatedConnectors.join(', ')}.`);
  return notes;
}
