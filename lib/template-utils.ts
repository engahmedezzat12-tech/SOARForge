'use client';

import type { PlaybookState, ScoringModel } from './soar-types';
import type { PlaybookTemplate } from './soar-types';
import { hardenTemplateWithThreatKnowledge } from './threat-knowledge/template-hardening';

/**
 * Apply best-practice defaults to fill in optional fields.
 * Used when a template doesn't provide certain values.
 */
export function applyBestPracticeDefaults(
  template: PlaybookTemplate
): Partial<PlaybookState> {
  return {
    // If no testing plan in template, provide structure
    testingPlan: template.testingPlan || {
      scenarios: template.testCases?.map((t) => `- ${t.name}`).join('\n') || 'Define test scenarios',
      successCriteria: 'All test cases pass without false positives',
      performanceTargets: 'Detection latency < 2 min, false positive rate < 1%',
    },

    // If no approval sign-off, provide defaults
    approvalSignOff: template.approvalSignOff || {
      approvedBy: 'SOC Manager',
      approvalDate: new Date().toISOString().split('T')[0],
      complianceNotes: 'Complies with incident response policy',
      reviewHistory: 'Initial review',
    },

    // If no fallback procedure, provide defaults
    fallbackProcedure: template.fallbackProcedure || {
      escalationPath: 'SOC Analyst → SOC Manager → CISO',
      manualSteps: template.fallbackItems?.map((f) => `- ${f.action}`).join('\n') || 'Manual escalation required',
      communicationTemplate: 'Notify affected teams via security channel',
    },
  };
}

/**
 * Auto-fill missing fields in PlaybookState from template.
 * Called by loadTemplate to ensure all 11 steps have data.
 */
export function autoFillMissingFields(
  template: PlaybookTemplate,
  currentId: string
): PlaybookState {
  const defaults = applyBestPracticeDefaults(template);

  // Build full ScoringModel with all fields
  const scoringModel: ScoringModel = {
    type: template.scoringModel?.type || template.scoringType || 'additive',
    severity: template.severity,
    rules: template.scoringModel?.rules || template.scoringRules || [],
    thresholds: template.scoringModel?.thresholds || template.scoringThresholds || [],
    approvalRecommendation: template.scoringModel?.approvalRecommendation || template.approvalNotes || '',
    actionRecommendation: template.scoringModel?.actionRecommendation || '',
    decisionLogic: template.scoringModel?.decisionLogic || '',
    mitreMapping: template.scoringModel?.mitreMapping || template.mitreTactics || [],
  };

  const playbook: PlaybookState = {
    id: currentId,
    name: template.name,
    description: template.description,
    severity: template.severity,
    owner: '',
    templateId: template.id,
    generatorType: template.generatorType || template.category?.toLowerCase().replace(/\s+/g, '_') || 'custom',
    
    // Step 2: Trigger
    trigger: template.trigger || {
      type: template.triggerType || '',
      description: template.triggerDescription || '',
      sourceSystem: template.sourceSystems?.[0] || '',
    },
    
    // Step 3: Entities
    entities: template.entities || template.requiredEntities || [],
    
    // Step 4: Enrichment
    enrichmentConnectors: template.enrichmentConnectors || template.enrichmentSources || [],
    
    // Step 5: Scoring
    scoringModel,
    
    // Step 6: Actions
    actions: template.actions || template.actionIds || [],
    
    // Step 7: Fallback
    fallbackProcedure: defaults.fallbackProcedure || template.fallbackProcedure || {
      escalationPath: '',
      manualSteps: '',
      communicationTemplate: '',
    },
    
    // Step 8: Testing
    testingPlan: defaults.testingPlan || {
      scenarios: '',
      successCriteria: '',
      performanceTargets: '',
    },
    
    // Step 9: Approval
    approvalSignOff: defaults.approvalSignOff || {
      approvedBy: '',
      approvalDate: '',
      complianceNotes: '',
      reviewHistory: '',
    },
    
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return hardenTemplateWithThreatKnowledge(template, playbook);
}

// Per-template canonical connector sets — authoritative source of truth.
// These represent the correct connectors each generator actually uses.
const TEMPLATE_CONNECTOR_SETS: Record<string, string[]> = {
  ransomware:        ['groupib_edr', 'active_directory', 'fortisandbox', 'microsoft_teams', 'virustotal'],
  waf_attack:        ['fortigate_firewall', 'palo_alto_firewall', 'abuseipdb', 'virustotal', 'microsoft_teams'],
  phishing:          ['exchange', 'abuseipdb', 'virustotal', 'microsoft_teams'],
  suspicious_login:  ['active_directory', 'azure_ad', 'abuseipdb', 'microsoft_teams'],
  malware_hash:      ['groupib_edr', 'virustotal', 'fortisandbox', 'microsoft_teams'],
  malicious_ip:      ['abuseipdb', 'virustotal', 'fortigate_firewall', 'palo_alto_firewall', 'microsoft_teams'],
  vulnerability:     ['servicenow', 'jira'],
  ticket_automation: ['servicenow', 'jira'],
  threat_intel:      ['virustotal', 'abuseipdb', 'fortiguard', 'microsoft_teams'],
  custom:            [],
  custom_blank:      [],
};

/**
 * Get required connectors for a template.
 *
 * Priority:
 *  1. Per-template canonical set from TEMPLATE_CONNECTOR_SETS (keyed by generatorType or id)
 *  2. Explicit requiredConnectorKeys from template definition
 *  3. Action-derived connector keys
 *  4. Enrichment connector keys (normalised)
 *
 * Ticketing connectors (servicenow / jira) are added when ticketingEnabled or
 * when the template's canonical set already includes them.
 */
export function getRequiredConnectorsForTemplate(template: PlaybookTemplate): string[] {
  const connectors = new Set<string>();

  // 1. Canonical per-template set
  const canonicalKey = template.generatorType || template.id;
  const canonical = TEMPLATE_CONNECTOR_SETS[canonicalKey];
  if (canonical) {
    for (const k of canonical) connectors.add(k);
  }

  // 2. Explicit requiredConnectorKeys declared on the template
  if (template.requiredConnectorKeys) {
    for (const k of template.requiredConnectorKeys) connectors.add(k);
  }

  // 3. Action-derived connector keys — use the action registry mapping
  const ACTION_CONNECTOR_MAP: Record<string, string> = {
    isolate_endpoint:          'groupib_edr',
    unisolate_endpoint:        'groupib_edr',
    search_asset_by_hostname:  'groupib_edr',
    crowdstrike_contain_host:  'crowdstrike_edr',
    defender_isolate_machine:  'microsoft_defender',
    disable_ad_user:           'active_directory',
    enable_ad_user:            'active_directory',
    reset_ad_password:         'active_directory',
    disable_account:           'active_directory',
    revoke_azure_sessions:     'azure_ad',
    abuseipdb_lookup:          'abuseipdb',
    virustotal_ip_lookup:      'virustotal',
    virustotal_hash_lookup:    'virustotal',
    virustotal_domain_lookup:  'virustotal',
    virustotal_url_lookup:     'virustotal',
    fortiguard_url_lookup:     'fortiguard',
    block_ip_paloalto:         'palo_alto_firewall',
    unblock_ip_paloalto:       'palo_alto_firewall',
    block_ip_fortigate:        'fortigate_firewall',
    unblock_ip_fortigate:      'fortigate_firewall',
    quarantine_email:          'exchange',
    block_sender:              'exchange',
    release_email:             'exchange',
    send_teams_notification:   'microsoft_teams',
    submit_file_to_sandbox:    'fortisandbox',
    submit_hash_sandbox:       'fortisandbox',
    create_servicenow_incident:'servicenow',
    lookup_duplicate_ticket:   'servicenow',
    lookup_duplicate_ticket_jira: 'jira',
    notify_soc:                'microsoft_teams',
  };

  const actionSource = template.actions ?? template.actionIds ?? [];
  for (const actionId of actionSource) {
    const k = ACTION_CONNECTOR_MAP[actionId];
    if (k) connectors.add(k);
  }

  // 4. Enrichment connector keys (normalised — strip version suffixes, lowercase)
  if (template.enrichmentConnectors) {
    for (const src of template.enrichmentConnectors) {
      const normalised = src.toLowerCase().replace(/\s+/g, '_').split(/[\s(/]/)[0];
      // Only add if it matches a known connector key
      if (TEMPLATE_CONNECTOR_SETS[canonicalKey]?.includes(normalised) ||
          Object.values(ACTION_CONNECTOR_MAP).includes(normalised)) {
        connectors.add(normalised);
      }
    }
  }

  // 5. Explicit connectorIds (legacy field)
  if (template.connectorIds) {
    for (const cid of template.connectorIds) connectors.add(cid.toLowerCase());
  }

  return Array.from(connectors);
}
