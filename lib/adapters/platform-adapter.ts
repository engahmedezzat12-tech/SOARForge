// ============================================================
// SOARForge — Vendor Adapter Interface + Export Result Types
// ============================================================

import type { SoarPlatformId } from '../soar-platforms';
import type { NormalizedPlaybook } from '../normalized/normalized-types';

export interface PlatformReadinessItem {
  id: string;
  label: string;
  passed: boolean;
  critical: boolean;
  message: string;
  recommendation?: string;
}

export interface PlatformReadinessResult {
  platform: SoarPlatformId;
  overallReady: boolean;
  directImportReady: boolean;
  items: PlatformReadinessItem[];
  warnings: string[];
  blockers: string[];
}

export interface VendorExportResult {
  platform: SoarPlatformId;
  platformName: string;
  exportType: 'direct_import' | 'blueprint' | 'draft' | 'documentation';
  fileName: string;
  mimeType: string;
  directImportSupported: boolean;
  blueprintOnly: boolean;
  requiresTenantVerification: boolean;
  warnings: string[];
  content: unknown;
}

export interface VendorAdapter {
  platformId: SoarPlatformId;
  platformName: string;
  exportFormat: string;
  directImportSupported: boolean;
  blueprintOnly: boolean;
  requiresTenantVerification: boolean;
  generateExport(
    playbook: NormalizedPlaybook,
    deploymentProfile: Record<string, unknown>,
  ): VendorExportResult;
  validateReadiness(
    playbook: NormalizedPlaybook,
    deploymentProfile: Record<string, unknown>,
  ): PlatformReadinessResult;
  generateConnectorChecklist(playbook: NormalizedPlaybook): string;
  generateDocumentation(playbook: NormalizedPlaybook): string;
}
