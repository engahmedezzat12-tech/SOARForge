// ============================================================
// SOARForge Professional v1.1 — Core Type Definitions
// ============================================================

// ──────────────────────────────────────────────────────────────────────────────
// SCORING TYPES
// ──────────────────────────────────────────────────────────────────────────────

export type ScoringType =
  | 'additive'
  | 'weighted'
  | 'consensus'
  | 'severity'
  | 'mitre'
  | 'asset_criticality'
  | 'user_risk'
  | 'confidence'
  | 'hybrid'
  | 'none';

export interface ScoringRule {
  id: string;
  label: string;
  condition?: string;
  points: number;
  weight?: number;
  mitre?: string;
}

export interface ScoringThreshold {
  label: string;
  minScore: number;
  maxScore: number;
  action: 'auto_contain' | 'analyst_approval' | 'monitor' | 'skip' | 'escalate' | 'ticket';
  description: string;
}

export interface ScoringPreset {
  type: ScoringType;
  label: string;
  description: string;
  useCases: string[];
  defaultRules: ScoringRule[];
  defaultThresholds: ScoringThreshold[];
  approvalRecommendation: string;
  actionRecommendation: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// ENTITY TYPES
// ──────────────────────────────────────────────────────────────────────────────

export interface EntityDefinition {
  id: string;
  displayLabel: string;
  normalizedField: string;
  rawFieldCandidates: string[];
  exampleValues: string[];
  requiredInUseCases: string[];
  fallbackExtractionMethod: string;
  validationNotes: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// CONNECTOR TYPES
// ──────────────────────────────────────────────────────────────────────────────

export interface ConnectorDefinition {
  id: string;
  name: string;
  category: string;
  supportedActions: string[];
  requiredInputs: string[];
  commonOutputFields: string[];
  authType: string;
  timeoutRecommendation: string;
  failureHandling: string;
  rollbackSupport: boolean;
  fortisoarNotes: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// ACTION TYPES
// ──────────────────────────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ExecutionType = 'automated' | 'semi-automated' | 'manual';

export interface ActionDefinition {
  id: string;
  name: string;
  category: string;
  requiredFields: string[];
  primaryMethod: string;
  fallbackMethod: string;
  approvalRequired: boolean;
  rollbackSupported: boolean;
  riskLevel: RiskLevel;
  executionType: ExecutionType;
  productionNotes: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// TEMPLATE TYPES
// ──────────────────────────────────────────────────────────────────────────────

export interface PlaybookTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  
  // Step 2: Trigger
  trigger: {
    type: string;
    description: string;
    sourceSystem: string;
  };
  triggerType?: string;
  triggerDescription?: string;
  sourceSystems?: string[];
  alertFields?: string[];
  parsingStrategy?: string;
  
  // Step 3: Entities
  entities: string[];
  requiredEntities?: string[];
  
  // Step 4: Enrichment
  enrichmentConnectors: string[];
  enrichmentSources?: string[];
  
  // Step 5: Scoring
  scoringModel: {
    type: ScoringType;
    severity: string;
    rules?: ScoringRule[];
    thresholds?: ScoringThreshold[];
    approvalRecommendation?: string;
    actionRecommendation?: string;
    decisionLogic?: string;
    mitreMapping?: string[];
  };
  scoringRules?: ScoringRule[];
  scoringThresholds?: ScoringThreshold[];
  scoringType?: ScoringType;
  
  // Step 6: Actions
  actions: string[];
  actionIds?: string[];
  
  // Step 7: Fallback
  fallbackProcedure: {
    escalationPath: string;
    manualSteps: string;
    communicationTemplate: string;
  };
  fallbackItems?: Array<{
    id: string;
    trigger: string;
    action: string;
    description: string;
  }>;
  
  // Step 8: Testing
  testingPlan?: {
    scenarios: string;
    successCriteria: string;
    performanceTargets: string;
  };
  testCases?: Array<{
    id: string;
    type: string;
    name: string;
    description: string;
    inputCondition: string;
    expectedResult: string;
    passcriterion: string;
  }>;
  
  // Step 9: Approval
  approvalSignOff?: {
    approvedBy: string;
    approvalDate: string;
    complianceNotes: string;
    reviewHistory: string;
  };
  approvalPolicy?: string;
  approvalNotes?: string;
  
  // Additional fields from templates
  tags?: string[];
  businessObjective?: string;
  decisionBranches?: Array<{
    id: string;
    condition: string;
    result: string;
    nextStep: string;
  }>;
  connectorIds?: string[];
  errorHandlingNotes?: string;
  rollbackPlan?: string;
  productionReadinessNotes?: string;
  mitreTactics?: string[];
  
  // Metadata for template-specific generator routing
  templateId?: string;
  generatorType?: string;
  requiredConnectorKeys?: string[];
}

// ──────────────────────────────────────────────────────────────────────────────
// CORE PLAYBOOK STATE TYPE
// ──────────────────────────────────────────────────────────────────────────────

export interface ScoringModel {
  type: ScoringType | '';
  severity: string;
  rules: ScoringRule[];
  thresholds: ScoringThreshold[];
  approvalRecommendation: string;
  actionRecommendation: string;
  decisionLogic: string;
  mitreMapping: string[];
}

export interface PlaybookState {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  owner: string;
  templateId?: string;
  generatorType?: string;
  trigger: {
    type: string;
    description: string;
    sourceSystem: string;
  };
  entities: string[];
  enrichmentConnectors: string[];
  scoringModel: ScoringModel;
  actions: string[];
  fallbackProcedure: {
    escalationPath: string;
    manualSteps: string;
    communicationTemplate: string;
  };
  testingPlan: {
    scenarios: string;
    successCriteria: string;
    performanceTargets: string;
  };
  approvalSignOff: {
    approvedBy: string;
    approvalDate: string;
    complianceNotes: string;
    reviewHistory: string;
  };
  status: 'draft' | 'testing' | 'approved' | 'deployed';
  createdAt: string;
  updatedAt: string;
}
