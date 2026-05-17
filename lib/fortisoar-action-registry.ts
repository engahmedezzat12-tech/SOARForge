// ============================================================================
// FortiSOAR Action Registry
// Maps SOARForge actions to FortiSOAR connector operations
// ============================================================================

import type { FortiSOARActionEntry, FortiSOARConnectorConfig } from "./fortisoar-types";

// ============================================================================
// Connector Configuration Templates
// ============================================================================

export const FORTISOAR_CONNECTOR_TEMPLATES: Record<string, Omit<FortiSOARConnectorConfig, "config" | "isConfigured">> = {
  groupib_edr: {
    connector: "groupib",
    displayName: "Group-IB EDR",
    category: "EDR",
    version: "1.1.4",
  },
  crowdstrike_edr: {
    connector: "crowdstrike-falcon",
    displayName: "CrowdStrike Falcon",
    category: "EDR",
    version: "3.2.0",
  },
  microsoft_defender: {
    connector: "microsoft-defender-atp",
    displayName: "Microsoft Defender for Endpoint",
    category: "EDR",
    version: "2.1.0",
  },
  sentinelone: {
    connector: "sentinelone",
    displayName: "SentinelOne",
    category: "EDR",
    version: "2.0.1",
  },
  active_directory: {
    connector: "activedirectory",
    displayName: "Active Directory",
    category: "Identity",
    version: "2.4.0",
  },
  azure_ad: {
    connector: "azure-active-directory",
    displayName: "Azure AD / Entra ID",
    category: "Identity",
    version: "3.0.0",
  },
  qradar: {
    connector: "qradar",
    displayName: "IBM QRadar",
    category: "SIEM",
    version: "2.2.0",
  },
  splunk: {
    connector: "splunk",
    displayName: "Splunk Enterprise",
    category: "SIEM",
    version: "3.1.0",
  },
  microsoft_sentinel: {
    connector: "azure-sentinel",
    displayName: "Microsoft Sentinel",
    category: "SIEM",
    version: "2.0.0",
  },
  abuseipdb: {
    connector: "abuseipdb",
    displayName: "AbuseIPDB",
    category: "Threat Intel",
    version: "2.0.0",
  },
  virustotal: {
    connector: "virustotal",
    displayName: "VirusTotal",
    category: "Threat Intel",
    version: "3.0.0",
  },
  fortiguard: {
    connector: "fortiguard",
    displayName: "FortiGuard",
    category: "Threat Intel",
    version: "1.2.0",
  },
  palo_alto_firewall: {
    connector: "paloalto-panorama",
    displayName: "Palo Alto Panorama",
    category: "Firewall",
    version: "2.1.0",
  },
  fortigate_firewall: {
    connector: "fortigate",
    displayName: "FortiGate Firewall",
    category: "Firewall",
    version: "3.0.0",
  },
  microsoft_teams: {
    connector: "microsoft-teams",
    displayName: "Microsoft Teams",
    category: "Notification",
    version: "2.0.0",
  },
  slack: {
    connector: "slack",
    displayName: "Slack",
    category: "Notification",
    version: "2.1.0",
  },
  servicenow: {
    connector: "servicenow",
    displayName: "ServiceNow",
    category: "Ticketing",
    version: "3.2.0",
  },
  jira: {
    connector: "jira",
    displayName: "Jira",
    category: "Ticketing",
    version: "2.3.0",
  },
  exchange: {
    connector: "exchange",
    displayName: "Microsoft Exchange",
    category: "Email",
    version: "3.0.0",
  },
  proofpoint: {
    connector: "proofpoint",
    displayName: "Proofpoint",
    category: "Email Security",
    version: "2.0.0",
  },
  fortisandbox: {
    connector: "fortisandbox",
    displayName: "FortiSandbox",
    category: "Sandbox",
    version: "1.1.0",
  },
  misp: {
    connector: "misp",
    displayName: "MISP Threat Intelligence",
    category: "Threat Intel",
    version: "2.0.0",
  },
};

// ============================================================================
// Action Registry
// ============================================================================

export const FORTISOAR_ACTION_REGISTRY: FortiSOARActionEntry[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // EDR Actions
  // ─────────────────────────────────────────────────────────────────────────
  {
    actionId: "isolate_endpoint",
    displayName: "Isolate Endpoint",
    category: "EDR",
    connectorKey: "groupib_edr",
    connector: "groupib",
    operation: "isolate_endpoint",
    operationTitle: "Isolate Endpoint",
    defaultVersion: "1.1.4",
    requiredParams: ["machine_id"],
    optionalParams: ["comment"],
    paramTemplates: {
      machine_id: "{{ vars.steps.Final_Context.machine_id | default('') }}",
      comment: "SOARForge containment - Incident {{ vars.steps.Build_Context.record_id | default('N/A') }}",
    },
    approvalRequired: true,
    rollbackAction: "unisolate_endpoint",
    fallbackAction: "search_asset_by_hostname",
    riskLevel: "high",
    productionNotes: "Never isolate without valid machine_id. Verify asset criticality before execution.",
    mitreTechniques: ["T1486", "T1490"],
  },
  {
    actionId: "unisolate_endpoint",
    displayName: "Unisolate Endpoint",
    category: "EDR",
    connectorKey: "groupib_edr",
    connector: "groupib",
    operation: "unisolate_endpoint",
    operationTitle: "Unisolate Endpoint",
    defaultVersion: "1.1.4",
    requiredParams: ["machine_id"],
    optionalParams: ["comment"],
    paramTemplates: {
      machine_id: "{{ vars.steps.Final_Context.machine_id | default('') }}",
      comment: "SOARForge rollback - Restoring network access",
    },
    approvalRequired: true,
    rollbackAction: null,
    fallbackAction: null,
    riskLevel: "medium",
    productionNotes: "Verify threat is remediated before unisolating.",
    mitreTechniques: [],
  },
  {
    actionId: "search_asset_by_hostname",
    displayName: "Search Asset by Hostname",
    category: "EDR",
    connectorKey: "groupib_edr",
    connector: "groupib",
    operation: "search_asset_by_hostname",
    operationTitle: "Search Asset by Hostname",
    defaultVersion: "1.1.4",
    requiredParams: ["hostname"],
    optionalParams: [],
    paramTemplates: {
      hostname: "{{ vars.steps.Final_Context.hostname | default('') }}",
    },
    approvalRequired: false,
    rollbackAction: null,
    fallbackAction: null,
    riskLevel: "low",
    productionNotes: "Lookup step to resolve machine_id from hostname.",
    mitreTechniques: [],
  },
  {
    actionId: "crowdstrike_contain_host",
    displayName: "Contain Host (CrowdStrike)",
    category: "EDR",
    connectorKey: "crowdstrike_edr",
    connector: "crowdstrike-falcon",
    operation: "contain_host",
    operationTitle: "Contain Host",
    defaultVersion: "3.2.0",
    requiredParams: ["device_id"],
    optionalParams: [],
    paramTemplates: {
      device_id: "{{ vars.steps.Final_Context.device_id | default('') }}",
    },
    approvalRequired: true,
    rollbackAction: "crowdstrike_lift_containment",
    fallbackAction: null,
    riskLevel: "high",
    productionNotes: "CrowdStrike network isolation. Verify device_id exists.",
    mitreTechniques: ["T1486", "T1490"],
  },
  {
    actionId: "defender_isolate_machine",
    displayName: "Isolate Machine (Defender)",
    category: "EDR",
    connectorKey: "microsoft_defender",
    connector: "microsoft-defender-atp",
    operation: "isolate_machine",
    operationTitle: "Isolate Machine",
    defaultVersion: "2.1.0",
    requiredParams: ["machine_id"],
    optionalParams: ["comment", "isolation_type"],
    paramTemplates: {
      machine_id: "{{ vars.steps.Final_Context.machine_id | default('') }}",
      isolation_type: "Full",
      comment: "SOARForge ransomware containment",
    },
    approvalRequired: true,
    rollbackAction: "defender_unisolate_machine",
    fallbackAction: null,
    riskLevel: "high",
    productionNotes: "Microsoft Defender ATP isolation. Full or Selective mode.",
    mitreTechniques: ["T1486", "T1490"],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Identity Actions
  // ─────────────────────────────────────────────────────────────────────────
  {
    actionId: "disable_ad_user",
    displayName: "Disable AD User Account",
    category: "Identity",
    connectorKey: "active_directory",
    connector: "activedirectory",
    operation: "disable_user_account",
    operationTitle: "Disable User Account",
    defaultVersion: "2.4.0",
    requiredParams: ["search_attr_name", "search_attr_value"],
    optionalParams: [],
    paramTemplates: {
      search_attr_name: "SamAccount Name",
      search_attr_value: "{{ vars.steps.User_Context.username_normalized | default('') | string | trim }}",
    },
    approvalRequired: true,
    rollbackAction: "enable_ad_user",
    fallbackAction: null,
    riskLevel: "high",
    productionNotes: "Never disable SYSTEM, LOCAL SERVICE, NETWORK SERVICE, Administrator, or Domain Admin accounts.",
    mitreTechniques: ["T1078"],
  },
  {
    actionId: "enable_ad_user",
    displayName: "Enable AD User Account",
    category: "Identity",
    connectorKey: "active_directory",
    connector: "activedirectory",
    operation: "enable_user_account",
    operationTitle: "Enable User Account",
    defaultVersion: "2.4.0",
    requiredParams: ["search_attr_name", "search_attr_value"],
    optionalParams: [],
    paramTemplates: {
      search_attr_name: "SamAccount Name",
      search_attr_value: "{{ vars.steps.User_Context.username_normalized | default('') | string | trim }}",
    },
    approvalRequired: true,
    rollbackAction: null,
    fallbackAction: null,
    riskLevel: "medium",
    productionNotes: "Rollback action for user disable. Verify threat is remediated.",
    mitreTechniques: [],
  },
  {
    actionId: "reset_ad_password",
    displayName: "Reset AD Password",
    category: "Identity",
    connectorKey: "active_directory",
    connector: "activedirectory",
    operation: "reset_password",
    operationTitle: "Reset Password",
    defaultVersion: "2.4.0",
    requiredParams: ["search_attr_name", "search_attr_value", "new_password"],
    optionalParams: ["must_change_password"],
    paramTemplates: {
      search_attr_name: "SamAccount Name",
      search_attr_value: "{{ vars.steps.User_Context.username_normalized | default('') | string | trim }}",
      must_change_password: "true",
    },
    approvalRequired: true,
    rollbackAction: null,
    fallbackAction: null,
    riskLevel: "medium",
    productionNotes: "Force password change on next login.",
    mitreTechniques: ["T1078"],
  },
  {
    actionId: "revoke_azure_sessions",
    displayName: "Revoke Azure AD Sessions",
    category: "Identity",
    connectorKey: "azure_ad",
    connector: "azure-active-directory",
    operation: "revoke_user_sessions",
    operationTitle: "Revoke User Sessions",
    defaultVersion: "3.0.0",
    requiredParams: ["user_principal_name"],
    optionalParams: [],
    paramTemplates: {
      user_principal_name: "{{ vars.steps.User_Context.upn | default('') }}",
    },
    approvalRequired: false,
    rollbackAction: null,
    fallbackAction: null,
    riskLevel: "medium",
    productionNotes: "Forces re-authentication for all Azure AD sessions.",
    mitreTechniques: ["T1078"],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Threat Intel Actions
  // ─────────────────────────────────────────────────────────────────────────
  {
    actionId: "abuseipdb_lookup",
    displayName: "AbuseIPDB IP Lookup",
    category: "Threat Intel",
    connectorKey: "abuseipdb",
    connector: "abuseipdb",
    operation: "ip_lookup",
    operationTitle: "IP Lookup",
    defaultVersion: "2.0.0",
    requiredParams: ["ip"],
    optionalParams: ["days"],
    paramTemplates: {
      ip: "{{ vars.steps.Extract_IOCs.ioc_public_ips.split(',')[0] | trim }}",
      days: "",
    },
    approvalRequired: false,
    rollbackAction: null,
    fallbackAction: null,
    riskLevel: "low",
    productionNotes: "IP reputation lookup. Returns abuse confidence score.",
    mitreTechniques: [],
  },
  {
    actionId: "virustotal_ip_lookup",
    displayName: "VirusTotal IP Lookup",
    category: "Threat Intel",
    connectorKey: "virustotal",
    connector: "virustotal",
    operation: "get_ip_report",
    operationTitle: "Get IP Report",
    defaultVersion: "3.0.0",
    requiredParams: ["ip"],
    optionalParams: [],
    paramTemplates: {
      ip: "{{ vars.steps.Extract_IOCs.ioc_public_ips.split(',')[0] | trim }}",
    },
    approvalRequired: false,
    rollbackAction: null,
    fallbackAction: null,
    riskLevel: "low",
    productionNotes: "VirusTotal IP reputation.",
    mitreTechniques: [],
  },
  {
    actionId: "virustotal_hash_lookup",
    displayName: "VirusTotal Hash Lookup",
    category: "Threat Intel",
    connectorKey: "virustotal",
    connector: "virustotal",
    operation: "get_file_report",
    operationTitle: "Get File Report",
    defaultVersion: "3.0.0",
    requiredParams: ["hash"],
    optionalParams: [],
    paramTemplates: {
      hash: "{{ vars.steps.Extract_IOCs.ioc_hashes.split(',')[0] | trim }}",
    },
    approvalRequired: false,
    rollbackAction: null,
    fallbackAction: null,
    riskLevel: "low",
    productionNotes: "VirusTotal file hash reputation.",
    mitreTechniques: [],
  },
  {
    actionId: "virustotal_domain_lookup",
    displayName: "VirusTotal Domain Lookup",
    category: "Threat Intel",
    connectorKey: "virustotal",
    connector: "virustotal",
    operation: "get_domain_report",
    operationTitle: "Get Domain Report",
    defaultVersion: "3.0.0",
    requiredParams: ["domain"],
    optionalParams: [],
    paramTemplates: {
      domain: "{{ vars.steps.Extract_IOCs.ioc_domains.split(',')[0] | trim }}",
    },
    approvalRequired: false,
    rollbackAction: null,
    fallbackAction: null,
    riskLevel: "low",
    productionNotes: "VirusTotal domain reputation.",
    mitreTechniques: [],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Firewall Actions
  // ─────────────────────────────────────────────────────────────────────────
  {
    actionId: "block_ip_paloalto",
    displayName: "Block IP (Palo Alto)",
    category: "Firewall",
    connectorKey: "palo_alto_firewall",
    connector: "paloalto-panorama",
    operation: "add_address_to_group",
    operationTitle: "Add Address to Block Group",
    defaultVersion: "2.1.0",
    requiredParams: ["address", "address_group"],
    optionalParams: ["description"],
    paramTemplates: {
      address: "{{ vars.steps.Extract_IOCs.ioc_public_ips.split(',')[0] | trim }}",
      address_group: "SOAR-Blocked-IPs",
      description: "Blocked by SOARForge - {{ vars.steps.Build_Context.record_id | default('N/A') }}",
    },
    approvalRequired: true,
    rollbackAction: "unblock_ip_paloalto",
    fallbackAction: null,
    riskLevel: "high",
    productionNotes: "Never auto-block CDN, cloud provider, or shared hosting IPs.",
    mitreTechniques: ["T1071"],
  },
  {
    actionId: "unblock_ip_paloalto",
    displayName: "Unblock IP (Palo Alto)",
    category: "Firewall",
    connectorKey: "palo_alto_firewall",
    connector: "paloalto-panorama",
    operation: "remove_address_from_group",
    operationTitle: "Remove Address from Block Group",
    defaultVersion: "2.1.0",
    requiredParams: ["address", "address_group"],
    optionalParams: [],
    paramTemplates: {
      address: "{{ vars.steps.Extract_IOCs.ioc_public_ips.split(',')[0] | trim }}",
      address_group: "SOAR-Blocked-IPs",
    },
    approvalRequired: true,
    rollbackAction: null,
    fallbackAction: null,
    riskLevel: "medium",
    productionNotes: "Rollback for IP block.",
    mitreTechniques: [],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Email Actions
  // ─────────────────────────────────────────────────────────────────────────
  {
    actionId: "quarantine_email",
    displayName: "Quarantine Email",
    category: "Email",
    connectorKey: "exchange",
    connector: "exchange",
    operation: "quarantine_message",
    operationTitle: "Quarantine Message",
    defaultVersion: "3.0.0",
    requiredParams: ["message_id"],
    optionalParams: ["mailbox"],
    paramTemplates: {
      message_id: "{{ vars.steps.Extract_IOCs.message_id | default('') }}",
      mailbox: "{{ vars.steps.Extract_IOCs.recipient_email | default('') }}",
    },
    approvalRequired: false,
    rollbackAction: "release_email",
    fallbackAction: null,
    riskLevel: "medium",
    productionNotes: "Quarantine only unique messages. Verify message_id exists.",
    mitreTechniques: ["T1566"],
  },
  {
    actionId: "block_sender",
    displayName: "Block Email Sender",
    category: "Email",
    connectorKey: "exchange",
    connector: "exchange",
    operation: "add_to_blocked_senders",
    operationTitle: "Add to Blocked Senders",
    defaultVersion: "3.0.0",
    requiredParams: ["sender_address"],
    optionalParams: [],
    paramTemplates: {
      sender_address: "{{ vars.steps.Extract_IOCs.sender_email | default('') }}",
    },
    approvalRequired: true,
    rollbackAction: "unblock_sender",
    fallbackAction: null,
    riskLevel: "medium",
    productionNotes: "Block sender organization-wide.",
    mitreTechniques: ["T1566"],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SIEM Actions
  // ─────────────────────────────────────────────────────────────────────────
  {
    actionId: "qradar_aql_search",
    displayName: "QRadar AQL Search",
    category: "SIEM",
    connectorKey: "qradar",
    connector: "qradar",
    operation: "run_aql_query",
    operationTitle: "Run AQL Query",
    defaultVersion: "2.2.0",
    requiredParams: ["query"],
    optionalParams: ["range"],
    paramTemplates: {
      query: "{{ vars.steps.QRadar_Hunt_Context.qradar_ransomware_aql | default('') }}",
      range: "items=0-100",
    },
    approvalRequired: false,
    rollbackAction: null,
    fallbackAction: null,
    riskLevel: "low",
    productionNotes: "SIEM hunting query. Results used for correlation.",
    mitreTechniques: [],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Notification Actions
  // ─────────────────────────────────────────────────────────────────────────
  {
    actionId: "send_teams_notification",
    displayName: "Send Teams Notification",
    category: "Notification",
    connectorKey: "microsoft_teams",
    connector: "microsoft-teams",
    operation: "send_message",
    operationTitle: "Send Message",
    defaultVersion: "2.0.0",
    requiredParams: ["channel_id", "message"],
    optionalParams: ["team_id"],
    paramTemplates: {
      channel_id: "{{CUSTOMER_SOC_CHANNEL_ID}}",
      message: "SOARForge Alert: {{ vars.steps.Build_Final_Assessment.final_verdict | default('N/A') }} - {{ vars.steps.Final_Context.hostname | default('N/A') }}",
    },
    approvalRequired: false,
    rollbackAction: null,
    fallbackAction: null,
    riskLevel: "low",
    productionNotes: "SOC channel notification.",
    mitreTechniques: [],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Sandbox Actions
  // ─────────────────────────────────────────────────────────────────────────
  {
    actionId: "submit_file_to_sandbox",
    displayName: "Submit File to FortiSandbox",
    category: "Sandbox",
    connectorKey: "fortisandbox",
    connector: "fortisandbox",
    operation: "submit_file",
    operationTitle: "Submit File",
    defaultVersion: "1.1.0",
    requiredParams: ["hash"],
    optionalParams: ["file_path"],
    paramTemplates: {
      hash: "{{ vars.steps.Extract_IOCs.ioc_hashes.split(',')[0] | trim }}",
      file_path: "{{ vars.steps.Build_Context.file_path | default('') }}",
    },
    approvalRequired: false,
    rollbackAction: null,
    fallbackAction: null,
    riskLevel: "low",
    productionNotes: "Detonate file hash in sandbox. Returns behavioral verdict.",
    mitreTechniques: ["T1204"],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Additional Threat Intel Actions
  // ─────────────────────────────────────────────────────────────────────────
  {
    actionId: "fortiguard_url_lookup",
    displayName: "FortiGuard URL Lookup",
    category: "Threat Intel",
    connectorKey: "fortiguard",
    connector: "fortiguard",
    operation: "lookup_url",
    operationTitle: "Lookup URL",
    defaultVersion: "1.2.0",
    requiredParams: ["url"],
    optionalParams: [],
    paramTemplates: {
      url: "{{ vars.steps.Extract_IOCs.ioc_urls.split(',')[0] | trim }}",
    },
    approvalRequired: false,
    rollbackAction: null,
    fallbackAction: null,
    riskLevel: "low",
    productionNotes: "FortiGuard URL category and reputation lookup.",
    mitreTechniques: [],
  },
  {
    actionId: "virustotal_url_lookup",
    displayName: "VirusTotal URL Lookup",
    category: "Threat Intel",
    connectorKey: "virustotal",
    connector: "virustotal",
    operation: "get_url_report",
    operationTitle: "Get URL Report",
    defaultVersion: "3.0.0",
    requiredParams: ["url"],
    optionalParams: [],
    paramTemplates: {
      url: "{{ vars.steps.Extract_IOCs.ioc_urls.split(',')[0] | trim }}",
    },
    approvalRequired: false,
    rollbackAction: null,
    fallbackAction: null,
    riskLevel: "low",
    productionNotes: "VirusTotal URL reputation scan.",
    mitreTechniques: [],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Additional Firewall Actions
  // ─────────────────────────────────────────────────────────────────────────
  {
    actionId: "block_ip_fortigate",
    displayName: "Block IP (FortiGate)",
    category: "Firewall",
    connectorKey: "fortigate_firewall",
    connector: "fortigate",
    operation: "add_address_to_group",
    operationTitle: "Add Address to Block Group",
    defaultVersion: "3.0.0",
    requiredParams: ["address", "address_group"],
    optionalParams: ["description"],
    paramTemplates: {
      address: "{{ vars.steps.Extract_IOCs.ioc_public_ips.split(',')[0] | trim }}",
      address_group: "SOAR-Blocked-IPs",
      description: "Blocked by SOARForge - {{ vars.steps.Build_Context.record_id | default('N/A') }}",
    },
    approvalRequired: true,
    rollbackAction: "unblock_ip_fortigate",
    fallbackAction: null,
    riskLevel: "high",
    productionNotes: "Never auto-block CDN, cloud provider, or shared hosting IPs.",
    mitreTechniques: ["T1071"],
  },
  {
    actionId: "unblock_ip_fortigate",
    displayName: "Unblock IP (FortiGate)",
    category: "Firewall",
    connectorKey: "fortigate_firewall",
    connector: "fortigate",
    operation: "remove_address_from_group",
    operationTitle: "Remove Address from Block Group",
    defaultVersion: "3.0.0",
    requiredParams: ["address", "address_group"],
    optionalParams: [],
    paramTemplates: {
      address: "{{ vars.steps.Extract_IOCs.ioc_public_ips.split(',')[0] | trim }}",
      address_group: "SOAR-Blocked-IPs",
    },
    approvalRequired: true,
    rollbackAction: null,
    fallbackAction: null,
    riskLevel: "medium",
    productionNotes: "Rollback for FortiGate IP block.",
    mitreTechniques: [],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Additional Email Actions
  // ─────────────────────────────────────────────────────────────────────────
  {
    actionId: "release_email",
    displayName: "Release Email from Quarantine",
    category: "Email",
    connectorKey: "exchange",
    connector: "exchange",
    operation: "release_message",
    operationTitle: "Release Message",
    defaultVersion: "3.0.0",
    requiredParams: ["message_id"],
    optionalParams: ["mailbox"],
    paramTemplates: {
      message_id: "{{ vars.steps.Extract_IOCs.message_id | default('') }}",
      mailbox: "{{ vars.steps.Extract_IOCs.recipient_email | default('') }}",
    },
    approvalRequired: true,
    rollbackAction: null,
    fallbackAction: null,
    riskLevel: "medium",
    productionNotes: "Release false-positive quarantined email. Requires analyst approval.",
    mitreTechniques: [],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Ticketing Actions
  // ─────────────────────────────────────────────────────────────────────────
  {
    actionId: "lookup_duplicate_ticket",
    displayName: "Lookup Duplicate Ticket (ServiceNow)",
    category: "Ticketing",
    connectorKey: "servicenow",
    connector: "servicenow",
    operation: "query_incident",
    operationTitle: "Query Incident",
    defaultVersion: "3.2.0",
    requiredParams: ["query"],
    optionalParams: [],
    paramTemplates: {
      query: "short_description CONTAINS SOARForge AND alert_id={{ vars.steps.Build_Context.record_id | default('') }}",
    },
    approvalRequired: false,
    rollbackAction: null,
    fallbackAction: null,
    riskLevel: "low",
    productionNotes: "Duplicate_Ticket_Lookup: check if a ticket already exists for this alert before creating.",
    mitreTechniques: [],
  },
  {
    actionId: "lookup_duplicate_ticket_jira",
    displayName: "Lookup Duplicate Ticket (Jira)",
    category: "Ticketing",
    connectorKey: "jira",
    connector: "jira",
    operation: "search_issues",
    operationTitle: "Search Issues",
    defaultVersion: "2.3.0",
    requiredParams: ["jql"],
    optionalParams: [],
    paramTemplates: {
      jql: "summary ~ \"SOARForge\" AND description ~ \"{{ vars.steps.Build_Context.record_id | default('') }}\" AND status != Done",
    },
    approvalRequired: false,
    rollbackAction: null,
    fallbackAction: null,
    riskLevel: "low",
    productionNotes: "Duplicate_Ticket_Lookup for Jira. Check before creating new ticket.",
    mitreTechniques: [],
  },
  {
    actionId: "create_servicenow_incident",
    displayName: "Create ServiceNow Incident",
    category: "Ticketing",
    connectorKey: "servicenow",
    connector: "servicenow",
    operation: "create_incident",
    operationTitle: "Create Incident",
    defaultVersion: "3.2.0",
    requiredParams: ["short_description", "description"],
    optionalParams: ["urgency", "impact", "assignment_group"],
    paramTemplates: {
      short_description: "SOARForge: {{ vars.steps.Build_Context.alert_name | default('Security Alert') }}",
      description: "{{ vars.steps.Executive_Risk_Summary.executive_summary | default('N/A') }}",
      urgency: "2",
      impact: "2",
    },
    approvalRequired: false,
    rollbackAction: null,
    fallbackAction: null,
    riskLevel: "low",
    productionNotes: "Create incident ticket for tracking.",
    mitreTechniques: [],
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

export function getActionById(actionId: string): FortiSOARActionEntry | undefined {
  return FORTISOAR_ACTION_REGISTRY.find((a) => a.actionId === actionId);
}

export function getActionsByCategory(category: string): FortiSOARActionEntry[] {
  return FORTISOAR_ACTION_REGISTRY.filter((a) => a.category === category);
}

export function getConnectorTemplate(connectorKey: string): Omit<FortiSOARConnectorConfig, "config" | "isConfigured"> | undefined {
  return FORTISOAR_CONNECTOR_TEMPLATES[connectorKey];
}

export function buildConnectorConfig(
  connectorKey: string,
  configUuid?: string
): FortiSOARConnectorConfig {
  const template = FORTISOAR_CONNECTOR_TEMPLATES[connectorKey];
  if (!template) {
    return {
      connector: connectorKey,
      config: configUuid || `{{CUSTOMER_${connectorKey.toUpperCase()}_CONFIG_UUID}}`,
      version: "1.0.0",
      displayName: connectorKey,
      category: "Unknown",
      isConfigured: !!configUuid,
    };
  }
  return {
    ...template,
    config: configUuid || `{{CUSTOMER_${connectorKey.toUpperCase()}_CONFIG_UUID}}`,
    isConfigured: !!configUuid,
  };
}

export function getRequiredConnectorsForActions(actionIds: string[]): string[] {
  const connectorKeys = new Set<string>();
  for (const actionId of actionIds) {
    const action = getActionById(actionId);
    if (action) {
      connectorKeys.add(action.connectorKey);
    }
  }
  return Array.from(connectorKeys);
}

/**
 * Build a connectors map from an explicit list of connector keys.
 * Used by loadTemplate to pre-populate the deployment profile.
 */
export function buildConnectorsForTemplate(
  connectorKeys: string[]
): Record<string, FortiSOARConnectorConfig> {
  const result: Record<string, FortiSOARConnectorConfig> = {};
  for (const key of connectorKeys) {
    result[key] = buildConnectorConfig(key);
  }
  return result;
}
