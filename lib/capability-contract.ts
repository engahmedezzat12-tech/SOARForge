import type { PlaybookState } from '@/lib/soar-types';
import { FORTISOAR_ACTION_REGISTRY, FORTISOAR_CONNECTOR_TEMPLATES, getRequiredConnectorsForActions } from '@/lib/fortisoar-action-registry';

export type CapabilityKind = 'enrichment' | 'hunt' | 'response_action' | 'notification' | 'ticketing';

const CONNECTOR_KIND_MAP: Record<string, CapabilityKind[]> = {
  abuseipdb: ['enrichment', 'hunt'],
  virustotal: ['enrichment', 'hunt'],
  fortiguard: ['enrichment', 'hunt'],
  misp: ['enrichment', 'hunt'],
  qradar: ['hunt'],
  splunk: ['hunt'],
  microsoft_sentinel: ['hunt'],
  microsoft_teams: ['notification'],
  slack: ['notification'],
  servicenow: ['ticketing'],
  jira: ['ticketing'],
};

function getActionKinds(actionId: string, connectorKey: string): CapabilityKind[] {
  if (connectorKey === 'microsoft_teams' || connectorKey === 'slack') return ['notification'];
  if (connectorKey === 'servicenow' || connectorKey === 'jira') return ['ticketing'];
  if (/lookup|search|query|sandbox|reputation|intel|duplicate/i.test(actionId)) return ['enrichment', 'hunt'];
  return ['response_action'];
}

export function getVisibleConnectorKeys(playbook: PlaybookState, forKinds?: CapabilityKind[]): string[] {
  const requested = new Set(forKinds ?? ['enrichment', 'hunt', 'response_action', 'notification', 'ticketing']);
  return Object.keys(FORTISOAR_CONNECTOR_TEMPLATES).filter((key) => (CONNECTOR_KIND_MAP[key] ?? []).some((k) => requested.has(k)));
}

export function getVisibleActionIds(playbook: PlaybookState, forKinds?: CapabilityKind[]): string[] {
  const requested = new Set(forKinds ?? ['enrichment', 'hunt', 'response_action', 'notification', 'ticketing']);
  return FORTISOAR_ACTION_REGISTRY
    .filter((a) => getActionKinds(a.actionId, a.connectorKey).some((k) => requested.has(k)))
    .map((a) => a.actionId);
}

export function cleanupSelectionsByContract(playbook: PlaybookState): PlaybookState {
  const visibleConnectors = new Set(getVisibleConnectorKeys(playbook, ['enrichment', 'hunt']));
  const visibleActions = new Set(getVisibleActionIds(playbook, ['response_action', 'notification', 'ticketing']));
  return {
    ...playbook,
    enrichmentConnectors: (playbook.enrichmentConnectors || []).filter((c) => visibleConnectors.has(c)),
    actions: (playbook.actions || []).filter((a) => visibleActions.has(a)),
  };
}

export function validateCapabilityContract(playbook: PlaybookState): string[] {
  const errors: string[] = [];
  const visibleConnectors = new Set(getVisibleConnectorKeys(playbook, ['enrichment', 'hunt']));
  const visibleActions = new Set(getVisibleActionIds(playbook, ['response_action', 'notification', 'ticketing']));
  const invalidConnectors = (playbook.enrichmentConnectors || []).filter((c) => !visibleConnectors.has(c));
  const invalidActions = (playbook.actions || []).filter((a) => !visibleActions.has(a));
  if (invalidConnectors.length) errors.push(`Unavailable enrichment connectors selected: ${invalidConnectors.join(', ')}`);
  if (invalidActions.length) errors.push(`Unavailable actions selected: ${invalidActions.join(', ')}`);

  void getRequiredConnectorsForActions;
  return errors;
}
