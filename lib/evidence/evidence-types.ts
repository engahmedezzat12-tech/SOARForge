// ============================================================
// SOARForge — Export Readiness / Compatibility Types
// Customer-facing labels only. No repository/GitHub wording in UI.
// ============================================================

import type { SoarPlatformId } from '@/lib/soar-platforms';

export type InternalValidationLevel =
  | 'blueprint_only'
  | 'schema_validated'
  | 'platform_pattern_validated'
  | 'runtime_certified'
  | 'not_recommended';

export type CustomerValidationLabel =
  | 'Guided Build'
  | 'Format Validated'
  | 'Platform Pattern Validated'
  | 'Runtime Certified'
  | 'Not Recommended';

export type ExportReadinessStatus =
  | 'production_ready'
  | 'ready_with_review'
  | 'guided_build'
  | 'blocked'
  | 'not_recommended';

export interface PlatformEvidenceProfile {
  platformId: SoarPlatformId;
  displayName: string;
  customerFacingValidationLabel: CustomerValidationLabel;
  internalValidationLevel: InternalValidationLevel;
  confidence: number;
  runtimeCertified: boolean;
  exportStrategy:
    | 'direct_import_candidate'
    | 'schema_validated_export'
    | 'platform_pattern_validated_export'
    | 'partial_export'
    | 'guided_build_package'
    | 'manual_implementation_guide';
  fileExtension: string;
  manualRequirements: string[];
  limitations: string[];
  safeToGenerate: string[];
  requiresTenantVerification: boolean;
}

export interface UnsafePatternFinding {
  id: string;
  title: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  recommendation: string;
  affectedStepId?: string;
  affectedStepName?: string;
}

export interface ExportReadinessResult {
  platformId: SoarPlatformId;
  platformName: string;
  score: number;
  status: ExportReadinessStatus;
  customerFacingValidationLabel: CustomerValidationLabel;
  runtimeCertified: boolean;
  requiresTenantVerification: boolean;
  blockers: string[];
  warnings: string[];
  manualRequirements: string[];
  limitations: string[];
  safeToGenerate: string[];
  unsafeFindings: UnsafePatternFinding[];
}
