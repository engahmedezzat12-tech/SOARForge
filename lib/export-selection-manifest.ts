import type { FortiSOARDeploymentProfile } from './fortisoar-types';
import type { PlaybookState } from './soar-types';
import { getMergedRequiredConnectorKeys } from './fortisoar-workflow-generator';

export interface ExportSelectionManifest {
  enrichmentConnectors: string[];
  selectedActions: string[];
  actionRequiredConnectors: string[];
  mergedRequiredConnectorKeys: string[];
  missingConnectorConfigs: string[];
}

export function buildExportSelectionManifest(
  playbook: PlaybookState,
  profile: FortiSOARDeploymentProfile
): ExportSelectionManifest {
  const mergedRequiredConnectorKeys = getMergedRequiredConnectorKeys(playbook);
  const actionRequiredConnectors = mergedRequiredConnectorKeys.filter(
    (key) => !(playbook.enrichmentConnectors ?? []).includes(key)
  );

  const missingConnectorConfigs = mergedRequiredConnectorKeys.filter(
    (key) => !profile.connectors?.[key]
  );

  return {
    enrichmentConnectors: [...(playbook.enrichmentConnectors ?? [])],
    selectedActions: [...(playbook.actions ?? [])],
    actionRequiredConnectors,
    mergedRequiredConnectorKeys,
    missingConnectorConfigs,
  };
}
