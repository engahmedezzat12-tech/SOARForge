// ============================================================
// SOARForge — Normalized Action Mapping
// Maps normalized command IDs to platform-native equivalents
// ============================================================

import type { SoarPlatformId } from '../soar-platforms';

export type ActionConfidence = 'high' | 'medium' | 'low';

export interface NormalizedActionMapping {
  normalizedCommand: string;            // e.g. "edr.device.isolate"
  category: string;
  description: string;
  isDestructive: boolean;
  approvalRecommended: boolean;
  rollbackSupported: boolean;
  platformMappings: Partial<Record<SoarPlatformId, PlatformActionEquivalent>>;
}

export interface PlatformActionEquivalent {
  nativeEquivalent: string;
  confidence: ActionConfidence;
  tenantVerificationRequired: boolean;
  notes?: string;
}

// ─────────────────────────────────────────────────────────────
// Action Registry
// ─────────────────────────────────────────────────────────────
export const NORMALIZED_ACTION_REGISTRY: NormalizedActionMapping[] = [

  // ── EDR ───────────────────────────────────────────────────
  {
    normalizedCommand: 'edr.device.search',
    category: 'edr',
    description: 'Search for a device/endpoint by hostname or IP',
    isDestructive: false,
    approvalRecommended: false,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Get Endpoint Details', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true, notes: 'Depends on EDR integration instance' },
      splunk_soar:         { nativeEquivalent: 'get device info', confidence: 'medium', tenantVerificationRequired: true, notes: 'App asset name required' },
      sentinel_logic_apps: { nativeEquivalent: 'Get-MgDevice (MS Graph)', confidence: 'medium', tenantVerificationRequired: true },
      tines:               { nativeEquivalent: 'HTTP Request to EDR API', confidence: 'medium', tenantVerificationRequired: true },
      shuffle:             { nativeEquivalent: 'verify in tenant', confidence: 'low', tenantVerificationRequired: true },
      qradar_soar:         { nativeEquivalent: 'verify in tenant', confidence: 'low', tenantVerificationRequired: true },
      servicenow_secops:   { nativeEquivalent: 'verify in tenant', confidence: 'low', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'edr.device.search', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'edr.device.isolate',
    category: 'edr',
    description: 'Isolate/quarantine endpoint from network',
    isDestructive: true,
    approvalRecommended: true,
    rollbackSupported: true,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Isolate Device', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true, notes: 'isolate-endpoint or contain-host depending on EDR' },
      splunk_soar:         { nativeEquivalent: 'quarantine device', confidence: 'medium', tenantVerificationRequired: true },
      sentinel_logic_apps: { nativeEquivalent: 'Isolate-MgDeviceManagementManagedDevice', confidence: 'medium', tenantVerificationRequired: true },
      tines:               { nativeEquivalent: 'HTTP Request to EDR isolate API', confidence: 'medium', tenantVerificationRequired: true },
      shuffle:             { nativeEquivalent: 'verify in tenant', confidence: 'low', tenantVerificationRequired: true },
      qradar_soar:         { nativeEquivalent: 'verify in tenant', confidence: 'low', tenantVerificationRequired: true },
      servicenow_secops:   { nativeEquivalent: 'verify in tenant', confidence: 'low', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'edr.device.isolate', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'edr.device.unisolate',
    category: 'edr',
    description: 'Remove endpoint isolation/quarantine',
    isDestructive: false,
    approvalRecommended: true,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Un-Isolate Device', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'unquarantine device', confidence: 'medium', tenantVerificationRequired: true },
      sentinel_logic_apps: { nativeEquivalent: 'verify in tenant', confidence: 'low', tenantVerificationRequired: true },
      tines:               { nativeEquivalent: 'HTTP Request to EDR unisolate API', confidence: 'medium', tenantVerificationRequired: true },
      shuffle:             { nativeEquivalent: 'verify in tenant', confidence: 'low', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'edr.device.unisolate', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'edr.ioc.block',
    category: 'edr',
    description: 'Block an IOC (hash, IP, URL) in EDR',
    isDestructive: true,
    approvalRecommended: true,
    rollbackSupported: true,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Add IOC to Blocklist', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'block ip', confidence: 'medium', tenantVerificationRequired: true },
      sentinel_logic_apps: { nativeEquivalent: 'verify in tenant', confidence: 'low', tenantVerificationRequired: true },
      tines:               { nativeEquivalent: 'HTTP Request to EDR block API', confidence: 'medium', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'edr.ioc.block', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'edr.process.kill',
    category: 'edr',
    description: 'Kill a running process on an endpoint',
    isDestructive: true,
    approvalRecommended: true,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Kill Process', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'terminate process', confidence: 'medium', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'edr.process.kill', confidence: 'high', tenantVerificationRequired: false },
    },
  },

  // ── Identity ─────────────────────────────────────────────
  {
    normalizedCommand: 'iam.user.disable',
    category: 'identity',
    description: 'Disable a user account in IAM/directory',
    isDestructive: true,
    approvalRecommended: true,
    rollbackSupported: true,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Disable AD User', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'disable account', confidence: 'medium', tenantVerificationRequired: true },
      sentinel_logic_apps: { nativeEquivalent: 'Update-MgUser (accountEnabled: false)', confidence: 'high', tenantVerificationRequired: true },
      tines:               { nativeEquivalent: 'HTTP Request to Graph/AD API', confidence: 'medium', tenantVerificationRequired: true },
      shuffle:             { nativeEquivalent: 'verify in tenant', confidence: 'low', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'iam.user.disable', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'iam.user.enable',
    category: 'identity',
    description: 'Re-enable a disabled user account',
    isDestructive: false,
    approvalRecommended: true,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Enable AD User', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'enable account', confidence: 'medium', tenantVerificationRequired: true },
      sentinel_logic_apps: { nativeEquivalent: 'Update-MgUser (accountEnabled: true)', confidence: 'high', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'iam.user.enable', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'iam.user.reset_password',
    category: 'identity',
    description: 'Force password reset for a user',
    isDestructive: false,
    approvalRecommended: false,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Reset User Password', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'reset password', confidence: 'medium', tenantVerificationRequired: true },
      sentinel_logic_apps: { nativeEquivalent: 'Reset-MgUserPassword', confidence: 'medium', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'iam.user.reset_password', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'iam.session.revoke',
    category: 'identity',
    description: 'Revoke all active sessions for a user',
    isDestructive: true,
    approvalRecommended: false,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Revoke User Sessions', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      sentinel_logic_apps: { nativeEquivalent: 'Revoke-MgUserSignInSession', confidence: 'high', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'iam.session.revoke', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'iam.mfa.reset',
    category: 'identity',
    description: 'Reset MFA enrollment for a user',
    isDestructive: false,
    approvalRecommended: false,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Reset MFA', confidence: 'medium', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'low', tenantVerificationRequired: true },
      sentinel_logic_apps: { nativeEquivalent: 'verify in tenant', confidence: 'low', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'iam.mfa.reset', confidence: 'high', tenantVerificationRequired: false },
    },
  },

  // ── Firewall / WAF ───────────────────────────────────────
  {
    normalizedCommand: 'firewall.ip.block',
    category: 'firewall',
    description: 'Block an IP address on the firewall',
    isDestructive: true,
    approvalRecommended: true,
    rollbackSupported: true,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Block IP', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'block ip', confidence: 'medium', tenantVerificationRequired: true },
      tines:               { nativeEquivalent: 'HTTP Request to Firewall API', confidence: 'medium', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'firewall.ip.block', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'firewall.ip.unblock',
    category: 'firewall',
    description: 'Remove IP block from firewall',
    isDestructive: false,
    approvalRecommended: true,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Unblock IP', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'unblock ip', confidence: 'medium', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'firewall.ip.unblock', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'waf.ip.block',
    category: 'firewall',
    description: 'Block an IP on the WAF',
    isDestructive: true,
    approvalRecommended: true,
    rollbackSupported: true,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Block IP on WAF', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'low', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'verify in tenant', confidence: 'low', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'waf.ip.block', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'waf.url.block',
    category: 'firewall',
    description: 'Block a URL/path on the WAF',
    isDestructive: true,
    approvalRecommended: true,
    rollbackSupported: true,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Block URL on WAF', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'low', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'waf.url.block', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'waf.rule.update',
    category: 'firewall',
    description: 'Update or create a WAF rule',
    isDestructive: false,
    approvalRecommended: true,
    rollbackSupported: true,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Update WAF Rule', confidence: 'medium', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'waf.rule.update', confidence: 'high', tenantVerificationRequired: false },
    },
  },

  // ── Email ─────────────────────────────────────────────────
  {
    normalizedCommand: 'email.message.search',
    category: 'email_security',
    description: 'Search for email messages by criteria',
    isDestructive: false,
    approvalRecommended: false,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Search Email Messages', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'search email', confidence: 'medium', tenantVerificationRequired: true },
      sentinel_logic_apps: { nativeEquivalent: 'Search-MgUserMessage', confidence: 'high', tenantVerificationRequired: true },
      tines:               { nativeEquivalent: 'HTTP Request to Exchange/Gmail API', confidence: 'medium', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'email.message.search', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'email.message.quarantine',
    category: 'email_security',
    description: 'Quarantine an email message',
    isDestructive: true,
    approvalRecommended: false,
    rollbackSupported: true,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Quarantine Email', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'quarantine email', confidence: 'medium', tenantVerificationRequired: true },
      sentinel_logic_apps: { nativeEquivalent: 'Move-MgUserMailFolderMessage', confidence: 'medium', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'email.message.quarantine', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'email.message.delete',
    category: 'email_security',
    description: 'Delete an email message',
    isDestructive: true,
    approvalRecommended: true,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Delete Email', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'delete email', confidence: 'medium', tenantVerificationRequired: true },
      sentinel_logic_apps: { nativeEquivalent: 'Remove-MgUserMessage', confidence: 'medium', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'email.message.delete', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'email.sender.block',
    category: 'email_security',
    description: 'Block an email sender',
    isDestructive: true,
    approvalRecommended: false,
    rollbackSupported: true,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Block Sender', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'block sender', confidence: 'medium', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'email.sender.block', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'email.url.block',
    category: 'email_security',
    description: 'Block a URL found in email',
    isDestructive: true,
    approvalRecommended: false,
    rollbackSupported: true,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Block URL', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'email.url.block', confidence: 'high', tenantVerificationRequired: false },
    },
  },

  // ── Threat Intelligence ──────────────────────────────────
  {
    normalizedCommand: 'ti.ip.reputation',
    category: 'threat_intel',
    description: 'Look up IP reputation from threat intelligence',
    isDestructive: false,
    approvalRecommended: false,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Get IP Reputation', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'ip', confidence: 'high', tenantVerificationRequired: true, notes: 'Uses built-in enrichment command' },
      splunk_soar:         { nativeEquivalent: 'ip reputation', confidence: 'high', tenantVerificationRequired: true },
      sentinel_logic_apps: { nativeEquivalent: 'ThreatIntelligenceIndicators API', confidence: 'medium', tenantVerificationRequired: true },
      tines:               { nativeEquivalent: 'HTTP Request to TI API', confidence: 'medium', tenantVerificationRequired: true },
      shuffle:             { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'ti.ip.reputation', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'ti.domain.reputation',
    category: 'threat_intel',
    description: 'Look up domain reputation',
    isDestructive: false,
    approvalRecommended: false,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Get Domain Reputation', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'domain', confidence: 'high', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'domain reputation', confidence: 'high', tenantVerificationRequired: true },
      tines:               { nativeEquivalent: 'HTTP Request to TI API', confidence: 'medium', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'ti.domain.reputation', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'ti.url.reputation',
    category: 'threat_intel',
    description: 'Look up URL reputation',
    isDestructive: false,
    approvalRecommended: false,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Get URL Reputation', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'url', confidence: 'high', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'url reputation', confidence: 'high', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'ti.url.reputation', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'ti.hash.reputation',
    category: 'threat_intel',
    description: 'Look up file hash reputation',
    isDestructive: false,
    approvalRecommended: false,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Get File Hash Reputation', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'file', confidence: 'high', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'file reputation', confidence: 'high', tenantVerificationRequired: true },
      tines:               { nativeEquivalent: 'HTTP Request to VirusTotal/TI API', confidence: 'medium', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'ti.hash.reputation', confidence: 'high', tenantVerificationRequired: false },
    },
  },

  // ── Sandbox ───────────────────────────────────────────────
  {
    normalizedCommand: 'sandbox.file.detonate',
    category: 'sandbox',
    description: 'Submit file to sandbox for detonation/analysis',
    isDestructive: false,
    approvalRecommended: false,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Detonate File', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'detonate file', confidence: 'medium', tenantVerificationRequired: true },
      tines:               { nativeEquivalent: 'HTTP Request to sandbox API', confidence: 'medium', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'sandbox.file.detonate', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'sandbox.url.detonate',
    category: 'sandbox',
    description: 'Submit URL to sandbox for detonation/analysis',
    isDestructive: false,
    approvalRecommended: false,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Detonate URL', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'detonate url', confidence: 'medium', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'sandbox.url.detonate', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'sandbox.report.get',
    category: 'sandbox',
    description: 'Retrieve sandbox analysis report',
    isDestructive: false,
    approvalRecommended: false,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Get Sandbox Report', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'get detonation results', confidence: 'medium', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'sandbox.report.get', confidence: 'high', tenantVerificationRequired: false },
    },
  },

  // ── Ticketing ─────────────────────────────────────────────
  {
    normalizedCommand: 'ticket.issue.create',
    category: 'ticketing',
    description: 'Create a ticket/issue in ticketing system',
    isDestructive: false,
    approvalRecommended: false,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Create Ticket', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'jira-create-issue or servicenow-create-record', confidence: 'medium', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'create ticket', confidence: 'high', tenantVerificationRequired: true },
      sentinel_logic_apps: { nativeEquivalent: 'ServiceNow/Jira connector action', confidence: 'medium', tenantVerificationRequired: true },
      tines:               { nativeEquivalent: 'HTTP Request to ticketing API', confidence: 'medium', tenantVerificationRequired: true },
      servicenow_secops:   { nativeEquivalent: 'Create Record (sn_si_incident)', confidence: 'high', tenantVerificationRequired: true },
      shuffle:             { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'ticket.issue.create', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'ticket.issue.update',
    category: 'ticketing',
    description: 'Update an existing ticket/issue',
    isDestructive: false,
    approvalRecommended: false,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Update Record', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'update ticket', confidence: 'medium', tenantVerificationRequired: true },
      servicenow_secops:   { nativeEquivalent: 'Update Record', confidence: 'high', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'ticket.issue.update', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'ticket.issue.comment',
    category: 'ticketing',
    description: 'Add a comment to a ticket/issue',
    isDestructive: false,
    approvalRecommended: false,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Add Comment', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'add comment', confidence: 'medium', tenantVerificationRequired: true },
      servicenow_secops:   { nativeEquivalent: 'Create Journal Entry', confidence: 'high', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'ticket.issue.comment', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'ticket.issue.close',
    category: 'ticketing',
    description: 'Close/resolve a ticket',
    isDestructive: false,
    approvalRecommended: false,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Close Alert / Close Incident', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'closeInvestigation', confidence: 'high', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'close container', confidence: 'medium', tenantVerificationRequired: true },
      servicenow_secops:   { nativeEquivalent: 'Update Record (state: resolved)', confidence: 'high', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'ticket.issue.close', confidence: 'high', tenantVerificationRequired: false },
    },
  },

  // ── Notification ─────────────────────────────────────────
  {
    normalizedCommand: 'notify.email.send',
    category: 'notification',
    description: 'Send email notification',
    isDestructive: false,
    approvalRecommended: false,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Send Email Notification', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'send-mail', confidence: 'high', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'send email', confidence: 'high', tenantVerificationRequired: true },
      sentinel_logic_apps: { nativeEquivalent: 'Office 365 Send Email', confidence: 'high', tenantVerificationRequired: true },
      tines:               { nativeEquivalent: 'EmailAgent', confidence: 'high', tenantVerificationRequired: true },
      shuffle:             { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'notify.email.send', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'notify.teams.send',
    category: 'notification',
    description: 'Send Microsoft Teams message',
    isDestructive: false,
    approvalRecommended: false,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Send Teams Message', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'post message', confidence: 'medium', tenantVerificationRequired: true },
      sentinel_logic_apps: { nativeEquivalent: 'Teams Post Message', confidence: 'high', tenantVerificationRequired: true },
      tines:               { nativeEquivalent: 'HTTP Request to Teams webhook', confidence: 'high', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'notify.teams.send', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'notify.slack.send',
    category: 'notification',
    description: 'Send Slack message',
    isDestructive: false,
    approvalRecommended: false,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Send Slack Message', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'send-notification', confidence: 'high', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'send message', confidence: 'high', tenantVerificationRequired: true },
      tines:               { nativeEquivalent: 'HTTP Request to Slack API', confidence: 'high', tenantVerificationRequired: true },
      shuffle:             { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'notify.slack.send', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'notify.message.send',
    category: 'notification',
    description: 'Send a generic notification message',
    isDestructive: false,
    approvalRecommended: false,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Send Notification', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'notify.message.send', confidence: 'high', tenantVerificationRequired: false },
    },
  },

  // ── Case ─────────────────────────────────────────────────
  {
    normalizedCommand: 'case.comment.add',
    category: 'case',
    description: 'Add a comment to the SOAR case/incident',
    isDestructive: false,
    approvalRecommended: false,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Add Comment to Alert', confidence: 'high', tenantVerificationRequired: false },
      cortex_xsoar:        { nativeEquivalent: 'addComment or setIncident', confidence: 'high', tenantVerificationRequired: false },
      splunk_soar:         { nativeEquivalent: 'add comment to container', confidence: 'high', tenantVerificationRequired: false },
      sentinel_logic_apps: { nativeEquivalent: 'Add Incident Comment', confidence: 'high', tenantVerificationRequired: true },
      tines:               { nativeEquivalent: 'HTTP Request to SOAR API', confidence: 'medium', tenantVerificationRequired: true },
      servicenow_secops:   { nativeEquivalent: 'Create Journal Entry', confidence: 'high', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'case.comment.add', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'case.field.update',
    category: 'case',
    description: 'Update a field on the SOAR case/incident record',
    isDestructive: false,
    approvalRecommended: false,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Update Alert / Update Record', confidence: 'high', tenantVerificationRequired: false },
      cortex_xsoar:        { nativeEquivalent: 'setIncident', confidence: 'high', tenantVerificationRequired: false },
      splunk_soar:         { nativeEquivalent: 'update container', confidence: 'high', tenantVerificationRequired: false },
      sentinel_logic_apps: { nativeEquivalent: 'Update Incident', confidence: 'high', tenantVerificationRequired: true },
      servicenow_secops:   { nativeEquivalent: 'Update Record', confidence: 'high', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'case.field.update', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'case.close',
    category: 'case',
    description: 'Close the SOAR case/incident',
    isDestructive: false,
    approvalRecommended: false,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Close Alert', confidence: 'high', tenantVerificationRequired: false },
      cortex_xsoar:        { nativeEquivalent: 'closeInvestigation', confidence: 'high', tenantVerificationRequired: false },
      splunk_soar:         { nativeEquivalent: 'close container', confidence: 'high', tenantVerificationRequired: false },
      sentinel_logic_apps: { nativeEquivalent: 'Close Incident', confidence: 'high', tenantVerificationRequired: true },
      servicenow_secops:   { nativeEquivalent: 'Update Record (state: closed)', confidence: 'high', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'case.close', confidence: 'high', tenantVerificationRequired: false },
    },
  },

  // ── Vulnerability ─────────────────────────────────────────
  {
    normalizedCommand: 'vuln.cve.lookup',
    category: 'vulnerability',
    description: 'Look up CVE details',
    isDestructive: false,
    approvalRecommended: false,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Get CVE Details', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'lookup cve', confidence: 'medium', tenantVerificationRequired: true },
      tines:               { nativeEquivalent: 'HTTP Request to NVD/vuln API', confidence: 'medium', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'vuln.cve.lookup', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'vuln.asset.lookup',
    category: 'vulnerability',
    description: 'Look up vulnerability findings for an asset',
    isDestructive: false,
    approvalRecommended: false,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Get Asset Vulnerabilities', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'list vulnerabilities', confidence: 'medium', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'vuln.asset.lookup', confidence: 'high', tenantVerificationRequired: false },
    },
  },
  {
    normalizedCommand: 'vuln.ticket.create',
    category: 'vulnerability',
    description: 'Create a vulnerability remediation ticket',
    isDestructive: false,
    approvalRecommended: false,
    rollbackSupported: false,
    platformMappings: {
      fortisoar:           { nativeEquivalent: 'Create Vulnerability Ticket', confidence: 'high', tenantVerificationRequired: true },
      cortex_xsoar:        { nativeEquivalent: 'verify in tenant', confidence: 'medium', tenantVerificationRequired: true },
      splunk_soar:         { nativeEquivalent: 'create ticket', confidence: 'medium', tenantVerificationRequired: true },
      servicenow_secops:   { nativeEquivalent: 'Create Vulnerability Response Item', confidence: 'high', tenantVerificationRequired: true },
      generic_soar:        { nativeEquivalent: 'vuln.ticket.create', confidence: 'high', tenantVerificationRequired: false },
    },
  },
];

/**
 * Look up a normalized action mapping by command ID
 */
export function getNormalizedAction(normalizedCommand: string): NormalizedActionMapping | undefined {
  return NORMALIZED_ACTION_REGISTRY.find((a) => a.normalizedCommand === normalizedCommand);
}

/**
 * Get all action mappings for a given category
 */
export function getActionsByCategory(category: string): NormalizedActionMapping[] {
  return NORMALIZED_ACTION_REGISTRY.filter((a) => a.category === category);
}

/**
 * Get the native equivalent for a normalized command on a given platform
 */
export function getPlatformNativeAction(
  normalizedCommand: string,
  platformId: SoarPlatformId,
): PlatformActionEquivalent | null {
  const action = getNormalizedAction(normalizedCommand);
  if (!action) return null;
  return action.platformMappings[platformId] ?? null;
}
