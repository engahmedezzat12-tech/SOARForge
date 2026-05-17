// ============================================================
// SOARForge — Tenant Learning Profile Helpers
// Placeholder-safe local profile implementation.
// ============================================================

import type { TenantLearningProfile } from './intelligence-types';
import { DEFAULT_TENANT_PROFILE } from './feedback-learning-engine';

export function getDefaultTenantLearningProfile(): TenantLearningProfile {
  return DEFAULT_TENANT_PROFILE;
}

export function adjustConfidenceForTenant(profile: TenantLearningProfile, recommendationId: string, baseScore: number): number {
  const delta = profile.confidenceAdjustments[recommendationId] ?? 0;
  return Math.max(0, Math.min(100, baseScore + delta));
}
