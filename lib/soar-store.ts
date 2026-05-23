'use client';

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { PlaybookState, ScoringModel } from './soar-types';
import type { FortiSOARDeploymentProfile, FortiSOARReadinessCheck, FortiSOARPlaybookStatus } from './fortisoar-types';
import type { SoarPlatformId } from './soar-platforms';
import { buildConnectorConfig, buildConnectorsForTemplate } from './fortisoar-action-registry';
import { autoFillMissingFields, getRequiredConnectorsForTemplate } from './template-utils';
import { PLAYBOOK_TEMPLATES } from './soar-templates';
import { isConfiguredForImport, isFakeValue, isPlaceholder, normalizeDeploymentProfileForSelections } from './fortisoar-workflow-generator';

const EMPTY_SCORING_MODEL: ScoringModel = {
  type: '',
  severity: 'medium',
  rules: [],
  thresholds: [],
  approvalRecommendation: '',
  actionRecommendation: '',
  decisionLogic: '',
  mitreMapping: [],
};

const INITIAL_STATE: PlaybookState = {
  id: uuidv4(),
  name: '',
  description: '',
  severity: 'medium',
  owner: '',
  templateId: '',
  generatorType: '',
  trigger: {
    type: '',
    description: '',
    sourceSystem: '',
  },
  entities: [],
  enrichmentConnectors: [],
  scoringModel: EMPTY_SCORING_MODEL,
  actions: [],
  fallbackProcedure: {
    escalationPath: '',
    manualSteps: '',
    communicationTemplate: '',
  },
  testingPlan: {
    scenarios: '',
    successCriteria: '',
    performanceTargets: '',
  },
  approvalSignOff: {
    approvedBy: '',
    approvalDate: '',
    complianceNotes: '',
    reviewHistory: '',
  },
  status: 'draft',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function buildInitialDeploymentProfile(): FortiSOARDeploymentProfile {
  return {
    id: uuidv4(),
    name: 'Default Deployment',
    customerName: '{{CUSTOMER_NAME}}',
    environment: 'development',
    version: '1.0.0',
    fortisoarBaseUrl: '{{FORTISOAR_BASE_URL}}',
    connectors: {
      crowdstrike_edr: buildConnectorConfig('crowdstrike_edr'),
      active_directory: buildConnectorConfig('active_directory'),
    },
    approvalTeamIri: '{{CUSTOMER_SOC_TEAM_IRI}}',
    approvalTeamName: 'SOC Team',
    defaultOwnerIri: '{{CUSTOMER_DEFAULT_OWNER_IRI}}',
    resourceType: 'alerts',
    targetCollectionName: 'SOARForge-Playbook',
    notificationChannel: '{{CUSTOMER_NOTIFICATION_CHANNEL}}',
    ticketingEnabled: false,
    ticketingProjectId: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export type ExportMode = 'project_state' | 'fortisoar_workflow' | 'documentation' | 'full_package';

export interface ConnectorConfigModalState {
  open: boolean;
  focusKey?: string;
}

interface SoarStore {
  // Playbook state
  playbook: PlaybookState;
  currentStep: number;
  isExporting: boolean;

  // Target SOAR platform (default: FortiSOAR)
  targetPlatform: SoarPlatformId;

  // Deployment profile
  deploymentProfile: FortiSOARDeploymentProfile;

  // Export settings
  exportMode: ExportMode;

  // Readiness
  readinessChecks: FortiSOARReadinessCheck[];
  fortisoarStatus: FortiSOARPlaybookStatus;

  // Connector config modal
  connectorModal: ConnectorConfigModalState;

  // Playbook actions
  setPlaybook: (playbook: PlaybookState) => void;
  setCurrentStep: (step: number) => void;
  setIsExporting: (exporting: boolean) => void;
  resetPlaybook: () => void;

  // Platform actions
  setTargetPlatform: (platform: SoarPlatformId) => void;

  /** Load a template by id — fully populates all 11 wizard steps */
  loadTemplate: (templateId: string) => void;

  // Deployment profile actions
  setDeploymentProfile: (profile: FortiSOARDeploymentProfile) => void;
  updateConnectorConfig: (connectorKey: string, configUuid: string) => void;
  updateConnectorOperation: (connectorKey: string, operation: string, operationTitle: string) => void;

  // Export actions
  setExportMode: (mode: ExportMode) => void;

  // Readiness actions
  setReadinessChecks: (checks: FortiSOARReadinessCheck[]) => void;
  setFortisoarStatus: (status: FortiSOARPlaybookStatus) => void;

  // Modal actions
  openConnectorModal: (focusKey?: string) => void;
  closeConnectorModal: () => void;
}

export const useSoarStore = create<SoarStore>((set, get) => ({
  playbook: INITIAL_STATE,
  currentStep: 1,
  isExporting: false,
  targetPlatform: 'fortisoar',
  deploymentProfile: buildInitialDeploymentProfile(),
  exportMode: 'fortisoar_workflow',
  readinessChecks: [],
  fortisoarStatus: 'draft',
  connectorModal: { open: false },

  setPlaybook: (playbook) => {
    const currentProfile = get().deploymentProfile;
    const normalizedProfile = normalizeDeploymentProfileForSelections(currentProfile, playbook);

    set({
      playbook: { ...playbook, updatedAt: new Date().toISOString() },
      deploymentProfile: normalizedProfile,
    });
  },

  setCurrentStep: (step) => set({ currentStep: step }),

  setIsExporting: (exporting) => set({ isExporting: exporting }),

  setTargetPlatform: (platform) => set({ targetPlatform: platform }),

  resetPlaybook: () =>
    set({
      playbook: { ...INITIAL_STATE, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      currentStep: 1,
      isExporting: false,
      deploymentProfile: buildInitialDeploymentProfile(),
      readinessChecks: [],
      fortisoarStatus: 'draft',
    }),

  loadTemplate: (templateId) => {
    const tpl = PLAYBOOK_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;

    const currentId = get().playbook.id;

    // Use helper to auto-fill all missing fields from template with best-practice defaults.
    // autoFillMissingFields populates all 11 wizard steps:
    //   1. identity (name/description/severity)
    //   2. trigger
    //   3. entities
    //   4. enrichment
    //   5. scoring
    //   6. actions
    //   7. fallback
    //   8. testing
    //   9. approval
    //  10. deployment profile (below)
    //  11. required connectors (below)
    const newPlaybook = autoFillMissingFields(tpl, currentId);

    // Ensure generatorType is always set from the template (drives correct generator routing).
    newPlaybook.generatorType = tpl.generatorType || tpl.id;
    newPlaybook.templateId = tpl.id;

    // Get required connectors for this template using the updated canonical lookup.
    const requiredConnectorKeys = getRequiredConnectorsForTemplate(tpl);
    const connectors =
      requiredConnectorKeys.length > 0
        ? buildConnectorsForTemplate(requiredConnectorKeys)
        : {
            crowdstrike_edr: buildConnectorConfig('crowdstrike_edr'),
            active_directory: buildConnectorConfig('active_directory'),
          };

    // Build the deployment profile with template-specific collection name and connectors.
    // Approval team IRI remains as placeholder — must be filled by the user before import.
    const newProfile: FortiSOARDeploymentProfile = {
      ...buildInitialDeploymentProfile(),
      targetCollectionName: `SOARForge-${tpl.name.replace(/\s+/g, '-')}`,
      connectors,
      // Ticketing enabled for templates that require it
      ticketingEnabled: ['vulnerability', 'ticket_automation'].includes(tpl.generatorType || tpl.id),
    };

    set({
      playbook: newPlaybook,
      deploymentProfile: newProfile,
      readinessChecks: [],
      fortisoarStatus: 'draft',
      currentStep: 1,
    });
  },

  setDeploymentProfile: (profile) =>
    set({ deploymentProfile: { ...profile, updatedAt: new Date().toISOString() } }),

  updateConnectorConfig: (connectorKey, configUuid) => {
    const current = get().deploymentProfile;
    const connector = current.connectors[connectorKey];
    if (connector) {
      // CRITICAL: Use proper validation - don't mark as configured if fake/placeholder
      const trimmedConfig = configUuid.trim();
      const isValidConfig = isConfiguredForImport(trimmedConfig, false);
      const isPlaceholderConfig = isPlaceholder(trimmedConfig);
      const isFakeConfig = isFakeValue(trimmedConfig);
      
      // isConfigured should only be true for valid UUIDs, not fake values
      // We still allow placeholders but don't mark them as "configured"
      const isConfigured = isValidConfig && !isFakeConfig && !isPlaceholderConfig;
      
      set({
        deploymentProfile: {
          ...current,
          connectors: {
            ...current.connectors,
            [connectorKey]: {
              ...connector,
              config: configUuid,
              isConfigured,
            },
          },
          updatedAt: new Date().toISOString(),
        },
      });
    }
  },

  updateConnectorOperation: (connectorKey, operation, operationTitle) => {
    const current = get().deploymentProfile;
    const connector = current.connectors[connectorKey];
    if (connector) {
      set({
        deploymentProfile: {
          ...current,
          connectors: {
            ...current.connectors,
            [connectorKey]: { ...connector, operation, operationTitle },
          },
          updatedAt: new Date().toISOString(),
        },
      });
    }
  },

  setExportMode: (mode) => set({ exportMode: mode }),

  setReadinessChecks: (checks) => set({ readinessChecks: checks }),

  setFortisoarStatus: (status) => set({ fortisoarStatus: status }),

  openConnectorModal: (focusKey) => set({ connectorModal: { open: true, focusKey } }),

  closeConnectorModal: () => set({ connectorModal: { open: false } }),
}));
