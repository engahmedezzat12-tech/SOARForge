import type { ThreatCoverageResult } from '../threat-knowledge/threat-knowledge-types';
// ============================================================
// SOARForge Professional — Customer Documentation Types
// ============================================================

import type { SoarPlatformId } from '../soar-platforms';

// ── Document Metadata ───────────────────────────────────────
export interface DocumentMetadata {
  playbookName: string;
  templateId: string;
  targetPlatform: SoarPlatformId;
  platformName: string;
  exportType: 'direct_import' | 'blueprint';
  directImportSupported: boolean;
  blueprintOnly: boolean;
  requiresTenantVerification: boolean;
  generatedAt: string;
  version: string;
  preparedFor: string;
  preparedBy: string;
  classification: string;
}

// ── Configuration Summary ───────────────────────────────────
export interface ConfigurationSummary {
  playbookName: string;
  useCase: string;
  targetPlatform: string;
  exportMode: string;
  directImportSupported: boolean;
  blueprintOnly: boolean;
  tenantVerificationRequired: boolean;
  severity: string;
  owner: string;
  status: string;
}

// ── Workflow Step ───────────────────────────────────────────
export interface DocumentWorkflowStep {
  stepNumber: number;
  name: string;
  type: string;
  purpose: string;
  input: string;
  output: string;
  tenantVerification: boolean;
}

// ── Scoring Rule ────────────────────────────────────────────
export interface DocumentScoringRule {
  rule: string;
  condition: string;
  points: number;
  mitre?: string;
  purpose: string;
}

// ── Scoring Threshold ───────────────────────────────────────
export interface DocumentThreshold {
  scoreRange: string;
  decision: string;
  action: string;
  approvalRequired: boolean;
  notes: string;
}

// ── MITRE Mapping ───────────────────────────────────────────
export interface MitreMapping {
  technique: string;
  name: string;
  whereUsed: string;
  riskContribution: string;
}

// ── Connector Matrix ────────────────────────────────────────
export interface ConnectorMatrixEntry {
  connector: string;
  category: string;
  usedFor: string;
  required: boolean;
  platformEquivalent: string;
  configurationRequired: string;
  verificationStatus: string;
  notes: string;
}

// ── Response Action ─────────────────────────────────────────
export interface ResponseAction {
  action: string;
  category: string;
  destructive: boolean;
  approvalRecommended: boolean;
  rollbackSupported: boolean;
  rollbackAction: string;
  tenantVerification: boolean;
}

// ── Fallback Item ───────────────────────────────────────────
export interface FallbackItem {
  failureScenario: string;
  manualAction: string;
  responsibleTeam: string;
  escalationPath: string;
  notes: string;
}

// ── Test Case ───────────────────────────────────────────────
export interface TestCase {
  testId: string;
  scenario: string;
  expectedResult: string;
  passCriteria: string;
  notes: string;
}

// ── Readiness Check ─────────────────────────────────────────
export interface ReadinessCheck {
  check: string;
  status: 'pass' | 'fail' | 'warning';
  notes: string;
}

// ── Deployment Step ─────────────────────────────────────────
export interface DeploymentStep {
  step: string;
  completed: boolean;
}

// ── Limitation ──────────────────────────────────────────────
export interface Limitation {
  category: string;
  description: string;
}

// ── Full Customer Document ──────────────────────────────────
export interface CustomerDocument {
  metadata: DocumentMetadata;
  executiveSummary: string;
  configurationSummary: ConfigurationSummary;
  workflowSteps: DocumentWorkflowStep[];
  scoringModel: {
    type: string;
    maxScore: number;
    rules: DocumentScoringRule[];
    thresholds: DocumentThreshold[];
    decisionLogic: string;
  };
  mitreMapping: MitreMapping[];
  threatCoverage?: ThreatCoverageResult;
  connectorMatrix: ConnectorMatrixEntry[];
  vendorNotes: string;
  responseActions: ResponseAction[];
  approvalFlow: string;
  fallbackProcedure: FallbackItem[];
  testCases: TestCase[];
  readinessChecks: ReadinessCheck[];
  deploymentChecklist: DeploymentStep[];
  limitations: Limitation[];
}

// ── Export Format ───────────────────────────────────────────
export type DocumentExportFormat = 'markdown' | 'html' | 'printable_html';
