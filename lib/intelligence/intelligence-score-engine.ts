// ============================================================
// SOARForge — Intelligence Score Engine
// Believable scoring with caps for tenant validation and safety gaps.
// ============================================================

import type { IntelligenceRecommendation, IntelligenceScoreBreakdown, PlaybookIntelligenceContext } from './intelligence-types';

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function severityPenalty(recommendations: IntelligenceRecommendation[]): number {
  return recommendations.reduce((sum, r) => {
    if (r.severity === 'critical') return sum + 18;
    if (r.severity === 'high') return sum + 10;
    if (r.severity === 'medium') return sum + 5;
    if (r.severity === 'low') return sum + 2;
    return sum + 0;
  }, 0);
}

export function calculateIntelligenceScore(context: PlaybookIntelligenceContext, recommendations: IntelligenceRecommendation[]): IntelligenceScoreBreakdown {
  const bestPracticeAlignment = clamp(100 - severityPenalty(recommendations));
  const detectionCoverage = clamp(context.detectionReferences.length > 0 ? 85 + Math.min(10, context.detectionReferences.length) : 45);
  const responseSafety = clamp(90 - context.destructiveActions.filter((a) => !a.rollbackSupported).length * 10 - (context.approvals.length === 0 && context.destructiveActions.length > 0 ? 20 : 0));
  const platformReadiness = context.exportReadiness.score;
  const visibleThreatCoverage = !context.exportReadiness.runtimeCertified && context.threatCoverage.score > 95 ? 95 : context.threatCoverage.score;
  const documentationQuality = clamp(80 + Math.min(15, context.threatCoverage.recommendedEnhancements.length * 2));
  const testCoverage = clamp(context.safeTestScenarios.length > 0 || context.threatCoverage.testCoverage.length > 0 ? 88 : 62);

  let overall = clamp(
    bestPracticeAlignment * 0.24 +
    visibleThreatCoverage * 0.18 +
    detectionCoverage * 0.14 +
    responseSafety * 0.16 +
    platformReadiness * 0.14 +
    documentationQuality * 0.08 +
    testCoverage * 0.06,
  );

  const appliedCaps: string[] = [];
  if (!context.exportReadiness.runtimeCertified && context.threatCoverage.score > 95) {
    appliedCaps.push('Threat Coverage display capped at 95 until runtime tenant validation is completed.');
  }
  if (!context.exportReadiness.runtimeCertified && overall > 95) {
    overall = 95;
    appliedCaps.push('Overall Intelligence Score capped at 95 until runtime tenant validation is completed.');
  }
  if (context.exportBlockers.length > 0 && overall > 90) {
    overall = 90;
    appliedCaps.push('Capped at 90 while export readiness blockers remain open.');
  }
  if (context.exportReadiness.manualRequirements.some((m) => m.toLowerCase().includes('uuid')) && overall > 90) {
    overall = 90;
    appliedCaps.push('Capped at 90 until connector UUIDs and tenant-specific references are configured.');
  }
  if (context.destructiveActions.length > 0 && context.approvals.length === 0 && overall > 80) {
    overall = 80;
    appliedCaps.push('Capped at 80 because high-impact response actions require approval coverage.');
  }

  return {
    bestPracticeAlignment,
    threatCoverage: visibleThreatCoverage,
    detectionCoverage,
    responseSafety,
    platformReadiness,
    documentationQuality,
    testCoverage,
    overall,
    appliedCaps,
  };
}
