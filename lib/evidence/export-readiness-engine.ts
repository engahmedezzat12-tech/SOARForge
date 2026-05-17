// ============================================================
// SOARForge — Export Readiness Engine
// Combines platform compatibility + adapter readiness + safety checks.
// ============================================================

import type { SoarPlatformId } from '@/lib/soar-platforms';
import type { PlatformReadinessResult } from '@/lib/adapters/platform-adapter';
import type { NormalizedPlaybook } from '@/lib/normalized/normalized-types';
import { getPlatformEvidenceProfile } from './platform-evidence-registry';
import { UNSAFE_PATTERN_RULES } from './unsafe-pattern-rules';
import type {
  ExportReadinessResult,
  ExportReadinessStatus,
  UnsafePatternFinding,
} from './evidence-types';

type FlexibleStep = {
  id?: string;
  name?: string;
  type?: string;
  normalizedAction?: string;
  actionId?: string;
  description?: string;
  isDestructive?: boolean;
  approvalRequired?: boolean;
};

function stepText(step: FlexibleStep): string {
  return [
    step.id,
    step.name,
    step.type,
    step.normalizedAction,
    step.actionId,
    step.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function hasApprovalStep(playbook: NormalizedPlaybook): boolean {
  const steps = ((playbook as unknown as { steps?: FlexibleStep[] }).steps ?? []);
  return steps.some((s) => {
    const text = stepText(s);
    return s.type === 'approval' || text.includes('approval') || text.includes('manual review');
  });
}

function detectUnsafePatterns(playbook: NormalizedPlaybook): UnsafePatternFinding[] {
  const steps = ((playbook as unknown as { steps?: FlexibleStep[] }).steps ?? []);
  const approvalExists = hasApprovalStep(playbook);
  const findings: UnsafePatternFinding[] = [];

  for (const step of steps) {
    const text = stepText(step);

    for (const rule of UNSAFE_PATTERN_RULES) {
      const matched = rule.keywords.some((k) => text.includes(k.toLowerCase()));
      if (!matched) continue;

      const missingApproval = rule.requiresApproval && !approvalExists && !step.approvalRequired;

      const approvalCovered = rule.requiresApproval && (approvalExists || !!step.approvalRequired);

      findings.push({
        id: rule.id,
        title: rule.title,
        severity: missingApproval ? 'critical' : approvalCovered ? 'warning' : rule.severity,
        message: missingApproval
          ? `${rule.message} No approval step was found in the playbook.`
          : approvalCovered
            ? `${rule.message} Approval coverage is present; verify approver scope and timeout before production.`
            : rule.message,
        recommendation: rule.recommendation,
        affectedStepId: step.id,
        affectedStepName: step.name,
      });
    }
  }

  return findings;
}

function calculateScore(args: {
  baseConfidence: number;
  platformReadiness?: PlatformReadinessResult;
  unsafeFindings: UnsafePatternFinding[];
}): number {
  let score = args.baseConfidence;

  if (args.platformReadiness) {
    const criticalFailed = args.platformReadiness.items?.filter((i) => i.critical && !i.passed).length ?? 0;
    const normalFailed = args.platformReadiness.items?.filter((i) => !i.critical && !i.passed).length ?? 0;

    score -= criticalFailed * 15;
    score -= normalFailed * 5;

    if (args.platformReadiness.blockers?.length) score -= args.platformReadiness.blockers.length * 10;
    if (args.platformReadiness.warnings?.length) score -= args.platformReadiness.warnings.length * 3;
  }

  const criticalUnsafe = args.unsafeFindings.filter((f) => f.severity === 'critical').length;
  const warningUnsafe = args.unsafeFindings.filter((f) => f.severity === 'warning').length;

  score -= criticalUnsafe * 15;
  score -= warningUnsafe * 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function statusFromScore(score: number, hasBlockers: boolean): ExportReadinessStatus {
  if (hasBlockers) return 'blocked';
  if (score >= 90) return 'production_ready';
  if (score >= 75) return 'ready_with_review';
  if (score >= 50) return 'guided_build';
  return 'not_recommended';
}

export function evaluateExportReadiness(
  playbook: NormalizedPlaybook,
  platformId: SoarPlatformId,
  platformReadiness?: PlatformReadinessResult,
): ExportReadinessResult {
  const profile = getPlatformEvidenceProfile(platformId);
  const unsafeFindings = detectUnsafePatterns(playbook);

  const readinessBlockers = platformReadiness?.blockers ?? [];
  const criticalUnsafe = unsafeFindings.filter((f) => f.severity === 'critical');

  const blockers = [
    ...readinessBlockers,
    ...criticalUnsafe.map((f) => f.title),
  ];

  const warnings = [
    ...(platformReadiness?.warnings ?? []),
    ...unsafeFindings
      .filter((f) => f.severity !== 'critical')
      .map((f) => f.title),
  ];

  const score = calculateScore({
    baseConfidence: profile.confidence,
    platformReadiness,
    unsafeFindings,
  });

  const status = statusFromScore(score, blockers.length > 0);

  return {
    platformId,
    platformName: profile.displayName,
    score,
    status,
    customerFacingValidationLabel: profile.customerFacingValidationLabel,
    runtimeCertified: profile.runtimeCertified,
    requiresTenantVerification: profile.requiresTenantVerification,
    blockers,
    warnings,
    manualRequirements: profile.manualRequirements,
    limitations: profile.limitations,
    safeToGenerate: profile.safeToGenerate,
    unsafeFindings,
  };
}
