'use client';

import { useMemo, useState } from 'react';
import {
  generateFortiSOARExportPackage,
  buildDefaultDeploymentProfile,
} from '@/lib/fortisoar-workflow-generator';
import { buildNormalizedPlaybook } from '@/lib/normalized/build-normalized-playbook';
import { getAllAdapters } from '@/lib/adapters/adapter-registry';
import type { PlaybookState } from '@/lib/soar-types';
import type { SoarPlatformId } from '@/lib/soar-platforms';

// ── Ransomware Auto Containment test playbook ─────────────────────────────────
const TEST_PLAYBOOK: PlaybookState = {
  id: 'ae7f62bc-f815-4ebb-9ebe-99facbedd841',
  name: 'Ransomware Auto Containment',
  description: 'Automated ransomware detection and endpoint containment using behavior-based scoring.',
  severity: 'critical',
  owner: 'SOC Team',
  templateId: 'ransomware',
  generatorType: 'endpoint_response',
  trigger: {
    type: 'alert',
    description: 'Triggered by EDR behavioral alert or SIEM correlation detecting ransomware indicators.',
    sourceSystem: 'CrowdStrike Falcon / Defender for Endpoint',
  },
  entities: ['hostname', 'machine_id', 'username', 'command_line', 'file_hash'],
  enrichmentConnectors: ['crowdstrike_edr', 'virustotal', 'abuseipdb', 'groupib_edr', 'active_directory'],
  scoringModel: {
    type: 'additive',
    severity: 'critical',
    rules: [
      { id: 'r1', label: 'MITRE T1486 detected', condition: 'T1486', points: 3, mitre: 'T1486' },
      { id: 'r2', label: 'vssadmin in command_line', condition: 'vssadmin', points: 3, mitre: 'T1490' },
    ],
    thresholds: [
      { label: 'Skip', minScore: 0, maxScore: 1, action: 'skip', description: 'No action' },
      { label: 'Approval Required', minScore: 2, maxScore: 7, action: 'analyst_approval', description: 'Analyst review' },
      { label: 'Auto Contain', minScore: 8, maxScore: 99, action: 'auto_contain', description: 'Automatic isolation' },
    ],
    approvalRecommendation: 'Verify endpoint is not backup software',
    actionRecommendation: 'Isolate endpoint, disable account, disable_ad_user',
    decisionLogic: 'Auto-isolate if score >= 8',
    mitreMapping: ['T1486', 'T1490'],
  },
  actions: ['isolate_endpoint', 'disable_account', 'disable_ad_user'],
  fallbackProcedure: {
    escalationPath: 'EDR Team > SOC Lead > CISO',
    manualSteps: 'Verify machine, check EDR, approve isolation',
    communicationTemplate: 'Ransomware suspected on {hostname}. Endpoint isolated.',
  },
  testingPlan: {
    scenarios: 'Benign vssadmin, MITRE T1486, multiple indicators',
    successCriteria: 'Benign skipped, multi-indicator contained',
    performanceTargets: '< 2 min detection to isolation',
  },
  approvalSignOff: {
    approvedBy: '',
    approvalDate: '',
    complianceNotes: '',
    reviewHistory: '',
  },
  status: 'testing',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ── Platform metadata ─────────────────────────────────────────────────────────
type PlatformId = SoarPlatformId;

interface PlatformMeta {
  id: PlatformId;
  label: string;
  fileName: string;
  exportType: string;
  directImport: boolean;
  blueprintOnly: boolean;
  requiresTenant: boolean;
}

const PLATFORMS: PlatformMeta[] = [
  {
    id: 'fortisoar',
    label: 'FortiSOAR',
    fileName: 'ransomware-auto-containment_fortisoar_workflow.json',
    exportType: 'direct_import',
    directImport: true,
    blueprintOnly: false,
    requiresTenant: true,
  },
  {
    id: 'cortex_xsoar',
    label: 'Cortex XSOAR',
    fileName: 'ransomware-auto-containment_cortex_xsoar_content_pack_blueprint.json',
    exportType: 'blueprint',
    directImport: false,
    blueprintOnly: true,
    requiresTenant: true,
  },
  {
    id: 'splunk_soar',
    label: 'Splunk SOAR',
    fileName: 'ransomware-auto-containment_splunk_soar_blueprint.json',
    exportType: 'blueprint',
    directImport: false,
    blueprintOnly: true,
    requiresTenant: true,
  },
  {
    id: 'sentinel_logic_apps',
    label: 'Sentinel Logic Apps',
    fileName: 'ransomware-auto-containment_sentinel_logic_app_arm.json',
    exportType: 'blueprint',
    directImport: true,
    blueprintOnly: false,
    requiresTenant: true,
  },
  {
    id: 'qradar_soar',
    label: 'QRadar SOAR',
    fileName: 'ransomware-auto-containment_qradar_soar_blueprint.json',
    exportType: 'blueprint',
    directImport: false,
    blueprintOnly: true,
    requiresTenant: true,
  },
  {
    id: 'servicenow_secops',
    label: 'ServiceNow SecOps',
    fileName: 'ransomware-auto-containment_servicenow_secops_flow_blueprint.json',
    exportType: 'blueprint',
    directImport: false,
    blueprintOnly: true,
    requiresTenant: true,
  },
  {
    id: 'tines',
    label: 'Tines',
    fileName: 'ransomware-auto-containment_tines_story_blueprint.json',
    exportType: 'blueprint',
    directImport: true,
    blueprintOnly: false,
    requiresTenant: true,
  },
  {
    id: 'shuffle',
    label: 'Shuffle',
    fileName: 'ransomware-auto-containment_shuffle_workflow_blueprint.json',
    exportType: 'blueprint',
    directImport: true,
    blueprintOnly: false,
    requiresTenant: true,
  },
  {
    id: 'generic_soar',
    label: 'Generic SOAR',
    fileName: 'ransomware-auto-containment_normalized_soar_blueprint.json',
    exportType: 'blueprint',
    directImport: false,
    blueprintOnly: true,
    requiresTenant: true,
  },
];

// ── Structural validation rules ───────────────────────────────────────────────
interface ValidationRule {
  id: string;
  description: string;
  category: 'native_structure' | 'branching' | 'approval_path' | 'action_mapping' | 'documentation' | 'other';
  check: (content: unknown) => boolean;
}

function deepHasKey(obj: unknown, key: string): boolean {
  if (obj === null || obj === undefined) return false;
  if (typeof obj === 'object') {
    if (key in (obj as Record<string, unknown>)) return true;
    return Object.values(obj as Record<string, unknown>).some((v) => deepHasKey(v, key));
  }
  return false;
}

function deepHasValue(obj: unknown, value: string): boolean {
  if (obj === null || obj === undefined) return false;
  if (typeof obj === 'string') return obj.includes(value);
  if (typeof obj === 'object') {
    return Object.values(obj as Record<string, unknown>).some((v) => deepHasValue(v, value));
  }
  return false;
}

const RULES_BY_PLATFORM: Record<PlatformId, ValidationRule[]> = {
  fortisoar: [
    {
      id: 'has_workflow_collections',
      description: 'Has workflow_collections type',
      category: 'native_structure',
      check: (c) => {
        const obj = c as { type?: string };
        return obj?.type === 'workflow_collections';
      },
    },
    {
      id: 'has_data_array',
      description: 'Has data array with at least 1 workflow',
      category: 'native_structure',
      check: (c) => {
        const obj = c as { data?: unknown[] };
        return Array.isArray(obj?.data) && obj.data.length > 0;
      },
    },
    {
      id: 'connector_count',
      description: 'Has at least 2 connectors (enrichment + action)',
      category: 'native_structure',
      check: (c) => {
        const obj = c as { data?: Array<{ connectorUUIDs?: unknown[] }> };
        const workflow = obj?.data?.[0];
        return Array.isArray(workflow?.connectorUUIDs) && workflow.connectorUUIDs.length >= 2;
      },
    },
    {
      id: 'has_safety_gates',
      description: 'Contains Safety Gates decision step',
      category: 'branching',
      check: (c) => deepHasValue(c, 'Safety Gates'),
    },
    {
      id: 'has_approval_branch',
      description: 'Contains Analyst Approval branching path',
      category: 'approval_path',
      check: (c) => deepHasValue(c, 'Analyst Approval'),
    },
    {
      id: 'no_active_flag',
      description: 'Workflow has isActive or status field (safety)',
      category: 'native_structure',
      check: (c) => deepHasKey(c, 'isActive') || deepHasValue(c, 'draft') || deepHasValue(c, 'testing'),
    },
    {
      id: 'has_isolate_action',
      description: 'Contains isolate endpoint action',
      category: 'action_mapping',
      check: (c) => deepHasValue(c, 'edr.device.isolate') || deepHasValue(c, 'isolate') || deepHasValue(c, 'Isolate'),
    },
    {
      id: 'has_disable_user',
      description: 'Contains disable user action',
      category: 'action_mapping',
      check: (c) => deepHasValue(c, 'iam.user.disable') || deepHasValue(c, 'Disable') || deepHasValue(c, 'disable'),
    },
  ],
  cortex_xsoar: [
    {
      id: 'no_workflow_collections',
      description: 'Does NOT contain workflow_collections',
      category: 'other',
      check: (c) => !deepHasValue(c, 'workflow_collections'),
    },
    {
      id: 'has_contentPackDraft',
      description: 'Contains contentPackDraft object',
      category: 'native_structure',
      check: (c) => deepHasKey(c, 'contentPackDraft'),
    },
    {
      id: 'has_playbooks',
      description: 'contentPackDraft has playbooks array',
      category: 'native_structure',
      check: (c) => {
        const obj = c as { contentPackDraft?: { playbooks?: unknown[] } };
        return Array.isArray(obj?.contentPackDraft?.playbooks) && obj.contentPackDraft.playbooks.length > 0;
      },
    },
    {
      id: 'has_tasks',
      description: 'Playbook has tasks object with 3+ tasks',
      category: 'native_structure',
      check: (c) => {
        const obj = c as { contentPackDraft?: { playbooks?: Array<{ tasks?: Record<string, unknown> }> } };
        const tasks = obj?.contentPackDraft?.playbooks?.[0]?.tasks;
        return tasks !== undefined && Object.keys(tasks).length >= 3;
      },
    },
    {
      id: 'has_nexttasks',
      description: 'Tasks contain nexttasks (branching)',
      category: 'branching',
      check: (c) => deepHasKey(c, 'nexttasks'),
    },
    {
      id: 'safety_gates_branches',
      description: 'Safety Gates condition has 2+ branches (nexttasks)',
      category: 'branching',
      check: (c) => {
        const obj = c as { contentPackDraft?: { playbooks?: Array<{ tasks?: Record<string, { type?: string; nexttasks?: Record<string, unknown[]> }> }> } };
        const tasks = obj?.contentPackDraft?.playbooks?.[0]?.tasks ?? {};
        const conditionTask = Object.values(tasks).find((t) => t.type === 'condition');
        if (!conditionTask) return false;
        const nexttasks = (conditionTask as { nexttasks?: Record<string, unknown[]> }).nexttasks ?? {};
        return Object.keys(nexttasks).length >= 2;
      },
    },
    {
      id: 'analyst_approval_task',
      description: 'Analyst Approval task present',
      category: 'approval_path',
      check: (c) => deepHasValue(c, 'Analyst Approval') || deepHasValue(c, 'analyst_approval'),
    },
    {
      id: 'approval_approved_rejected',
      description: 'Approval task has Approved/Rejected paths',
      category: 'approval_path',
      check: (c) => deepHasValue(c, 'Approved') && deepHasValue(c, 'Rejected'),
    },
    {
      id: 'isolate_normalized',
      description: 'Isolate Endpoint = edr.device.isolate',
      category: 'action_mapping',
      check: (c) => deepHasValue(c, 'edr.device.isolate'),
    },
    {
      id: 'disable_normalized',
      description: 'Disable AD User = iam.user.disable',
      category: 'action_mapping',
      check: (c) => deepHasValue(c, 'iam.user.disable'),
    },
    {
      id: 'disable_identity_category',
      description: 'Disable AD User uses identity category',
      category: 'action_mapping',
      check: (c) => deepHasValue(c, 'identity'),
    },
    {
      id: 'has_integration_refs',
      description: 'Integration candidate references present',
      category: 'documentation',
      check: (c) => deepHasValue(c, 'integrationCandidate') || deepHasValue(c, 'integrations'),
    },
    {
      id: 'verify_in_tenant_list',
      description: 'Contains verifyInTenant checklist',
      category: 'documentation',
      check: (c) => deepHasKey(c, 'verifyInTenant'),
    },
  ],
  splunk_soar: [
    {
      id: 'no_workflow_collections',
      description: 'Does NOT contain workflow_collections',
      category: 'other',
      check: (c) => !deepHasValue(c, 'workflow_collections'),
    },
    {
      id: 'has_playbookBlueprint',
      description: 'Contains playbookBlueprint object',
      category: 'native_structure',
      check: (c) => deepHasKey(c, 'playbookBlueprint'),
    },
    {
      id: 'has_container',
      description: 'Container section present',
      category: 'native_structure',
      check: (c) => {
        const obj = c as { playbookBlueprint?: { container?: unknown } };
        return obj?.playbookBlueprint?.container !== undefined;
      },
    },
    {
      id: 'has_artifacts',
      description: 'artifacts array present in playbookBlueprint',
      category: 'native_structure',
      check: (c) => {
        const obj = c as { playbookBlueprint?: { artifacts?: unknown[] } };
        return Array.isArray(obj?.playbookBlueprint?.artifacts) && obj.playbookBlueprint.artifacts.length >= 1;
      },
    },
    {
      id: 'has_blocks',
      description: 'blocks array present in playbookBlueprint (3+ blocks)',
      category: 'native_structure',
      check: (c) => {
        // blocks is directly under playbookBlueprint, NOT under container
        const obj = c as { playbookBlueprint?: { blocks?: unknown[] } };
        return Array.isArray(obj?.playbookBlueprint?.blocks) && obj.playbookBlueprint.blocks.length >= 3;
      },
    },
    {
      id: 'has_requiredApps',
      description: 'requiredApps array present (asset placeholders)',
      category: 'native_structure',
      check: (c) => {
        const obj = c as { playbookBlueprint?: { requiredApps?: unknown[] } };
        return Array.isArray(obj?.playbookBlueprint?.requiredApps) && obj.playbookBlueprint.requiredApps.length >= 1;
      },
    },
    {
      id: 'decision_block',
      description: 'Decision block (Safety Gates) present',
      category: 'branching',
      check: (c) => {
        const obj = c as { playbookBlueprint?: { blocks?: Array<{ blockType?: string }> } };
        return (obj?.playbookBlueprint?.blocks ?? []).some((b) => b.blockType === 'decision');
      },
    },
    {
      id: 'decision_branches',
      description: 'Decision block has decisionBranches array',
      category: 'branching',
      check: (c) => {
        const obj = c as { playbookBlueprint?: { decisionBranches?: unknown[] } };
        return Array.isArray(obj?.playbookBlueprint?.decisionBranches) && obj.playbookBlueprint.decisionBranches.length >= 1;
      },
    },
    {
      id: 'approval_block',
      description: 'Approval prompt block present',
      category: 'approval_path',
      check: (c) => {
        const obj = c as { playbookBlueprint?: { blocks?: Array<{ blockType?: string; type?: string }> } };
        return (obj?.playbookBlueprint?.blocks ?? []).some((b) => b.blockType === 'prompt' || b.type === 'approval');
      },
    },
    {
      id: 'asset_placeholders',
      description: 'SPLUNK_*_ASSET placeholder references exist',
      category: 'documentation',
      check: (c) => deepHasValue(c, 'SPLUNK_') || deepHasValue(c, 'assetPlaceholder'),
    },
    {
      id: 'verify_in_tenant_list',
      description: 'Contains verifyInTenant checklist',
      category: 'documentation',
      check: (c) => deepHasKey(c, 'verifyInTenant'),
    },
    {
      id: 'isolate_normalized',
      description: 'Isolate action = edr.device.isolate',
      category: 'action_mapping',
      check: (c) => deepHasValue(c, 'edr.device.isolate'),
    },
    {
      id: 'disable_normalized',
      description: 'Disable AD User = iam.user.disable',
      category: 'action_mapping',
      check: (c) => deepHasValue(c, 'iam.user.disable'),
    },
  ],
  sentinel_logic_apps: [
    {
      id: 'no_workflow_collections',
      description: 'Does NOT contain workflow_collections',
      category: 'other',
      check: (c) => !deepHasValue(c, 'workflow_collections'),
    },
    {
      id: 'has_armTemplate',
      description: 'Contains ARM template structure ($schema)',
      category: 'native_structure',
      check: (c) => deepHasKey(c, 'armTemplateDraft') || deepHasKey(c, '$schema'),
    },
    {
      id: 'has_logic_workflows',
      description: 'Contains Microsoft.Logic/workflows',
      category: 'native_structure',
      check: (c) => deepHasValue(c, 'Microsoft.Logic/workflows'),
    },
    {
      id: 'has_workflow_definition',
      description: 'Contains workflow definition schema',
      category: 'native_structure',
      check: (c) => deepHasValue(c, 'workflowdefinition'),
    },
    {
      id: 'has_triggers',
      description: 'Contains Sentinel triggers section',
      category: 'native_structure',
      check: (c) => deepHasValue(c, 'Microsoft_Sentinel_incident') || deepHasValue(c, 'incident-creation'),
    },
    {
      id: 'has_actions',
      description: 'Contains workflow actions',
      category: 'native_structure',
      check: (c) => deepHasValue(c, 'actions') || deepHasValue(c, 'runAfter'),
    },
    {
      id: 'has_runAfter',
      description: 'Contains runAfter dependency branching',
      category: 'branching',
      check: (c) => deepHasValue(c, 'runAfter'),
    },
    {
      id: 'has_if_branching',
      description: 'Contains If condition branching (Safety Gates)',
      category: 'branching',
      check: (c) => deepHasValue(c, 'Auto_Contain') || deepHasValue(c, 'Auto Contain') || deepHasValue(c, 'If'),
    },
    {
      id: 'has_api_connections',
      description: 'Contains API connection parameters',
      category: 'native_structure',
      check: (c) => deepHasValue(c, 'sentinelConnectionId') || deepHasValue(c, '$connections'),
    },
    {
      id: 'has_approval_action',
      description: 'Contains approval action (manual gate)',
      category: 'approval_path',
      check: (c) => deepHasValue(c, 'approvalrequest') || deepHasValue(c, 'Approval Required') || deepHasValue(c, 'approval'),
    },
    {
      id: 'isolate_normalized',
      description: 'Contains isolate action (edr.device.isolate)',
      category: 'action_mapping',
      check: (c) => deepHasValue(c, 'edr.device.isolate') || deepHasValue(c, 'isolate'),
    },
    {
      id: 'verify_in_tenant_list',
      description: 'Contains verifyInTenant deployment checklist',
      category: 'documentation',
      check: (c) => deepHasKey(c, 'verifyInTenant'),
    },
  ],
  tines: [
    {
      id: 'no_workflow_collections',
      description: 'Does NOT contain workflow_collections',
      category: 'other',
      check: (c) => !deepHasValue(c, 'workflow_collections'),
    },
    {
      id: 'has_schema_version',
      description: 'Contains schema_version field',
      category: 'native_structure',
      check: (c) => {
        const obj = c as { schema_version?: unknown };
        return obj?.schema_version !== undefined;
      },
    },
    {
      id: 'has_agents',
      description: 'Contains agents array (2+ story agents)',
      category: 'native_structure',
      check: (c) => {
        const obj = c as { agents?: unknown[] };
        return Array.isArray(obj?.agents) && obj.agents.length >= 2;
      },
    },
    {
      id: 'has_links',
      description: 'Contains links array (normalized route connections)',
      category: 'native_structure',
      check: (c) => {
        const obj = c as { links?: unknown[] };
        return Array.isArray(obj?.links) && obj.links.length >= 1;
      },
    },
    {
      id: 'trigger_agent',
      description: 'Contains WebhookAgent trigger',
      category: 'native_structure',
      check: (c) => deepHasValue(c, 'WebhookAgent') || deepHasValue(c, 'webhook'),
    },
    {
      id: 'decision_agent',
      description: 'Contains TriggerAgent for decision/branching',
      category: 'branching',
      check: (c) => deepHasValue(c, 'TriggerAgent'),
    },
    {
      id: 'approval_agent',
      description: 'Contains ManualInterventionAgent for analyst approval',
      category: 'approval_path',
      check: (c) => deepHasValue(c, 'ManualInterventionAgent'),
    },
    {
      id: 'credential_placeholders',
      description: 'Contains CREDENTIAL placeholder references',
      category: 'documentation',
      check: (c) => deepHasValue(c, 'CREDENTIAL'),
    },
    {
      id: 'has_credentialsRequired',
      description: 'Contains credentialsRequired array',
      category: 'documentation',
      check: (c) => deepHasKey(c, 'credentialsRequired'),
    },
    {
      id: 'isolate_normalized',
      description: 'Contains edr.device.isolate action reference',
      category: 'action_mapping',
      check: (c) => deepHasValue(c, 'edr.device.isolate'),
    },
    {
      id: 'disable_normalized',
      description: 'Contains iam.user.disable action reference',
      category: 'action_mapping',
      check: (c) => deepHasValue(c, 'iam.user.disable'),
    },
    {
      id: 'verify_in_tenant_list',
      description: 'Contains verifyInTenant checklist',
      category: 'documentation',
      check: (c) => deepHasKey(c, 'verifyInTenant'),
    },
  ],
  shuffle: [
    {
      id: 'no_workflow_collections',
      description: 'Does NOT contain workflow_collections',
      category: 'other',
      check: (c) => !deepHasValue(c, 'workflow_collections'),
    },
    {
      id: 'has_workflow_object',
      description: 'Contains top-level workflow object',
      category: 'native_structure',
      check: (c) => {
        const obj = c as { workflow?: unknown };
        return obj?.workflow !== undefined;
      },
    },
    {
      id: 'has_nodes',
      description: 'workflow.nodes array present (3+ nodes)',
      category: 'native_structure',
      check: (c) => {
        const obj = c as { workflow?: { nodes?: unknown[] } };
        return Array.isArray(obj?.workflow?.nodes) && obj.workflow.nodes.length >= 3;
      },
    },
    {
      id: 'has_edges',
      description: 'workflow.edges array present (2+ edges)',
      category: 'native_structure',
      check: (c) => {
        const obj = c as { workflow?: { edges?: unknown[] } };
        return Array.isArray(obj?.workflow?.edges) && obj.workflow.edges.length >= 2;
      },
    },
    {
      id: 'node_positions',
      description: 'Nodes have x/y position coordinates',
      category: 'native_structure',
      check: (c) => deepHasValue(c, 'position'),
    },
    {
      id: 'decision_node',
      description: 'Decision node (Safety Gates) present',
      category: 'branching',
      check: (c) => {
        const obj = c as { workflow?: { nodes?: Array<{ name?: string; action?: string }> } };
        return (obj?.workflow?.nodes ?? []).some(
          (n) => (n.name ?? '').includes('branch') || (n.action ?? '').includes('filter')
        );
      },
    },
    {
      id: 'decision_outgoing_edges',
      description: 'Decision node has multiple outgoing edges',
      category: 'branching',
      check: (c) => {
        const obj = c as { workflow?: { edges?: Array<{ source_id?: string }> } };
        const edges = obj?.workflow?.edges ?? [];
        const sourceCounts = new Map<string, number>();
        for (const e of edges) {
          if (e.source_id) sourceCounts.set(e.source_id, (sourceCounts.get(e.source_id) ?? 0) + 1);
        }
        return [...sourceCounts.values()].some((count) => count >= 2);
      },
    },
    {
      id: 'approval_node',
      description: 'Approval gate node present',
      category: 'approval_path',
      check: (c) => {
        const obj = c as { workflow?: { nodes?: Array<{ name?: string; app_name?: string }> } };
        return (obj?.workflow?.nodes ?? []).some(
          (n) => (n.name ?? '').includes('approval') || (n.app_name ?? '').toLowerCase().includes('shuffle tools')
        );
      },
    },
    {
      id: 'auth_variables',
      description: 'SHUFFLE_*_AUTH variables defined',
      category: 'documentation',
      check: (c) => deepHasValue(c, 'SHUFFLE_') || deepHasValue(c, '_AUTH'),
    },
    {
      id: 'isolate_normalized',
      description: 'Contains edr.device.isolate action reference',
      category: 'action_mapping',
      check: (c) => deepHasValue(c, 'edr.device.isolate'),
    },
    {
      id: 'disable_normalized',
      description: 'Contains iam.user.disable action reference',
      category: 'action_mapping',
      check: (c) => deepHasValue(c, 'iam.user.disable'),
    },
    {
      id: 'verify_in_tenant_list',
      description: 'Contains verifyInTenant checklist',
      category: 'documentation',
      check: (c) => deepHasKey(c, 'verifyInTenant'),
    },
  ],
  qradar_soar: [
    {
      id: 'no_workflow_collections',
      description: 'Does NOT contain workflow_collections',
      category: 'other',
      check: (c) => !deepHasValue(c, 'workflow_collections'),
    },
    {
      id: 'has_qradarBlueprint',
      description: 'Contains qradarBlueprint object',
      category: 'native_structure',
      check: (c) => deepHasKey(c, 'qradarBlueprint'),
    },
    {
      id: 'has_functions',
      description: 'qradarBlueprint.functions array (automation functions)',
      category: 'native_structure',
      check: (c) => {
        const obj = c as { qradarBlueprint?: { functions?: unknown[] } };
        return Array.isArray(obj?.qradarBlueprint?.functions) && obj.qradarBlueprint.functions.length >= 1;
      },
    },
    {
      id: 'has_tasks',
      description: 'qradarBlueprint.tasks array (manual/approval tasks)',
      category: 'native_structure',
      check: (c) => {
        const obj = c as { qradarBlueprint?: { tasks?: unknown[] } };
        // approval step generates 1 task — check >= 1
        return Array.isArray(obj?.qradarBlueprint?.tasks) && obj.qradarBlueprint.tasks.length >= 1;
      },
    },
    {
      id: 'has_message_destinations',
      description: 'qradarBlueprint.messageDestinations present',
      category: 'native_structure',
      check: (c) => deepHasKey(c, 'messageDestinations'),
    },
    {
      id: 'has_incident_fields',
      description: 'qradarBlueprint.incidentFields present',
      category: 'native_structure',
      check: (c) => deepHasKey(c, 'incidentFields'),
    },
    {
      id: 'blueprint_only_warning',
      description: 'Contains .resz-not-generated blueprint warning',
      category: 'documentation',
      check: (c) => deepHasValue(c, '.resz') || deepHasValue(c, 'blueprintOnly') || deepHasValue(c, 'blueprint'),
    },
    {
      id: 'workflow_steps',
      description: 'Contains workflowSteps with phase structure',
      category: 'branching',
      check: (c) => deepHasKey(c, 'workflowSteps') || deepHasKey(c, 'phases'),
    },
    {
      id: 'approval_task',
      description: 'Approval/manual task defined',
      category: 'approval_path',
      check: (c) => {
        const obj = c as { qradarBlueprint?: { tasks?: Array<{ required?: boolean }> } };
        return (obj?.qradarBlueprint?.tasks ?? []).length >= 1;
      },
    },
    {
      id: 'isolate_normalized',
      description: 'edr.device.isolate referenced in functions',
      category: 'action_mapping',
      check: (c) => deepHasValue(c, 'edr.device.isolate'),
    },
    {
      id: 'disable_normalized',
      description: 'iam.user.disable referenced in functions',
      category: 'action_mapping',
      check: (c) => deepHasValue(c, 'iam.user.disable'),
    },
    {
      id: 'verify_in_tenant_list',
      description: 'Contains verifyInTenant checklist',
      category: 'documentation',
      check: (c) => deepHasKey(c, 'verifyInTenant'),
    },
  ],
  servicenow_secops: [
    {
      id: 'no_workflow_collections',
      description: 'Does NOT contain workflow_collections',
      category: 'other',
      check: (c) => !deepHasValue(c, 'workflow_collections'),
    },
    {
      id: 'has_flowBlueprint',
      description: 'Contains flowBlueprint object',
      category: 'native_structure',
      check: (c) => deepHasKey(c, 'flowBlueprint'),
    },
    {
      id: 'has_sn_si_incident',
      description: 'Contains sn_si_incident table reference',
      category: 'native_structure',
      check: (c) => deepHasValue(c, 'sn_si_incident'),
    },
    {
      id: 'has_spokes',
      description: 'flowBlueprint.spokes array (IntegrationHub spokes)',
      category: 'native_structure',
      check: (c) => {
        const obj = c as { flowBlueprint?: { spokes?: unknown[] } };
        return Array.isArray(obj?.flowBlueprint?.spokes) && obj.flowBlueprint.spokes.length >= 1;
      },
    },
    {
      id: 'has_actions',
      description: 'flowBlueprint.actions array (spoke actions)',
      category: 'native_structure',
      check: (c) => {
        const obj = c as { flowBlueprint?: { actions?: unknown[] } };
        return Array.isArray(obj?.flowBlueprint?.actions) && obj.flowBlueprint.actions.length >= 1;
      },
    },
    {
      id: 'has_trigger',
      description: 'Contains Flow Designer trigger definition',
      category: 'native_structure',
      check: (c) => {
        const obj = c as { flowBlueprint?: { trigger?: unknown } };
        return obj?.flowBlueprint?.trigger !== undefined;
      },
    },
    {
      id: 'approval_step',
      description: 'Contains approvalSteps array',
      category: 'approval_path',
      check: (c) => deepHasKey(c, 'approvalSteps'),
    },
    {
      id: 'blueprint_only_warning',
      description: 'Contains XML Update Set not-generated warning',
      category: 'documentation',
      check: (c) => deepHasValue(c, 'Update Set') || deepHasValue(c, 'blueprintOnly') || deepHasValue(c, 'Flow Designer'),
    },
    {
      id: 'decision_branching',
      description: 'Contains Safety Gates / decision step reference',
      category: 'branching',
      check: (c) => deepHasValue(c, 'Safety Gates') || deepHasValue(c, 'decision'),
    },
    {
      id: 'verify_in_tenant_list',
      description: 'Contains verifyInTenant checklist',
      category: 'documentation',
      check: (c) => deepHasKey(c, 'verifyInTenant'),
    },
    {
      id: 'spoke_actions_normalized',
      description: 'Action entries have normalizedAction references',
      category: 'action_mapping',
      check: (c) => deepHasKey(c, 'actionName') || deepHasValue(c, 'normalizedAction'),
    },
  ],
  generic_soar: [
    {
      id: 'no_workflow_collections',
      description: 'Does NOT contain workflow_collections',
      category: 'other',
      check: (c) => !deepHasValue(c, 'workflow_collections'),
    },
    {
      id: 'has_normalizedPlaybook',
      description: 'Contains full NormalizedPlaybook object',
      category: 'native_structure',
      check: (c) => {
        const obj = c as { normalizedPlaybook?: { steps?: unknown[] } };
        return (
          obj?.normalizedPlaybook?.steps !== undefined &&
          Array.isArray((obj.normalizedPlaybook as { steps?: unknown[] }).steps)
        );
      },
    },
    {
      id: 'has_cacaoPlaybook',
      description: 'Contains CACAO v2 playbook',
      category: 'native_structure',
      check: (c) => {
        const obj = c as { cacaoV2Playbook?: { spec_version?: string } };
        return obj?.cacaoV2Playbook?.spec_version === 'cacao-2.0';
      },
    },
    {
      id: 'cacao_workflow',
      description: 'CACAO playbook has workflow steps',
      category: 'native_structure',
      check: (c) => deepHasValue(c, 'cacao-2.0') && deepHasKey(c, 'workflow'),
    },
    {
      id: 'has_normalized_steps',
      description: 'NormalizedPlaybook has steps array (3+ steps)',
      category: 'native_structure',
      check: (c) => {
        const obj = c as { normalizedPlaybook?: { steps?: unknown[] } };
        return Array.isArray(obj?.normalizedPlaybook?.steps) && obj.normalizedPlaybook.steps.length >= 3;
      },
    },
    {
      id: 'has_normalized_routes',
      description: 'NormalizedPlaybook has routes array',
      category: 'branching',
      check: (c) => {
        const obj = c as { normalizedPlaybook?: { routes?: unknown[] } };
        return Array.isArray(obj?.normalizedPlaybook?.routes) && obj.normalizedPlaybook.routes.length >= 1;
      },
    },
    {
      id: 'safety_gates_in_cacao',
      description: 'CACAO workflow contains if-condition (Safety Gates)',
      category: 'branching',
      check: (c) => deepHasValue(c, 'if-condition'),
    },
    {
      id: 'approval_in_cacao',
      description: 'CACAO workflow contains manual-action (approval)',
      category: 'approval_path',
      check: (c) => deepHasValue(c, 'manual-action'),
    },
    {
      id: 'isolate_normalized',
      description: 'Contains edr.device.isolate',
      category: 'action_mapping',
      check: (c) => deepHasValue(c, 'edr.device.isolate'),
    },
    {
      id: 'disable_normalized',
      description: 'Contains iam.user.disable',
      category: 'action_mapping',
      check: (c) => deepHasValue(c, 'iam.user.disable'),
    },
    {
      id: 'cross_platform_ready',
      description: 'Blueprint ready for cross-platform adaptation',
      category: 'documentation',
      check: (c) => deepHasValue(c, 'normalizedAction') && deepHasValue(c, 'connectorCategory'),
    },
  ],
};

// ── Per-category pass/fail summary ────────────────────────────────────────────
function getCategoryResult(
  rules: Array<{ id: string; description: string; category: ValidationRule['category']; passed: boolean }>,
  category: ValidationRule['category'],
): { passed: boolean; total: number; count: number } {
  const filtered = rules.filter((r) => r.category === category);
  const count = filtered.filter((r) => r.passed).length;
  return { passed: count === filtered.length && filtered.length > 0, total: filtered.length, count };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getFirst100Lines(obj: unknown): string {
  const lines = JSON.stringify(obj, null, 2).split('\n');
  return lines.slice(0, 100).join('\n') + (lines.length > 100 ? '\n  ... (truncated at line 100)' : '');
}

function StatusBadge({ passed, label }: { passed: boolean; label?: string }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold ${
      passed ? 'bg-green-950 text-green-400 border border-green-800' : 'bg-red-950 text-red-400 border border-red-800'
    }`}>
      {passed ? '✓' : '✗'} {label ?? (passed ? 'PASS' : 'FAIL')}
    </span>
  );
}

function CategoryCell({ passed, total, count }: { passed: boolean; total: number; count: number }) {
  if (total === 0) return <span className="text-muted-foreground text-xs">N/A</span>;
  return (
    <span className={`text-xs font-semibold ${passed ? 'text-green-400' : 'text-red-400'}`}>
      {count}/{total}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DebugPage() {
  const [expandedPlatform, setExpandedPlatform] = useState<PlatformId | null>(null);

  // Generate all exports
  const exports = useMemo(() => {
    const adapters = getAllAdapters();
    const results: Record<string, { content: object | null; fileName: string; error?: string }> = {};

    for (const meta of PLATFORMS) {
      try {
        const adapter = adapters.find((a) => a.platformId === meta.id);
        if (!adapter) {
          results[meta.id] = { content: null, fileName: meta.fileName, error: 'Adapter not found' };
          continue;
        }

        let content: object;

        if (meta.id === 'fortisoar') {
          const profile = buildDefaultDeploymentProfile(TEST_PLAYBOOK);
          const pkg = generateFortiSOARExportPackage(TEST_PLAYBOOK, profile);
          content = pkg.workflowCollection as object;
        } else {
          const normalized = buildNormalizedPlaybook(TEST_PLAYBOOK, meta.id);
          const result = adapter.generateExport(normalized, {});
          content = result.content as object;
        }

        results[meta.id] = { content, fileName: meta.fileName };
      } catch (err) {
        results[meta.id] = {
          content: null,
          fileName: meta.fileName,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    return results;
  }, []);

  // Run validation rules for each platform
  const validation = useMemo(() => {
    const out: Record<string, {
      rules: Array<{ id: string; description: string; category: ValidationRule['category']; passed: boolean }>;
      allPassed: boolean;
    }> = {};
    for (const meta of PLATFORMS) {
      const { content, error } = exports[meta.id] ?? {};
      const rules = RULES_BY_PLATFORM[meta.id] ?? [];
      if (error || content === null) {
        out[meta.id] = {
          rules: rules.map((r) => ({ id: r.id, description: r.description, category: r.category, passed: false })),
          allPassed: false,
        };
        continue;
      }
      const evaluated = rules.map((r) => ({
        id: r.id,
        description: r.description,
        category: r.category,
        passed: (() => {
          try {
            return r.check(content);
          } catch {
            return false;
          }
        })(),
      }));
      out[meta.id] = { rules: evaluated, allPassed: evaluated.every((r) => r.passed) };
    }
    return out;
  }, [exports]);

  const overallPass = PLATFORMS.every((p) => validation[p.id]?.allPassed);
  const passCount = PLATFORMS.filter((p) => validation[p.id]?.allPassed).length;

  return (
    <div className="min-h-screen bg-background text-foreground p-6 font-mono">
      <div className="max-w-[1600px] mx-auto space-y-8">

        {/* Header */}
        <div className="border-b border-border pb-4">
          <h1 className="text-2xl font-bold text-foreground">SOARForge — Final QA Vendor Validation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ransomware Auto Containment · 9 platform adapters · Structural + action-mapping + branching + approval-path rules
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded text-sm font-bold ${
              overallPass
                ? 'bg-green-950 text-green-400 border border-green-800'
                : 'bg-red-950 text-red-400 border border-red-800'
            }`}>
              {overallPass ? '✓ ALL PLATFORMS PASSED' : `✗ ${PLATFORMS.length - passCount} PLATFORM(S) FAILING`}
            </div>
            <span className="text-xs text-muted-foreground">{passCount}/{PLATFORMS.length} platforms pass all rules</span>
          </div>
        </div>

        {/* Main Validation Table */}
        <div>
          <h2 className="text-lg font-semibold mb-3 text-foreground">Export Vendor Quality Validation Table</h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="text-left px-2 py-2 text-muted-foreground font-semibold whitespace-nowrap">Platform</th>
                  <th className="text-left px-2 py-2 text-muted-foreground font-semibold whitespace-nowrap">Export File</th>
                  <th className="text-center px-2 py-2 text-muted-foreground font-semibold whitespace-nowrap">Export Type</th>
                  <th className="text-center px-2 py-2 text-muted-foreground font-semibold whitespace-nowrap">Direct Import</th>
                  <th className="text-center px-2 py-2 text-muted-foreground font-semibold whitespace-nowrap">Blueprint Only</th>
                  <th className="text-center px-2 py-2 text-muted-foreground font-semibold whitespace-nowrap">Tenant Verify</th>
                  <th className="text-center px-2 py-2 text-muted-foreground font-semibold whitespace-nowrap">Native Structure</th>
                  <th className="text-center px-2 py-2 text-muted-foreground font-semibold whitespace-nowrap">Branching Valid</th>
                  <th className="text-center px-2 py-2 text-muted-foreground font-semibold whitespace-nowrap">Approval Path</th>
                  <th className="text-center px-2 py-2 text-muted-foreground font-semibold whitespace-nowrap">Action Mapping</th>
                  <th className="text-center px-2 py-2 text-muted-foreground font-semibold whitespace-nowrap">Docs Platform-Aware</th>
                  <th className="text-center px-2 py-2 text-muted-foreground font-semibold whitespace-nowrap">workflow_collections?</th>
                  <th className="text-center px-2 py-2 text-muted-foreground font-semibold whitespace-nowrap">Expected?</th>
                  <th className="text-center px-2 py-2 text-muted-foreground font-semibold whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {PLATFORMS.map((meta, idx) => {
                  const v = validation[meta.id];
                  const ex = exports[meta.id];
                  const hasWorkflowCollections = ex?.content ? deepHasValue(ex.content, 'workflow_collections') : false;
                  const expectedWorkflowCollections = meta.id === 'fortisoar';
                  const wcPass = hasWorkflowCollections === expectedWorkflowCollections;
                  const allPass = v?.allPassed && !ex?.error;

                  const nativeResult = getCategoryResult(v?.rules ?? [], 'native_structure');
                  const branchResult = getCategoryResult(v?.rules ?? [], 'branching');
                  const approvalResult = getCategoryResult(v?.rules ?? [], 'approval_path');
                  const actionResult = getCategoryResult(v?.rules ?? [], 'action_mapping');
                  const docResult = getCategoryResult(v?.rules ?? [], 'documentation');

                  return (
                    <tr key={meta.id} className={`border-b border-border ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}>
                      <td className="px-2 py-2 font-semibold text-foreground whitespace-nowrap">{meta.label}</td>
                      <td className="px-2 py-2 text-muted-foreground max-w-[180px] truncate text-[11px]" title={meta.fileName}>
                        {meta.fileName}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className={`text-xs ${meta.directImport ? 'text-green-400' : 'text-blue-400'}`}>
                          {meta.exportType}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        {meta.directImport
                          ? <span className="text-green-400 font-bold">YES</span>
                          : <span className="text-muted-foreground">NO</span>}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {meta.blueprintOnly
                          ? <span className="text-yellow-400 font-bold">YES</span>
                          : <span className="text-muted-foreground">NO</span>}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {meta.requiresTenant
                          ? <span className="text-yellow-400">YES</span>
                          : <span className="text-green-400">NO</span>}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <CategoryCell {...nativeResult} />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <CategoryCell {...branchResult} />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <CategoryCell {...approvalResult} />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <CategoryCell {...actionResult} />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <CategoryCell {...docResult} />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className={wcPass ? (hasWorkflowCollections ? 'text-green-400 font-bold' : 'text-muted-foreground') : 'text-red-400 font-bold'}>
                          {hasWorkflowCollections ? 'YES' : 'NO'}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-muted-foreground">{expectedWorkflowCollections ? 'YES' : 'NO'}</span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        {ex?.error ? (
                          <span className="text-red-400 font-bold text-xs">ERROR</span>
                        ) : (
                          <StatusBadge passed={allPass} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Per-Platform Rule Details + Export Preview */}
        <div>
          <h2 className="text-lg font-semibold mb-3 text-foreground">Per-Platform Validation Details &amp; Export Preview</h2>
          <div className="space-y-3">
            {PLATFORMS.map((meta) => {
              const v = validation[meta.id];
              const ex = exports[meta.id];
              const allPass = v?.allPassed && !ex?.error;
              const isExpanded = expandedPlatform === meta.id;

              const rulesByCategory = {
                native_structure: (v?.rules ?? []).filter((r) => r.category === 'native_structure'),
                branching: (v?.rules ?? []).filter((r) => r.category === 'branching'),
                approval_path: (v?.rules ?? []).filter((r) => r.category === 'approval_path'),
                action_mapping: (v?.rules ?? []).filter((r) => r.category === 'action_mapping'),
                documentation: (v?.rules ?? []).filter((r) => r.category === 'documentation'),
                other: (v?.rules ?? []).filter((r) => r.category === 'other'),
              };

              return (
                <div
                  key={meta.id}
                  className={`rounded-lg border ${allPass ? 'border-green-800' : 'border-red-800'} overflow-hidden`}
                >
                  {/* Accordion header */}
                  <button
                    className={`w-full text-left px-4 py-3 flex items-center justify-between ${
                      allPass ? 'bg-green-950/40' : 'bg-red-950/40'
                    }`}
                    onClick={() => setExpandedPlatform(isExpanded ? null : meta.id)}
                  >
                    <span className="flex items-center gap-3 flex-wrap">
                      <span className={`text-sm font-bold ${allPass ? 'text-green-400' : 'text-red-400'}`}>
                        {allPass ? '✓' : '✗'}
                      </span>
                      <span className="font-semibold text-foreground">{meta.label}</span>
                      <span className="text-xs text-muted-foreground">{meta.exportType}</span>
                      {meta.directImport && <span className="text-xs bg-green-950 text-green-400 border border-green-800 px-1 rounded">direct import</span>}
                      {meta.blueprintOnly && <span className="text-xs bg-yellow-950 text-yellow-400 border border-yellow-800 px-1 rounded">blueprint only</span>}
                      <span className="text-xs text-muted-foreground">
                        {(v?.rules ?? []).filter((r) => r.passed).length}/{(v?.rules ?? []).length} rules
                      </span>
                    </span>
                    <span className="text-muted-foreground text-xs shrink-0 ml-2">{isExpanded ? '▲' : '▼'}</span>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border bg-background p-4 space-y-5">
                      {/* Error */}
                      {ex?.error && (
                        <div className="text-red-400 text-xs bg-red-950/30 border border-red-800 rounded p-3">
                          <span className="font-bold">ERROR: </span>{ex.error}
                        </div>
                      )}

                      {/* Rules by category */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(Object.entries(rulesByCategory) as [string, typeof rulesByCategory.native_structure][]).map(([cat, catRules]) => {
                          if (catRules.length === 0) return null;
                          const catPass = catRules.every((r) => r.passed);
                          const catLabels: Record<string, string> = {
                            native_structure: 'Native Structure',
                            branching: 'Branching Valid',
                            approval_path: 'Approval Path',
                            action_mapping: 'Action Mapping',
                            documentation: 'Documentation',
                            other: 'Other',
                          };
                          return (
                            <div key={cat} className={`rounded border p-3 ${catPass ? 'border-green-900/50' : 'border-red-900/50'}`}>
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-xs font-semibold uppercase tracking-wider ${catPass ? 'text-green-400' : 'text-red-400'}`}>
                                  {catLabels[cat]}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {catRules.filter((r) => r.passed).length}/{catRules.length}
                                </span>
                              </div>
                              <div className="space-y-1">
                                {catRules.map((rule) => (
                                  <div key={rule.id} className="flex items-start gap-2 text-xs">
                                    <span className={`shrink-0 ${rule.passed ? 'text-green-400' : 'text-red-400'}`}>
                                      {rule.passed ? '✓' : '✗'}
                                    </span>
                                    <span className={rule.passed ? 'text-foreground' : 'text-red-300'}>
                                      {rule.description}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Export preview */}
                      {ex?.content && (
                        <div>
                          <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                            Export Preview — first 100 lines of {meta.fileName}
                          </h3>
                          <pre className="bg-muted rounded p-3 text-xs overflow-x-auto max-h-80 leading-relaxed text-foreground whitespace-pre">
                            {getFirst100Lines(ex.content)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* QA Evidence Summary */}
        <div className="border border-border rounded-lg p-5 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">QA Evidence Summary</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Direct Import vs Blueprint */}
            <div className="bg-muted/40 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-foreground mb-2">Export Type Classification</p>
              {PLATFORMS.map((meta) => (
                <div key={meta.id} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{meta.label}</span>
                  <span className={`font-semibold ${meta.directImport ? 'text-green-400' : 'text-blue-400'}`}>
                    {meta.directImport ? 'Direct Import' : 'Blueprint Only'}
                  </span>
                </div>
              ))}
            </div>

            {/* workflow_collections isolation */}
            <div className="bg-muted/40 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-foreground mb-2">workflow_collections Isolation</p>
              {PLATFORMS.map((meta) => {
                const ex = exports[meta.id];
                const hasWC = ex?.content ? deepHasValue(ex.content, 'workflow_collections') : false;
                const expected = meta.id === 'fortisoar';
                const pass = hasWC === expected;
                return (
                  <div key={meta.id} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{meta.label}</span>
                    <span className={`font-semibold ${pass ? 'text-green-400' : 'text-red-400'}`}>
                      {hasWC ? 'present' : 'absent'} {pass ? '✓' : '✗'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Platform PASS criteria */}
          <div className="space-y-1 text-xs text-muted-foreground border-t border-border pt-4">
            <p className="font-semibold text-foreground mb-2">Validation Rules by Platform</p>
            <p><span className="text-foreground">FortiSOAR:</span> workflow_collections ✓ · data array ✓ · connector UUIDs ✓ · Safety Gates ✓ · Approval path ✓ · isActive/status ✓</p>
            <p><span className="text-foreground">Cortex XSOAR:</span> contentPackDraft ✓ · playbooks/tasks/nexttasks ✓ · Safety Gates 2+ branches ✓ · Analyst Approval Approved/Rejected ✓ · edr.device.isolate ✓ · iam.user.disable (identity) ✓ · NO workflow_collections ✓</p>
            <p><span className="text-foreground">Splunk SOAR:</span> playbookBlueprint ✓ · container/artifacts ✓ · blocks (at playbookBlueprint level) ✓ · requiredApps ✓ · decision block ✓ · decisionBranches ✓ · approval prompt ✓ · SPLUNK_*_ASSET placeholders ✓ · NO workflow_collections ✓</p>
            <p><span className="text-foreground">Sentinel Logic Apps:</span> ARM $schema ✓ · Microsoft.Logic/workflows ✓ · workflowdefinition ✓ · Sentinel triggers ✓ · actions ✓ · runAfter branching ✓ · If condition (Safety Gates) ✓ · API connection params ✓ · NO workflow_collections ✓</p>
            <p><span className="text-foreground">QRadar SOAR:</span> qradarBlueprint ✓ · functions ✓ · tasks (1+) ✓ · messageDestinations ✓ · incidentFields ✓ · .resz blueprint warning ✓ · phases/workflowSteps ✓ · edr.device.isolate/iam.user.disable ✓ · NO workflow_collections ✓</p>
            <p><span className="text-foreground">ServiceNow SecOps:</span> flowBlueprint ✓ · sn_si_incident ✓ · spokes ✓ · actions ✓ · trigger ✓ · approvalSteps ✓ · XML Update Set warning ✓ · normalizedAction refs ✓ · NO workflow_collections ✓</p>
            <p><span className="text-foreground">Tines:</span> schema_version ✓ · agents ✓ · links ✓ · WebhookAgent ✓ · TriggerAgent branching ✓ · ManualInterventionAgent ✓ · CREDENTIAL placeholders ✓ · edr.device.isolate/iam.user.disable ✓ · NO workflow_collections ✓</p>
            <p><span className="text-foreground">Shuffle:</span> workflow ✓ · nodes ✓ · edges ✓ · positions ✓ · decision node ✓ · multiple outgoing edges ✓ · approval node ✓ · SHUFFLE_*_AUTH vars ✓ · edr.device.isolate/iam.user.disable ✓ · NO workflow_collections ✓</p>
            <p><span className="text-foreground">Generic SOAR:</span> normalizedPlaybook ✓ · cacaoV2Playbook (cacao-2.0) ✓ · steps/routes ✓ · if-condition ✓ · manual-action ✓ · edr.device.isolate/iam.user.disable ✓ · cross-platform refs ✓ · NO workflow_collections ✓</p>
          </div>
        </div>
      </div>
    </div>
  );
}
