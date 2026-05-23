// ============================================================================
// FortiSOAR Workflow JSON Types
// Based on the exported FortiSOAR workflow collection structure
// ============================================================================

export interface FortiSOARWorkflowCollection {
  type: "workflow_collections";
  data: FortiSOARWorkflowCollectionData[];
  exported_tags: string[];
}

export interface FortiSOARWorkflowCollectionData {
  "@context": string;
  "@type": "WorkflowCollection";
  name: string;
  description: string | null;
  visible: boolean;
  image: string | null;
  uuid: string;
  id: number;
  createDate: number;
  modifyDate: number;
  deletedAt: null;
  importedBy: string[];
  recordTags: string[];
  workflows: FortiSOARWorkflow[];
  unsupportedWorkflowCoverage?: {
    enrichments: Array<{ key: string; reason: string }>;
    actions: Array<{ key: string; reason: string }>;
  };
  workflowCoverageValidation?: {
    missingEnrichmentSteps: string[];
    missingActionSteps: string[];
    passed: boolean;
  };
}

export interface FortiSOARWorkflow {
  "@type": "Workflow";
  triggerLimit: number | null;
  name: string;
  aliasName: string | null;
  tag: string | null;
  description: string | null;
  isActive: boolean;
  debug: boolean;
  singleRecordExecution: boolean;
  remoteExecutableFlag: boolean;
  parameters: unknown[];
  synchronous: boolean;
  lastModifyDate: number;
  collection: string;
  versions: unknown[];
  triggerStep: string;
  steps: FortiSOARStep[];
  routes: FortiSOARRoute[];
  groups: unknown[];
  priority: string;
  playbookOrigin: string;
  isEditable: boolean;
  uuid: string;
  id: number;
  owners: unknown[];
  isPrivate: boolean;
  deletedAt: null;
  importedBy: string[];
  recordTags: string[];
}

// ============================================================================
// Step Types
// ============================================================================

export type FortiSOARStepType =
  | "trigger"
  | "set_variable"
  | "decision"
  | "approval"
  | "connector"
  | "manual_task"
  | "api_call"
  | "reference";

export interface FortiSOARStep {
  "@type": "WorkflowStep";
  name: string;
  description: string | null;
  arguments: FortiSOARStepArguments;
  status: string | null;
  top: string;
  left: string;
  stepType: string;
  group: string | null;
  uuid: string;
}

// Step type IRIs from FortiSOAR
export const FORTISOAR_STEP_TYPE_IRIS = {
  trigger: "/api/3/workflow_step_types/b348f017-9a94-471f-87f8-ce88b6a7ad62",
  set_variable: "/api/3/workflow_step_types/04d0cf46-b6a8-42c4-8683-60a7eaa69e8f",
  decision: "/api/3/workflow_step_types/12254cf5-5db7-4b1a-8cb1-3af081924b28",
  approval: "/api/3/workflow_step_types/a19333c2-c822-11ed-afa1-0242ac120002",
  connector: "/api/3/workflow_step_types/0bfed618-0316-11e7-93ae-92361f002671",
  manual_task: "/api/3/workflow_step_types/0109f35d-090b-4a2b-bd8a-94cbc3508562",
  api_call: "/api/3/workflow_step_types/b593663d-7d13-40ce-a3a3-96dece928722",
  reference: "/api/3/workflow_step_types/c20c9c57-03a2-4ba4-93bb-4bd81addd7c7",
} as const;

// ============================================================================
// Step Arguments by Type
// ============================================================================

export type FortiSOARStepArguments =
  | FortiSOARTriggerArguments
  | FortiSOARSetVariableArguments
  | FortiSOARDecisionArguments
  | FortiSOARApprovalArguments
  | FortiSOARConnectorArguments;

  export interface FortiSOARTriggerArguments {
    route: string;
    title: string;
    resources: string;
    inputVariables: unknown[];
    step_variables: FortiSOARStepVariable[];
    displayConditions: {
      conditions: unknown[];
      operator: string;
    };
    executeButtonTitle: string;
    noRecordExecution: boolean;
    singleRecordExecution: boolean;
  }

export interface FortiSOARSetVariableArguments {
  [key: string]: string | FortiSOARStepVariable[] | undefined;
}

export interface FortiSOARDecisionArguments {
  conditions: FortiSOARCondition[];
  step_variables: FortiSOARStepVariable[];
}

export interface FortiSOARCondition {
  option?: string;
  default?: boolean;
  step_iri: string;
  step_name: string;
  condition?: string;
}

export interface FortiSOARApprovalArguments {
  type: "InputBased" | "DecisionBased";
  input: {
    schema: {
      title: string;
      description: string;
      inputVariables: unknown[];
    };
  };
  record: string;
  agent_id: string | null;
  resources: string;
  is_approval: boolean;
  owner_detail: {
    isAssigned: boolean;
    assignedToTeam: Array<{
      iri: string;
      teamname: string;
    }>;
    assignedToField: null;
    emailRecipients: string;
    assignedToPerson: unknown[];
    assignedToRecord: boolean;
  };
  isRecordLinked: boolean;
  step_variables: FortiSOARStepVariable[];
  response_mapping: {
    options: Array<{
      option: string;
      primary: boolean;
      step_iri: string;
    }>;
    connecteStepsLength: number;
    customSuccessMessage: string;
  };
  email_notification: {
    enabled: boolean;
    smtpParameters: unknown[];
  };
  customEmailExternal: boolean;
  inline_channel_list: unknown[];
  external_channel_list: unknown[];
  unauthenticated_input: boolean;
  external_email_subject: string | null;
  internal_email_subject: string;
  custom_email_body_external: string | null;
  external_email_attachments: unknown | null;
}

export interface FortiSOARConnectorArguments {
  name: string;
  when?: string;
  config: string;
  params: Record<string, string>;
  version: string;
  connector: string;
  operation: string;
  operationTitle: string;
  pickFromTenant: boolean;
  step_variables: FortiSOARStepVariable[];
}

export interface FortiSOARStepVariable {
  name: string;
  value: string;
  scope?: string;
}

// ============================================================================
// Routes (connections between steps)
// ============================================================================

export interface FortiSOARRoute {
  "@type": "WorkflowRoute";
  name: string;
  targetStep: string;
  sourceStep: string;
  label: string | null;
  isExecuted: boolean;
  group: string | null;
  uuid: string;
}

// ============================================================================
// Deployment Profile
// ============================================================================

export interface FortiSOARDeploymentProfile {
  id: string;
  name: string;
  customerName: string;
  environment: "development" | "staging" | "production";
  version: string;
  fortisoarBaseUrl: string;
  
  // Connector configurations with placeholders
  connectors: {
    [key: string]: FortiSOARConnectorConfig;
  };
  
  // Approval settings
  approvalTeamIri: string;
  approvalTeamName: string;
  defaultOwnerIri: string;
  
  // Resource settings
  resourceType: string;
  targetCollectionName: string;
  
  // Notification settings
  notificationChannel: string;
  ticketingEnabled: boolean;
  ticketingProjectId: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface FortiSOARConnectorConfig {
  connector: string;
  config: string; // UUID or placeholder like {{CUSTOMER_EDR_CONFIG_UUID}}
  version: string;
  displayName: string;
  category: string;
  isConfigured: boolean;
  operation?: string; // Operation name for the connector action
  operationTitle?: string; // Display title for the operation
}

// ============================================================================
// Action Registry Entry
// ============================================================================

export interface FortiSOARActionEntry {
  actionId: string;
  displayName: string;
  category: string;
  connectorKey: string;
  connector: string;
  operation: string;
  operationTitle: string;
  defaultVersion: string;
  requiredParams: string[];
  optionalParams: string[];
  paramTemplates: Record<string, string>;
  approvalRequired: boolean;
  rollbackAction: string | null;
  fallbackAction: string | null;
  riskLevel: "low" | "medium" | "high" | "critical";
  productionNotes: string;
  mitreTechniques: string[];
}

// ============================================================================
// Playbook Status
// ============================================================================

export type FortiSOARPlaybookStatus =
  | "draft"
  | "ready_for_configuration"
  | "ready_for_uat"
  | "ready_for_import"
  | "production_ready";

// ============================================================================
// Readiness Check
// ============================================================================

export interface FortiSOARReadinessCheck {
  id: string;
  label: string;
  category: "template" | "trigger" | "entities" | "enrichment" | "scoring" | "actions" | "connectors" | "approval" | "rollback" | "testing" | "export";
  passed: boolean;
  critical: boolean;
  fixStepNumber?: number;
  fixConnectorKey?: string; // If fix involves a connector, which one to configure
  note?: string;
}

// ============================================================================
// Export Package
// ============================================================================

export interface FortiSOARExportPackage {
  metadata: {
    name: string;
    version: string;
    generatedAt: string;
    generatedBy: string;
    templateId: string;
    status: FortiSOARPlaybookStatus;
  };
  workflowCollection: FortiSOARWorkflowCollection;
  deploymentProfile: FortiSOARDeploymentProfile;
  connectorChecklist: FortiSOARConnectorConfig[];
  documentation: {
    implementationGuide: string;
    uatTestPlan: string;
    rollbackPlan: string;
    mitreMapping: string;
    connectorMatrix: string;
    knownLimitations: string;
  };
  readinessChecks: FortiSOARReadinessCheck[];
}
