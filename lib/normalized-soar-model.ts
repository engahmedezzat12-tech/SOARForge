// ============================================================
// SOARForge Professional v1.1 — Normalized SOAR Data Model
// Platform-agnostic playbook representation
// ============================================================

import type { SoarPlatformId } from './soar-platforms';

// ──────────────────────────────────────────────────────────────────────────────
// NORMALIZED CONNECTOR TYPES
// ──────────────────────────────────────────────────────────────────────────────

export type NormalizedConnectorCategory =
  | 'edr'           // Endpoint Detection & Response
  | 'siem'          // Security Information & Event Management
  | 'firewall'      // Network Firewalls
  | 'email_security' // Email Security Gateways
  | 'identity'      // Identity & Access Management
  | 'threat_intel'  // Threat Intelligence Platforms
  | 'ticketing'     // IT Service Management
  | 'communication' // Notification & Communication
  | 'cloud_security' // Cloud Security Posture
  | 'vulnerability' // Vulnerability Management
  | 'sandbox'       // Malware Analysis
  | 'dns'           // DNS Security
  | 'custom';       // Custom/API-based

export interface NormalizedConnector {
  id: string;
  category: NormalizedConnectorCategory;
  name: string;
  vendor: string;
  description: string;
  
  // Platform-specific mappings
  platformMappings: Partial<Record<SoarPlatformId, PlatformConnectorMapping>>;
}

export interface PlatformConnectorMapping {
  connectorName?: string;     // FortiSOAR
  connectorId?: string;
  integrationName?: string;   // XSOAR
  appName?: string;           // Splunk SOAR
  spokeName?: string;         // ServiceNow
  apiConnectionId?: string;   // Sentinel
  credentialId?: string;      // Tines
  
  // Configuration requirements
  requiresInstanceConfig: boolean;
  configFields: string[];
}

// ──────────────────────────────────────────────────────────────────────────────
// NORMALIZED ACTION TYPES
// ──────────────────────────────────────────────────────────────────────────────

export type NormalizedActionType =
  | 'isolate_endpoint'
  | 'unisolate_endpoint'
  | 'block_ip'
  | 'unblock_ip'
  | 'block_domain'
  | 'block_url'
  | 'block_hash'
  | 'disable_user'
  | 'enable_user'
  | 'reset_password'
  | 'revoke_sessions'
  | 'quarantine_email'
  | 'delete_email'
  | 'create_ticket'
  | 'update_ticket'
  | 'close_ticket'
  | 'send_notification'
  | 'send_email'
  | 'send_slack'
  | 'send_teams'
  | 'enrich_ip'
  | 'enrich_domain'
  | 'enrich_hash'
  | 'enrich_user'
  | 'enrich_host'
  | 'lookup_threat_intel'
  | 'submit_sandbox'
  | 'get_sandbox_report'
  | 'scan_vulnerability'
  | 'update_record'
  | 'create_record'
  | 'run_query'
  | 'custom_action';

export interface NormalizedAction {
  id: string;
  type: NormalizedActionType;
  name: string;
  description: string;
  connectorCategory: NormalizedConnectorCategory;
  
  // Input/output schema
  inputSchema: NormalizedFieldSchema[];
  outputSchema: NormalizedFieldSchema[];
  
  // Platform-specific mappings
  platformMappings: Partial<Record<SoarPlatformId, PlatformActionMapping>>;
  
  // Risk classification
  isDestructive: boolean;
  requiresApproval: boolean;
  canRollback: boolean;
  rollbackActionType?: NormalizedActionType;
}

export interface PlatformActionMapping {
  operationName?: string;     // FortiSOAR
  operationId?: string;
  commandName?: string;       // XSOAR
  actionName?: string;        // Splunk SOAR
  functionName?: string;      // QRadar
  logicAppAction?: string;    // Sentinel
  flowAction?: string;        // ServiceNow
  tinesAction?: string;       // Tines
  
  // Parameter mapping
  parameterMapping: Record<string, string>;
  
  // Compatibility
  isSupported: boolean;
  requiresVerification: boolean;
  notes?: string;
}

export interface NormalizedFieldSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'ip' | 'domain' | 'hash' | 'email' | 'user' | 'host';
  required: boolean;
  description: string;
  defaultValue?: unknown;
  validationRegex?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// NORMALIZED WORKFLOW TYPES
// ──────────────────────────────────────────────────────────────────────────────

export type NormalizedStepType =
  | 'trigger'
  | 'condition'
  | 'action'
  | 'enrichment'
  | 'approval'
  | 'notification'
  | 'loop'
  | 'parallel'
  | 'wait'
  | 'set_variable'
  | 'manual_task'
  | 'end';

export interface NormalizedWorkflowStep {
  id: string;
  type: NormalizedStepType;
  name: string;
  description: string;
  
  // Step configuration
  config: NormalizedStepConfig;
  
  // Flow control
  nextSteps: string[];          // IDs of next steps
  onSuccess?: string;           // Step ID on success
  onFailure?: string;           // Step ID on failure
  onTimeout?: string;           // Step ID on timeout
  
  // Position in visual editor
  position?: { x: number; y: number };
}

export type NormalizedStepConfig =
  | TriggerConfig
  | ConditionConfig
  | ActionConfig
  | EnrichmentConfig
  | ApprovalConfig
  | NotificationConfig
  | LoopConfig
  | ParallelConfig
  | WaitConfig
  | SetVariableConfig
  | ManualTaskConfig
  | EndConfig;

export interface TriggerConfig {
  type: 'trigger';
  triggerType: 'alert' | 'incident' | 'indicator' | 'scheduled' | 'manual' | 'webhook';
  sourceSystem: string;
  filters?: Record<string, unknown>;
}

export interface ConditionConfig {
  type: 'condition';
  conditionType: 'if' | 'switch' | 'score_threshold';
  expression: string;
  branches: Array<{
    condition: string;
    nextStepId: string;
  }>;
}

export interface ActionConfig {
  type: 'action';
  actionType: NormalizedActionType;
  connectorId: string;
  parameters: Record<string, unknown>;
  timeout?: number;
  retryCount?: number;
}

export interface EnrichmentConfig {
  type: 'enrichment';
  connectorId: string;
  enrichmentType: string;
  inputField: string;
  outputField: string;
}

export interface ApprovalConfig {
  type: 'approval';
  approvers: string[];
  approvalType: 'any' | 'all' | 'majority';
  timeout: number;
  escalationPath?: string;
  message: string;
}

export interface NotificationConfig {
  type: 'notification';
  channel: 'email' | 'slack' | 'teams' | 'webhook' | 'sms';
  recipients: string[];
  template: string;
  includeAttachments?: boolean;
}

export interface LoopConfig {
  type: 'loop';
  iterateOver: string;
  itemVariable: string;
  maxIterations?: number;
  parallelExecution?: boolean;
}

export interface ParallelConfig {
  type: 'parallel';
  branches: string[];  // Step IDs to run in parallel
  waitForAll: boolean;
}

export interface WaitConfig {
  type: 'wait';
  waitType: 'duration' | 'condition' | 'event';
  duration?: number;
  condition?: string;
  eventType?: string;
}

export interface SetVariableConfig {
  type: 'set_variable';
  variableName: string;
  value: unknown;
  scope: 'step' | 'workflow' | 'global';
}

export interface ManualTaskConfig {
  type: 'manual_task';
  taskName: string;
  instructions: string;
  assignee: string;
  dueDate?: string;
  requiredFields?: string[];
}

export interface EndConfig {
  type: 'end';
  status: 'success' | 'failure' | 'cancelled' | 'escalated';
  summary?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// NORMALIZED PLAYBOOK
// ──────────────────────────────────────────────────────────────────────────────

export interface NormalizedPlaybook {
  id: string;
  name: string;
  description: string;
  version: string;
  
  // Metadata
  metadata: {
    author: string;
    created: string;
    updated: string;
    tags: string[];
    category: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    mitreTechniques: string[];
  };
  
  // Target platform (original design target)
  targetPlatform: SoarPlatformId;
  
  // Workflow definition
  trigger: NormalizedWorkflowStep;
  steps: NormalizedWorkflowStep[];
  
  // Connectors used
  connectors: NormalizedConnector[];
  
  // Variables
  variables: Array<{
    name: string;
    type: string;
    defaultValue?: unknown;
    scope: 'input' | 'output' | 'internal';
  }>;
  
  // Scoring model (if applicable)
  scoringModel?: {
    type: string;
    rules: Array<{
      id: string;
      condition: string;
      score: number;
    }>;
    thresholds: Array<{
      level: string;
      minScore: number;
      maxScore: number;
      action: string;
    }>;
  };
  
  // Readiness information
  readiness: {
    isReady: boolean;
    warnings: string[];
    errors: string[];
    platformCompatibility: Partial<Record<SoarPlatformId, PlatformCompatibility>>;
  };
}

export interface PlatformCompatibility {
  isCompatible: boolean;
  compatibilityScore: number;  // 0-100
  supportedFeatures: string[];
  unsupportedFeatures: string[];
  requiredVerifications: string[];
  exportFormat: string;
  notes: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// CONNECTOR REGISTRY (Normalized)
// ──────────────────────────────────────────────────────────────────────────────

export const NORMALIZED_CONNECTORS: Record<string, NormalizedConnector> = {
  crowdstrike_falcon: {
    id: 'crowdstrike_falcon',
    category: 'edr',
    name: 'CrowdStrike Falcon',
    vendor: 'CrowdStrike',
    description: 'Endpoint detection, response, and threat intelligence',
    platformMappings: {
      fortisoar: {
        connectorName: 'CrowdStrike Falcon',
        connectorId: 'crowdstrike-falcon',
        requiresInstanceConfig: true,
        configFields: ['client_id', 'client_secret', 'base_url'],
      },
      cortex_xsoar: {
        integrationName: 'CrowdStrikeFalcon',
        requiresInstanceConfig: true,
        configFields: ['client_id', 'client_secret', 'base_url'],
      },
      splunk_soar: {
        appName: 'CrowdStrike',
        requiresInstanceConfig: true,
        configFields: ['api_id', 'api_secret', 'base_url'],
      },
      sentinel_logic_apps: {
        apiConnectionId: 'crowdstrike-falcon',
        requiresInstanceConfig: true,
        configFields: ['clientId', 'clientSecret'],
      },
    },
  },
  
  microsoft_defender: {
    id: 'microsoft_defender',
    category: 'edr',
    name: 'Microsoft Defender for Endpoint',
    vendor: 'Microsoft',
    description: 'Endpoint protection, detection, and response',
    platformMappings: {
      fortisoar: {
        connectorName: 'Microsoft Defender ATP',
        connectorId: 'microsoft-defender-atp',
        requiresInstanceConfig: true,
        configFields: ['tenant_id', 'client_id', 'client_secret'],
      },
      cortex_xsoar: {
        integrationName: 'MicrosoftDefenderAdvancedThreatProtection',
        requiresInstanceConfig: true,
        configFields: ['tenant_id', 'client_id', 'client_secret'],
      },
      sentinel_logic_apps: {
        apiConnectionId: 'wdatp',
        requiresInstanceConfig: true,
        configFields: ['tenantId'],
      },
    },
  },
  
  active_directory: {
    id: 'active_directory',
    category: 'identity',
    name: 'Microsoft Active Directory',
    vendor: 'Microsoft',
    description: 'User and group management, authentication',
    platformMappings: {
      fortisoar: {
        connectorName: 'Active Directory',
        connectorId: 'active-directory',
        requiresInstanceConfig: true,
        configFields: ['server', 'domain', 'username', 'password'],
      },
      cortex_xsoar: {
        integrationName: 'Active Directory Query v2',
        requiresInstanceConfig: true,
        configFields: ['server', 'username', 'password'],
      },
      splunk_soar: {
        appName: 'LDAP',
        requiresInstanceConfig: true,
        configFields: ['server', 'username', 'password'],
      },
    },
  },
  
  servicenow: {
    id: 'servicenow',
    category: 'ticketing',
    name: 'ServiceNow',
    vendor: 'ServiceNow',
    description: 'IT service management and ticketing',
    platformMappings: {
      fortisoar: {
        connectorName: 'ServiceNow',
        connectorId: 'servicenow',
        requiresInstanceConfig: true,
        configFields: ['instance_url', 'username', 'password'],
      },
      cortex_xsoar: {
        integrationName: 'ServiceNow v2',
        requiresInstanceConfig: true,
        configFields: ['url', 'username', 'password'],
      },
      splunk_soar: {
        appName: 'ServiceNow',
        requiresInstanceConfig: true,
        configFields: ['device', 'username', 'password'],
      },
      servicenow_secops: {
        spokeName: 'ServiceNow Core',
        requiresInstanceConfig: false,
        configFields: [],
      },
    },
  },
  
  slack: {
    id: 'slack',
    category: 'communication',
    name: 'Slack',
    vendor: 'Slack',
    description: 'Team communication and notifications',
    platformMappings: {
      fortisoar: {
        connectorName: 'Slack',
        connectorId: 'slack',
        requiresInstanceConfig: true,
        configFields: ['bot_token', 'channel'],
      },
      cortex_xsoar: {
        integrationName: 'SlackV3',
        requiresInstanceConfig: true,
        configFields: ['bot_token'],
      },
      splunk_soar: {
        appName: 'Slack',
        requiresInstanceConfig: true,
        configFields: ['bot_token'],
      },
      tines: {
        credentialId: 'slack',
        requiresInstanceConfig: true,
        configFields: ['bot_token'],
      },
    },
  },
  
  virustotal: {
    id: 'virustotal',
    category: 'threat_intel',
    name: 'VirusTotal',
    vendor: 'Google',
    description: 'File, URL, IP, and domain reputation',
    platformMappings: {
      fortisoar: {
        connectorName: 'VirusTotal',
        connectorId: 'virustotal',
        requiresInstanceConfig: true,
        configFields: ['api_key'],
      },
      cortex_xsoar: {
        integrationName: 'VirusTotal',
        requiresInstanceConfig: true,
        configFields: ['api_key'],
      },
      splunk_soar: {
        appName: 'VirusTotal',
        requiresInstanceConfig: true,
        configFields: ['api_key'],
      },
      tines: {
        credentialId: 'virustotal',
        requiresInstanceConfig: true,
        configFields: ['api_key'],
      },
    },
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// ACTION REGISTRY (Normalized)
// ──────────────────────────────────────────────────────────────────────────────

export const NORMALIZED_ACTIONS: Record<NormalizedActionType, NormalizedAction> = {
  isolate_endpoint: {
    id: 'isolate_endpoint',
    type: 'isolate_endpoint',
    name: 'Isolate Endpoint',
    description: 'Network isolate an endpoint to prevent lateral movement',
    connectorCategory: 'edr',
    inputSchema: [
      { name: 'hostname', type: 'host', required: true, description: 'Target hostname' },
      { name: 'reason', type: 'string', required: false, description: 'Isolation reason' },
    ],
    outputSchema: [
      { name: 'success', type: 'boolean', required: true, description: 'Isolation success' },
      { name: 'isolation_id', type: 'string', required: false, description: 'Isolation reference ID' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'contain_device',
        parameterMapping: { hostname: 'device_id', reason: 'comment' },
        isSupported: true,
        requiresVerification: false,
      },
      cortex_xsoar: {
        commandName: 'cs-falcon-contain-host',
        parameterMapping: { hostname: 'ids', reason: 'comment' },
        isSupported: true,
        requiresVerification: true,
        notes: 'Verify integration instance configured',
      },
      splunk_soar: {
        actionName: 'quarantine device',
        parameterMapping: { hostname: 'hostname', reason: 'comment' },
        isSupported: true,
        requiresVerification: true,
      },
    },
    isDestructive: true,
    requiresApproval: true,
    canRollback: true,
    rollbackActionType: 'unisolate_endpoint',
  },
  
  unisolate_endpoint: {
    id: 'unisolate_endpoint',
    type: 'unisolate_endpoint',
    name: 'Release Endpoint Isolation',
    description: 'Release network isolation on an endpoint',
    connectorCategory: 'edr',
    inputSchema: [
      { name: 'hostname', type: 'host', required: true, description: 'Target hostname' },
      { name: 'reason', type: 'string', required: false, description: 'Release reason' },
    ],
    outputSchema: [
      { name: 'success', type: 'boolean', required: true, description: 'Release success' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'lift_containment',
        parameterMapping: { hostname: 'device_id', reason: 'comment' },
        isSupported: true,
        requiresVerification: false,
      },
      cortex_xsoar: {
        commandName: 'cs-falcon-lift-host-containment',
        parameterMapping: { hostname: 'ids' },
        isSupported: true,
        requiresVerification: true,
      },
    },
    isDestructive: false,
    requiresApproval: false,
    canRollback: true,
    rollbackActionType: 'isolate_endpoint',
  },
  
  block_ip: {
    id: 'block_ip',
    type: 'block_ip',
    name: 'Block IP Address',
    description: 'Block an IP address at the firewall or security gateway',
    connectorCategory: 'firewall',
    inputSchema: [
      { name: 'ip_address', type: 'ip', required: true, description: 'IP address to block' },
      { name: 'duration', type: 'number', required: false, description: 'Block duration in hours' },
      { name: 'reason', type: 'string', required: false, description: 'Block reason' },
    ],
    outputSchema: [
      { name: 'success', type: 'boolean', required: true, description: 'Block success' },
      { name: 'rule_id', type: 'string', required: false, description: 'Firewall rule ID' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'block_ip',
        parameterMapping: { ip_address: 'ip', duration: 'ttl', reason: 'comment' },
        isSupported: true,
        requiresVerification: false,
      },
      cortex_xsoar: {
        commandName: 'pan-os-block-ip',
        parameterMapping: { ip_address: 'ip' },
        isSupported: true,
        requiresVerification: true,
      },
    },
    isDestructive: true,
    requiresApproval: true,
    canRollback: true,
    rollbackActionType: 'unblock_ip',
  },
  
  unblock_ip: {
    id: 'unblock_ip',
    type: 'unblock_ip',
    name: 'Unblock IP Address',
    description: 'Remove IP address block from firewall',
    connectorCategory: 'firewall',
    inputSchema: [
      { name: 'ip_address', type: 'ip', required: true, description: 'IP address to unblock' },
    ],
    outputSchema: [
      { name: 'success', type: 'boolean', required: true, description: 'Unblock success' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'unblock_ip',
        parameterMapping: { ip_address: 'ip' },
        isSupported: true,
        requiresVerification: false,
      },
    },
    isDestructive: false,
    requiresApproval: false,
    canRollback: true,
    rollbackActionType: 'block_ip',
  },
  
  block_domain: {
    id: 'block_domain',
    type: 'block_domain',
    name: 'Block Domain',
    description: 'Block a domain at DNS or web gateway',
    connectorCategory: 'dns',
    inputSchema: [
      { name: 'domain', type: 'domain', required: true, description: 'Domain to block' },
      { name: 'reason', type: 'string', required: false, description: 'Block reason' },
    ],
    outputSchema: [
      { name: 'success', type: 'boolean', required: true, description: 'Block success' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'block_domain',
        parameterMapping: { domain: 'domain', reason: 'comment' },
        isSupported: true,
        requiresVerification: false,
      },
    },
    isDestructive: true,
    requiresApproval: true,
    canRollback: true,
  },
  
  block_url: {
    id: 'block_url',
    type: 'block_url',
    name: 'Block URL',
    description: 'Block a URL at web gateway or proxy',
    connectorCategory: 'firewall',
    inputSchema: [
      { name: 'url', type: 'string', required: true, description: 'URL to block' },
      { name: 'reason', type: 'string', required: false, description: 'Block reason' },
    ],
    outputSchema: [
      { name: 'success', type: 'boolean', required: true, description: 'Block success' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'block_url',
        parameterMapping: { url: 'url', reason: 'comment' },
        isSupported: true,
        requiresVerification: false,
      },
    },
    isDestructive: true,
    requiresApproval: true,
    canRollback: true,
  },
  
  block_hash: {
    id: 'block_hash',
    type: 'block_hash',
    name: 'Block File Hash',
    description: 'Block a file hash at endpoint or gateway',
    connectorCategory: 'edr',
    inputSchema: [
      { name: 'hash', type: 'hash', required: true, description: 'File hash (MD5/SHA1/SHA256)' },
      { name: 'hash_type', type: 'string', required: false, description: 'Hash type' },
      { name: 'reason', type: 'string', required: false, description: 'Block reason' },
    ],
    outputSchema: [
      { name: 'success', type: 'boolean', required: true, description: 'Block success' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'block_hash',
        parameterMapping: { hash: 'hash', reason: 'comment' },
        isSupported: true,
        requiresVerification: false,
      },
      cortex_xsoar: {
        commandName: 'cs-falcon-upload-ioc',
        parameterMapping: { hash: 'ioc_value' },
        isSupported: true,
        requiresVerification: true,
      },
    },
    isDestructive: true,
    requiresApproval: true,
    canRollback: true,
  },
  
  disable_user: {
    id: 'disable_user',
    type: 'disable_user',
    name: 'Disable User Account',
    description: 'Disable a user account in identity provider',
    connectorCategory: 'identity',
    inputSchema: [
      { name: 'username', type: 'user', required: true, description: 'Username to disable' },
      { name: 'reason', type: 'string', required: false, description: 'Disable reason' },
    ],
    outputSchema: [
      { name: 'success', type: 'boolean', required: true, description: 'Disable success' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'disable_user',
        parameterMapping: { username: 'user', reason: 'comment' },
        isSupported: true,
        requiresVerification: false,
      },
      cortex_xsoar: {
        commandName: 'ad-disable-account',
        parameterMapping: { username: 'username' },
        isSupported: true,
        requiresVerification: true,
      },
    },
    isDestructive: true,
    requiresApproval: true,
    canRollback: true,
    rollbackActionType: 'enable_user',
  },
  
  enable_user: {
    id: 'enable_user',
    type: 'enable_user',
    name: 'Enable User Account',
    description: 'Re-enable a user account in identity provider',
    connectorCategory: 'identity',
    inputSchema: [
      { name: 'username', type: 'user', required: true, description: 'Username to enable' },
    ],
    outputSchema: [
      { name: 'success', type: 'boolean', required: true, description: 'Enable success' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'enable_user',
        parameterMapping: { username: 'user' },
        isSupported: true,
        requiresVerification: false,
      },
      cortex_xsoar: {
        commandName: 'ad-enable-account',
        parameterMapping: { username: 'username' },
        isSupported: true,
        requiresVerification: true,
      },
    },
    isDestructive: false,
    requiresApproval: false,
    canRollback: true,
    rollbackActionType: 'disable_user',
  },
  
  reset_password: {
    id: 'reset_password',
    type: 'reset_password',
    name: 'Reset User Password',
    description: 'Force password reset for a user account',
    connectorCategory: 'identity',
    inputSchema: [
      { name: 'username', type: 'user', required: true, description: 'Username' },
      { name: 'force_change', type: 'boolean', required: false, description: 'Force change on next login' },
    ],
    outputSchema: [
      { name: 'success', type: 'boolean', required: true, description: 'Reset success' },
      { name: 'temp_password', type: 'string', required: false, description: 'Temporary password' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'reset_password',
        parameterMapping: { username: 'user', force_change: 'must_change' },
        isSupported: true,
        requiresVerification: false,
      },
    },
    isDestructive: true,
    requiresApproval: true,
    canRollback: false,
  },
  
  revoke_sessions: {
    id: 'revoke_sessions',
    type: 'revoke_sessions',
    name: 'Revoke User Sessions',
    description: 'Revoke all active sessions for a user',
    connectorCategory: 'identity',
    inputSchema: [
      { name: 'username', type: 'user', required: true, description: 'Username' },
    ],
    outputSchema: [
      { name: 'success', type: 'boolean', required: true, description: 'Revoke success' },
      { name: 'sessions_revoked', type: 'number', required: false, description: 'Number of sessions revoked' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'revoke_sessions',
        parameterMapping: { username: 'user' },
        isSupported: true,
        requiresVerification: false,
      },
    },
    isDestructive: true,
    requiresApproval: true,
    canRollback: false,
  },
  
  quarantine_email: {
    id: 'quarantine_email',
    type: 'quarantine_email',
    name: 'Quarantine Email',
    description: 'Move email to quarantine folder',
    connectorCategory: 'email_security',
    inputSchema: [
      { name: 'message_id', type: 'string', required: true, description: 'Email message ID' },
      { name: 'mailbox', type: 'email', required: true, description: 'Mailbox address' },
    ],
    outputSchema: [
      { name: 'success', type: 'boolean', required: true, description: 'Quarantine success' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'quarantine_email',
        parameterMapping: { message_id: 'message_id', mailbox: 'mailbox' },
        isSupported: true,
        requiresVerification: false,
      },
    },
    isDestructive: true,
    requiresApproval: false,
    canRollback: true,
  },
  
  delete_email: {
    id: 'delete_email',
    type: 'delete_email',
    name: 'Delete Email',
    description: 'Permanently delete email from mailbox',
    connectorCategory: 'email_security',
    inputSchema: [
      { name: 'message_id', type: 'string', required: true, description: 'Email message ID' },
      { name: 'mailbox', type: 'email', required: true, description: 'Mailbox address' },
    ],
    outputSchema: [
      { name: 'success', type: 'boolean', required: true, description: 'Delete success' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'delete_email',
        parameterMapping: { message_id: 'message_id', mailbox: 'mailbox' },
        isSupported: true,
        requiresVerification: false,
      },
    },
    isDestructive: true,
    requiresApproval: true,
    canRollback: false,
  },
  
  create_ticket: {
    id: 'create_ticket',
    type: 'create_ticket',
    name: 'Create Ticket',
    description: 'Create a ticket in ITSM system',
    connectorCategory: 'ticketing',
    inputSchema: [
      { name: 'title', type: 'string', required: true, description: 'Ticket title' },
      { name: 'description', type: 'string', required: true, description: 'Ticket description' },
      { name: 'priority', type: 'string', required: false, description: 'Ticket priority' },
      { name: 'assignee', type: 'string', required: false, description: 'Ticket assignee' },
    ],
    outputSchema: [
      { name: 'ticket_id', type: 'string', required: true, description: 'Created ticket ID' },
      { name: 'ticket_url', type: 'string', required: false, description: 'Ticket URL' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'create_incident',
        parameterMapping: { title: 'short_description', description: 'description', priority: 'priority' },
        isSupported: true,
        requiresVerification: false,
      },
      cortex_xsoar: {
        commandName: 'servicenow-create-ticket',
        parameterMapping: { title: 'short_description', description: 'description' },
        isSupported: true,
        requiresVerification: true,
      },
      servicenow_secops: {
        flowAction: 'Create Record',
        parameterMapping: { title: 'short_description', description: 'description' },
        isSupported: true,
        requiresVerification: false,
      },
    },
    isDestructive: false,
    requiresApproval: false,
    canRollback: false,
  },
  
  update_ticket: {
    id: 'update_ticket',
    type: 'update_ticket',
    name: 'Update Ticket',
    description: 'Update an existing ticket',
    connectorCategory: 'ticketing',
    inputSchema: [
      { name: 'ticket_id', type: 'string', required: true, description: 'Ticket ID' },
      { name: 'fields', type: 'object', required: true, description: 'Fields to update' },
    ],
    outputSchema: [
      { name: 'success', type: 'boolean', required: true, description: 'Update success' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'update_incident',
        parameterMapping: { ticket_id: 'sys_id', fields: 'data' },
        isSupported: true,
        requiresVerification: false,
      },
    },
    isDestructive: false,
    requiresApproval: false,
    canRollback: false,
  },
  
  close_ticket: {
    id: 'close_ticket',
    type: 'close_ticket',
    name: 'Close Ticket',
    description: 'Close a ticket in ITSM system',
    connectorCategory: 'ticketing',
    inputSchema: [
      { name: 'ticket_id', type: 'string', required: true, description: 'Ticket ID' },
      { name: 'resolution', type: 'string', required: false, description: 'Resolution notes' },
    ],
    outputSchema: [
      { name: 'success', type: 'boolean', required: true, description: 'Close success' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'close_incident',
        parameterMapping: { ticket_id: 'sys_id', resolution: 'close_notes' },
        isSupported: true,
        requiresVerification: false,
      },
    },
    isDestructive: false,
    requiresApproval: false,
    canRollback: false,
  },
  
  send_notification: {
    id: 'send_notification',
    type: 'send_notification',
    name: 'Send Notification',
    description: 'Send a notification to specified channel',
    connectorCategory: 'communication',
    inputSchema: [
      { name: 'channel', type: 'string', required: true, description: 'Notification channel' },
      { name: 'message', type: 'string', required: true, description: 'Notification message' },
      { name: 'recipients', type: 'array', required: false, description: 'Recipients' },
    ],
    outputSchema: [
      { name: 'success', type: 'boolean', required: true, description: 'Send success' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'send_message',
        parameterMapping: { channel: 'channel', message: 'text', recipients: 'users' },
        isSupported: true,
        requiresVerification: false,
      },
    },
    isDestructive: false,
    requiresApproval: false,
    canRollback: false,
  },
  
  send_email: {
    id: 'send_email',
    type: 'send_email',
    name: 'Send Email',
    description: 'Send an email notification',
    connectorCategory: 'communication',
    inputSchema: [
      { name: 'to', type: 'array', required: true, description: 'Recipients' },
      { name: 'subject', type: 'string', required: true, description: 'Email subject' },
      { name: 'body', type: 'string', required: true, description: 'Email body' },
    ],
    outputSchema: [
      { name: 'success', type: 'boolean', required: true, description: 'Send success' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'send_email',
        parameterMapping: { to: 'to', subject: 'subject', body: 'body' },
        isSupported: true,
        requiresVerification: false,
      },
    },
    isDestructive: false,
    requiresApproval: false,
    canRollback: false,
  },
  
  send_slack: {
    id: 'send_slack',
    type: 'send_slack',
    name: 'Send Slack Message',
    description: 'Send a message to Slack channel',
    connectorCategory: 'communication',
    inputSchema: [
      { name: 'channel', type: 'string', required: true, description: 'Slack channel' },
      { name: 'message', type: 'string', required: true, description: 'Message text' },
    ],
    outputSchema: [
      { name: 'success', type: 'boolean', required: true, description: 'Send success' },
      { name: 'ts', type: 'string', required: false, description: 'Message timestamp' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'send_message',
        parameterMapping: { channel: 'channel', message: 'text' },
        isSupported: true,
        requiresVerification: false,
      },
      tines: {
        tinesAction: 'Send Slack Message',
        parameterMapping: { channel: 'channel', message: 'text' },
        isSupported: true,
        requiresVerification: true,
      },
    },
    isDestructive: false,
    requiresApproval: false,
    canRollback: false,
  },
  
  send_teams: {
    id: 'send_teams',
    type: 'send_teams',
    name: 'Send Teams Message',
    description: 'Send a message to Microsoft Teams',
    connectorCategory: 'communication',
    inputSchema: [
      { name: 'channel', type: 'string', required: true, description: 'Teams channel' },
      { name: 'message', type: 'string', required: true, description: 'Message text' },
    ],
    outputSchema: [
      { name: 'success', type: 'boolean', required: true, description: 'Send success' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'send_message',
        parameterMapping: { channel: 'channel', message: 'text' },
        isSupported: true,
        requiresVerification: false,
      },
      sentinel_logic_apps: {
        logicAppAction: 'Post message in a chat or channel',
        parameterMapping: { channel: 'channelId', message: 'messageBody' },
        isSupported: true,
        requiresVerification: true,
      },
    },
    isDestructive: false,
    requiresApproval: false,
    canRollback: false,
  },
  
  enrich_ip: {
    id: 'enrich_ip',
    type: 'enrich_ip',
    name: 'Enrich IP Address',
    description: 'Get threat intelligence for an IP address',
    connectorCategory: 'threat_intel',
    inputSchema: [
      { name: 'ip', type: 'ip', required: true, description: 'IP address to enrich' },
    ],
    outputSchema: [
      { name: 'reputation', type: 'string', required: false, description: 'IP reputation' },
      { name: 'malicious', type: 'boolean', required: false, description: 'Is malicious' },
      { name: 'country', type: 'string', required: false, description: 'Country' },
      { name: 'asn', type: 'string', required: false, description: 'ASN' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'get_ip_reputation',
        parameterMapping: { ip: 'ip' },
        isSupported: true,
        requiresVerification: false,
      },
      cortex_xsoar: {
        commandName: 'ip',
        parameterMapping: { ip: 'ip' },
        isSupported: true,
        requiresVerification: true,
      },
    },
    isDestructive: false,
    requiresApproval: false,
    canRollback: false,
  },
  
  enrich_domain: {
    id: 'enrich_domain',
    type: 'enrich_domain',
    name: 'Enrich Domain',
    description: 'Get threat intelligence for a domain',
    connectorCategory: 'threat_intel',
    inputSchema: [
      { name: 'domain', type: 'domain', required: true, description: 'Domain to enrich' },
    ],
    outputSchema: [
      { name: 'reputation', type: 'string', required: false, description: 'Domain reputation' },
      { name: 'malicious', type: 'boolean', required: false, description: 'Is malicious' },
      { name: 'registrar', type: 'string', required: false, description: 'Registrar' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'get_domain_reputation',
        parameterMapping: { domain: 'domain' },
        isSupported: true,
        requiresVerification: false,
      },
      cortex_xsoar: {
        commandName: 'domain',
        parameterMapping: { domain: 'domain' },
        isSupported: true,
        requiresVerification: true,
      },
    },
    isDestructive: false,
    requiresApproval: false,
    canRollback: false,
  },
  
  enrich_hash: {
    id: 'enrich_hash',
    type: 'enrich_hash',
    name: 'Enrich File Hash',
    description: 'Get threat intelligence for a file hash',
    connectorCategory: 'threat_intel',
    inputSchema: [
      { name: 'hash', type: 'hash', required: true, description: 'File hash' },
    ],
    outputSchema: [
      { name: 'malicious', type: 'boolean', required: false, description: 'Is malicious' },
      { name: 'detection_ratio', type: 'string', required: false, description: 'Detection ratio' },
      { name: 'file_type', type: 'string', required: false, description: 'File type' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'get_file_reputation',
        parameterMapping: { hash: 'hash' },
        isSupported: true,
        requiresVerification: false,
      },
      cortex_xsoar: {
        commandName: 'file',
        parameterMapping: { hash: 'file' },
        isSupported: true,
        requiresVerification: true,
      },
    },
    isDestructive: false,
    requiresApproval: false,
    canRollback: false,
  },
  
  enrich_user: {
    id: 'enrich_user',
    type: 'enrich_user',
    name: 'Enrich User',
    description: 'Get details about a user from directory',
    connectorCategory: 'identity',
    inputSchema: [
      { name: 'username', type: 'user', required: true, description: 'Username' },
    ],
    outputSchema: [
      { name: 'display_name', type: 'string', required: false, description: 'Display name' },
      { name: 'email', type: 'email', required: false, description: 'Email address' },
      { name: 'department', type: 'string', required: false, description: 'Department' },
      { name: 'manager', type: 'string', required: false, description: 'Manager' },
      { name: 'groups', type: 'array', required: false, description: 'Group memberships' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'get_user',
        parameterMapping: { username: 'user' },
        isSupported: true,
        requiresVerification: false,
      },
      cortex_xsoar: {
        commandName: 'ad-get-user',
        parameterMapping: { username: 'username' },
        isSupported: true,
        requiresVerification: true,
      },
    },
    isDestructive: false,
    requiresApproval: false,
    canRollback: false,
  },
  
  enrich_host: {
    id: 'enrich_host',
    type: 'enrich_host',
    name: 'Enrich Host',
    description: 'Get details about a host from EDR/directory',
    connectorCategory: 'edr',
    inputSchema: [
      { name: 'hostname', type: 'host', required: true, description: 'Hostname' },
    ],
    outputSchema: [
      { name: 'os', type: 'string', required: false, description: 'Operating system' },
      { name: 'ip_addresses', type: 'array', required: false, description: 'IP addresses' },
      { name: 'last_seen', type: 'string', required: false, description: 'Last seen time' },
      { name: 'status', type: 'string', required: false, description: 'Agent status' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'get_device',
        parameterMapping: { hostname: 'hostname' },
        isSupported: true,
        requiresVerification: false,
      },
      cortex_xsoar: {
        commandName: 'cs-falcon-search-device',
        parameterMapping: { hostname: 'hostname' },
        isSupported: true,
        requiresVerification: true,
      },
    },
    isDestructive: false,
    requiresApproval: false,
    canRollback: false,
  },
  
  lookup_threat_intel: {
    id: 'lookup_threat_intel',
    type: 'lookup_threat_intel',
    name: 'Lookup Threat Intelligence',
    description: 'Query threat intelligence platform for IOC',
    connectorCategory: 'threat_intel',
    inputSchema: [
      { name: 'indicator', type: 'string', required: true, description: 'Indicator value' },
      { name: 'indicator_type', type: 'string', required: true, description: 'Indicator type' },
    ],
    outputSchema: [
      { name: 'found', type: 'boolean', required: true, description: 'Found in TI' },
      { name: 'confidence', type: 'number', required: false, description: 'Confidence score' },
      { name: 'tags', type: 'array', required: false, description: 'Associated tags' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'lookup_indicator',
        parameterMapping: { indicator: 'value', indicator_type: 'type' },
        isSupported: true,
        requiresVerification: false,
      },
    },
    isDestructive: false,
    requiresApproval: false,
    canRollback: false,
  },
  
  submit_sandbox: {
    id: 'submit_sandbox',
    type: 'submit_sandbox',
    name: 'Submit to Sandbox',
    description: 'Submit file or URL to sandbox for analysis',
    connectorCategory: 'sandbox',
    inputSchema: [
      { name: 'sample', type: 'string', required: true, description: 'File hash or URL' },
      { name: 'sample_type', type: 'string', required: true, description: 'Sample type' },
    ],
    outputSchema: [
      { name: 'submission_id', type: 'string', required: true, description: 'Submission ID' },
      { name: 'status', type: 'string', required: false, description: 'Submission status' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'submit_sample',
        parameterMapping: { sample: 'sample', sample_type: 'type' },
        isSupported: true,
        requiresVerification: false,
      },
    },
    isDestructive: false,
    requiresApproval: false,
    canRollback: false,
  },
  
  get_sandbox_report: {
    id: 'get_sandbox_report',
    type: 'get_sandbox_report',
    name: 'Get Sandbox Report',
    description: 'Get analysis report from sandbox',
    connectorCategory: 'sandbox',
    inputSchema: [
      { name: 'submission_id', type: 'string', required: true, description: 'Submission ID' },
    ],
    outputSchema: [
      { name: 'verdict', type: 'string', required: false, description: 'Analysis verdict' },
      { name: 'score', type: 'number', required: false, description: 'Threat score' },
      { name: 'report_url', type: 'string', required: false, description: 'Full report URL' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'get_report',
        parameterMapping: { submission_id: 'id' },
        isSupported: true,
        requiresVerification: false,
      },
    },
    isDestructive: false,
    requiresApproval: false,
    canRollback: false,
  },
  
  scan_vulnerability: {
    id: 'scan_vulnerability',
    type: 'scan_vulnerability',
    name: 'Scan for Vulnerabilities',
    description: 'Trigger vulnerability scan on target',
    connectorCategory: 'vulnerability',
    inputSchema: [
      { name: 'target', type: 'string', required: true, description: 'Scan target' },
      { name: 'scan_type', type: 'string', required: false, description: 'Scan type' },
    ],
    outputSchema: [
      { name: 'scan_id', type: 'string', required: true, description: 'Scan ID' },
      { name: 'status', type: 'string', required: false, description: 'Scan status' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'launch_scan',
        parameterMapping: { target: 'target', scan_type: 'template' },
        isSupported: true,
        requiresVerification: false,
      },
    },
    isDestructive: false,
    requiresApproval: false,
    canRollback: false,
  },
  
  update_record: {
    id: 'update_record',
    type: 'update_record',
    name: 'Update Record',
    description: 'Update a record in the SOAR platform',
    connectorCategory: 'custom',
    inputSchema: [
      { name: 'record_id', type: 'string', required: true, description: 'Record ID' },
      { name: 'module', type: 'string', required: true, description: 'Module/table name' },
      { name: 'fields', type: 'object', required: true, description: 'Fields to update' },
    ],
    outputSchema: [
      { name: 'success', type: 'boolean', required: true, description: 'Update success' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'update_record',
        parameterMapping: { record_id: 'id', module: 'module', fields: 'data' },
        isSupported: true,
        requiresVerification: false,
      },
    },
    isDestructive: false,
    requiresApproval: false,
    canRollback: false,
  },
  
  create_record: {
    id: 'create_record',
    type: 'create_record',
    name: 'Create Record',
    description: 'Create a new record in the SOAR platform',
    connectorCategory: 'custom',
    inputSchema: [
      { name: 'module', type: 'string', required: true, description: 'Module/table name' },
      { name: 'fields', type: 'object', required: true, description: 'Record fields' },
    ],
    outputSchema: [
      { name: 'record_id', type: 'string', required: true, description: 'Created record ID' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'create_record',
        parameterMapping: { module: 'module', fields: 'data' },
        isSupported: true,
        requiresVerification: false,
      },
    },
    isDestructive: false,
    requiresApproval: false,
    canRollback: false,
  },
  
  run_query: {
    id: 'run_query',
    type: 'run_query',
    name: 'Run Query',
    description: 'Run a search query in SIEM or data lake',
    connectorCategory: 'siem',
    inputSchema: [
      { name: 'query', type: 'string', required: true, description: 'Search query' },
      { name: 'time_range', type: 'string', required: false, description: 'Time range' },
    ],
    outputSchema: [
      { name: 'results', type: 'array', required: true, description: 'Query results' },
      { name: 'count', type: 'number', required: false, description: 'Result count' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'run_query',
        parameterMapping: { query: 'query', time_range: 'range' },
        isSupported: true,
        requiresVerification: false,
      },
    },
    isDestructive: false,
    requiresApproval: false,
    canRollback: false,
  },
  
  custom_action: {
    id: 'custom_action',
    type: 'custom_action',
    name: 'Custom Action',
    description: 'Execute a custom action via API',
    connectorCategory: 'custom',
    inputSchema: [
      { name: 'action_name', type: 'string', required: true, description: 'Action name' },
      { name: 'parameters', type: 'object', required: false, description: 'Action parameters' },
    ],
    outputSchema: [
      { name: 'result', type: 'object', required: false, description: 'Action result' },
    ],
    platformMappings: {
      fortisoar: {
        operationName: 'custom_action',
        parameterMapping: { action_name: 'name', parameters: 'params' },
        isSupported: true,
        requiresVerification: true,
        notes: 'Custom action must be defined in connector',
      },
    },
    isDestructive: false,
    requiresApproval: false,
    canRollback: false,
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Get action by type
 */
export function getNormalizedAction(actionType: NormalizedActionType): NormalizedAction | undefined {
  return NORMALIZED_ACTIONS[actionType];
}

/**
 * Get all actions for a connector category
 */
export function getActionsForCategory(category: NormalizedConnectorCategory): NormalizedAction[] {
  return Object.values(NORMALIZED_ACTIONS).filter(
    (action) => action.connectorCategory === category
  );
}

/**
 * Get all destructive actions
 */
export function getDestructiveActions(): NormalizedAction[] {
  return Object.values(NORMALIZED_ACTIONS).filter((action) => action.isDestructive);
}

/**
 * Get platform-specific action mapping
 */
export function getPlatformActionMapping(
  actionType: NormalizedActionType,
  platform: SoarPlatformId
): PlatformActionMapping | undefined {
  const action = NORMALIZED_ACTIONS[actionType];
  return action?.platformMappings[platform];
}

/**
 * Check if action is supported on platform
 */
export function isActionSupportedOnPlatform(
  actionType: NormalizedActionType,
  platform: SoarPlatformId
): boolean {
  const mapping = getPlatformActionMapping(actionType, platform);
  return mapping?.isSupported ?? false;
}
