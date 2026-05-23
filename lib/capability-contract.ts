import type { PlaybookState } from '@/lib/soar-types';
import { FORTISOAR_ACTION_REGISTRY, FORTISOAR_CONNECTOR_TEMPLATES, getRequiredConnectorsForActions } from '@/lib/fortisoar-action-registry';

export type CapabilityCategory = 'endpoint' | 'identity' | 'threat_intel' | 'network' | 'email' | 'notification' | 'ticketing' | 'sandbox' | 'siem';

const TEMPLATE_CAPABILITY_MAP: Record<string, CapabilityCategory[]> = {
  ransomware: ['endpoint', 'identity', 'threat_intel', 'notification', 'sandbox'],
  waf_attack: ['network', 'threat_intel', 'notification', 'ticketing'],
  phishing: ['email', 'threat_intel', 'notification', 'identity'],
  suspicious_login: ['identity', 'threat_intel', 'notification'],
  malware_hash: ['endpoint', 'threat_intel', 'notification', 'sandbox'],
  malicious_ip: ['network', 'threat_intel', 'notification'],
  vulnerability: ['ticketing', 'notification'],
  ticket_automation: ['ticketing', 'notification'],
  threat_intel: ['threat_intel', 'notification', 'siem'],
};

const CONNECTOR_TO_CAPABILITY: Record<string, CapabilityCategory> = {
  groupib_edr: 'endpoint', crowdstrike_edr: 'endpoint', microsoft_defender: 'endpoint', sentinelone: 'endpoint',
  active_directory: 'identity', azure_ad: 'identity',
  qradar: 'siem', splunk: 'siem', microsoft_sentinel: 'siem',
  abuseipdb: 'threat_intel', virustotal: 'threat_intel', fortiguard: 'threat_intel', misp: 'threat_intel',
  palo_alto_firewall: 'network', fortigate_firewall: 'network',
  exchange: 'email', proofpoint: 'email',
  microsoft_teams: 'notification', slack: 'notification',
  servicenow: 'ticketing', jira: 'ticketing',
  fortisandbox: 'sandbox',
};

function allowedCapabilities(playbook: PlaybookState): Set<CapabilityCategory> {
  const key = playbook.templateId || playbook.generatorType || '';
  return new Set(TEMPLATE_CAPABILITY_MAP[key] ?? Object.values(CONNECTOR_TO_CAPABILITY));
}

export function getVisibleConnectorKeys(playbook: PlaybookState): string[] {
  const caps = allowedCapabilities(playbook);
  return Object.keys(FORTISOAR_CONNECTOR_TEMPLATES).filter((k) => caps.has(CONNECTOR_TO_CAPABILITY[k]));
}

export function getVisibleActionIds(playbook: PlaybookState): string[] {
  const caps = allowedCapabilities(playbook);
  return FORTISOAR_ACTION_REGISTRY.filter((a) => caps.has(CONNECTOR_TO_CAPABILITY[a.connectorKey])).map((a) => a.actionId);
}

export function cleanupSelectionsByContract(playbook: PlaybookState): PlaybookState {
  const visibleConnectors = new Set(getVisibleConnectorKeys(playbook));
  const visibleActions = new Set(getVisibleActionIds(playbook));
  return {
    ...playbook,
    enrichmentConnectors: (playbook.enrichmentConnectors || []).filter((c) => visibleConnectors.has(c)),
    actions: (playbook.actions || []).filter((a) => visibleActions.has(a)),
  };
}

export function validateCapabilityContract(playbook: PlaybookState): string[] {
  const errors: string[] = [];
  const visibleConnectors = new Set(getVisibleConnectorKeys(playbook));
  const visibleActions = new Set(getVisibleActionIds(playbook));
  const invalidConnectors = (playbook.enrichmentConnectors || []).filter((c) => !visibleConnectors.has(c));
  const invalidActions = (playbook.actions || []).filter((a) => !visibleActions.has(a));
  if (invalidConnectors.length) errors.push(`Unavailable enrichment connectors selected: ${invalidConnectors.join(', ')}`);
  if (invalidActions.length) errors.push(`Unavailable actions selected: ${invalidActions.join(', ')}`);

  const actionRequiredConnectors = getRequiredConnectorsForActions(playbook.actions || []);
  const unselectedButRequired = actionRequiredConnectors.filter((k) => !playbook.enrichmentConnectors.includes(k));
  if (unselectedButRequired.length) {
    errors.push(`Required connectors for selected actions are not selected in Step 4: ${unselectedButRequired.join(', ')}`);
  }
  return errors;
}
