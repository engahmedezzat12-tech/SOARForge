// ============================================================
// SOARForge Professional v1.1 — Multi-SOAR Platform Definitions
// ============================================================

export type SoarPlatformId =
  | 'fortisoar'
  | 'cortex_xsoar'
  | 'splunk_soar'
  | 'qradar_soar'
  | 'sentinel_logic_apps'
  | 'servicenow_secops'
  | 'tines'
  | 'shuffle'
  | 'generic_soar';

export type ExportFormat =
  | 'fortisoar_workflow_json'
  | 'xsoar_content_pack'
  | 'splunk_soar_playbook'
  | 'qradar_soar_resz'
  | 'azure_logic_app_arm'
  | 'servicenow_flow_xml'
  | 'tines_story_json'
  | 'shuffle_workflow_json'
  | 'normalized_soar_json';

export type CompatibilityStatus = 'supported' | 'partial' | 'verify_in_tenant' | 'unsupported';

export interface SoarPlatformDefinition {
  id: SoarPlatformId;
  name: string;
  vendor: string;
  description: string;
  exportFormat: ExportFormat;
  exportFormatLabel: string;
  directImportSupported: boolean;
  blueprintOnly: boolean;
  requiresTenantVerification: boolean;
  supportedFeatures: string[];
  supportedConnectorCategories: string[];
  supportedActionTypes: string[];
  notes: string;
  icon: string;
}

export const SOAR_PLATFORMS: Record<SoarPlatformId, SoarPlatformDefinition> = {
  fortisoar: {
    id: 'fortisoar',
    name: 'FortiSOAR',
    vendor: 'Fortinet',
    description: 'Enterprise SOAR platform with native workflow engine, playbook editor, and connector ecosystem.',
    exportFormat: 'fortisoar_workflow_json',
    exportFormatLabel: 'FortiSOAR Workflow JSON (Direct Import)',
    directImportSupported: true,
    blueprintOnly: false,
    requiresTenantVerification: true,
    supportedFeatures: [
      'workflow_engine',
      'playbook_collections',
      'connector_marketplace',
      'record_types',
      'modules',
      'dashboards',
      'sla_management',
      'war_rooms',
      'threat_intel_management',
    ],
    supportedConnectorCategories: [
      'edr',
      'siem',
      'firewall',
      'email_security',
      'identity',
      'threat_intel',
      'ticketing',
      'communication',
      'cloud_security',
      'vulnerability',
    ],
    supportedActionTypes: [
      'isolate_endpoint',
      'block_ip',
      'disable_user',
      'quarantine_email',
      'create_ticket',
      'send_notification',
      'enrich_ioc',
      'update_record',
      'approval_workflow',
    ],
    notes: 'Full production import supported. Connector config UUIDs and operation mappings included.',
    icon: '🛡️',
  },

  cortex_xsoar: {
    id: 'cortex_xsoar',
    name: 'Palo Alto Cortex XSOAR / Demisto',
    vendor: 'Palo Alto Networks',
    description: 'Security orchestration platform with playbooks, integrations, and incident management.',
    exportFormat: 'xsoar_content_pack',
    exportFormatLabel: 'XSOAR Content Pack Draft (Verify in Tenant)',
    directImportSupported: false,
    blueprintOnly: true,
    requiresTenantVerification: true,
    supportedFeatures: [
      'playbooks',
      'integrations',
      'incidents',
      'indicators',
      'war_rooms',
      'dashboards',
      'sla_management',
    ],
    supportedConnectorCategories: [
      'edr',
      'siem',
      'firewall',
      'email_security',
      'identity',
      'threat_intel',
      'ticketing',
      'communication',
    ],
    supportedActionTypes: [
      'isolate_endpoint',
      'block_ip',
      'disable_user',
      'quarantine_email',
      'create_ticket',
      'send_notification',
      'enrich_ioc',
    ],
    notes: 'Export generates content pack structure. Integration instances and commands must be verified in tenant.',
    icon: '🔷',
  },

  splunk_soar: {
    id: 'splunk_soar',
    name: 'Splunk SOAR (Phantom)',
    vendor: 'Splunk',
    description: 'Security orchestration platform with visual playbook editor and app ecosystem.',
    exportFormat: 'splunk_soar_playbook',
    exportFormatLabel: 'Splunk SOAR Playbook Blueprint (Verify in Tenant)',
    directImportSupported: false,
    blueprintOnly: true,
    requiresTenantVerification: true,
    supportedFeatures: [
      'playbooks',
      'apps',
      'containers',
      'artifacts',
      'actions',
      'custom_functions',
      'workbooks',
    ],
    supportedConnectorCategories: [
      'edr',
      'siem',
      'firewall',
      'email_security',
      'identity',
      'threat_intel',
      'ticketing',
    ],
    supportedActionTypes: [
      'isolate_endpoint',
      'block_ip',
      'disable_user',
      'quarantine_email',
      'create_ticket',
      'send_notification',
      'enrich_ioc',
    ],
    notes: 'Export generates playbook blueprint with app/action mapping checklist. App assets must be configured in tenant.',
    icon: '🟢',
  },

  qradar_soar: {
    id: 'qradar_soar',
    name: 'IBM QRadar SOAR (Resilient)',
    vendor: 'IBM',
    description: 'Incident response platform with workflows, integrations, and case management.',
    exportFormat: 'qradar_soar_resz',
    exportFormatLabel: 'QRadar SOAR Blueprint (Verify in Tenant)',
    directImportSupported: false,
    blueprintOnly: true,
    requiresTenantVerification: true,
    supportedFeatures: [
      'workflows',
      'playbooks',
      'integrations',
      'incidents',
      'artifacts',
      'phases',
      'tasks',
    ],
    supportedConnectorCategories: [
      'edr',
      'siem',
      'firewall',
      'email_security',
      'identity',
      'threat_intel',
      'ticketing',
    ],
    supportedActionTypes: [
      'isolate_endpoint',
      'block_ip',
      'disable_user',
      'quarantine_email',
      'create_ticket',
      'send_notification',
      'enrich_ioc',
    ],
    notes: 'Export generates workflow blueprint. .resz import format requires manual assembly unless fully implemented.',
    icon: '🔵',
  },

  sentinel_logic_apps: {
    id: 'sentinel_logic_apps',
    name: 'Microsoft Sentinel + Logic Apps',
    vendor: 'Microsoft',
    description: 'Cloud-native SIEM/SOAR with Azure Logic Apps for automation workflows.',
    exportFormat: 'azure_logic_app_arm',
    exportFormatLabel: 'ARM/Logic App Blueprint (Deployable with API connections)',
    directImportSupported: true,
    blueprintOnly: false,
    requiresTenantVerification: true,
    supportedFeatures: [
      'logic_apps',
      'playbooks',
      'automation_rules',
      'incidents',
      'entities',
      'workbooks',
      'analytics_rules',
    ],
    supportedConnectorCategories: [
      'edr',
      'siem',
      'firewall',
      'email_security',
      'identity',
      'threat_intel',
      'ticketing',
      'azure_services',
    ],
    supportedActionTypes: [
      'isolate_endpoint',
      'block_ip',
      'disable_user',
      'quarantine_email',
      'create_ticket',
      'send_notification',
      'enrich_ioc',
    ],
    notes: 'Export generates ARM template with API connection placeholders. Azure subscriptions and connections must be configured.',
    icon: '☁️',
  },

  servicenow_secops: {
    id: 'servicenow_secops',
    name: 'ServiceNow Security Operations',
    vendor: 'ServiceNow',
    description: 'IT service management platform with security incident response and orchestration.',
    exportFormat: 'servicenow_flow_xml',
    exportFormatLabel: 'ServiceNow Flow Blueprint (Verify in Tenant)',
    directImportSupported: false,
    blueprintOnly: true,
    requiresTenantVerification: true,
    supportedFeatures: [
      'flows',
      'playbooks',
      'security_incidents',
      'vulnerabilities',
      'threat_intel',
      'orchestration',
      'spokes',
    ],
    supportedConnectorCategories: [
      'edr',
      'siem',
      'firewall',
      'email_security',
      'identity',
      'threat_intel',
      'ticketing',
    ],
    supportedActionTypes: [
      'isolate_endpoint',
      'block_ip',
      'disable_user',
      'quarantine_email',
      'create_ticket',
      'send_notification',
      'enrich_ioc',
    ],
    notes: 'Export generates flow/update-set blueprint. Spoke and action instances must be configured in tenant.',
    icon: '🟡',
  },

  tines: {
    id: 'tines',
    name: 'Tines',
    vendor: 'Tines',
    description: 'No-code security automation platform with story-based workflows.',
    exportFormat: 'tines_story_json',
    exportFormatLabel: 'Tines Story JSON (Direct Import)',
    directImportSupported: true,
    blueprintOnly: false,
    requiresTenantVerification: true,
    supportedFeatures: [
      'stories',
      'actions',
      'credentials',
      'resources',
      'teams',
      'cases',
    ],
    supportedConnectorCategories: [
      'edr',
      'siem',
      'firewall',
      'email_security',
      'identity',
      'threat_intel',
      'ticketing',
      'communication',
    ],
    supportedActionTypes: [
      'isolate_endpoint',
      'block_ip',
      'disable_user',
      'quarantine_email',
      'create_ticket',
      'send_notification',
      'enrich_ioc',
    ],
    notes: 'Export generates story blueprint. Credentials and resources must be configured in tenant.',
    icon: '🟣',
  },

  shuffle: {
    id: 'shuffle',
    name: 'Shuffle',
    vendor: 'Shuffle',
    description: 'Open-source SOAR platform with workflow automation and app ecosystem.',
    exportFormat: 'shuffle_workflow_json',
    exportFormatLabel: 'Shuffle Workflow JSON (Direct Import)',
    directImportSupported: true,
    blueprintOnly: false,
    requiresTenantVerification: true,
    supportedFeatures: [
      'workflows',
      'apps',
      'triggers',
      'variables',
      'executions',
      'api_gateway',
    ],
    supportedConnectorCategories: [
      'edr',
      'siem',
      'firewall',
      'email_security',
      'identity',
      'threat_intel',
      'ticketing',
      'communication',
    ],
    supportedActionTypes: [
      'isolate_endpoint',
      'block_ip',
      'disable_user',
      'quarantine_email',
      'create_ticket',
      'send_notification',
      'enrich_ioc',
    ],
    notes: 'Workflow JSON is importable if app/action references and credentials are documented.',
    icon: 'SH',
  },

  generic_soar: {
    id: 'generic_soar',
    name: 'Generic SOAR Platform',
    vendor: 'Various',
    description: 'Normalized playbook format compatible with any SOAR platform.',
    exportFormat: 'normalized_soar_json',
    exportFormatLabel: 'Normalized SOAR JSON Blueprint',
    directImportSupported: false,
    blueprintOnly: true,
    requiresTenantVerification: true,
    supportedFeatures: [
      'workflows',
      'playbooks',
      'connectors',
      'actions',
      'conditions',
      'loops',
    ],
    supportedConnectorCategories: [
      'edr',
      'siem',
      'firewall',
      'email_security',
      'identity',
      'threat_intel',
      'ticketing',
      'communication',
    ],
    supportedActionTypes: [
      'isolate_endpoint',
      'block_ip',
      'disable_user',
      'quarantine_email',
      'create_ticket',
      'send_notification',
      'enrich_ioc',
    ],
    notes: 'Export generates normalized JSON that can be adapted to any SOAR platform manually.',
    icon: '⚙️',
  },
};

/**
 * Get platform definition by ID
 */
export function getPlatformById(id: SoarPlatformId): SoarPlatformDefinition {
  return SOAR_PLATFORMS[id];
}

/**
 * Get all available platforms as array
 */
export function getAllPlatforms(): SoarPlatformDefinition[] {
  return Object.values(SOAR_PLATFORMS);
}

/**
 * Check if a feature is supported by a platform
 */
export function isFeatureSupported(platformId: SoarPlatformId, feature: string): CompatibilityStatus {
  const platform = SOAR_PLATFORMS[platformId];
  if (!platform) return 'unsupported';
  
  if (platform.supportedFeatures.includes(feature)) {
    if (platform.directImportSupported) return 'supported';
    if (platform.requiresTenantVerification) return 'verify_in_tenant';
    return 'partial';
  }
  return 'unsupported';
}

/**
 * Check if a connector category is supported by a platform
 */
export function isConnectorCategorySupported(platformId: SoarPlatformId, category: string): CompatibilityStatus {
  const platform = SOAR_PLATFORMS[platformId];
  if (!platform) return 'unsupported';
  
  if (platform.supportedConnectorCategories.includes(category)) {
    if (platform.directImportSupported) return 'supported';
    if (platform.requiresTenantVerification) return 'verify_in_tenant';
    return 'partial';
  }
  return 'unsupported';
}

/**
 * Check if an action type is supported by a platform
 */
export function isActionTypeSupported(platformId: SoarPlatformId, actionType: string): CompatibilityStatus {
  const platform = SOAR_PLATFORMS[platformId];
  if (!platform) return 'unsupported';
  
  if (platform.supportedActionTypes.includes(actionType)) {
    if (platform.directImportSupported) return 'supported';
    if (platform.requiresTenantVerification) return 'verify_in_tenant';
    return 'partial';
  }
  return 'unsupported';
}

/**
 * Get compatibility badge label and color
 */
export function getCompatibilityBadge(status: CompatibilityStatus): { label: string; color: string } {
  switch (status) {
    case 'supported':
      return { label: 'Supported', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
    case 'partial':
      return { label: 'Partial', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
    case 'verify_in_tenant':
      return { label: 'Verify in Tenant', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    case 'unsupported':
      return { label: 'Unsupported', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
    default:
      return { label: 'Unknown', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
  }
}

/**
 * Get export format label for a platform
 */
export function getExportFormatLabel(platformId: SoarPlatformId): string {
  const platform = SOAR_PLATFORMS[platformId];
  return platform?.exportFormatLabel || 'Unknown Format';
}

/**
 * Check if platform supports direct import (no tenant verification needed)
 */
export function supportsDirectImport(platformId: SoarPlatformId): boolean {
  const platform = SOAR_PLATFORMS[platformId];
  return platform?.directImportSupported || false;
}
