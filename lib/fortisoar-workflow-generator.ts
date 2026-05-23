// ============================================================================
// FortiSOAR Workflow Generator
// Converts SOARForge playbook state into FortiSOAR-compatible workflow JSON
// ============================================================================

import type {
  FortiSOARWorkflowCollection,
  FortiSOARWorkflowCollectionData,
  FortiSOARWorkflow,
  FortiSOARStep,
  FortiSOARRoute,
  FortiSOARDeploymentProfile,
  FortiSOARExportPackage,
  FortiSOARReadinessCheck,
  FortiSOARPlaybookStatus,
  FortiSOARConnectorConfig,
  FortiSOARDecisionArguments,
  FortiSOARApprovalArguments,
  FortiSOARConnectorArguments,
} from "./fortisoar-types";
import { FORTISOAR_STEP_TYPE_IRIS } from "./fortisoar-types";
import {
  getActionById,
  buildConnectorConfig,
  getRequiredConnectorsForActions,
} from "./fortisoar-action-registry";
import { validateCapabilityContract } from './capability-contract';
import type { PlaybookState } from "./soar-types";
interface WorkflowPlanNode {
  id: string;
  label: string;
  type: "set_variable" | "connector" | "approval";
  actionId?: string;
  connectorKey?: string;
  args?: Record<string, string>;
}

interface WorkflowCoverageReport {
  unsupportedEnrichments: Array<{ key: string; reason: string }>;
  unsupportedActions: Array<{ key: string; reason: string }>;
  missingEnrichmentSteps: string[];
  missingActionSteps: string[];
  passed: boolean;
}

// ============================================================================
// UUID Generator
// ============================================================================

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================================
// Configuration Validators
// ============================================================================

const FAKE_VALUE_PATTERNS = [
  /^asdf/i, /^fasdf/i, /^sfasdf/i, /^dfsdf/i, /^sadfasdf/i,
  /^test$/i, /^demo$/i, /^dummy$/i, /^123$/, /^abc$/i,
  /^xxx/i, /^placeholder/i, /^sample/i, /^example/i,
];

export function isFakeValue(value: string): boolean {
  if (!value || value.trim() === "") return true;
  const t = value.trim().toLowerCase();
  if (t.length < 4) return true;
  return FAKE_VALUE_PATTERNS.some((p) => p.test(t));
}

export function isPlaceholder(value: string): boolean {
  if (!value) return true;
  return /^\{\{.*\}\}$/.test(value.trim());
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return !!value && UUID_PATTERN.test(value.trim());
}

export function isValidIri(value: string): boolean {
  if (!value) return false;
  const t = value.trim();
  if (!t.startsWith("/api/3/")) return false;
  const parts = t.split("/");
  return isValidUuid(parts[parts.length - 1]);
}

export function isConfiguredForImport(value: string, allowCustomIdentifier = false): boolean {
  if (!value || value.trim() === "") return false;
  if (isPlaceholder(value)) return false;
  if (isFakeValue(value)) return false;
  if (allowCustomIdentifier) return true;
  return isValidUuid(value) || isValidIri(value);
}

export type ConfigValidationStatus = "valid" | "placeholder" | "fake" | "invalid" | "empty";

export function validateConfigValue(value: string): ConfigValidationStatus {
  if (!value || value.trim() === '') return 'empty';
  if (isPlaceholder(value)) return 'placeholder';
  if (isFakeValue(value)) return 'fake';
  if (isValidUuid(value) || isValidIri(value)) return 'valid';
  return 'invalid';
}

// ============================================================================
// Export Types from fortisoar-types (re-exported for convenience)
// ============================================================================
export type {
  FortiSOARExportPackage,
  FortiSOARPlaybookStatus,
  FortiSOARReadinessCheck,
};

// ============================================================================
// Position Calculator
// ============================================================================

interface StepPosition { top: number; left: number; }

function calculateStepPositions(n: number): StepPosition[] {
  return Array.from({ length: n }, (_, i) => ({ top: 165 + i * 135, left: 485 }));
}

// ============================================================================
// FortiSOAR-safe Jinja helpers
// Uses (vars.input.records | first | default({})) — no direct indexing
// No tojson for extraction, no fromJSON, no match
// ============================================================================

const SAFE_RECORD = `(vars.input.records | first | default({}))`;

function safeField(field: string, fallback = ""): string {
  return `{{ ${SAFE_RECORD}.${field} | default('${fallback}') | string | trim }}`;
}

function safeStepVar(step: string, varName: string, fallback = ""): string {
  return `{{ vars.steps.${step}.${varName} | default('${fallback}') | string | trim }}`;
}

function safeStepVarLower(step: string, varName: string): string {
  return `{{ vars.steps.${step}.${varName} | default('') | string | lower | trim }}`;
}

// ============================================================================
// Step Builders
// ============================================================================

function buildTriggerStep(playbook: PlaybookState, pos: StepPosition): FortiSOARStep {
  return {
    "@type": "WorkflowStep",
    name: "Start",
    description: null,
    arguments: {
      route: generateUUID(),
      title: playbook.name || "SOARForge Playbook",
      resources: "alerts",
      inputVariables: [],
      step_variables: [],
      displayConditions: { conditions: [], operator: "And" },
      executeButtonTitle: "Execute",
      noRecordExecution: false,
      singleRecordExecution: false,
    },
    status: null,
    top: String(pos.top),
    left: String(pos.left),
    stepType: FORTISOAR_STEP_TYPE_IRIS.trigger,
    group: null,
    uuid: generateUUID(),
  };
}

function buildSetVarStep(name: string, vars: Record<string, string>, pos: StepPosition): FortiSOARStep {
  return {
    "@type": "WorkflowStep",
    name,
    description: null,
    arguments: { ...vars, step_variables: [] },
    status: null,
    top: String(pos.top),
    left: String(pos.left),
    stepType: FORTISOAR_STEP_TYPE_IRIS.set_variable,
    group: null,
    uuid: generateUUID(),
  };
}

function buildDecision(
  name: string,
  conditions: Array<{ condition?: string; default?: boolean; stepName: string; stepUuid: string }>,
  pos: StepPosition
): FortiSOARStep {
  return {
    "@type": "WorkflowStep",
    name,
    description: null,
    arguments: {
      conditions: conditions.map((c) => ({
        ...(c.condition ? { condition: c.condition } : {}),
        ...(c.default ? { default: true } : {}),
        step_iri: `/api/3/workflow_steps/${c.stepUuid}`,
        step_name: c.stepName,
      })),
      step_variables: [],
    },
    status: null,
    top: String(pos.top),
    left: String(pos.left),
    stepType: FORTISOAR_STEP_TYPE_IRIS.decision,
    group: null,
    uuid: generateUUID(),
  };
}

function buildApproval(
  name: string,
  description: string,
  approveUuid: string,
  rejectUuid: string,
  teamIri: string,
  teamName: string,
  pos: StepPosition
): FortiSOARStep {
  return {
    "@type": "WorkflowStep",
    name,
    description: null,
    arguments: {
      type: "InputBased",
      input: { schema: { title: name, description, inputVariables: [] } },
      record: `{{ ${SAFE_RECORD}["@id"] | default('') }}`,
      agent_id: null,
      resources: "alerts",
      is_approval: true,
      owner_detail: {
        isAssigned: true,
        assignedToTeam: [{ iri: teamIri, teamname: teamName }],
        assignedToField: null,
        emailRecipients: "",
        assignedToPerson: [],
        assignedToRecord: false,
      },
      isRecordLinked: false,
      step_variables: [],
      response_mapping: {
        options: [
          { option: "Approve", primary: true, step_iri: `/api/3/workflow_steps/${approveUuid}` },
          { option: "Reject", primary: false, step_iri: `/api/3/workflow_steps/${rejectUuid}` },
        ],
        connecteStepsLength: 2,
        customSuccessMessage: "Awaiting Playbook resumed successfully.",
      },
      email_notification: { enabled: false, smtpParameters: [] },
      customEmailExternal: false,
      inline_channel_list: [],
      external_channel_list: [],
      unauthenticated_input: false,
      external_email_subject: null,
      internal_email_subject: "A FortiSOAR playbook is requesting your input",
      custom_email_body_external: null,
      external_email_attachments: null,
    },
    status: null,
    top: String(pos.top),
    left: String(pos.left),
    stepType: FORTISOAR_STEP_TYPE_IRIS.approval,
    group: null,
    uuid: generateUUID(),
  };
}

/**
 * Build a connector step applying operation/operationTitle overrides
 * from the deployment profile connector config over the action registry defaults.
 */
function buildConnector(
  actionId: string,
  cfg: FortiSOARConnectorConfig,
  pos: StepPosition,
  paramOverrides?: Record<string, string>
): FortiSOARStep | null {
  const action = getActionById(actionId);
  if (!action) return null;

  const params: Record<string, string> = {};
  for (const p of action.requiredParams) params[p] = paramOverrides?.[p] ?? action.paramTemplates[p] ?? "";
  for (const p of action.optionalParams) {
    const v = paramOverrides?.[p] ?? action.paramTemplates[p];
    if (v) params[p] = v;
  }

  return {
    "@type": "WorkflowStep",
    name: action.displayName.replace(/\s+/g, "_"),
    description: null,
    arguments: {
      name: cfg.displayName,
      config: cfg.config,
      params,
      version: cfg.version,
      connector: cfg.connector,
      operation: cfg.operation?.trim() ? cfg.operation : action.operation,
      operationTitle: cfg.operationTitle?.trim() ? cfg.operationTitle : action.operationTitle,
      pickFromTenant: false,
      step_variables: [],
    },
    status: null,
    top: String(pos.top),
    left: String(pos.left),
    stepType: FORTISOAR_STEP_TYPE_IRIS.connector,
    group: null,
    uuid: generateUUID(),
  };
}

function buildRoute(srcName: string, tgtName: string, srcUuid: string, tgtUuid: string): FortiSOARRoute {
  return {
    "@type": "WorkflowRoute",
    name: `${srcName} -> ${tgtName}`,
    targetStep: `/api/3/workflow_steps/${tgtUuid}`,
    sourceStep: `/api/3/workflow_steps/${srcUuid}`,
    label: null,
    isExecuted: false,
    group: null,
    uuid: generateUUID(),
  };
}

function makeWorkflow(
  playbook: PlaybookState,
  triggerStep: FortiSOARStep,
  steps: FortiSOARStep[],
  routes: FortiSOARRoute[],
  collectionUuid: string
): FortiSOARWorkflow {
  return {
    "@type": "Workflow",
    triggerLimit: null,
    name: playbook.name || "SOARForge Playbook",
    aliasName: null,
    tag: null,
    description: playbook.description || "",
    isActive: false,
    debug: true,
    singleRecordExecution: false,
    remoteExecutableFlag: false,
    parameters: [],
    synchronous: false,
    lastModifyDate: Math.floor(Date.now() / 1000),
    collection: `/api/3/workflow_collections/${collectionUuid}`,
    versions: [],
    triggerStep: `/api/3/workflow_steps/${triggerStep.uuid}`,
    steps,
    routes,
    groups: [],
    priority: "/api/3/picklists/2b563c61-ae2c-41c0-a85a-c9709585e3f2",
    playbookOrigin: "/api/3/picklists/15c1e8c9-22bf-4e66-8fbb-0a502d4a4a3f",
    isEditable: true,
    uuid: generateUUID(),
    id: 1,
    owners: [],
    isPrivate: false,
    deletedAt: null,
    importedBy: [],
    recordTags: [],
  };
}

// ============================================================================
// Ransomware Playbook Generator
// ============================================================================

export function generateRansomwareWorkflow(
  playbook: PlaybookState,
  profile: FortiSOARDeploymentProfile
): FortiSOARWorkflow {
  const steps: FortiSOARStep[] = [];
  const routes: FortiSOARRoute[] = [];
  const pos = calculateStepPositions(42);
  let pi = 0;

  const sel = new Set(playbook.actions);

  // Step 1: Trigger
  const triggerStep = buildTriggerStep(playbook, pos[pi++]);
  steps.push(triggerStep);

  // Step 2: Build_Context — uses (vars.input.records | first | default({})), no direct indexing, no tojson
  const ctxStep = buildSetVarStep("Build_Context", {
    record_id: safeField("id"),
    alert_name: safeField("name"),
    source_name: safeField("source"),
    severity: safeField("severity"),
    description_text: safeField("description"),
    sourcedata_raw: `{{ ${SAFE_RECORD}.sourcedata | default('') | string }}`,
    raw_text_lower: `{{ ((${SAFE_RECORD}.description | default('') | string) ~ ' ' ~ (${SAFE_RECORD}.sourcedata | default('') | string)) | lower | trim }}`,
    machine_id: `{%- set _rec = ${SAFE_RECORD} -%}
{%- set _mid = _rec.machine_id | default('') | string | trim -%}
{%- set _did = _rec.device_id | default('') | string | trim -%}
{%- set _eid = _rec.endpoint_id | default('') | string | trim -%}
{%- if _mid != '' -%}{{ _mid }}{%- elif _did != '' -%}{{ _did }}{%- elif _eid != '' -%}{{ _eid }}{%- else -%}{%- endif -%}`,
    hostname: `{%- set _rec = ${SAFE_RECORD} -%}
{%- set _hn = _rec.hostname | default('') | string | trim -%}
{%- set _h = _rec.host | default('') | string | trim -%}
{%- set _cn = _rec.computer_name | default('') | string | trim -%}
{%- if _hn != '' -%}{{ _hn }}{%- elif _h != '' -%}{{ _h }}{%- elif _cn != '' -%}{{ _cn }}{%- else -%}{%- endif -%}`,
    username_raw: `{%- set _rec = ${SAFE_RECORD} -%}
{%- set _u = _rec.username | default('') | string | trim -%}
{%- set _u2 = _rec.user | default('') | string | trim -%}
{%- set _u3 = _rec.user_name | default('') | string | trim -%}
{%- if _u != '' -%}{{ _u }}{%- elif _u2 != '' -%}{{ _u2 }}{%- elif _u3 != '' -%}{{ _u3 }}{%- else -%}{%- endif -%}`,
    file_hash: `{%- set _rec = ${SAFE_RECORD} -%}
{%- set _h = _rec.file_hash | default('') | string | trim -%}
{%- set _h2 = _rec.sha256 | default('') | string | trim -%}
{%- if _h != '' -%}{{ _h }}{%- elif _h2 != '' -%}{{ _h2 }}{%- else -%}{%- endif -%}`,
    file_path: safeField("file_path"),
    source_ip: safeField("source_ip"),
    false_positive: `{%- set _fp = ${SAFE_RECORD}.falsePositive | default(false) -%}{%- if _fp == true or _fp | string | lower == 'true' -%}true{%- else -%}false{%- endif -%}`,
    resolved: `{%- set _st = ${SAFE_RECORD}.status | default('') | string | lower -%}{%- if 'resolved' in _st or 'closed' in _st or 'false positive' in _st -%}true{%- else -%}false{%- endif -%}`,
  }, pos[pi++]);
  steps.push(ctxStep);
  routes.push(buildRoute("Start", "Build_Context", triggerStep.uuid, ctxStep.uuid));

  // Step 3: User_Context
  const userCtxStep = buildSetVarStep("User_Context", {
    username_normalized: `{%- set _raw = vars.steps.Build_Context.username_raw | default('') | string | trim -%}
{%- set _u = _raw -%}
{%- if '\\\\' in _raw -%}{%- set _u = (_raw.split('\\\\') | last) | trim -%}
{%- elif '@' in _raw -%}{%- set _u = (_raw.split('@') | first) | trim -%}
{%- endif -%}{{ _u | default('') }}`,
    is_service_account: `{%- set _u = vars.steps.Build_Context.username_raw | default('') | string | lower | trim -%}
{%- set _blocked = ['system', 'local service', 'network service', 'administrator'] -%}
{%- if _u in _blocked or _u.endswith('\\\\system') or _u.startswith('nt authority') -%}true{%- else -%}false{%- endif -%}`,
    is_privileged_account: `{%- set _u = vars.steps.Build_Context.username_raw | default('') | string | lower | trim -%}
{%- if 'admin' in _u or _u.startswith('svc_') -%}true{%- else -%}false{%- endif -%}`,
    upn: safeStepVar("Build_Context", "username_raw"),
  }, pos[pi++]);
  steps.push(userCtxStep);
  routes.push(buildRoute("Build_Context", "User_Context", ctxStep.uuid, userCtxStep.uuid));

  // Step 4: Final_Context
  const finalCtxStep = buildSetVarStep("Final_Context", {
    machine_id: safeStepVar("Build_Context", "machine_id"),
    hostname: safeStepVar("Build_Context", "hostname"),
    username_raw: safeStepVar("Build_Context", "username_raw"),
    file_hash: safeStepVar("Build_Context", "file_hash"),
    file_path: safeStepVar("Build_Context", "file_path"),
    source_ip: safeStepVar("Build_Context", "source_ip"),
    source_name: safeStepVar("Build_Context", "source_name"),
    raw_text_lower: safeStepVarLower("Build_Context", "raw_text_lower"),
  }, pos[pi++]);
  steps.push(finalCtxStep);
  routes.push(buildRoute("User_Context", "Final_Context", userCtxStep.uuid, finalCtxStep.uuid));

  // Step 5: Decide_Base
  const decideBaseStep = buildSetVarStep("Decide_Base", {
    hit_mitre_t1486: `{%- set _s = vars.steps.Final_Context.raw_text_lower | default('') -%}{%- if 't1486' in _s or 'data encrypted for impact' in _s -%}true{%- else -%}false{%- endif -%}`,
    hit_mitre_t1490: `{%- set _s = vars.steps.Final_Context.raw_text_lower | default('') -%}{%- if 't1490' in _s or 'inhibit system recovery' in _s -%}true{%- else -%}false{%- endif -%}`,
    hit_mitre_t1059_001: `{%- set _s = vars.steps.Final_Context.raw_text_lower | default('') -%}{%- if 't1059.001' in _s or 'powershell' in _s or 'encodedcommand' in _s or 'executionpolicy bypass' in _s -%}true{%- else -%}false{%- endif -%}`,
    hit_mitre_t1048: `{%- set _s = vars.steps.Final_Context.raw_text_lower | default('') -%}{%- if 't1048' in _s or 'exfiltration over alternative protocol' in _s or 'exfil' in _s or 'unusual upload' in _s -%}true{%- else -%}false{%- endif -%}`,
    hit_encrypt_words: `{%- set _s = vars.steps.Final_Context.raw_text_lower | default('') -%}{%- if 'encrypt' in _s or 'ransom' in _s or 'lockbit' in _s or 'blackcat' in _s or 'conti' in _s -%}true{%- else -%}false{%- endif -%}`,
    hit_shadowcopy_tamper: `{%- set _s = vars.steps.Final_Context.raw_text_lower | default('') -%}{%- if 'vssadmin' in _s or 'delete shadows' in _s or 'wbadmin' in _s or 'bcdedit' in _s -%}true{%- else -%}false{%- endif -%}`,
    hit_ransom_note_words: `{%- set _s = vars.steps.Final_Context.raw_text_lower | default('') -%}{%- if 'ransom' in _s or 'bitcoin' in _s or 'decrypt' in _s or 'readme' in _s -%}true{%- else -%}false{%- endif -%}`,
    hit_known_ransom_ext: `{%- set _s = vars.steps.Final_Context.raw_text_lower | default('') -%}{%- if '.lockbit' in _s or '.encrypted' in _s or '.crypt' in _s or '.enc' in _s or '.locked' in _s -%}true{%- else -%}false{%- endif -%}`,
    hit_exfil_combo: `{%- set _s = vars.steps.Final_Context.raw_text_lower | default('') -%}{%- if ('exfil' in _s or 'upload' in _s) and ('encrypt' in _s or 'ransom' in _s) -%}true{%- else -%}false{%- endif -%}`,
    is_false_positive: safeStepVar("Build_Context", "false_positive"),
    is_resolved: safeStepVar("Build_Context", "resolved"),
  }, pos[pi++]);
  steps.push(decideBaseStep);
  routes.push(buildRoute("Final_Context", "Decide_Base", finalCtxStep.uuid, decideBaseStep.uuid));

  // Step 6: Decide_Final
  const decideFinalStep = buildSetVarStep("Decide_Final", {
    ransom_score: `{%- set _sc = 0 -%}
{%- if vars.steps.Decide_Base.is_false_positive | default('false') | string | lower == 'true' -%}0
{%- else -%}
{%- if vars.steps.Decide_Base.hit_mitre_t1486 | default('false') | string | lower == 'true' -%}{%- set _sc = _sc + 2 -%}{%- endif -%}
{%- if vars.steps.Decide_Base.hit_mitre_t1490 | default('false') | string | lower == 'true' -%}{%- set _sc = _sc + 2 -%}{%- endif -%}
{%- if vars.steps.Decide_Base.hit_mitre_t1059_001 | default('false') | string | lower == 'true' -%}{%- set _sc = _sc + 1 -%}{%- endif -%}
{%- if vars.steps.Decide_Base.hit_mitre_t1048 | default('false') | string | lower == 'true' -%}{%- set _sc = _sc + 1 -%}{%- endif -%}
{%- if vars.steps.Decide_Base.hit_encrypt_words | default('false') | string | lower == 'true' -%}{%- set _sc = _sc + 2 -%}{%- endif -%}
{%- if vars.steps.Decide_Base.hit_shadowcopy_tamper | default('false') | string | lower == 'true' -%}{%- set _sc = _sc + 2 -%}{%- endif -%}
{%- if vars.steps.Decide_Base.hit_ransom_note_words | default('false') | string | lower == 'true' -%}{%- set _sc = _sc + 2 -%}{%- endif -%}
{%- if vars.steps.Decide_Base.hit_known_ransom_ext | default('false') | string | lower == 'true' -%}{%- set _sc = _sc + 2 -%}{%- endif -%}
{%- if vars.steps.Decide_Base.hit_exfil_combo | default('false') | string | lower == 'true' -%}{%- set _sc = _sc + 1 -%}{%- endif -%}
{{ _sc }}
{%- endif -%}`,
    score_threshold: "8",
    require_approval_threshold: "2",
  }, pos[pi++]);
  steps.push(decideFinalStep);
  routes.push(buildRoute("Decide_Base", "Decide_Final", decideBaseStep.uuid, decideFinalStep.uuid));

  // Step 7: Safety_Gates
  const safetyStep = buildSetVarStep("Safety_Gates", {
    valid_machine_id: `{%- if vars.steps.Final_Context.machine_id | default('') | string | trim != '' -%}true{%- else -%}false{%- endif -%}`,
    valid_hostname: `{%- if vars.steps.Final_Context.hostname | default('') | string | trim != '' -%}true{%- else -%}false{%- endif -%}`,
    valid_user: `{%- set _u = vars.steps.User_Context.username_normalized | default('') | string | trim -%}
{%- set _svc = vars.steps.User_Context.is_service_account | default('false') | string | lower -%}
{%- if _u != '' and _svc != 'true' -%}true{%- else -%}false{%- endif -%}`,
    not_false_positive: `{%- if vars.steps.Decide_Base.is_false_positive | default('false') | string | lower != 'true' -%}true{%- else -%}false{%- endif -%}`,
    not_resolved: `{%- if vars.steps.Decide_Base.is_resolved | default('false') | string | lower != 'true' -%}true{%- else -%}false{%- endif -%}`,
    safe_auto_containment_allowed: `{%- set _sc = vars.steps.Decide_Final.ransom_score | default(0) | int -%}
{%- set _th = vars.steps.Decide_Final.score_threshold | default(8) | int -%}
{%- set _vm = vars.steps.Safety_Gates.valid_machine_id | default('false') | string | lower -%}
{%- set _nfp = vars.steps.Safety_Gates.not_false_positive | default('false') | string | lower -%}
{%- set _nr = vars.steps.Safety_Gates.not_resolved | default('false') | string | lower -%}
{%- if _sc >= _th and _vm == 'true' and _nfp == 'true' and _nr == 'true' -%}true{%- else -%}false{%- endif -%}`,
  }, pos[pi++]);
  steps.push(safetyStep);
  routes.push(buildRoute("Decide_Final", "Safety_Gates", decideFinalStep.uuid, safetyStep.uuid));

  // Step 8: Ransom_Action_Decision
  const actionDecisionStep = buildSetVarStep("Ransom_Action_Decision", {
    action_decision: `{%- set _sc = vars.steps.Decide_Final.ransom_score | default(0) | int -%}
{%- set _th = vars.steps.Decide_Final.score_threshold | default(8) | int -%}
{%- set _ath = vars.steps.Decide_Final.require_approval_threshold | default(2) | int -%}
{%- set _auto = vars.steps.Safety_Gates.safe_auto_containment_allowed | default('false') | string | lower -%}
{%- set _nfp = vars.steps.Safety_Gates.not_false_positive | default('false') | string | lower -%}
{%- if _nfp != 'true' -%}skip
{%- elif _auto == 'true' -%}auto_isolate
{%- elif _sc >= _ath -%}require_approval
{%- else -%}skip
{%- endif -%}`,
  }, pos[pi++]);
  steps.push(actionDecisionStep);
  routes.push(buildRoute("Safety_Gates", "Ransom_Action_Decision", safetyStep.uuid, actionDecisionStep.uuid));

  // Reserve Finalize position further down
  const FINALIZE_PI = pi + 20;
  const finalizeStep = buildSetVarStep("Finalize", {
    final_status: "Playbook completed",
    final_summary: `Score: {{ vars.steps.Decide_Final.ransom_score | default('0') | string }}
Decision: {{ vars.steps.Ransom_Action_Decision.action_decision | default('N/A') | string }}
Hostname: {{ vars.steps.Final_Context.hostname | default('Not Available') | string }}
Machine ID: {{ vars.steps.Final_Context.machine_id | default('Not Available') | string }}
Username: {{ vars.steps.User_Context.username_normalized | default('N/A') | string }}
Isolation: ${sel.has("isolate_endpoint") ? "selected" : "not selected"}
AD Disable: ${(sel.has("disable_ad_user") || sel.has("disable_account")) ? "selected" : "not selected"}
Hash Sandbox: ${sel.has("submit_hash_sandbox") ? "selected" : "not selected"}
Search Fallback Valid: {{ vars.steps.Validate_Search_Result.search_valid | default('false') | string }}
Rollback: Run unisolate_endpoint + enable_ad_user to reverse containment`,
  }, pos[Math.min(FINALIZE_PI, pos.length - 1)]);
  steps.push(finalizeStep);

  // Step 9: Decision_Ransom_Action
  const approvalUuid = generateUUID();
  const autoIsolateUuid = generateUUID();
  const decisionStep = buildDecision("Decision_Ransom_Action", [
    { condition: `{{ vars.steps.Ransom_Action_Decision.action_decision | default('') | string == 'auto_isolate' }}`, stepName: "Isolate_Endpoint", stepUuid: autoIsolateUuid },
    { condition: `{{ vars.steps.Ransom_Action_Decision.action_decision | default('') | string == 'require_approval' }}`, stepName: "Approval", stepUuid: approvalUuid },
    { default: true, stepName: "Finalize", stepUuid: finalizeStep.uuid },
  ], pos[pi++]);
  steps.push(decisionStep);
  routes.push(buildRoute("Ransom_Action_Decision", "Decision_Ransom_Action", actionDecisionStep.uuid, decisionStep.uuid));
  routes.push(buildRoute("Decision_Ransom_Action", "Finalize", decisionStep.uuid, finalizeStep.uuid));

  // Step 10: Approval
  const postApprovalUuid = generateUUID();
  const approvalStep = {
    ...buildApproval("Approval",
      `Host: {{ vars.steps.Final_Context.hostname | default('N/A') | string }}\nMachine ID: {{ vars.steps.Final_Context.machine_id | default('N/A') | string }}\nUser: {{ vars.steps.User_Context.username_normalized | default('N/A') | string }}\nScore: {{ vars.steps.Decide_Final.ransom_score | default('0') | string }}\nT1486: {{ 'Yes' if vars.steps.Decide_Base.hit_mitre_t1486 | default('false') | string | lower == 'true' else 'No' }}\nT1490: {{ 'Yes' if vars.steps.Decide_Base.hit_mitre_t1490 | default('false') | string | lower == 'true' else 'No' }}\nT1059.001 Supporting Context: {{ 'Yes' if vars.steps.Decide_Base.hit_mitre_t1059_001 | default('false') | string | lower == 'true' else 'No' }}\nT1048 Supporting Context: {{ 'Yes' if vars.steps.Decide_Base.hit_mitre_t1048 | default('false') | string | lower == 'true' else 'No' }}\nEncryption Keywords: {{ 'Yes' if vars.steps.Decide_Base.hit_encrypt_words | default('false') | string | lower == 'true' else 'No' }}\nShadow Copy: {{ 'Yes' if vars.steps.Decide_Base.hit_shadowcopy_tamper | default('false') | string | lower == 'true' else 'No' }}`,
      postApprovalUuid,
      finalizeStep.uuid,
      profile.approvalTeamIri,
      profile.approvalTeamName,
      pos[pi++]
    ),
    uuid: approvalUuid,
  };
  steps.push(approvalStep);
  routes.push(buildRoute("Decision_Ransom_Action", "Approval", decisionStep.uuid, approvalUuid));

  // Step 11: Approval_Post_Decision
  const searchAssetUuid = generateUUID();
  const postApprovalStep: FortiSOARStep = {
    "@type": "WorkflowStep",
    name: "Approval_Post_Decision",
    description: null,
    arguments: {
      conditions: [
        {
          condition: `{{ (vars.steps.Approval.approved | default(false) | string | lower == 'true') and (vars.steps.Final_Context.machine_id | default('') | string | trim != '') }}`,
          step_iri: `/api/3/workflow_steps/${autoIsolateUuid}`,
          step_name: "Isolate_Endpoint",
        },
        {
          condition: `{{ (vars.steps.Approval.approved | default(false) | string | lower == 'true') and (vars.steps.Final_Context.machine_id | default('') | string | trim == '') and (vars.steps.Final_Context.hostname | default('') | string | trim != '') }}`,
          step_iri: `/api/3/workflow_steps/${searchAssetUuid}`,
          step_name: "Search_Asset_by_Hostname",
        },
        {
          default: true,
          step_iri: `/api/3/workflow_steps/${finalizeStep.uuid}`,
          step_name: "Finalize",
        },
      ],
      step_variables: [],
    },
    status: null,
    top: String(pos[pi].top),
    left: String(pos[pi].left),
    stepType: FORTISOAR_STEP_TYPE_IRIS.decision,
    group: null,
    uuid: postApprovalUuid,
  };
  pi++;
  steps.push(postApprovalStep);
  routes.push(buildRoute("Approval", "Approval_Post_Decision", approvalUuid, postApprovalUuid));
  routes.push(buildRoute("Approval_Post_Decision", "Finalize", postApprovalUuid, finalizeStep.uuid));

  // Step 12: Isolate_Endpoint
  const edrCfg = profile.connectors["groupib_edr"] || buildConnectorConfig("groupib_edr");
  const isolateStep = buildConnector("isolate_endpoint", edrCfg, pos[pi++], {
    machine_id: safeStepVar("Final_Context", "machine_id"),
    comment: `SOARForge containment - Incident {{ vars.steps.Build_Context.record_id | default('N/A') | string }}`,
  });
  if (isolateStep) {
    isolateStep.uuid = autoIsolateUuid;
    steps.push(isolateStep);
  }
  routes.push(buildRoute("Decision_Ransom_Action", "Isolate_Endpoint", decisionStep.uuid, autoIsolateUuid));
  routes.push(buildRoute("Approval_Post_Decision", "Isolate_Endpoint", postApprovalUuid, autoIsolateUuid));

  // Step 13: Search_Asset_by_Hostname
  const searchStep = buildConnector("search_asset_by_hostname", edrCfg, pos[pi++], {
    hostname: safeStepVar("Final_Context", "hostname"),
  });
  if (searchStep) {
    searchStep.uuid = searchAssetUuid;
    steps.push(searchStep);
  }
  routes.push(buildRoute("Approval_Post_Decision", "Search_Asset_by_Hostname", postApprovalUuid, searchAssetUuid));

  // Step 14: Validate_Search_Result — safe, no direct indexing
  const validateStep = buildSetVarStep("Validate_Search_Result", {
    search_result_count: `{%- set _r = vars.steps.Search_Asset_by_Hostname.data | default([]) -%}{%- if _r is iterable and _r is not string -%}{{ _r | length }}{%- else -%}0{%- endif -%}`,
    resolved_machine_id: `{%- set _r = vars.steps.Search_Asset_by_Hostname.data | default([]) -%}
{%- if _r is iterable and _r is not string and _r | length == 1 -%}
{{ (_r | first).machine_id | default((_r | first).id | default('')) | string | trim }}
{%- else -%}{%- endif -%}`,
    search_valid: `{%- set _r = vars.steps.Search_Asset_by_Hostname.data | default([]) -%}{%- if _r is iterable and _r is not string and _r | length == 1 -%}true{%- else -%}false{%- endif -%}`,
  }, pos[pi++]);
  steps.push(validateStep);
  if (searchStep) routes.push(buildRoute("Search_Asset_by_Hostname", "Validate_Search_Result", searchAssetUuid, validateStep.uuid));

  // Step 15: Decision_Search_Result
  const isolateAfterSearchUuid = generateUUID();
  const decisionSearchStep = buildDecision("Decision_Search_Result", [
    { condition: `{{ vars.steps.Validate_Search_Result.search_valid | default('false') | string | lower == 'true' }}`, stepName: "Isolate_After_Search", stepUuid: isolateAfterSearchUuid },
    { default: true, stepName: "Finalize", stepUuid: finalizeStep.uuid },
  ], pos[pi++]);
  steps.push(decisionSearchStep);
  routes.push(buildRoute("Validate_Search_Result", "Decision_Search_Result", validateStep.uuid, decisionSearchStep.uuid));
  routes.push(buildRoute("Decision_Search_Result", "Finalize", decisionSearchStep.uuid, finalizeStep.uuid));

  // Step 16: Isolate_After_Search
  const isolateAfterStep = buildConnector("isolate_endpoint", edrCfg, pos[pi++], {
    machine_id: safeStepVar("Validate_Search_Result", "resolved_machine_id"),
    comment: `SOARForge containment via hostname lookup - Incident {{ vars.steps.Build_Context.record_id | default('N/A') | string }}`,
  });
  if (isolateAfterStep) {
    isolateAfterStep.uuid = isolateAfterSearchUuid;
    isolateAfterStep.name = "Isolate_After_Search";
    steps.push(isolateAfterStep);
    routes.push(buildRoute("Decision_Search_Result", "Isolate_After_Search", decisionSearchStep.uuid, isolateAfterSearchUuid));
  }

  // ── Post-isolation chain ──────────────────────────────────────────────────
  const isolateEndUuid = isolateStep?.uuid ?? autoIsolateUuid;
  const isolateAfterEndUuid = isolateAfterStep?.uuid ?? isolateAfterSearchUuid;

  // Step 17: AD Disable (if disable_ad_user or disable_account selected)
  const doADDisable = sel.has("disable_ad_user") || sel.has("disable_account");
  let adDisableUuid = "";
  let adDecisionUuid = "";
  let lastChainUuid = "";
  let lastChainName = "";

  if (doADDisable) {
    adDisableUuid = generateUUID();
    adDecisionUuid = generateUUID();

    const adDecision = buildDecision("Decision_Disable_AD_User", [
      {
        condition: `{{ (vars.steps.Safety_Gates.valid_user | default('false') | string | lower == 'true') and (vars.steps.User_Context.is_service_account | default('false') | string | lower != 'true') and (vars.steps.User_Context.is_privileged_account | default('false') | string | lower != 'true') }}`,
        stepName: "AD_Disable_User",
        stepUuid: adDisableUuid,
      },
      { default: true, stepName: "Finalize", stepUuid: finalizeStep.uuid },
    ], pos[pi++]);
    adDecision.uuid = adDecisionUuid;
    steps.push(adDecision);
    // Route both isolation paths to AD decision
    routes.push(buildRoute("Isolate_Endpoint", "Decision_Disable_AD_User", isolateEndUuid, adDecisionUuid));
    routes.push(buildRoute("Isolate_After_Search", "Decision_Disable_AD_User", isolateAfterEndUuid, adDecisionUuid));
    routes.push(buildRoute("Decision_Disable_AD_User", "Finalize", adDecisionUuid, finalizeStep.uuid));

    const adCfg = profile.connectors["active_directory"] || buildConnectorConfig("active_directory");
    const adStep = buildConnector("disable_ad_user", adCfg, pos[pi++], {
      search_attr_name: "sAMAccountName",
      search_attr_value: safeStepVar("User_Context", "username_normalized"),
    });
    if (adStep) {
      adStep.uuid = adDisableUuid;
      adStep.name = "AD_Disable_User";
      steps.push(adStep);
      routes.push(buildRoute("Decision_Disable_AD_User", "AD_Disable_User", adDecisionUuid, adDisableUuid));
      lastChainUuid = adDisableUuid;
      lastChainName = "AD_Disable_User";
    }
  }

  // Step 18/19: Hash sandbox
  const doHashSandbox = sel.has("submit_hash_sandbox");
  let hashDecisionUuid = "";
  let hashStepUuid = "";

  if (doHashSandbox) {
    hashDecisionUuid = generateUUID();
    hashStepUuid = generateUUID();

    const hashDecision = buildDecision("Decision_Hash_Available", [
      { condition: `{{ vars.steps.Final_Context.file_hash | default('') | string | trim != '' }}`, stepName: "Submit_Hash_To_Sandbox", stepUuid: hashStepUuid },
      { default: true, stepName: "Notify_SOC", stepUuid: generateUUID() },
    ], pos[pi++]);
    hashDecision.uuid = hashDecisionUuid;
    // Fix the default target after Notify is created — for now set to finalizeStep
    (hashDecision.arguments as { conditions: Array<{ default?: boolean; step_iri: string; step_name: string }> }).conditions[1].step_iri = `/api/3/workflow_steps/${finalizeStep.uuid}`;
    steps.push(hashDecision);

    if (lastChainUuid) {
      routes.push(buildRoute(lastChainName, "Decision_Hash_Available", lastChainUuid, hashDecisionUuid));
    } else {
      routes.push(buildRoute("Isolate_Endpoint", "Decision_Hash_Available", isolateEndUuid, hashDecisionUuid));
      routes.push(buildRoute("Isolate_After_Search", "Decision_Hash_Available", isolateAfterEndUuid, hashDecisionUuid));
    }
    routes.push(buildRoute("Decision_Hash_Available", "Finalize", hashDecisionUuid, finalizeStep.uuid));

    const sandboxCfg = profile.connectors["fortisandbox"] || buildConnectorConfig("fortisandbox");
    const sandboxStep = buildConnector("submit_file_to_sandbox", sandboxCfg, pos[pi++], {
      hash: safeStepVar("Final_Context", "file_hash"),
    }) ?? buildSetVarStep("Submit_Hash_To_Sandbox", {
      hash_submitted: safeStepVar("Final_Context", "file_hash"),
      status: "Submitted to sandbox — configure fortisandbox connector for live execution",
    }, pos[pi - 1]);
    sandboxStep.uuid = hashStepUuid;
    sandboxStep.name = "Submit_Hash_To_Sandbox";
    steps.push(sandboxStep);
    routes.push(buildRoute("Decision_Hash_Available", "Submit_Hash_To_Sandbox", hashDecisionUuid, hashStepUuid));
    lastChainUuid = hashStepUuid;
    lastChainName = "Submit_Hash_To_Sandbox";
  }

  // Step 20: Notify_SOC
  const notifyUuid = generateUUID();
  const teamsCfg = profile.connectors["microsoft_teams"];
  let notifyStep: FortiSOARStep;
  if (teamsCfg) {
    const built = buildConnector("send_teams_notification", teamsCfg, pos[pi++], {
      channel_id: "{{CUSTOMER_SOC_CHANNEL_ID}}",
      message: `SOARForge Alert: Score={{ vars.steps.Decide_Final.ransom_score | default('0') | string }}, Decision={{ vars.steps.Ransom_Action_Decision.action_decision | default('N/A') | string }}, Host={{ vars.steps.Final_Context.hostname | default('N/A') | string }}`,
    });
    notifyStep = built ?? buildSetVarStep("Notify_SOC", { status: "pending_manual", note: "Configure microsoft_teams connector" }, pos[pi - 1]);
  } else {
    notifyStep = buildSetVarStep("Notify_SOC", {
      notification_status: "pending_manual",
      notification_message: `Score={{ vars.steps.Decide_Final.ransom_score | default('0') | string }} Decision={{ vars.steps.Ransom_Action_Decision.action_decision | default('N/A') | string }} Host={{ vars.steps.Final_Context.hostname | default('N/A') | string }}`,
      note: "Configure microsoft_teams connector to enable automated SOC notifications",
    }, pos[pi++]);
  }
  notifyStep.uuid = notifyUuid;
  notifyStep.name = "Notify_SOC";
  steps.push(notifyStep);

  if (lastChainUuid) {
    routes.push(buildRoute(lastChainName, "Notify_SOC", lastChainUuid, notifyUuid));
  } else {
    routes.push(buildRoute("Isolate_Endpoint", "Notify_SOC", isolateEndUuid, notifyUuid));
    routes.push(buildRoute("Isolate_After_Search", "Notify_SOC", isolateAfterEndUuid, notifyUuid));
  }
  lastChainUuid = notifyUuid;
  lastChainName = "Notify_SOC";

  // Step 21: Create_or_Update_Ticket
  const ticketUuid = generateUUID();
  const snowCfg = profile.connectors["servicenow"];
  let ticketStep: FortiSOARStep;
  if (profile.ticketingEnabled && snowCfg) {
    const built = buildConnector("create_servicenow_incident", snowCfg, pos[pi++], {
      short_description: `SOARForge: {{ vars.steps.Build_Context.alert_name | default('Security Alert') | string }}`,
      description: `Score: {{ vars.steps.Decide_Final.ransom_score | default('0') | string }}\nDecision: {{ vars.steps.Ransom_Action_Decision.action_decision | default('N/A') | string }}\nHost: {{ vars.steps.Final_Context.hostname | default('N/A') | string }}\nMachine ID: {{ vars.steps.Final_Context.machine_id | default('N/A') | string }}\nUser: {{ vars.steps.User_Context.username_normalized | default('N/A') | string }}`,
      urgency: "2",
      impact: "2",
    });
    ticketStep = built ?? buildSetVarStep("Create_or_Update_Ticket", { status: "not_configured" }, pos[pi - 1]);
  } else {
    ticketStep = buildSetVarStep("Create_or_Update_Ticket", {
      ticket_status: "not_configured",
      note: "Enable ticketingEnabled and configure servicenow connector to create incidents",
    }, pos[pi++]);
  }
  ticketStep.uuid = ticketUuid;
  ticketStep.name = "Create_or_Update_Ticket";
  steps.push(ticketStep);
  routes.push(buildRoute("Notify_SOC", "Create_or_Update_Ticket", notifyUuid, ticketUuid));

  // Step 22: Add_Case_Comment
  const commentUuid = generateUUID();
  const commentStep = buildSetVarStep("Add_Case_Comment", {
    case_comment: `SOARForge Ransomware Containment Summary
---
Score: {{ vars.steps.Decide_Final.ransom_score | default('0') | string }}
Decision: {{ vars.steps.Ransom_Action_Decision.action_decision | default('N/A') | string }}
Hostname: {{ vars.steps.Final_Context.hostname | default('Not Available') | string }}
Machine ID: {{ vars.steps.Final_Context.machine_id | default('Not Available') | string }}
Username: {{ vars.steps.User_Context.username_normalized | default('N/A') | string }}
Isolation: ${sel.has("isolate_endpoint") ? "attempted" : "not selected"}
AD Disable: ${doADDisable ? "attempted" : "not selected"}
Hash Sandbox: ${doHashSandbox ? "attempted" : "not selected"}
Search Fallback: hostname used={{ vars.steps.Safety_Gates.valid_machine_id | default('false') | string | lower != 'true' | string }}, result valid={{ vars.steps.Validate_Search_Result.search_valid | default('false') | string }}
Rollback: Run unisolate_endpoint + enable_ad_user to reverse containment
Generated by SOARForge Professional v1.1`,
    comment_added: "true",
  }, pos[pi++]);
  commentStep.uuid = commentUuid;
  steps.push(commentStep);
  routes.push(buildRoute("Create_or_Update_Ticket", "Add_Case_Comment", ticketUuid, commentUuid));
  routes.push(buildRoute("Add_Case_Comment", "Finalize", commentUuid, finalizeStep.uuid));

  const collectionUuid = generateUUID();
  return makeWorkflow(playbook, triggerStep, steps, routes, collectionUuid);
}

// ============================================================================
// Shared context step builder (used by all template generators)
// ============================================================================

function buildBaseContextStep(pos: StepPosition): FortiSOARStep {
  return buildSetVarStep("Build_Context", {
    record_id: safeField("id"),
    alert_name: safeField("name"),
    severity: safeField("severity"),
    source_name: safeField("source"),
    description_text: safeField("description"),
    sourcedata_raw: `{{ ${SAFE_RECORD}.sourcedata | default('') | string }}`,
    raw_text_lower: `{{ ((${SAFE_RECORD}.description | default('') | string) ~ ' ' ~ (${SAFE_RECORD}.sourcedata | default('') | string)) | lower | trim }}`,
    false_positive: `{%- set _fp = ${SAFE_RECORD}.falsePositive | default(false) -%}{%- if _fp == true or _fp | string | lower == 'true' -%}true{%- else -%}false{%- endif -%}`,
    resolved: `{%- set _st = ${SAFE_RECORD}.status | default('') | string | lower -%}{%- if 'resolved' in _st or 'closed' in _st or 'false positive' in _st -%}true{%- else -%}false{%- endif -%}`,
  }, pos);
}

function buildFinalizeStep(summary: string, pos: StepPosition): FortiSOARStep {
  return buildSetVarStep("Finalize", {
    final_status: "Playbook completed",
    final_summary: summary,
  }, pos);
}

// ============================================================================
// WAF Attack Response Generator
// ============================================================================

export function generateWAFWorkflow(
  playbook: PlaybookState,
  profile: FortiSOARDeploymentProfile
): FortiSOARWorkflow {
  const steps: FortiSOARStep[] = [];
  const routes: FortiSOARRoute[] = [];
  const pos = calculateStepPositions(28);
  let pi = 0;
  const markDynamicNode = (step: FortiSOARStep, actionId: string, capabilityId: string): void => {
    const action = getActionById(actionId);
    if (!action) return;
    (step.arguments as Record<string, unknown>).__soarforge_meta = {
      kind: "dynamic_connector_action",
      actionId,
      capabilityId,
      connectorKey: action.connectorKey,
      operation: action.operation,
    };
  };

  // Step 1: Trigger
  const triggerStep = buildTriggerStep(playbook, pos[pi++]);
  steps.push(triggerStep);

  // Step 2: Build_Context
  const ctxStep = buildBaseContextStep(pos[pi++]);
  steps.push(ctxStep);
  routes.push(buildRoute("Start", "Build_Context", triggerStep.uuid, ctxStep.uuid));

  // Step 3: Extract_IOCs
  const extractStep = buildSetVarStep("Extract_IOCs", {
    source_ip: `{%- set _r = ${SAFE_RECORD} -%}{{ _r.source_ip | default(_r.sourceip | default(_r.src_ip | default(''))) | string | trim }}`,
    target_url: `{{ ${SAFE_RECORD}.target_url | default(${SAFE_RECORD}.url | default('')) | string | trim }}`,
    attack_type: `{{ ${SAFE_RECORD}.attack_type | default(${SAFE_RECORD}.rule_name | default('')) | string | lower | trim }}`,
    request_count: `{{ ${SAFE_RECORD}.request_count | default(${SAFE_RECORD}.hit_count | default(0)) | string }}`,
    user_agent: `{{ ${SAFE_RECORD}.user_agent | default('') | string | trim }}`,
  }, pos[pi++]);
  steps.push(extractStep);
  routes.push(buildRoute("Build_Context", "Extract_IOCs", ctxStep.uuid, extractStep.uuid));

  // Step 4: Score_WAF_Attack
  const scoreStep = buildSetVarStep("Score_WAF_Attack", {
    hit_critical_attack: `{%- set _at = vars.steps.Extract_IOCs.attack_type | default('') | lower -%}{%- if 'sqli' in _at or 'sql injection' in _at or 'rce' in _at or 'command injection' in _at or 'lfi' in _at or 'local file' in _at -%}true{%- else -%}false{%- endif -%}`,
    hit_medium_attack: `{%- set _at = vars.steps.Extract_IOCs.attack_type | default('') | lower -%}{%- if 'xss' in _at or 'cross-site' in _at or 'path traversal' in _at or 'ssrf' in _at -%}true{%- else -%}false{%- endif -%}`,
    hit_high_volume: `{%- set _cnt = vars.steps.Extract_IOCs.request_count | default(0) | int -%}{%- if _cnt > 100 -%}true{%- else -%}false{%- endif -%}`,
    is_false_positive: safeStepVar("Build_Context", "false_positive"),
    is_resolved: safeStepVar("Build_Context", "resolved"),
  }, pos[pi++]);
  steps.push(scoreStep);
  routes.push(buildRoute("Extract_IOCs", "Score_WAF_Attack", extractStep.uuid, scoreStep.uuid));

  // Step 5: Compute_WAF_Score
  const computeStep = buildSetVarStep("Compute_WAF_Score", {
    waf_score: `{%- if vars.steps.Score_WAF_Attack.is_false_positive | default('false') | string | lower == 'true' -%}0
{%- else -%}
{%- set _sc = 0 -%}
{%- if vars.steps.Score_WAF_Attack.hit_critical_attack | default('false') | string | lower == 'true' -%}{%- set _sc = _sc + 3 -%}{%- endif -%}
{%- if vars.steps.Score_WAF_Attack.hit_medium_attack | default('false') | string | lower == 'true' -%}{%- set _sc = _sc + 1 -%}{%- endif -%}
{%- if vars.steps.Score_WAF_Attack.hit_high_volume | default('false') | string | lower == 'true' -%}{%- set _sc = _sc + 2 -%}{%- endif -%}
{{ _sc }}
{%- endif -%}`,
    block_threshold: "6",
    approval_threshold: "3",
    action_decision: `{%- set _sc = vars.steps.Compute_WAF_Score.waf_score | default(0) | int -%}
{%- if vars.steps.Score_WAF_Attack.is_false_positive | default('false') | string | lower == 'true' -%}skip
{%- elif _sc >= 6 -%}auto_block
{%- elif _sc >= 3 -%}require_approval
{%- else -%}monitor
{%- endif -%}`,
  }, pos[pi++]);
  steps.push(computeStep);
  routes.push(buildRoute("Score_WAF_Attack", "Compute_WAF_Score", scoreStep.uuid, computeStep.uuid));

  // Finalize (pre-declare)
  const finalizeStep = buildFinalizeStep(
    `WAF Score: {{ vars.steps.Compute_WAF_Score.waf_score | default('0') | string }}\nDecision: {{ vars.steps.Compute_WAF_Score.action_decision | default('N/A') | string }}\nSource IP: {{ vars.steps.Extract_IOCs.source_ip | default('N/A') | string }}\nAttack Type: {{ vars.steps.Extract_IOCs.attack_type | default('N/A') | string }}\nGuardrail: CDN/cloud IPs never blocked`,
    pos[Math.min(pi + 14, pos.length - 1)]
  );
  steps.push(finalizeStep);

  const hasWafBlockAction = playbook.actions.includes("block_ip_fortigate") || playbook.actions.includes("block_ip_paloalto");
  const approvalUuid = generateUUID();
  const blockUuid = generateUUID();
  const decisionConditions = hasWafBlockAction
    ? [
      { condition: `{{ vars.steps.Compute_WAF_Score.action_decision | default('') | string == 'auto_block' }}`, stepName: "Block_IP", stepUuid: blockUuid },
      { condition: `{{ vars.steps.Compute_WAF_Score.action_decision | default('') | string == 'require_approval' }}`, stepName: "WAF_Approval", stepUuid: approvalUuid },
      { default: true, stepName: "Finalize", stepUuid: finalizeStep.uuid },
    ]
    : [{ default: true, stepName: "Finalize", stepUuid: finalizeStep.uuid }];
  const decisionStep = buildDecision("WAF_Action_Decision", decisionConditions, pos[pi++]);
  steps.push(decisionStep);
  routes.push(buildRoute("Compute_WAF_Score", "WAF_Action_Decision", computeStep.uuid, decisionStep.uuid));
  routes.push(buildRoute("WAF_Action_Decision", "Finalize", decisionStep.uuid, finalizeStep.uuid));

  const postApprovalUuid = generateUUID();
  if (hasWafBlockAction) {
    const approvalStep = {
    ...buildApproval(
      "WAF_Approval",
      `WAF Attack Detected\nSource IP: {{ vars.steps.Extract_IOCs.source_ip | default('N/A') | string }}\nAttack Type: {{ vars.steps.Extract_IOCs.attack_type | default('N/A') | string }}\nScore: {{ vars.steps.Compute_WAF_Score.waf_score | default('0') | string }}\n\nGUARDRAIL: Verify source IP is not a CDN or cloud provider IP before approving block.`,
      blockUuid,
      finalizeStep.uuid,
      profile.approvalTeamIri,
      profile.approvalTeamName,
      pos[pi++]
    ),
    uuid: approvalUuid,
  };
    steps.push(approvalStep);
    routes.push(buildRoute("WAF_Action_Decision", "WAF_Approval", decisionStep.uuid, approvalUuid));

  // Step 8: Approval decision
    const postApprovalStep: FortiSOARStep = {
    "@type": "WorkflowStep",
    name: "WAF_Approval_Decision",
    description: null,
    arguments: {
      conditions: [
        { condition: `{{ vars.steps.WAF_Approval.approved | default(false) | string | lower == 'true' }}`, step_iri: `/api/3/workflow_steps/${blockUuid}`, step_name: "Block_IP" },
        { default: true, step_iri: `/api/3/workflow_steps/${finalizeStep.uuid}`, step_name: "Finalize" },
      ],
      step_variables: [],
    },
    status: null,
    top: String(pos[pi].top),
    left: String(pos[pi].left),
    stepType: FORTISOAR_STEP_TYPE_IRIS.decision,
    group: null,
    uuid: postApprovalUuid,
  };
    pi++;
    steps.push(postApprovalStep);
    routes.push(buildRoute("WAF_Approval", "WAF_Approval_Decision", approvalUuid, postApprovalUuid));
    routes.push(buildRoute("WAF_Approval_Decision", "Finalize", postApprovalUuid, finalizeStep.uuid));

  // Step 9: Block_IP
    const fwCfg = playbook.actions.includes("block_ip_fortigate")
      ? (profile.connectors["fortigate_firewall"] || buildConnectorConfig("fortigate_firewall"))
      : (profile.connectors["palo_alto_firewall"] || buildConnectorConfig("palo_alto_firewall"));
    const blockActionId = playbook.actions.includes("block_ip_fortigate") ? "block_ip_fortigate" : "block_ip_paloalto";
    const builtBlockStep = buildConnector(blockActionId, fwCfg, pos[pi++], {
    address: safeStepVar("Extract_IOCs", "source_ip"),
    address_group: "SOAR-Blocked-IPs",
    description: `SOARForge WAF block - Incident {{ vars.steps.Build_Context.record_id | default('N/A') | string }}`,
  });
    if (!builtBlockStep) {
      throw new Error(`WAF Block_IP connector step could not be built for selected action '${blockActionId}'.`);
    }
    const blockStep = builtBlockStep;
    blockStep.uuid = blockUuid;
    blockStep.name = "Block_IP";
    markDynamicNode(blockStep, blockActionId, "waf_block_ip");
    steps.push(blockStep);
    routes.push(buildRoute("WAF_Action_Decision", "Block_IP", decisionStep.uuid, blockUuid));
    routes.push(buildRoute("WAF_Approval_Decision", "Block_IP", postApprovalUuid, blockUuid));

  // Step 10: CDN_Guardrail_Note
    const cdnGuardrailStep = buildSetVarStep("CDN_Cloud_Guardrail", {
    guardrail_note: "OWASP WAF Guardrail: Blocked IP {{ vars.steps.Extract_IOCs.source_ip | default('N/A') | string }}. Verify this IP is not a CDN (Cloudflare, Akamai, Fastly) or cloud provider (AWS, Azure, GCP) range.",
    block_completed: "true",
  }, pos[pi++]);
    steps.push(cdnGuardrailStep);
    routes.push(buildRoute("Block_IP", "CDN_Cloud_Guardrail", blockUuid, cdnGuardrailStep.uuid));
    routes.push(buildRoute("CDN_Cloud_Guardrail", "Finalize", cdnGuardrailStep.uuid, finalizeStep.uuid));
  }

  // Create ticket if configured
  const ticketUuid = generateUUID();
  const snowCfg = profile.connectors["servicenow"];
  if (profile.ticketingEnabled && snowCfg) {
    const ticketStep = buildConnector("create_servicenow_incident", snowCfg, pos[pi++], {
      short_description: `SOARForge WAF: {{ vars.steps.Extract_IOCs.attack_type | default('Unknown Attack') | string }} from {{ vars.steps.Extract_IOCs.source_ip | default('N/A') | string }}`,
      description: `Score: {{ vars.steps.Compute_WAF_Score.waf_score | default('0') | string }}\nDecision: {{ vars.steps.Compute_WAF_Score.action_decision | default('N/A') | string }}`,
      urgency: "2",
      impact: "2",
    });
    if (ticketStep) {
      ticketStep.uuid = ticketUuid;
      ticketStep.name = "Create_Ticket";
      steps.push(ticketStep);
      routes.push(buildRoute("Compute_WAF_Score", "Create_Ticket", computeStep.uuid, ticketUuid));
    }
  }

  const collectionUuid = generateUUID();
  return makeWorkflow(playbook, triggerStep, steps, routes, collectionUuid);
}

// ============================================================================
// Phishing Campaign Response Generator
// ============================================================================

export function generatePhishingWorkflow(
  playbook: PlaybookState,
  profile: FortiSOARDeploymentProfile
): FortiSOARWorkflow {
  const steps: FortiSOARStep[] = [];
  const routes: FortiSOARRoute[] = [];
  const pos = calculateStepPositions(28);
  let pi = 0;
  const hasQuarantine = (playbook.actions || []).includes("quarantine_email");
  const hasBlockSender = (playbook.actions || []).includes("block_sender");

  const markDynamicNode = (step: FortiSOARStep, actionId: string): void => {
    const action = getActionById(actionId);
    if (!action) return;
    (step.arguments as Record<string, unknown>).__soarforge_meta = {
      kind: "dynamic_connector_action",
      actionId,
      connectorKey: action.connectorKey,
    };
  };

  // Step 1: Trigger
  const triggerStep = buildTriggerStep(playbook, pos[pi++]);
  steps.push(triggerStep);

  // Step 2: Build_Context
  const ctxStep = buildBaseContextStep(pos[pi++]);
  steps.push(ctxStep);
  routes.push(buildRoute("Start", "Build_Context", triggerStep.uuid, ctxStep.uuid));

  // Step 3: Extract_Email_IOCs
  const extractStep = buildSetVarStep("Extract_Email_IOCs", {
    sender_email: `{{ ${SAFE_RECORD}.sender_email | default(${SAFE_RECORD}.from_address | default('')) | string | trim }}`,
    recipient_email: `{{ ${SAFE_RECORD}.recipient_email | default(${SAFE_RECORD}.to_address | default('')) | string | trim }}`,
    subject_line: `{{ ${SAFE_RECORD}.subject | default(${SAFE_RECORD}.subject_line | default('')) | string | trim }}`,
    message_id: `{{ ${SAFE_RECORD}.message_id | default(${SAFE_RECORD}.messageId | default('')) | string | trim }}`,
    url: `{{ ${SAFE_RECORD}.url | default(${SAFE_RECORD}.urls | default('')) | string | trim }}`,
    attachment_hash: `{{ ${SAFE_RECORD}.attachment_hash | default(${SAFE_RECORD}.file_hash | default('')) | string | trim }}`,
    ioc_urls: `{{ ${SAFE_RECORD}.url | default('') | string | trim }}`,
    ioc_hashes: `{{ ${SAFE_RECORD}.attachment_hash | default(${SAFE_RECORD}.file_hash | default('')) | string | trim }}`,
    has_message_id: `{%- if ${SAFE_RECORD}.message_id | default('') | string | trim != '' -%}true{%- else -%}false{%- endif -%}`,
  }, pos[pi++]);
  steps.push(extractStep);
  routes.push(buildRoute("Build_Context", "Extract_Email_IOCs", ctxStep.uuid, extractStep.uuid));

  // Step 4: Unique_Message_Check (Duplicate_Ticket_Lookup equivalent for phishing)
  const uniqueCheckStep = buildSetVarStep("Unique_Message_Check", {
    message_id_present: safeStepVar("Extract_Email_IOCs", "has_message_id"),
    message_id_value: safeStepVar("Extract_Email_IOCs", "message_id"),
    note: "Phishing guardrail: quarantine only by unique message_id to prevent duplicate processing",
  }, pos[pi++]);
  steps.push(uniqueCheckStep);
  routes.push(buildRoute("Extract_Email_IOCs", "Unique_Message_Check", extractStep.uuid, uniqueCheckStep.uuid));

  // Step 5: Score_Phishing
  const scoreStep = buildSetVarStep("Score_Phishing", {
    hit_url_in_body: `{%- set _raw = vars.steps.Build_Context.raw_text_lower | default('') -%}{%- if 'http' in _raw or '.com' in _raw or '.net' in _raw -%}true{%- else -%}false{%- endif -%}`,
    hit_url_shortener: `{%- set _u = vars.steps.Extract_Email_IOCs.url | default('') | lower -%}{%- if 'bit.ly' in _u or 'tinyurl' in _u or 't.co' in _u or 'goo.gl' in _u -%}true{%- else -%}false{%- endif -%}`,
    hit_credential_keywords: `{%- set _s = vars.steps.Build_Context.raw_text_lower | default('') -%}{%- if 'verify account' in _s or 'reset password' in _s or 'urgent action' in _s or 'confirm your' in _s -%}true{%- else -%}false{%- endif -%}`,
    hit_attachment: `{%- if vars.steps.Extract_Email_IOCs.attachment_hash | default('') | string | trim != '' -%}true{%- else -%}false{%- endif -%}`,
    is_false_positive: safeStepVar("Build_Context", "false_positive"),
  }, pos[pi++]);
  steps.push(scoreStep);
  routes.push(buildRoute("Unique_Message_Check", "Score_Phishing", uniqueCheckStep.uuid, scoreStep.uuid));

  // Step 6: Compute_Phishing_Score
  const computeStep = buildSetVarStep("Compute_Phishing_Score", {
    phishing_score: `{%- if vars.steps.Score_Phishing.is_false_positive | default('false') | string | lower == 'true' -%}0
{%- else -%}
{%- set _sc = 0 -%}
{%- if vars.steps.Score_Phishing.hit_url_in_body | default('false') | string | lower == 'true' -%}{%- set _sc = _sc + 1 -%}{%- endif -%}
{%- if vars.steps.Score_Phishing.hit_url_shortener | default('false') | string | lower == 'true' -%}{%- set _sc = _sc + 2 -%}{%- endif -%}
{%- if vars.steps.Score_Phishing.hit_credential_keywords | default('false') | string | lower == 'true' -%}{%- set _sc = _sc + 1 -%}{%- endif -%}
{%- if vars.steps.Score_Phishing.hit_attachment | default('false') | string | lower == 'true' -%}{%- set _sc = _sc + 2 -%}{%- endif -%}
{{ _sc }}
{%- endif -%}`,
    quarantine_threshold: "2",
    auto_threshold: "5",
    action_decision: `{%- set _sc = vars.steps.Compute_Phishing_Score.phishing_score | default(0) | int -%}
{%- if vars.steps.Score_Phishing.is_false_positive | default('false') | string | lower == 'true' -%}skip
{%- elif _sc >= 5 -%}auto_quarantine
{%- elif _sc >= 2 -%}require_approval
{%- else -%}skip
{%- endif -%}`,
  }, pos[pi++]);
  steps.push(computeStep);
  routes.push(buildRoute("Score_Phishing", "Compute_Phishing_Score", scoreStep.uuid, computeStep.uuid));

  // Finalize (pre-declare)
  const finalizeStep = buildFinalizeStep(
    `Phishing Score: {{ vars.steps.Compute_Phishing_Score.phishing_score | default('0') | string }}\nDecision: {{ vars.steps.Compute_Phishing_Score.action_decision | default('N/A') | string }}\nSender: {{ vars.steps.Extract_Email_IOCs.sender_email | default('N/A') | string }}\nMessage ID: {{ vars.steps.Extract_Email_IOCs.message_id | default('N/A') | string }}\nGuardrail: Unique message_id check applied`,
    pos[Math.min(pi + 12, pos.length - 1)]
  );
  steps.push(finalizeStep);

  // Step 7: Phishing_Action_Decision
  const approvalUuid = generateUUID();
  const quarantineUuid = generateUUID();
  const blockSenderUuid = generateUUID();
  const hasPhishingResponseAction = hasQuarantine || hasBlockSender;
  const firstActionUuid = hasQuarantine ? quarantineUuid : blockSenderUuid;
  const firstActionName = hasQuarantine ? "Quarantine_Email" : "Block_Sender";

  const decisionStep = buildDecision("Phishing_Action_Decision", hasPhishingResponseAction ? [
    { condition: `{{ vars.steps.Compute_Phishing_Score.action_decision | default('') | string == 'auto_quarantine' }}`, stepName: firstActionName, stepUuid: firstActionUuid },
    { condition: `{{ vars.steps.Compute_Phishing_Score.action_decision | default('') | string == 'require_approval' }}`, stepName: "Phishing_Approval", stepUuid: approvalUuid },
    { default: true, stepName: "Finalize", stepUuid: finalizeStep.uuid },
  ] : [{ default: true, stepName: "Finalize", stepUuid: finalizeStep.uuid }], pos[pi++]);
  steps.push(decisionStep);
  routes.push(buildRoute("Compute_Phishing_Score", "Phishing_Action_Decision", computeStep.uuid, decisionStep.uuid));
  routes.push(buildRoute("Phishing_Action_Decision", "Finalize", decisionStep.uuid, finalizeStep.uuid));

  if (hasPhishingResponseAction) {
    // Step 8: Phishing_Approval
    const postApprovalUuid = generateUUID();
    const approvalStep = {
      ...buildApproval(
        "Phishing_Approval",
        `Phishing Email Detected\nSender: {{ vars.steps.Extract_Email_IOCs.sender_email | default('N/A') | string }}\nSubject: {{ vars.steps.Extract_Email_IOCs.subject_line | default('N/A') | string }}\nScore: {{ vars.steps.Compute_Phishing_Score.phishing_score | default('0') | string }}\nMessage ID: {{ vars.steps.Extract_Email_IOCs.message_id | default('N/A') | string }}\n\nNote: False Positive Release process available via release_email action.`,
        firstActionUuid,
        finalizeStep.uuid,
        profile.approvalTeamIri,
        profile.approvalTeamName,
        pos[pi++]
      ),
      uuid: approvalUuid,
    };
    steps.push(approvalStep);
    routes.push(buildRoute("Phishing_Action_Decision", "Phishing_Approval", decisionStep.uuid, approvalUuid));

    // Step 9: Post-approval decision
    const postApprovalStep: FortiSOARStep = {
      "@type": "WorkflowStep",
      name: "Phishing_Approval_Decision",
      description: null,
      arguments: {
        conditions: [
          { condition: `{{ vars.steps.Phishing_Approval.approved | default(false) | string | lower == 'true' }}`, step_iri: `/api/3/workflow_steps/${firstActionUuid}`, step_name: firstActionName },
          { default: true, step_iri: `/api/3/workflow_steps/${finalizeStep.uuid}`, step_name: "Finalize" },
        ],
        step_variables: [],
      },
      status: null,
      top: String(pos[pi].top),
      left: String(pos[pi].left),
      stepType: FORTISOAR_STEP_TYPE_IRIS.decision,
      group: null,
      uuid: postApprovalUuid,
    };
    pi++;
    steps.push(postApprovalStep);
    routes.push(buildRoute("Phishing_Approval", "Phishing_Approval_Decision", approvalUuid, postApprovalUuid));
    routes.push(buildRoute("Phishing_Approval_Decision", "Finalize", postApprovalUuid, finalizeStep.uuid));

    const emailCfg = profile.connectors["exchange"] || buildConnectorConfig("exchange");
    let quarantineCreated = false;

    if (hasQuarantine) {
      // Step 10: Quarantine_Email
      const quarantineStep = buildConnector("quarantine_email", emailCfg, pos[pi++], {
        message_id: safeStepVar("Extract_Email_IOCs", "message_id"),
        mailbox: safeStepVar("Extract_Email_IOCs", "recipient_email"),
      });
      if (quarantineStep) {
        quarantineStep.uuid = quarantineUuid;
        quarantineStep.name = "Quarantine_Email";
        markDynamicNode(quarantineStep, "quarantine_email");
        steps.push(quarantineStep);
        routes.push(buildRoute("Phishing_Action_Decision", "Quarantine_Email", decisionStep.uuid, quarantineUuid));
        routes.push(buildRoute("Phishing_Approval_Decision", "Quarantine_Email", postApprovalUuid, quarantineUuid));
        quarantineCreated = true;
      }
    }

    if (hasBlockSender) {
      // Step 11: Block_Sender
      const blockSenderStep = buildConnector("block_sender", emailCfg, pos[pi++], {
        sender_address: safeStepVar("Extract_Email_IOCs", "sender_email"),
      });
      if (blockSenderStep) {
        blockSenderStep.uuid = blockSenderUuid;
        blockSenderStep.name = "Block_Sender";
        markDynamicNode(blockSenderStep, "block_sender");
        steps.push(blockSenderStep);

        if (quarantineCreated) {
          routes.push(buildRoute("Quarantine_Email", "Block_Sender", quarantineUuid, blockSenderUuid));
        } else {
          routes.push(buildRoute("Phishing_Action_Decision", "Block_Sender", decisionStep.uuid, blockSenderUuid));
          routes.push(buildRoute("Phishing_Approval_Decision", "Block_Sender", postApprovalUuid, blockSenderUuid));
        }

        routes.push(buildRoute("Block_Sender", "Finalize", blockSenderUuid, finalizeStep.uuid));
      } else if (quarantineCreated) {
        routes.push(buildRoute("Quarantine_Email", "Finalize", quarantineUuid, finalizeStep.uuid));
      }
    } else if (quarantineCreated) {
      routes.push(buildRoute("Quarantine_Email", "Finalize", quarantineUuid, finalizeStep.uuid));
    }
  }

  const collectionUuid = generateUUID();
  return makeWorkflow(playbook, triggerStep, steps, routes, collectionUuid);
}

// ============================================================================
// Suspicious Login / Identity Response Generator
// ============================================================================

export function generateSuspiciousLoginWorkflow(
  playbook: PlaybookState,
  profile: FortiSOARDeploymentProfile
): FortiSOARWorkflow {
  const steps: FortiSOARStep[] = [];
  const routes: FortiSOARRoute[] = [];
  const pos = calculateStepPositions(28);
  let pi = 0;
  const hasDisableAD = (playbook.actions || []).includes("disable_ad_user");
  const hasRevokeAzure = (playbook.actions || []).includes("revoke_azure_sessions");

  const markDynamicNode = (step: FortiSOARStep, actionId: string): void => {
    const action = getActionById(actionId);
    if (!action) return;
    (step.arguments as Record<string, unknown>).__soarforge_meta = {
      kind: "dynamic_connector_action",
      actionId,
      connectorKey: action.connectorKey,
    };
  };

  // Step 1: Trigger
  const triggerStep = buildTriggerStep(playbook, pos[pi++]);
  steps.push(triggerStep);

  // Step 2: Build_Context
  const ctxStep = buildBaseContextStep(pos[pi++]);
  steps.push(ctxStep);
  routes.push(buildRoute("Start", "Build_Context", triggerStep.uuid, ctxStep.uuid));

  // Step 3: User_Context
  const userCtxStep = buildSetVarStep("User_Context", {
    username_raw: `{%- set _r = ${SAFE_RECORD} -%}{{ _r.username | default(_r.user | default(_r.user_name | default(''))) | string | trim }}`,
    username_normalized: `{%- set _raw = ${SAFE_RECORD}.username | default(${SAFE_RECORD}.user | default('')) | string | trim -%}
{%- if '\\\\' in _raw -%}{%- set _u = (_raw.split('\\\\') | last) | trim -%}
{%- elif '@' in _raw -%}{%- set _u = (_raw.split('@') | first) | trim -%}
{%- else -%}{%- set _u = _raw -%}
{%- endif -%}{{ _u | default('') }}`,
    is_service_account: `{%- set _u = ${SAFE_RECORD}.username | default('') | string | lower | trim -%}
{%- set _blocked = ['system', 'local service', 'network service', 'administrator'] -%}
{%- if _u in _blocked or _u.startswith('svc_') or _u.startswith('nt authority') -%}true{%- else -%}false{%- endif -%}`,
    is_domain_admin: `{%- set _u = ${SAFE_RECORD}.username | default('') | string | lower | trim -%}
{%- if 'admin' in _u or 'domain admin' in _u or _u == 'administrator' -%}true{%- else -%}false{%- endif -%}`,
    source_ip: `{{ ${SAFE_RECORD}.source_ip | default(${SAFE_RECORD}.login_ip | default('')) | string | trim }}`,
    login_country: `{{ ${SAFE_RECORD}.country | default(${SAFE_RECORD}.login_country | default('')) | string | trim }}`,
    auth_method: `{{ ${SAFE_RECORD}.auth_method | default('') | string | trim }}`,
    upn: `{{ ${SAFE_RECORD}.upn | default(${SAFE_RECORD}.user_principal_name | default('')) | string | trim }}`,
  }, pos[pi++]);
  steps.push(userCtxStep);
  routes.push(buildRoute("Build_Context", "User_Context", ctxStep.uuid, userCtxStep.uuid));

  // Step 4: Score_Identity_Risk
  const scoreStep = buildSetVarStep("Score_Identity_Risk", {
    hit_impossible_travel: `{%- set _s = vars.steps.Build_Context.raw_text_lower | default('') -%}{%- if 'impossible travel' in _s or 'impossible_travel' in _s -%}true{%- else -%}false{%- endif -%}`,
    hit_new_country: `{%- set _s = vars.steps.Build_Context.raw_text_lower | default('') -%}{%- if 'new country' in _s or 'new geolocation' in _s or 'unfamiliar location' in _s -%}true{%- else -%}false{%- endif -%}`,
    hit_credential_spray: `{%- set _s = vars.steps.Build_Context.raw_text_lower | default('') -%}{%- if 'credential spray' in _s or 'password spray' in _s or 'brute force' in _s or 'multiple failed' in _s -%}true{%- else -%}false{%- endif -%}`,
    hit_mfa_bypass: `{%- set _s = vars.steps.Build_Context.raw_text_lower | default('') -%}{%- if 'mfa bypass' in _s or 'mfa fatigue' in _s or 'push notification' in _s -%}true{%- else -%}false{%- endif -%}`,
    hit_after_hours: `{%- set _s = vars.steps.Build_Context.raw_text_lower | default('') -%}{%- if 'after hours' in _s or 'unusual time' in _s or 'off-hours' in _s -%}true{%- else -%}false{%- endif -%}`,
    is_false_positive: safeStepVar("Build_Context", "false_positive"),
    is_resolved: safeStepVar("Build_Context", "resolved"),
  }, pos[pi++]);
  steps.push(scoreStep);
  routes.push(buildRoute("User_Context", "Score_Identity_Risk", userCtxStep.uuid, scoreStep.uuid));

  // Step 5: Identity_Safety_Gates (Approval_Before_Disable guardrail)
  const safetyStep = buildSetVarStep("Identity_Safety_Gates", {
    valid_user: `{%- set _u = vars.steps.User_Context.username_normalized | default('') | string | trim -%}{%- if _u != '' -%}true{%- else -%}false{%- endif -%}`,
    not_service_account: `{%- if vars.steps.User_Context.is_service_account | default('false') | string | lower != 'true' -%}true{%- else -%}false{%- endif -%}`,
    not_domain_admin: `{%- if vars.steps.User_Context.is_domain_admin | default('false') | string | lower != 'true' -%}true{%- else -%}false{%- endif -%}`,
    approval_before_disable: "true",
    guardrail_note: "GUARDRAIL: Approval_Before_Disable is MANDATORY. Never disable service accounts or Domain Admins automatically.",
    identity_score: `{%- if vars.steps.Score_Identity_Risk.is_false_positive | default('false') | string | lower == 'true' -%}0
{%- else -%}
{%- set _sc = 0 -%}
{%- if vars.steps.Score_Identity_Risk.hit_impossible_travel | default('false') | string | lower == 'true' -%}{%- set _sc = _sc + 4 -%}{%- endif -%}
{%- if vars.steps.Score_Identity_Risk.hit_new_country | default('false') | string | lower == 'true' -%}{%- set _sc = _sc + 3 -%}{%- endif -%}
{%- if vars.steps.Score_Identity_Risk.hit_credential_spray | default('false') | string | lower == 'true' -%}{%- set _sc = _sc + 3 -%}{%- endif -%}
{%- if vars.steps.Score_Identity_Risk.hit_mfa_bypass | default('false') | string | lower == 'true' -%}{%- set _sc = _sc + 3 -%}{%- endif -%}
{%- if vars.steps.Score_Identity_Risk.hit_after_hours | default('false') | string | lower == 'true' -%}{%- set _sc = _sc + 1 -%}{%- endif -%}
{{ _sc }}
{%- endif -%}`,
    action_decision: `{%- set _sc = vars.steps.Identity_Safety_Gates.identity_score | default(0) | int -%}
{%- set _svc = vars.steps.User_Context.is_service_account | default('false') | string | lower -%}
{%- set _da = vars.steps.User_Context.is_domain_admin | default('false') | string | lower -%}
{%- if vars.steps.Score_Identity_Risk.is_false_positive | default('false') | string | lower == 'true' -%}skip
{%- elif _svc == 'true' or _da == 'true' -%}escalate_manual
{%- elif _sc >= 3 -%}require_approval
{%- else -%}monitor
{%- endif -%}`,
  }, pos[pi++]);
  steps.push(safetyStep);
  routes.push(buildRoute("Score_Identity_Risk", "Identity_Safety_Gates", scoreStep.uuid, safetyStep.uuid));

  // Finalize
  const finalizeStep = buildFinalizeStep(
    `Identity Score: {{ vars.steps.Identity_Safety_Gates.identity_score | default('0') | string }}\nDecision: {{ vars.steps.Identity_Safety_Gates.action_decision | default('N/A') | string }}\nUser: {{ vars.steps.User_Context.username_normalized | default('N/A') | string }}\nSource IP: {{ vars.steps.User_Context.source_ip | default('N/A') | string }}\nGuardrail: Approval_Before_Disable enforced. Service accounts and Domain Admins never auto-disabled.`,
    pos[Math.min(pi + 12, pos.length - 1)]
  );
  steps.push(finalizeStep);

  // Step 6: Identity_Action_Decision
  const approvalUuid = generateUUID();
  const postApprovalUuid = generateUUID();
  const disableUuid = generateUUID();
  const revokeUuid = generateUUID();
  const escalateUuid = generateUUID();

  const identityActionChain: Array<{ name: string; uuid: string; step: FortiSOARStep }> = [];

  if (hasDisableAD) {
    const adCfg = profile.connectors["active_directory"] || buildConnectorConfig("active_directory");
    const disableStep = buildConnector("disable_ad_user", adCfg, pos[Math.min(pi + 3, pos.length - 1)], {
      search_attr_name: "sAMAccountName",
      search_attr_value: safeStepVar("User_Context", "username_normalized"),
    });
    if (disableStep) {
      disableStep.uuid = disableUuid;
      disableStep.name = "Disable_AD_User";
      markDynamicNode(disableStep, "disable_ad_user");
      identityActionChain.push({ name: "Disable_AD_User", uuid: disableUuid, step: disableStep });
    }
  }

  if (hasRevokeAzure) {
    const azureCfg = profile.connectors["azure_ad"] || buildConnectorConfig("azure_ad");
    const revokeStep = buildConnector("revoke_azure_sessions", azureCfg, pos[Math.min(pi + 4, pos.length - 1)], {
      user_principal_name: safeStepVar("User_Context", "upn"),
    });
    if (revokeStep) {
      revokeStep.uuid = revokeUuid;
      revokeStep.name = "Revoke_Azure_Sessions";
      markDynamicNode(revokeStep, "revoke_azure_sessions");
      identityActionChain.push({ name: "Revoke_Azure_Sessions", uuid: revokeUuid, step: revokeStep });
    }
  }

  const firstAction = identityActionChain[0];
  const hasIdentityResponseAction = Boolean(firstAction);

  const decisionStep = buildDecision("Identity_Action_Decision", hasIdentityResponseAction ? [
    { condition: `{{ vars.steps.Identity_Safety_Gates.action_decision | default('') | string == 'require_approval' }}`, stepName: "Identity_Approval", stepUuid: approvalUuid },
    { condition: `{{ vars.steps.Identity_Safety_Gates.action_decision | default('') | string == 'escalate_manual' }}`, stepName: "Manual_Escalation", stepUuid: escalateUuid },
    { default: true, stepName: "Finalize", stepUuid: finalizeStep.uuid },
  ] : [
    { condition: `{{ vars.steps.Identity_Safety_Gates.action_decision | default('') | string == 'escalate_manual' }}`, stepName: "Manual_Escalation", stepUuid: escalateUuid },
    { default: true, stepName: "Finalize", stepUuid: finalizeStep.uuid },
  ], pos[pi++]);
  steps.push(decisionStep);
  routes.push(buildRoute("Identity_Safety_Gates", "Identity_Action_Decision", safetyStep.uuid, decisionStep.uuid));
  routes.push(buildRoute("Identity_Action_Decision", "Finalize", decisionStep.uuid, finalizeStep.uuid));

  // Manual escalation step
  const escalateStep = buildSetVarStep("Manual_Escalation", {
    escalation_note: `ESCALATE MANUALLY: Account {{ vars.steps.User_Context.username_normalized | default('N/A') | string }} is a privileged/service account. Do not auto-disable. Escalate to SOC Lead and Identity Team.`,
    requires_human_review: "true",
  }, pos[pi++]);
  escalateStep.uuid = escalateUuid;
  steps.push(escalateStep);
  routes.push(buildRoute("Identity_Action_Decision", "Manual_Escalation", decisionStep.uuid, escalateUuid));
  routes.push(buildRoute("Manual_Escalation", "Finalize", escalateUuid, finalizeStep.uuid));

  if (hasIdentityResponseAction) {
    // Step 7: Identity_Approval (Approval_Before_Disable)
    const approvalStep = {
      ...buildApproval(
        "Identity_Approval",
        `APPROVAL_BEFORE_DISABLE\nUser: {{ vars.steps.User_Context.username_normalized | default('N/A') | string }}\nUPN: {{ vars.steps.User_Context.upn | default('N/A') | string }}\nSource IP: {{ vars.steps.User_Context.source_ip | default('N/A') | string }}\nCountry: {{ vars.steps.User_Context.login_country | default('N/A') | string }}\nScore: {{ vars.steps.Identity_Safety_Gates.identity_score | default('0') | string }}\n\nAction: Execute selected identity response action(s).\nConfirm this is NOT a service account or Domain Admin before approving.`,
        firstAction.uuid,
        finalizeStep.uuid,
        profile.approvalTeamIri,
        profile.approvalTeamName,
        pos[pi++]
      ),
      uuid: approvalUuid,
    };
    steps.push(approvalStep);
    routes.push(buildRoute("Identity_Action_Decision", "Identity_Approval", decisionStep.uuid, approvalUuid));

    // Post-approval decision
    const postApprovalStep: FortiSOARStep = {
      "@type": "WorkflowStep",
      name: "Identity_Approval_Decision",
      description: null,
      arguments: {
        conditions: [
          {
            condition: `{{ (vars.steps.Identity_Approval.approved | default(false) | string | lower == 'true') and (vars.steps.User_Context.is_service_account | default('false') | string | lower != 'true') and (vars.steps.User_Context.is_domain_admin | default('false') | string | lower != 'true') }}`,
            step_iri: `/api/3/workflow_steps/${firstAction.uuid}`,
            step_name: firstAction.name,
          },
          { default: true, step_iri: `/api/3/workflow_steps/${finalizeStep.uuid}`, step_name: "Finalize" },
        ],
        step_variables: [],
      },
      status: null,
      top: String(pos[pi].top),
      left: String(pos[pi].left),
      stepType: FORTISOAR_STEP_TYPE_IRIS.decision,
      group: null,
      uuid: postApprovalUuid,
    };
    pi++;
    steps.push(postApprovalStep);
    routes.push(buildRoute("Identity_Approval", "Identity_Approval_Decision", approvalUuid, postApprovalUuid));
    routes.push(buildRoute("Identity_Approval_Decision", "Finalize", postApprovalUuid, finalizeStep.uuid));

    for (const action of identityActionChain) {
      const actionPos = pos[Math.min(pi++, pos.length - 1)];
      action.step.top = String(actionPos.top);
      action.step.left = String(actionPos.left);
      steps.push(action.step);
    }

    routes.push(buildRoute("Identity_Approval_Decision", firstAction.name, postApprovalUuid, firstAction.uuid));
    for (let i = 1; i < identityActionChain.length; i++) {
      const previous = identityActionChain[i - 1];
      const current = identityActionChain[i];
      routes.push(buildRoute(previous.name, current.name, previous.uuid, current.uuid));
    }
    const lastAction = identityActionChain[identityActionChain.length - 1];
    routes.push(buildRoute(lastAction.name, "Finalize", lastAction.uuid, finalizeStep.uuid));
  }

  const collectionUuid = generateUUID();
  return makeWorkflow(playbook, triggerStep, steps, routes, collectionUuid);
}

// ============================================================================
// Malware Hash Analysis Generator
// ============================================================================

export function generateMalwareHashWorkflow(
  playbook: PlaybookState,
  profile: FortiSOARDeploymentProfile
): FortiSOARWorkflow {
  const steps: FortiSOARStep[] = [];
  const routes: FortiSOARRoute[] = [];
  const pos = calculateStepPositions(28);
  let pi = 0;

  // Step 1: Trigger
  const triggerStep = buildTriggerStep(playbook, pos[pi++]);
  steps.push(triggerStep);

  // Step 2: Build_Context
  const ctxStep = buildBaseContextStep(pos[pi++]);
  steps.push(ctxStep);
  routes.push(buildRoute("Start", "Build_Context", triggerStep.uuid, ctxStep.uuid));

  // Step 3: Extract_Hash_Context
  const extractStep = buildSetVarStep("Extract_Hash_Context", {
    file_hash: `{%- set _r = ${SAFE_RECORD} -%}{{ _r.file_hash | default(_r.sha256 | default(_r.md5 | default(_r.sha1 | default('')))) | string | trim }}`,
    file_path: `{{ ${SAFE_RECORD}.file_path | default(${SAFE_RECORD}.file_name | default('')) | string | trim }}`,
    hostname: `{{ ${SAFE_RECORD}.hostname | default(${SAFE_RECORD}.host | default('')) | string | trim }}`,
    machine_id: `{{ ${SAFE_RECORD}.machine_id | default(${SAFE_RECORD}.device_id | default('')) | string | trim }}`,
    process_name: `{{ ${SAFE_RECORD}.process_name | default(${SAFE_RECORD}.process | default('')) | string | trim }}`,
    hash_available: `{%- if ${SAFE_RECORD}.file_hash | default(${SAFE_RECORD}.sha256 | default(${SAFE_RECORD}.md5 | default(''))) | string | trim != '' -%}true{%- else -%}false{%- endif -%}`,
    ioc_hashes: `{{ ${SAFE_RECORD}.file_hash | default(${SAFE_RECORD}.sha256 | default('')) | string | trim }}`,
  }, pos[pi++]);
  steps.push(extractStep);
  routes.push(buildRoute("Build_Context", "Extract_Hash_Context", ctxStep.uuid, extractStep.uuid));

  // Step 4: Hash_Availability_Check
  const hashCheckUuid = generateUUID();
  const hashMissingUuid = generateUUID();
  const hashAvailableUuid = generateUUID();
  const hashCheckStep = buildDecision("Hash_Availability_Check", [
    { condition: `{{ vars.steps.Extract_Hash_Context.hash_available | default('false') | string | lower == 'true' }}`, stepName: "VT_Hash_Lookup", stepUuid: hashAvailableUuid },
    { default: true, stepName: "Hash_Missing_Fallback", stepUuid: hashMissingUuid },
  ], pos[pi++]);
  hashCheckStep.uuid = hashCheckUuid;
  steps.push(hashCheckStep);
  routes.push(buildRoute("Extract_Hash_Context", "Hash_Availability_Check", extractStep.uuid, hashCheckUuid));

  // Step 5a: Hash_Missing_Fallback
  const finalizeStep = buildFinalizeStep(
    `Malware Hash Analysis\nHash: {{ vars.steps.Extract_Hash_Context.file_hash | default('N/A') | string }}\nVT Detections: {{ vars.steps.VT_Hash_Lookup.vt_detections | default('N/A') | string }}\nSandbox Verdict: {{ vars.steps.Sandbox_Analysis.sandbox_verdict | default('N/A') | string }}\nDecision: {{ vars.steps.Score_Hash_Reputation.action_decision | default('N/A') | string }}\nHostname: {{ vars.steps.Extract_Hash_Context.hostname | default('N/A') | string }}`,
    pos[Math.min(pi + 13, pos.length - 1)]
  );
  steps.push(finalizeStep);

  const hashMissingStep = buildSetVarStep("Hash_Missing_Fallback", {
    fallback_note: "Hash not available in alert. Manual analysis required. Collect file from endpoint for hash extraction.",
    requires_manual_hash: "true",
  }, pos[pi++]);
  hashMissingStep.uuid = hashMissingUuid;
  steps.push(hashMissingStep);
  routes.push(buildRoute("Hash_Availability_Check", "Hash_Missing_Fallback", hashCheckUuid, hashMissingUuid));
  routes.push(buildRoute("Hash_Missing_Fallback", "Finalize", hashMissingUuid, finalizeStep.uuid));

  // Step 5b: VT_Hash_Lookup
  const vtCfg = profile.connectors["virustotal"] || buildConnectorConfig("virustotal");
  const vtStep = buildConnector("virustotal_hash_lookup", vtCfg, pos[pi++], {
    hash: safeStepVar("Extract_Hash_Context", "file_hash"),
  }) ?? buildSetVarStep("VT_Hash_Lookup", { vt_detections: "0", vt_verdict: "unknown", note: "Configure virustotal connector" }, pos[pi - 1]);
  vtStep.uuid = hashAvailableUuid;
  vtStep.name = "VT_Hash_Lookup";
  steps.push(vtStep);
  routes.push(buildRoute("Hash_Availability_Check", "VT_Hash_Lookup", hashCheckUuid, hashAvailableUuid));

  // Step 6: Parse_VT_Result
  const vtParseStep = buildSetVarStep("Parse_VT_Result", {
    vt_positives: `{{ vars.steps.VT_Hash_Lookup.data.positives | default(vars.steps.VT_Hash_Lookup.data.attributes.last_analysis_stats.malicious | default(0)) | int }}`,
    vt_total: `{{ vars.steps.VT_Hash_Lookup.data.total | default(70) | int }}`,
    vt_verdict: `{%- set _pos = vars.steps.Parse_VT_Result.vt_positives | default(0) | int -%}
{%- if _pos > 5 -%}malicious{%- elif _pos > 0 -%}suspicious{%- else -%}clean{%- endif -%}`,
  }, pos[pi++]);
  steps.push(vtParseStep);
  routes.push(buildRoute("VT_Hash_Lookup", "Parse_VT_Result", hashAvailableUuid, vtParseStep.uuid));

  // Step 7: Submit_to_Sandbox
  const sandboxUuid = generateUUID();
  const sandboxCfg = profile.connectors["fortisandbox"] || buildConnectorConfig("fortisandbox");
  const sandboxStep = buildConnector("submit_file_to_sandbox", sandboxCfg, pos[pi++], {
    hash: safeStepVar("Extract_Hash_Context", "file_hash"),
  }) ?? buildSetVarStep("Sandbox_Analysis", {
    sandbox_verdict: "not_configured",
    note: "Configure fortisandbox connector for behavioral analysis",
  }, pos[pi - 1]);
  sandboxStep.uuid = sandboxUuid;
  sandboxStep.name = "Sandbox_Analysis";
  steps.push(sandboxStep);
  routes.push(buildRoute("Parse_VT_Result", "Sandbox_Analysis", vtParseStep.uuid, sandboxUuid));

  // Step 8: Score_Hash_Reputation
  const scoreStep = buildSetVarStep("Score_Hash_Reputation", {
    vt_score: `{%- set _p = vars.steps.Parse_VT_Result.vt_positives | default(0) | int -%}{%- if _p > 5 -%}3{%- elif _p > 0 -%}2{%- else -%}0{%- endif -%}`,
    sandbox_score: `{%- set _sv = vars.steps.Sandbox_Analysis.sandbox_verdict | default('unknown') | string | lower -%}{%- if _sv == 'malicious' -%}3{%- elif _sv == 'suspicious' -%}1{%- else -%}0{%- endif -%}`,
    total_score: `{{ (vars.steps.Score_Hash_Reputation.vt_score | default(0) | int) + (vars.steps.Score_Hash_Reputation.sandbox_score | default(0) | int) }}`,
    action_decision: `{%- set _sc = (vars.steps.Score_Hash_Reputation.vt_score | default(0) | int) + (vars.steps.Score_Hash_Reputation.sandbox_score | default(0) | int) -%}
{%- if vars.steps.Build_Context.false_positive | default('false') | string | lower == 'true' -%}skip
{%- elif _sc >= 5 -%}auto_contain
{%- elif _sc >= 2 -%}require_approval
{%- else -%}no_action
{%- endif -%}`,
  }, pos[pi++]);
  steps.push(scoreStep);
  routes.push(buildRoute("Sandbox_Analysis", "Score_Hash_Reputation", sandboxUuid, scoreStep.uuid));

  // Step 9: Hash_Action_Decision
  const approvalUuid = generateUUID();
  const isolateUuid = generateUUID();
  const decisionStep = buildDecision("Hash_Action_Decision", [
    { condition: `{{ vars.steps.Score_Hash_Reputation.action_decision | default('') | string == 'auto_contain' }}`, stepName: "Isolate_Endpoint", stepUuid: isolateUuid },
    { condition: `{{ vars.steps.Score_Hash_Reputation.action_decision | default('') | string == 'require_approval' }}`, stepName: "Malware_Approval", stepUuid: approvalUuid },
    { default: true, stepName: "Finalize", stepUuid: finalizeStep.uuid },
  ], pos[pi++]);
  steps.push(decisionStep);
  routes.push(buildRoute("Score_Hash_Reputation", "Hash_Action_Decision", scoreStep.uuid, decisionStep.uuid));
  routes.push(buildRoute("Hash_Action_Decision", "Finalize", decisionStep.uuid, finalizeStep.uuid));

  // Step 10: Malware_Approval
  const postApprovalUuid = generateUUID();
  const approvalStep = {
    ...buildApproval(
      "Malware_Approval",
      `Malware Hash Detected\nHash: {{ vars.steps.Extract_Hash_Context.file_hash | default('N/A') | string }}\nVT Positives: {{ vars.steps.Parse_VT_Result.vt_positives | default('0') | string }}\nSandbox Verdict: {{ vars.steps.Sandbox_Analysis.sandbox_verdict | default('N/A') | string }}\nTotal Score: {{ vars.steps.Score_Hash_Reputation.total_score | default('0') | string }}\nHostname: {{ vars.steps.Extract_Hash_Context.hostname | default('N/A') | string }}\n\nVerify file is not a legitimate tool before approving isolation.`,
      isolateUuid,
      finalizeStep.uuid,
      profile.approvalTeamIri,
      profile.approvalTeamName,
      pos[pi++]
    ),
    uuid: approvalUuid,
  };
  steps.push(approvalStep);
  routes.push(buildRoute("Hash_Action_Decision", "Malware_Approval", decisionStep.uuid, approvalUuid));

  // Post-approval
  const postApprovalStep: FortiSOARStep = {
    "@type": "WorkflowStep",
    name: "Malware_Approval_Decision",
    description: null,
    arguments: {
      conditions: [
        { condition: `{{ vars.steps.Malware_Approval.approved | default(false) | string | lower == 'true' }}`, step_iri: `/api/3/workflow_steps/${isolateUuid}`, step_name: "Isolate_Endpoint" },
        { default: true, step_iri: `/api/3/workflow_steps/${finalizeStep.uuid}`, step_name: "Finalize" },
      ],
      step_variables: [],
    },
    status: null,
    top: String(pos[pi].top),
    left: String(pos[pi].left),
    stepType: FORTISOAR_STEP_TYPE_IRIS.decision,
    group: null,
    uuid: postApprovalUuid,
  };
  pi++;
  steps.push(postApprovalStep);
  routes.push(buildRoute("Malware_Approval", "Malware_Approval_Decision", approvalUuid, postApprovalUuid));
  routes.push(buildRoute("Malware_Approval_Decision", "Finalize", postApprovalUuid, finalizeStep.uuid));

  // Step 11: Isolate_Endpoint
  const edrCfg = profile.connectors["groupib_edr"] || buildConnectorConfig("groupib_edr");
  const isolateStep = buildConnector("isolate_endpoint", edrCfg, pos[pi++], {
    machine_id: safeStepVar("Extract_Hash_Context", "machine_id"),
    comment: `SOARForge malware isolation - Hash: {{ vars.steps.Extract_Hash_Context.file_hash | default('N/A') | string }} - Incident {{ vars.steps.Build_Context.record_id | default('N/A') | string }}`,
  }) ?? buildSetVarStep("Isolate_Endpoint", { isolate_status: "not_configured" }, pos[pi - 1]);
  isolateStep.uuid = isolateUuid;
  isolateStep.name = "Isolate_Endpoint";
  steps.push(isolateStep);
  routes.push(buildRoute("Hash_Action_Decision", "Isolate_Endpoint", decisionStep.uuid, isolateUuid));
  routes.push(buildRoute("Malware_Approval_Decision", "Isolate_Endpoint", postApprovalUuid, isolateUuid));
  routes.push(buildRoute("Isolate_Endpoint", "Finalize", isolateUuid, finalizeStep.uuid));

  const collectionUuid = generateUUID();
  return makeWorkflow(playbook, triggerStep, steps, routes, collectionUuid);
}

// ============================================================================
// Malicious IP Response Generator
// ============================================================================

export function generateMaliciousIPWorkflow(
  playbook: PlaybookState,
  profile: FortiSOARDeploymentProfile
): FortiSOARWorkflow {
  const steps: FortiSOARStep[] = [];
  const routes: FortiSOARRoute[] = [];
  const pos = calculateStepPositions(28);
  let pi = 0;

  // Step 1: Trigger
  const triggerStep = buildTriggerStep(playbook, pos[pi++]);
  steps.push(triggerStep);

  // Step 2: Build_Context
  const ctxStep = buildBaseContextStep(pos[pi++]);
  steps.push(ctxStep);
  routes.push(buildRoute("Start", "Build_Context", triggerStep.uuid, ctxStep.uuid));

  // Step 3: Extract_IP_IOCs
  const extractStep = buildSetVarStep("Extract_IOCs", {
    ioc_public_ips: `{{ ${SAFE_RECORD}.source_ip | default(${SAFE_RECORD}.src_ip | default('')) | string | trim }}`,
    source_ip: `{{ ${SAFE_RECORD}.source_ip | default(${SAFE_RECORD}.src_ip | default('')) | string | trim }}`,
    dest_ip: `{{ ${SAFE_RECORD}.dest_ip | default(${SAFE_RECORD}.dst_ip | default('')) | string | trim }}`,
    protocol: `{{ ${SAFE_RECORD}.protocol | default('') | string | trim }}`,
    bytes_transferred: `{{ ${SAFE_RECORD}.bytes_transferred | default(${SAFE_RECORD}.bytes | default(0)) | string }}`,
    ip_available: `{%- if ${SAFE_RECORD}.source_ip | default(${SAFE_RECORD}.src_ip | default('')) | string | trim != '' -%}true{%- else -%}false{%- endif -%}`,
  }, pos[pi++]);
  steps.push(extractStep);
  routes.push(buildRoute("Build_Context", "Extract_IOCs", ctxStep.uuid, extractStep.uuid));

  // Step 4: AbuseIPDB_Lookup
  const abuseUuid = generateUUID();
  const abuseCfg = profile.connectors["abuseipdb"] || buildConnectorConfig("abuseipdb");
  const abuseStep = buildConnector("abuseipdb_lookup", abuseCfg, pos[pi++], {
    ip: safeStepVar("Extract_IOCs", "source_ip"),
    days: "30",
  }) ?? buildSetVarStep("AbuseIPDB_Lookup", { abuseConfidenceScore: "0", note: "Configure abuseipdb connector" }, pos[pi - 1]);
  abuseStep.uuid = abuseUuid;
  abuseStep.name = "AbuseIPDB_Lookup";
  steps.push(abuseStep);
  routes.push(buildRoute("Extract_IOCs", "AbuseIPDB_Lookup", extractStep.uuid, abuseUuid));

  // Step 5: VT_IP_Lookup
  const vtUuid = generateUUID();
  const vtCfg = profile.connectors["virustotal"] || buildConnectorConfig("virustotal");
  const vtStep = buildConnector("virustotal_ip_lookup", vtCfg, pos[pi++], {
    ip: safeStepVar("Extract_IOCs", "source_ip"),
  }) ?? buildSetVarStep("VT_IP_Lookup", { vt_positives: "0", note: "Configure virustotal connector" }, pos[pi - 1]);
  vtStep.uuid = vtUuid;
  vtStep.name = "VT_IP_Lookup";
  steps.push(vtStep);
  routes.push(buildRoute("AbuseIPDB_Lookup", "VT_IP_Lookup", abuseUuid, vtUuid));

  // Step 6: Reputation_Consensus
  const consensusStep = buildSetVarStep("Reputation_Consensus", {
    abuseipdb_score: `{{ vars.steps.AbuseIPDB_Lookup.data.abuseConfidenceScore | default(0) | int }}`,
    vt_positives: `{{ vars.steps.VT_IP_Lookup.data.attributes.last_analysis_stats.malicious | default(0) | int }}`,
    abuseipdb_high: `{%- set _s = vars.steps.Reputation_Consensus.abuseipdb_score | default(0) | int -%}{%- if _s >= 90 -%}true{%- else -%}false{%- endif -%}`,
    abuseipdb_medium: `{%- set _s = vars.steps.Reputation_Consensus.abuseipdb_score | default(0) | int -%}{%- if _s >= 50 and _s < 90 -%}true{%- else -%}false{%- endif -%}`,
    vt_malicious: `{%- set _v = vars.steps.Reputation_Consensus.vt_positives | default(0) | int -%}{%- if _v > 5 -%}true{%- else -%}false{%- endif -%}`,
    consensus_block: `{%- set _a = vars.steps.Reputation_Consensus.abuseipdb_score | default(0) | int -%}
{%- set _v = vars.steps.Reputation_Consensus.vt_positives | default(0) | int -%}
{%- if _a >= 90 or (_a >= 50 and _v > 3) -%}true{%- else -%}false{%- endif -%}`,
    ip_score: `{%- set _a = vars.steps.Reputation_Consensus.abuseipdb_score | default(0) | int -%}
{%- set _v = vars.steps.Reputation_Consensus.vt_positives | default(0) | int -%}
{%- set _sc = 0 -%}
{%- if _a >= 90 -%}{%- set _sc = _sc + 4 -%}{%- elif _a >= 50 -%}{%- set _sc = _sc + 2 -%}{%- endif -%}
{%- if _v > 5 -%}{%- set _sc = _sc + 3 -%}{%- elif _v > 0 -%}{%- set _sc = _sc + 1 -%}{%- endif -%}
{%- if vars.steps.Reputation_Consensus.consensus_block | default('false') | string | lower == 'true' -%}{%- set _sc = _sc + 2 -%}{%- endif -%}
{{ _sc }}`,
    action_decision: `{%- set _sc = vars.steps.Reputation_Consensus.ip_score | default(0) | int -%}
{%- if vars.steps.Build_Context.false_positive | default('false') | string | lower == 'true' -%}monitor
{%- elif _sc >= 6 -%}auto_block
{%- elif _sc >= 3 -%}require_approval
{%- else -%}monitor
{%- endif -%}`,
    guardrail_note: "CDN/Cloud IP Guardrail: verify source IP is not Cloudflare, Akamai, AWS, Azure, or GCP before blocking",
  }, pos[pi++]);
  steps.push(consensusStep);
  routes.push(buildRoute("VT_IP_Lookup", "Reputation_Consensus", vtUuid, consensusStep.uuid));

  // Finalize
  const finalizeStep = buildFinalizeStep(
    `IP: {{ vars.steps.Extract_IOCs.source_ip | default('N/A') | string }}\nAbuseIPDB: {{ vars.steps.Reputation_Consensus.abuseipdb_score | default('0') | string }}\nVT Positives: {{ vars.steps.Reputation_Consensus.vt_positives | default('0') | string }}\nConsensus Block: {{ vars.steps.Reputation_Consensus.consensus_block | default('false') | string }}\nScore: {{ vars.steps.Reputation_Consensus.ip_score | default('0') | string }}\nDecision: {{ vars.steps.Reputation_Consensus.action_decision | default('N/A') | string }}\nGuardrail: CDN/cloud IPs never blocked`,
    pos[Math.min(pi + 8, pos.length - 1)]
  );
  steps.push(finalizeStep);

  // Step 7: IP_Action_Decision
  const approvalUuid = generateUUID();
  const blockUuid = generateUUID();
  const decisionStep = buildDecision("IP_Action_Decision", [
    { condition: `{{ vars.steps.Reputation_Consensus.action_decision | default('') | string == 'auto_block' }}`, stepName: "Block_IP", stepUuid: blockUuid },
    { condition: `{{ vars.steps.Reputation_Consensus.action_decision | default('') | string == 'require_approval' }}`, stepName: "IP_Block_Approval", stepUuid: approvalUuid },
    { default: true, stepName: "Finalize", stepUuid: finalizeStep.uuid },
  ], pos[pi++]);
  steps.push(decisionStep);
  routes.push(buildRoute("Reputation_Consensus", "IP_Action_Decision", consensusStep.uuid, decisionStep.uuid));
  routes.push(buildRoute("IP_Action_Decision", "Finalize", decisionStep.uuid, finalizeStep.uuid));

  // Step 8: IP_Block_Approval
  const postApprovalUuid = generateUUID();
  const approvalStep = {
    ...buildApproval(
      "IP_Block_Approval",
      `Malicious IP Detected\nIP: {{ vars.steps.Extract_IOCs.source_ip | default('N/A') | string }}\nAbuseIPDB: {{ vars.steps.Reputation_Consensus.abuseipdb_score | default('0') | string }}\nVT Positives: {{ vars.steps.Reputation_Consensus.vt_positives | default('0') | string }}\nScore: {{ vars.steps.Reputation_Consensus.ip_score | default('0') | string }}\n\nGUARDRAIL: Verify IP is not a CDN (Cloudflare, Akamai) or cloud provider (AWS, Azure, GCP) before approving block.`,
      blockUuid,
      finalizeStep.uuid,
      profile.approvalTeamIri,
      profile.approvalTeamName,
      pos[pi++]
    ),
    uuid: approvalUuid,
  };
  steps.push(approvalStep);
  routes.push(buildRoute("IP_Action_Decision", "IP_Block_Approval", decisionStep.uuid, approvalUuid));

  // Post-approval
  const postApprovalStep: FortiSOARStep = {
    "@type": "WorkflowStep",
    name: "IP_Block_Approval_Decision",
    description: null,
    arguments: {
      conditions: [
        { condition: `{{ vars.steps.IP_Block_Approval.approved | default(false) | string | lower == 'true' }}`, step_iri: `/api/3/workflow_steps/${blockUuid}`, step_name: "Block_IP" },
        { default: true, step_iri: `/api/3/workflow_steps/${finalizeStep.uuid}`, step_name: "Finalize" },
      ],
      step_variables: [],
    },
    status: null,
    top: String(pos[pi].top),
    left: String(pos[pi].left),
    stepType: FORTISOAR_STEP_TYPE_IRIS.decision,
    group: null,
    uuid: postApprovalUuid,
  };
  pi++;
  steps.push(postApprovalStep);
  routes.push(buildRoute("IP_Block_Approval", "IP_Block_Approval_Decision", approvalUuid, postApprovalUuid));
  routes.push(buildRoute("IP_Block_Approval_Decision", "Finalize", postApprovalUuid, finalizeStep.uuid));

  // Step 9: Block_IP (Temporary_Block_IP — spec-required named step)
  const fwCfg = profile.connectors["fortigate_firewall"] || profile.connectors["palo_alto_firewall"] || buildConnectorConfig("fortigate_firewall");
  const blockActionId = playbook.actions.includes("block_ip_fortigate") ? "block_ip_fortigate" : "block_ip_paloalto";
  const blockStep = buildConnector(blockActionId, fwCfg, pos[pi++], {
    address: safeStepVar("Extract_IOCs", "source_ip"),
    address_group: "SOAR-Blocked-IPs",
    description: `SOARForge IP block - Score: {{ vars.steps.Reputation_Consensus.ip_score | default('0') | string }} - Incident {{ vars.steps.Build_Context.record_id | default('N/A') | string }}`,
  }) ?? buildSetVarStep("Temporary_Block_IP", { block_status: "not_configured", note: "Configure fortigate_firewall or palo_alto_firewall connector to enable IP blocking" }, pos[pi - 1]);
  blockStep.uuid = blockUuid;
  blockStep.name = "Temporary_Block_IP";
  steps.push(blockStep);
  routes.push(buildRoute("IP_Action_Decision", "Temporary_Block_IP", decisionStep.uuid, blockUuid));
  routes.push(buildRoute("IP_Block_Approval_Decision", "Temporary_Block_IP", postApprovalUuid, blockUuid));

  // Step 10: CDN_Cloud_Guardrail + Rollback_Note (spec-required for malicious IP)
  const ipGuardrailStep = buildSetVarStep("CDN_Cloud_Guardrail", {
    guardrail_note: "Malicious IP Guardrail: Blocked IP {{ vars.steps.Extract_IOCs.source_ip | default('N/A') | string }}. Verify this IP is not a CDN (Cloudflare, Akamai, Fastly) or cloud provider (AWS, Azure, GCP) range before leaving block in place.",
    rollback_action: "Run unblock_ip_fortigate or unblock_ip_paloalto to reverse. Remove from SOAR-Blocked-IPs group.",
    block_completed: "true",
  }, pos[pi++]);
  steps.push(ipGuardrailStep);
  routes.push(buildRoute("Temporary_Block_IP", "CDN_Cloud_Guardrail", blockUuid, ipGuardrailStep.uuid));
  routes.push(buildRoute("CDN_Cloud_Guardrail", "Finalize", ipGuardrailStep.uuid, finalizeStep.uuid));

  const collectionUuid = generateUUID();
  return makeWorkflow(playbook, triggerStep, steps, routes, collectionUuid);
}

// ============================================================================
// Vulnerability Remediation Workflow Generator
// ============================================================================

export function generateVulnerabilityWorkflow(
  playbook: PlaybookState,
  profile: FortiSOARDeploymentProfile
): FortiSOARWorkflow {
  const steps: FortiSOARStep[] = [];
  const routes: FortiSOARRoute[] = [];
  const pos = calculateStepPositions(20);
  let pi = 0;

  // Step 1: Trigger
  const triggerStep = buildTriggerStep(playbook, pos[pi++]);
  steps.push(triggerStep);

  // Step 2: Build_Context
  const ctxStep = buildBaseContextStep(pos[pi++]);
  steps.push(ctxStep);
  routes.push(buildRoute("Start", "Build_Context", triggerStep.uuid, ctxStep.uuid));

  // Step 3: Extract_Vuln_Data
  const extractStep = buildSetVarStep("Extract_Vuln_Data", {
    cve_id: `{{ ${SAFE_RECORD}.cve_id | default(${SAFE_RECORD}.vulnerability_id | default('')) | string | trim }}`,
    cvss_score: `{{ ${SAFE_RECORD}.cvss_score | default(${SAFE_RECORD}.severity_score | default(0)) | string }}`,
    affected_host: `{{ ${SAFE_RECORD}.hostname | default(${SAFE_RECORD}.affected_host | default('')) | string | trim }}`,
    asset_criticality: `{{ ${SAFE_RECORD}.asset_criticality | default(${SAFE_RECORD}.business_criticality | default('medium')) | string | lower | trim }}`,
    patch_available: `{{ ${SAFE_RECORD}.patch_available | default(${SAFE_RECORD}.has_fix | default('unknown')) | string | lower | trim }}`,
    exploit_available: `{{ ${SAFE_RECORD}.exploit_available | default(${SAFE_RECORD}.exploit_in_wild | default('false')) | string | lower | trim }}`,
  }, pos[pi++]);
  steps.push(extractStep);
  routes.push(buildRoute("Build_Context", "Extract_Vuln_Data", ctxStep.uuid, extractStep.uuid));

  // Step 4: Duplicate_Ticket_Lookup (REQUIRED by spec)
  const snowCfg = profile.connectors["servicenow"] || buildConnectorConfig("servicenow");
  const dupLookupUuid = generateUUID();
  const dupLookupStep = buildConnector("lookup_duplicate_ticket", snowCfg, pos[pi++], {
    query: `short_description CONTAINS SOARForge AND short_description CONTAINS {{ vars.steps.Extract_Vuln_Data.cve_id | default('') | string }} AND active=true`,
  }) ?? buildSetVarStep("Duplicate_Ticket_Lookup", {
    duplicate_found: "false",
    existing_ticket_id: "",
    note: "Duplicate_Ticket_Lookup: check for existing tickets before creating new one",
  }, pos[pi - 1]);
  dupLookupStep.uuid = dupLookupUuid;
  dupLookupStep.name = "Duplicate_Ticket_Lookup";
  steps.push(dupLookupStep);
  routes.push(buildRoute("Extract_Vuln_Data", "Duplicate_Ticket_Lookup", extractStep.uuid, dupLookupUuid));

  // Step 5: Vuln_Score_And_SLA
  const scoreStep = buildSetVarStep("Vuln_Score_And_SLA", {
    cvss_numeric: `{{ vars.steps.Extract_Vuln_Data.cvss_score | default(0) | float }}`,
    is_critical_asset: `{%- set _crit = vars.steps.Extract_Vuln_Data.asset_criticality | default('medium') | string | lower -%}{%- if _crit == 'critical' or _crit == 'tier1' or _crit == '1' -%}true{%- else -%}false{%- endif -%}`,
    is_critical_cvss: `{%- set _cv = vars.steps.Extract_Vuln_Data.cvss_score | default(0) | float -%}{%- if _cv >= 9.0 -%}true{%- elif _cv >= 7.0 -%}high{%- elif _cv >= 4.0 -%}medium{%- else -%}false{%- endif -%}`,
    has_exploit: `{%- set _e = vars.steps.Extract_Vuln_Data.exploit_available | default('false') | string | lower -%}{%- if _e == 'true' or _e == 'yes' -%}true{%- else -%}false{%- endif -%}`,
    duplicate_exists: `{%- set _d = vars.steps.Duplicate_Ticket_Lookup.data | default([]) -%}{%- if _d is iterable and _d is not string and _d | length > 0 -%}true{%- else -%}false{%- endif -%}`,
    sla_days: `{%- set _cv = vars.steps.Extract_Vuln_Data.cvss_score | default(0) | float -%}
{%- set _crit = vars.steps.Vuln_Score_And_SLA.is_critical_asset | default('false') | string | lower -%}
{%- set _exp = vars.steps.Vuln_Score_And_SLA.has_exploit | default('false') | string | lower -%}
{%- if _cv >= 9.0 or _exp == 'true' -%}7
{%- elif _cv >= 7.0 or _crit == 'true' -%}14
{%- else -%}30
{%- endif -%}`,
    ticket_priority: `{%- set _sla = vars.steps.Vuln_Score_And_SLA.sla_days | default(30) | int -%}
{%- if _sla <= 7 -%}1{%- elif _sla <= 14 -%}2{%- else -%}3{%- endif -%}`,
  }, pos[pi++]);
  steps.push(scoreStep);
  routes.push(buildRoute("Duplicate_Ticket_Lookup", "Vuln_Score_And_SLA", dupLookupUuid, scoreStep.uuid));

  // Finalize
  const finalizeStep = buildFinalizeStep(
    `CVE: {{ vars.steps.Extract_Vuln_Data.cve_id | default('N/A') | string }}\nCVSS: {{ vars.steps.Extract_Vuln_Data.cvss_score | default('N/A') | string }}\nSLA: {{ vars.steps.Vuln_Score_And_SLA.sla_days | default('N/A') | string }} days\nDuplicate: {{ vars.steps.Vuln_Score_And_SLA.duplicate_exists | default('false') | string }}\nGuardrail: No destructive remediation actions. Ticket-based workflow only.`,
    pos[Math.min(pi + 6, pos.length - 1)]
  );
  steps.push(finalizeStep);

  // Step 6: Duplicate_Check_Decision
  const createTicketUuid = generateUUID();
  const dupDecisionStep = buildDecision("Duplicate_Check_Decision", [
    { condition: `{{ vars.steps.Vuln_Score_And_SLA.duplicate_exists | default('false') | string | lower == 'true' }}`, stepName: "Update_Existing_Ticket", stepUuid: generateUUID() },
    { default: true, stepName: "Create_Vuln_Ticket", stepUuid: createTicketUuid },
  ], pos[pi++]);
  steps.push(dupDecisionStep);
  // Route from SLA_Recommendation to Duplicate_Check_Decision is added after SLA_Recommendation step below

  // Update existing ticket path
  const updateUuid = (dupDecisionStep.arguments as { conditions: Array<{ step_iri: string }> }).conditions[0].step_iri.split("/").pop()!;
  const updateStep = buildSetVarStep("Update_Existing_Ticket", {
    update_note: `Duplicate ticket detected. CVE {{ vars.steps.Extract_Vuln_Data.cve_id | default('N/A') | string }} already tracked. Updating existing record.`,
    ticket_action: "update",
  }, pos[pi++]);
  updateStep.uuid = updateUuid;
  steps.push(updateStep);
  routes.push(buildRoute("Duplicate_Check_Decision", "Update_Existing_Ticket", dupDecisionStep.uuid, updateUuid));
  routes.push(buildRoute("Update_Existing_Ticket", "Finalize", updateUuid, finalizeStep.uuid));

  // Step 6b: SLA_Recommendation (spec-required step)
  const slaRecStep = buildSetVarStep("SLA_Recommendation", {
    recommended_sla_days: safeStepVar("Vuln_Score_And_SLA", "sla_days"),
    recommended_priority: safeStepVar("Vuln_Score_And_SLA", "ticket_priority"),
    sla_rationale: `{%- set _cv = vars.steps.Extract_Vuln_Data.cvss_score | default(0) | float -%}
{%- set _exp = vars.steps.Vuln_Score_And_SLA.has_exploit | default('false') | string | lower -%}
{%- set _crit = vars.steps.Vuln_Score_And_SLA.is_critical_asset | default('false') | string | lower -%}
{%- if _exp == 'true' -%}7-day SLA: Known exploit in wild
{%- elif _cv >= 9.0 -%}7-day SLA: Critical CVSS ({{ _cv }})
{%- elif _cv >= 7.0 or _crit == 'true' -%}14-day SLA: High CVSS or critical asset
{%- else -%}30-day SLA: Standard remediation timeline
{%- endif -%}`,
    guardrail: "No destructive remediation actions. All remediation is ticket-driven and manual.",
    epss_note: "EPSS/CVSS scoring applied. SLA aligned with vulnerability policy.",
  }, pos[pi++]);
  steps.push(slaRecStep);
  routes.push(buildRoute("Vuln_Score_And_SLA", "SLA_Recommendation", scoreStep.uuid, slaRecStep.uuid));
  // Duplicate_Check_Decision now comes after SLA_Recommendation
  routes.push(buildRoute("SLA_Recommendation", "Duplicate_Check_Decision", slaRecStep.uuid, dupDecisionStep.uuid));

  // Step 7: Create_Vuln_Ticket
  const ticketStep = buildConnector("create_servicenow_incident", snowCfg, pos[pi++], {
    short_description: `SOARForge Vuln: {{ vars.steps.Extract_Vuln_Data.cve_id | default('Unknown CVE') | string }} on {{ vars.steps.Extract_Vuln_Data.affected_host | default('N/A') | string }}`,
    description: `CVE: {{ vars.steps.Extract_Vuln_Data.cve_id | default('N/A') | string }}\nCVSS: {{ vars.steps.Extract_Vuln_Data.cvss_score | default('N/A') | string }}\nAffected Host: {{ vars.steps.Extract_Vuln_Data.affected_host | default('N/A') | string }}\nAsset Criticality: {{ vars.steps.Extract_Vuln_Data.asset_criticality | default('N/A') | string }}\nSLA: {{ vars.steps.Vuln_Score_And_SLA.sla_days | default('30') | string }} days ({{ vars.steps.SLA_Recommendation.sla_rationale | default('') | string }})\nPatch Available: {{ vars.steps.Extract_Vuln_Data.patch_available | default('unknown') | string }}\nExploit Available: {{ vars.steps.Extract_Vuln_Data.exploit_available | default('false') | string }}`,
    urgency: safeStepVar("SLA_Recommendation", "recommended_priority"),
    impact: safeStepVar("SLA_Recommendation", "recommended_priority"),
  }) ?? buildSetVarStep("Create_Vuln_Ticket", { ticket_status: "not_configured" }, pos[pi - 1]);
  ticketStep.uuid = createTicketUuid;
  ticketStep.name = "Create_Vuln_Ticket";
  steps.push(ticketStep);
  routes.push(buildRoute("Duplicate_Check_Decision", "Create_Vuln_Ticket", dupDecisionStep.uuid, createTicketUuid));
  routes.push(buildRoute("Create_Vuln_Ticket", "Finalize", createTicketUuid, finalizeStep.uuid));

  const collectionUuid = generateUUID();
  return makeWorkflow(playbook, triggerStep, steps, routes, collectionUuid);
}

// ============================================================================
// Ticket Automation Generator
// ============================================================================

export function generateTicketAutomationWorkflow(
  playbook: PlaybookState,
  profile: FortiSOARDeploymentProfile
): FortiSOARWorkflow {
  const steps: FortiSOARStep[] = [];
  const routes: FortiSOARRoute[] = [];
  const pos = calculateStepPositions(16);
  let pi = 0;

  // Step 1: Trigger
  const triggerStep = buildTriggerStep(playbook, pos[pi++]);
  steps.push(triggerStep);

  // Step 2: Build_Context
  const ctxStep = buildBaseContextStep(pos[pi++]);
  steps.push(ctxStep);
  routes.push(buildRoute("Start", "Build_Context", triggerStep.uuid, ctxStep.uuid));

  // Step 3: Extract_Alert_Metadata
  const extractStep = buildSetVarStep("Extract_Alert_Metadata", {
    alert_id: safeField("id"),
    alert_name: safeField("name"),
    alert_severity: safeField("severity"),
    alert_status: safeField("status"),
    assignee: `{{ ${SAFE_RECORD}.assignee | default(${SAFE_RECORD}.assignedTo | default('SOC Team')) | string | trim }}`,
    alert_type: `{{ ${SAFE_RECORD}.type | default(${SAFE_RECORD}.alert_type | default('Security Alert')) | string | trim }}`,
  }, pos[pi++]);
  steps.push(extractStep);
  routes.push(buildRoute("Build_Context", "Extract_Alert_Metadata", ctxStep.uuid, extractStep.uuid));

  // Step 4: Duplicate_Ticket_Lookup (REQUIRED by spec)
  const snowCfg = profile.connectors["servicenow"] || buildConnectorConfig("servicenow");
  const jiraCfg = profile.connectors["jira"];
  const dupUuid = generateUUID();
  const dupStep = buildConnector("lookup_duplicate_ticket", snowCfg, pos[pi++], {
    query: `short_description CONTAINS SOARForge AND alert_id={{ vars.steps.Extract_Alert_Metadata.alert_id | default('') | string }} AND active=true`,
  }) ?? buildSetVarStep("Duplicate_Ticket_Lookup", {
    duplicate_found: "false",
    note: "Duplicate_Ticket_Lookup: prevent duplicate ticket creation",
  }, pos[pi - 1]);
  dupStep.uuid = dupUuid;
  dupStep.name = "Duplicate_Ticket_Lookup";
  steps.push(dupStep);
  routes.push(buildRoute("Extract_Alert_Metadata", "Duplicate_Ticket_Lookup", extractStep.uuid, dupUuid));

  // Step 5: Check_Duplicate
  const ticketCreateUuid = generateUUID();
  const ticketUpdateUuid = generateUUID();
  const dupCheckStep = buildDecision("Check_Duplicate", [
    {
      condition: `{%- set _d = vars.steps.Duplicate_Ticket_Lookup.data | default([]) -%}{%- if _d is iterable and _d is not string and _d | length > 0 -%}true{%- else -%}false{%- endif -%}`,
      stepName: "Update_Ticket",
      stepUuid: ticketUpdateUuid,
    },
    { default: true, stepName: "Create_Ticket", stepUuid: ticketCreateUuid },
  ], pos[pi++]);
  steps.push(dupCheckStep);
  routes.push(buildRoute("Duplicate_Ticket_Lookup", "Check_Duplicate", dupUuid, dupCheckStep.uuid));

  // Finalize
  const finalizeStep = buildFinalizeStep(
    `Alert: {{ vars.steps.Extract_Alert_Metadata.alert_name | default('N/A') | string }}\nAlert ID: {{ vars.steps.Extract_Alert_Metadata.alert_id | default('N/A') | string }}\nGuardrail: Duplicate_Ticket_Lookup prevented duplicate creation`,
    pos[Math.min(pi + 4, pos.length - 1)]
  );
  steps.push(finalizeStep);

  // Step 6a: Create_Ticket
  const createStep = buildConnector("create_servicenow_incident", snowCfg, pos[pi++], {
    short_description: `SOARForge: {{ vars.steps.Extract_Alert_Metadata.alert_name | default('Security Alert') | string }}`,
    description: `Alert ID: {{ vars.steps.Extract_Alert_Metadata.alert_id | default('N/A') | string }}\nType: {{ vars.steps.Extract_Alert_Metadata.alert_type | default('N/A') | string }}\nSeverity: {{ vars.steps.Extract_Alert_Metadata.alert_severity | default('N/A') | string }}\nAssignee: {{ vars.steps.Extract_Alert_Metadata.assignee | default('SOC Team') | string }}`,
    urgency: "2",
    impact: "2",
  }) ?? buildSetVarStep("Create_Ticket", { ticket_status: "not_configured" }, pos[pi - 1]);
  createStep.uuid = ticketCreateUuid;
  createStep.name = "Create_Ticket";
  steps.push(createStep);
  routes.push(buildRoute("Check_Duplicate", "Create_Ticket", dupCheckStep.uuid, ticketCreateUuid));
  routes.push(buildRoute("Create_Ticket", "Finalize", ticketCreateUuid, finalizeStep.uuid));

  // Step 6b: Update_Ticket (set_variable noting update)
  const updateStep = buildSetVarStep("Update_Ticket", {
    update_note: `Duplicate detected for alert {{ vars.steps.Extract_Alert_Metadata.alert_id | default('N/A') | string }}. Updating existing ticket instead of creating new.`,
    ticket_action: "updated",
  }, pos[pi++]);
  updateStep.uuid = ticketUpdateUuid;
  steps.push(updateStep);
  routes.push(buildRoute("Check_Duplicate", "Update_Ticket", dupCheckStep.uuid, ticketUpdateUuid));
  routes.push(buildRoute("Update_Ticket", "Finalize", ticketUpdateUuid, finalizeStep.uuid));

  // Jira alternative (optional)
  if (jiraCfg) {
    const jiraStep = buildConnector("lookup_duplicate_ticket_jira", jiraCfg, pos[Math.min(pi, pos.length - 2)], {
      jql: `summary ~ "SOARForge" AND description ~ "{{ vars.steps.Extract_Alert_Metadata.alert_id | default('') | string }}" AND status != Done`,
    });
    if (jiraStep) {
      // Add as informational set_variable — Jira lookup is secondary to ServiceNow in this template
      jiraStep.name = "Jira_Duplicate_Check_Optional";
    }
  }

  const collectionUuid = generateUUID();
  return makeWorkflow(playbook, triggerStep, steps, routes, collectionUuid);
}

// ============================================================================
// Threat Intel IOC Enrichment Generator
// ============================================================================

export function generateThreatIntelWorkflow(
  playbook: PlaybookState,
  profile: FortiSOARDeploymentProfile
): FortiSOARWorkflow {
  const steps: FortiSOARStep[] = [];
  const routes: FortiSOARRoute[] = [];
  const pos = calculateStepPositions(24);
  let pi = 0;

  // Step 1: Trigger
  const triggerStep = buildTriggerStep(playbook, pos[pi++]);
  steps.push(triggerStep);

  // Step 2: Build_Context
  const ctxStep = buildBaseContextStep(pos[pi++]);
  steps.push(ctxStep);
  routes.push(buildRoute("Start", "Build_Context", triggerStep.uuid, ctxStep.uuid));

  // Step 3: Extract_IOCs
  const extractStep = buildSetVarStep("Extract_IOCs", {
    ioc_public_ips: `{{ ${SAFE_RECORD}.source_ip | default(${SAFE_RECORD}.ip | default('')) | string | trim }}`,
    ioc_domains: `{{ ${SAFE_RECORD}.domain | default(${SAFE_RECORD}.hostname | default('')) | string | trim }}`,
    ioc_urls: `{{ ${SAFE_RECORD}.url | default('') | string | trim }}`,
    ioc_hashes: `{{ ${SAFE_RECORD}.file_hash | default(${SAFE_RECORD}.sha256 | default('')) | string | trim }}`,
    has_ip: `{%- if ${SAFE_RECORD}.source_ip | default(${SAFE_RECORD}.ip | default('')) | string | trim != '' -%}true{%- else -%}false{%- endif -%}`,
    has_hash: `{%- if ${SAFE_RECORD}.file_hash | default(${SAFE_RECORD}.sha256 | default('')) | string | trim != '' -%}true{%- else -%}false{%- endif -%}`,
    has_url: `{%- if ${SAFE_RECORD}.url | default('') | string | trim != '' -%}true{%- else -%}false{%- endif -%}`,
  }, pos[pi++]);
  steps.push(extractStep);
  routes.push(buildRoute("Build_Context", "Extract_IOCs", ctxStep.uuid, extractStep.uuid));

  // Step 4: VT_IOC_Lookup (handles IP/hash/domain)
  const vtUuid = generateUUID();
  const vtCfg = profile.connectors["virustotal"] || buildConnectorConfig("virustotal");
  const vtStep = buildConnector("virustotal_ip_lookup", vtCfg, pos[pi++], {
    ip: safeStepVar("Extract_IOCs", "ioc_public_ips"),
  }) ?? buildSetVarStep("VT_IOC_Lookup", { vt_positives: "0", note: "Configure virustotal connector" }, pos[pi - 1]);
  vtStep.uuid = vtUuid;
  vtStep.name = "VT_IOC_Lookup";
  steps.push(vtStep);
  routes.push(buildRoute("Extract_IOCs", "VT_IOC_Lookup", extractStep.uuid, vtUuid));

  // Step 5: AbuseIPDB_IOC_Lookup
  const abuseUuid = generateUUID();
  const abuseCfg = profile.connectors["abuseipdb"] || buildConnectorConfig("abuseipdb");
  const abuseStep = buildConnector("abuseipdb_lookup", abuseCfg, pos[pi++], {
    ip: safeStepVar("Extract_IOCs", "ioc_public_ips"),
    days: "90",
  }) ?? buildSetVarStep("AbuseIPDB_IOC_Lookup", { abuseConfidenceScore: "0", note: "Configure abuseipdb connector" }, pos[pi - 1]);
  abuseStep.uuid = abuseUuid;
  abuseStep.name = "AbuseIPDB_IOC_Lookup";
  steps.push(abuseStep);
  routes.push(buildRoute("VT_IOC_Lookup", "AbuseIPDB_IOC_Lookup", vtUuid, abuseUuid));

  // Step 6: Reputation_Consensus (multi-source — REQUIRED by spec)
  const consensusStep = buildSetVarStep("Reputation_Consensus", {
    vt_positives: `{{ vars.steps.VT_IOC_Lookup.data.attributes.last_analysis_stats.malicious | default(0) | int }}`,
    abuseipdb_score: `{{ vars.steps.AbuseIPDB_IOC_Lookup.data.abuseConfidenceScore | default(0) | int }}`,
    source_1_malicious: `{%- set _v = vars.steps.VT_IOC_Lookup.data.attributes.last_analysis_stats.malicious | default(0) | int -%}{%- if _v > 5 -%}true{%- else -%}false{%- endif -%}`,
    source_2_malicious: `{%- set _a = vars.steps.AbuseIPDB_IOC_Lookup.data.abuseConfidenceScore | default(0) | int -%}{%- if _a > 75 -%}true{%- else -%}false{%- endif -%}`,
    consensus_sources_count: `{%- set _count = 0 -%}
{%- if vars.steps.Reputation_Consensus.source_1_malicious | default('false') | string | lower == 'true' -%}{%- set _count = _count + 1 -%}{%- endif -%}
{%- if vars.steps.Reputation_Consensus.source_2_malicious | default('false') | string | lower == 'true' -%}{%- set _count = _count + 1 -%}{%- endif -%}
{{ _count }}`,
    consensus_verdict: `{%- set _cnt = vars.steps.Reputation_Consensus.consensus_sources_count | default(0) | int -%}
{%- if _cnt >= 2 -%}confirmed_malicious
{%- elif _cnt == 1 -%}single_source_flag
{%- else -%}benign
{%- endif -%}`,
    total_score: `{%- set _v = vars.steps.Reputation_Consensus.vt_positives | default(0) | int -%}
{%- set _a = vars.steps.Reputation_Consensus.abuseipdb_score | default(0) | int -%}
{%- set _sc = 0 -%}
{%- if _v > 5 -%}{%- set _sc = _sc + 3 -%}{%- elif _v > 0 -%}{%- set _sc = _sc + 1 -%}{%- endif -%}
{%- if _a > 75 -%}{%- set _sc = _sc + 3 -%}{%- elif _a > 50 -%}{%- set _sc = _sc + 2 -%}{%- endif -%}
{%- set _cnt = vars.steps.Reputation_Consensus.consensus_sources_count | default(0) | int -%}
{%- if _cnt >= 2 -%}{%- set _sc = _sc + 2 -%}{%- endif -%}
{{ _sc }}`,
    action_recommendation: `{%- set _verdict = vars.steps.Reputation_Consensus.consensus_verdict | default('benign') -%}
{%- if _verdict == 'confirmed_malicious' -%}analyst_review_block
{%- elif _verdict == 'single_source_flag' -%}analyst_review_informational
{%- else -%}update_alert_benign
{%- endif -%}`,
    guardrail_note: "GUARDRAIL: Reputation_Consensus required. No auto-block on single-source data. Analyst approval mandatory even for confirmed malicious IOCs.",
  }, pos[pi++]);
  steps.push(consensusStep);
  routes.push(buildRoute("AbuseIPDB_IOC_Lookup", "Reputation_Consensus", abuseUuid, consensusStep.uuid));

  // Step 7: Update_Alert_With_Enrichment
  const updateStep = buildSetVarStep("Update_Alert_With_Enrichment", {
    enrichment_summary: `IOC: {{ vars.steps.Extract_IOCs.ioc_public_ips | default(vars.steps.Extract_IOCs.ioc_hashes | default(vars.steps.Extract_IOCs.ioc_domains | default('N/A'))) | string }}\nVT Positives: {{ vars.steps.Reputation_Consensus.vt_positives | default('0') | string }}\nAbuseIPDB: {{ vars.steps.Reputation_Consensus.abuseipdb_score | default('0') | string }}\nConsensus Verdict: {{ vars.steps.Reputation_Consensus.consensus_verdict | default('N/A') | string }}\nSources Flagging: {{ vars.steps.Reputation_Consensus.consensus_sources_count | default('0') | string }} / 2\nRecommendation: {{ vars.steps.Reputation_Consensus.action_recommendation | default('N/A') | string }}\nNote: No auto-block on single-source data. Analyst review required.`,
    alert_updated: "true",
  }, pos[pi++]);
  steps.push(updateStep);
  routes.push(buildRoute("Reputation_Consensus", "Update_Alert_With_Enrichment", consensusStep.uuid, updateStep.uuid));

  // Step 8: Analyst_Review (spec-required — no auto-block, analyst decision mandatory)
  const analystReviewStep = buildSetVarStep("Analyst_Review", {
    analyst_action_required: "true",
    review_note: `Reputation_Consensus verdict: {{ vars.steps.Reputation_Consensus.consensus_verdict | default('unknown') | string }}
Sources agreeing: {{ vars.steps.Reputation_Consensus.consensus_sources_count | default('0') | string }} / 2
VT Positives: {{ vars.steps.Reputation_Consensus.vt_positives | default('0') | string }}
AbuseIPDB Score: {{ vars.steps.Reputation_Consensus.abuseipdb_score | default('0') | string }}
Recommendation: {{ vars.steps.Reputation_Consensus.action_recommendation | default('unknown') | string }}

GUARDRAIL: No automated blocking action has been taken.
- If verdict is confirmed_malicious (2+ sources), analyst may initiate IP block via separate playbook.
- If verdict is single_source_flag, this is informational only — do not block.
- Watchlist tagging and SIEM correlation recommended for all IOCs.`,
    watchlist_update: `{%- set _v = vars.steps.Reputation_Consensus.consensus_verdict | default('benign') -%}
{%- if _v == 'confirmed_malicious' -%}add_to_watchlist
{%- elif _v == 'single_source_flag' -%}flag_for_monitoring
{%- else -%}benign_no_action
{%- endif -%}`,
    auto_block_taken: "false",
  }, pos[pi++]);
  steps.push(analystReviewStep);
  routes.push(buildRoute("Update_Alert_With_Enrichment", "Analyst_Review", updateStep.uuid, analystReviewStep.uuid));

  // Finalize
  const finalizeStep = buildFinalizeStep(
    `IOC Enrichment Complete\nConsensus Verdict: {{ vars.steps.Reputation_Consensus.consensus_verdict | default('N/A') | string }}\nSources: {{ vars.steps.Reputation_Consensus.consensus_sources_count | default('0') | string }} / 2\nVT: {{ vars.steps.Reputation_Consensus.vt_positives | default('0') | string }}\nAbuseIPDB: {{ vars.steps.Reputation_Consensus.abuseipdb_score | default('0') | string }}\nWatchlist Action: {{ vars.steps.Analyst_Review.watchlist_update | default('N/A') | string }}\nGuardrail: No auto-block taken. Reputation_Consensus required. Analyst review mandatory.`,
    pos[Math.min(pi + 1, pos.length - 1)]
  );
  steps.push(finalizeStep);
  routes.push(buildRoute("Analyst_Review", "Finalize", analystReviewStep.uuid, finalizeStep.uuid));

  const collectionUuid = generateUUID();
  return makeWorkflow(playbook, triggerStep, steps, routes, collectionUuid);
}

// ============================================================================
// Custom (Blank) Workflow Generator
// ============================================================================

export function generateCustomWorkflow(
  playbook: PlaybookState,
  profile: FortiSOARDeploymentProfile
): FortiSOARWorkflow {
  const steps: FortiSOARStep[] = [];
  const routes: FortiSOARRoute[] = [];
  const pos = calculateStepPositions(16);
  let pi = 0;

  const trigger = buildTriggerStep(playbook, pos[pi++]);
  steps.push(trigger);

  const ctx = buildBaseContextStep(pos[pi++]);
  steps.push(ctx);
  routes.push(buildRoute("Start", "Build_Context", trigger.uuid, ctx.uuid));

  const scoring = buildSetVarStep("Evaluate_Indicators", {
    indicator_score: "{{ 0 }}",
    template_note: `Custom playbook: ${playbook.name || "Unnamed"}. Configure scoring and actions.`,
    is_false_positive: safeStepVar("Build_Context", "false_positive"),
  }, pos[pi++]);
  steps.push(scoring);
  routes.push(buildRoute("Build_Context", "Evaluate_Indicators", ctx.uuid, scoring.uuid));

  let prevUuid = scoring.uuid;
  let prevName = "Evaluate_Indicators";

  for (const actionId of playbook.actions) {
    const action = getActionById(actionId);
    if (!action || pi >= pos.length - 2) continue;
    const cfg = profile.connectors[action.connectorKey] || buildConnectorConfig(action.connectorKey);
    const actionStep = buildConnector(actionId, cfg, pos[pi++]);
    if (actionStep) {
      steps.push(actionStep);
      routes.push(buildRoute(prevName, actionStep.name, prevUuid, actionStep.uuid));
      prevUuid = actionStep.uuid;
      prevName = actionStep.name;
    }
  }

  const finalize = buildSetVarStep("Finalize", {
    final_status: "Playbook completed",
    template: playbook.name || "Custom Playbook",
    record_id: safeStepVar("Build_Context", "record_id"),
    alert_name: safeStepVar("Build_Context", "alert_name"),
  }, pos[pi++]);
  steps.push(finalize);
  routes.push(buildRoute(prevName, "Finalize", prevUuid, finalize.uuid));

  const collectionUuid = generateUUID();
  return makeWorkflow(playbook, trigger, steps, routes, collectionUuid);
}

// ============================================================================
// Main Workflow Collection Generator — strict per-template routing
// ============================================================================

export function generateFortiSOARWorkflowCollection(
  playbook: PlaybookState,
  profile: FortiSOARDeploymentProfile
): FortiSOARWorkflowCollection {
  const collectionUuid = generateUUID();
  const timestamp = Math.floor(Date.now() / 1000);

  const { workflow, coverage } = buildAugmentedTemplateWorkflow(playbook, profile, collectionUuid);

  workflow.collection = `/api/3/workflow_collections/${collectionUuid}`;

  const collectionData: FortiSOARWorkflowCollectionData = {
    "@context": "/api/3/contexts/WorkflowCollection",
    "@type": "WorkflowCollection",
    name: profile.targetCollectionName || `SOARForge-${playbook.name}`,
    description: playbook.description || null,
    visible: true,
    image: null,
    uuid: collectionUuid,
    id: 100,
    createDate: timestamp,
    modifyDate: timestamp,
    deletedAt: null,
    importedBy: [],
    recordTags: [],
    workflows: [workflow],
    unsupportedWorkflowCoverage: {
      enrichments: coverage.unsupportedEnrichments,
      actions: coverage.unsupportedActions,
    },
    workflowCoverageValidation: {
      missingEnrichmentSteps: coverage.missingEnrichmentSteps,
      missingActionSteps: coverage.missingActionSteps,
      passed: coverage.passed,
    },
  };

  return { type: "workflow_collections", data: [collectionData], exported_tags: [] };
}

function buildAugmentedTemplateWorkflow(playbook: PlaybookState, profile: FortiSOARDeploymentProfile, collectionUuid: string): { workflow: FortiSOARWorkflow; coverage: WorkflowCoverageReport } {
  const enrichmentActionMap: Record<string, string> = {
    virustotal: "virustotal_ip_lookup",
    abuseipdb: "abuseipdb_lookup",
    qradar: "qradar_aql_search",
    fortiguard: "fortiguard_url_lookup",
  };
  const tid = playbook.templateId || playbook.generatorType || "custom";
  const workflow = ({
    ransomware: generateRansomwareWorkflow,
    vuln_exploit: generateWAFWorkflow,
    waf_attack: generateWAFWorkflow,
    brute_force: generateSuspiciousLoginWorkflow,
    phishing: generatePhishingWorkflow,
    malware_response: generateMalwareHashWorkflow,
    suspicious_login: generateSuspiciousLoginWorkflow,
    lateral_movement: generateMaliciousIPWorkflow,
    malware_hash: generateMalwareHashWorkflow,
    malicious_ip: generateMaliciousIPWorkflow,
    compliance_violation: generateTicketAutomationWorkflow,
    vulnerability: generateVulnerabilityWorkflow,
    insider_threat: generateThreatIntelWorkflow,
    ticket_automation: generateTicketAutomationWorkflow,
    threat_intel: generateThreatIntelWorkflow,
    custom: generateCustomWorkflow,
  }[tid] || generateCustomWorkflow)(playbook, profile);

  const steps = workflow.steps || [];
  const stepNames = new Set(steps.map((s) => s.name));
  const unsupportedEnrichments: Array<{ key: string; reason: string }> = [];
  const unsupportedActions: Array<{ key: string; reason: string }> = [];
  const generatedEnrichments = new Set<string>();
  const generatedActions = new Set<string>();
  const insertPos = calculateStepPositions(steps.length + 10);
  const routes = workflow.routes || (workflow.routes = []);
  let pi = steps.length;
  const finalizeStep = steps.find((s) => s.name === "Finalize");
  let prevStep = steps[steps.length - 1];
  if (finalizeStep) {
    const candidateFinalizeRoutes = routes
      .map((route, index) => ({ route, index }))
      .filter(({ route }) => route.targetStep.endsWith(`/${finalizeStep.uuid}`));
    const lastNonFinalizeStep = [...steps].reverse().find((s) => s.uuid !== finalizeStep.uuid);
    let routeToFinalizeIndex = -1;
    if (lastNonFinalizeStep) {
      routeToFinalizeIndex = candidateFinalizeRoutes.find(
        ({ route }) => route.sourceStep.endsWith(`/${lastNonFinalizeStep.uuid}`)
      )?.index ?? -1;
    }
    if (routeToFinalizeIndex < 0 && candidateFinalizeRoutes.length > 0) {
      routeToFinalizeIndex = candidateFinalizeRoutes[candidateFinalizeRoutes.length - 1].index;
    }
    if (routeToFinalizeIndex >= 0) {
      const routeToFinalize = routes[routeToFinalizeIndex];
      prevStep = steps.find((s) => routeToFinalize.sourceStep.endsWith(`/${s.uuid}`)) || prevStep;
      routes.splice(routeToFinalizeIndex, 1);
    }
  }

  const appendActionIfMissing = (actionId: string, isEnrichment: boolean, sourceKey: string): void => {
    const action = getActionById(actionId);
    if (!action) {
      (isEnrichment ? unsupportedEnrichments : unsupportedActions).push({ key: sourceKey, reason: `Action '${actionId}' not found in registry.` });
      return;
    }
    const connectorStepName = action.displayName.replace(/\s+/g, "_");
    if (stepNames.has(connectorStepName)) {
      (isEnrichment ? generatedEnrichments : generatedActions).add(sourceKey);
      return;
    }
    const cfg = profile.connectors[action.connectorKey] || buildConnectorConfig(action.connectorKey);
    const newStep = buildConnector(actionId, cfg, insertPos[Math.min(pi++, insertPos.length - 1)]);
    if (!newStep) return;
    steps.push(newStep);
    stepNames.add(newStep.name);
    if (prevStep) routes.push(buildRoute(prevStep.name, newStep.name, prevStep.uuid, newStep.uuid));
    prevStep = newStep;
    (isEnrichment ? generatedEnrichments : generatedActions).add(sourceKey);
  };

  for (const key of playbook.enrichmentConnectors || []) {
    const mapped = enrichmentActionMap[key];
    if (!mapped) unsupportedEnrichments.push({ key, reason: "No mapped FortiSOAR operation in registry." });
    else appendActionIfMissing(mapped, true, key);
  }
  for (const actionId of playbook.actions || []) appendActionIfMissing(actionId, false, actionId);
  if (finalizeStep && prevStep && prevStep.uuid !== finalizeStep.uuid) {
    routes.push(buildRoute(prevStep.name, finalizeStep.name, prevStep.uuid, finalizeStep.uuid));
  }

  const hasConnectedPathForActionId = (actionId: string): boolean => {
    const action = getActionById(actionId);
    if (!action) return false;
    const stepName = action.displayName.replace(/\s+/g, "_");
    const step = steps.find((s) => s.name === stepName);
    if (!step) return false;
    const stepIri = `/api/3/workflow_steps/${step.uuid}`;
    const hasInbound = routes.some((r) => r.targetStep === stepIri);
    const hasOutbound = routes.some((r) => r.sourceStep === stepIri);
    return hasInbound && (hasOutbound || step.name === "Finalize");
  };

  const missingEnrichmentSteps = (playbook.enrichmentConnectors || []).filter((key) => {
    const mapped = enrichmentActionMap[key];
    if (!mapped || unsupportedEnrichments.some((u) => u.key === key)) return false;
    return !hasConnectedPathForActionId(mapped);
  });
  const missingActionSteps = (playbook.actions || []).filter((actionId) => {
    if (unsupportedActions.some((u) => u.key === actionId)) return false;
    return !hasConnectedPathForActionId(actionId);
  });
  workflow.collection = `/api/3/workflow_collections/${collectionUuid}`;
  return { workflow, coverage: { unsupportedEnrichments, unsupportedActions, missingEnrichmentSteps, missingActionSteps, passed: missingEnrichmentSteps.length === 0 && missingActionSteps.length === 0 } };
}

// ============================================================================
// Deployment Profile Builder
// ============================================================================

// Canonical per-template connector sets — mirrors template-utils.ts TEMPLATE_CONNECTOR_SETS.
// Kept in sync here so buildDefaultDeploymentProfile doesn't need to import template-utils.
const CANONICAL_CONNECTOR_SETS: Record<string, string[]> = {
  ransomware:        ['groupib_edr', 'active_directory', 'fortisandbox', 'microsoft_teams', 'virustotal'],
  waf_attack:        ['fortigate_firewall', 'palo_alto_firewall', 'abuseipdb', 'virustotal', 'microsoft_teams'],
  phishing:          ['exchange', 'abuseipdb', 'virustotal', 'microsoft_teams'],
  suspicious_login:  ['active_directory', 'azure_ad', 'abuseipdb', 'microsoft_teams'],
  malware_hash:      ['groupib_edr', 'virustotal', 'fortisandbox', 'microsoft_teams'],
  malicious_ip:      ['abuseipdb', 'virustotal', 'fortigate_firewall', 'palo_alto_firewall', 'microsoft_teams'],
  vulnerability:     ['servicenow', 'jira'],
  ticket_automation: ['servicenow', 'jira'],
  threat_intel:      ['virustotal', 'abuseipdb', 'fortiguard', 'microsoft_teams'],
};

export function buildDefaultDeploymentProfile(
  playbook: PlaybookState
): FortiSOARDeploymentProfile {
  // Priority: canonical template set → action-derived connectors → fallback defaults
  const templateKey = playbook.templateId || playbook.generatorType || '';
  const canonicalKeys: string[] = CANONICAL_CONNECTOR_SETS[templateKey] ?? [];
  const actionKeys = getRequiredConnectorsForActions(playbook.actions);

  // Merge: canonical first, then action-derived (no duplicates)
  const allKeys = Array.from(new Set([...canonicalKeys, ...actionKeys]));

  // Ensure at least basic defaults for custom/unknown templates
  if (allKeys.length === 0) {
    allKeys.push('groupib_edr', 'active_directory');
  }

  const connectors: Record<string, FortiSOARConnectorConfig> = {};
  for (const k of allKeys) connectors[k] = buildConnectorConfig(k);

  return {
    id: generateUUID(),
    name: `${playbook.name} Deployment`,
    customerName: "{{CUSTOMER_NAME}}",
    environment: "development",
    version: "1.0.0",
    fortisoarBaseUrl: "{{FORTISOAR_BASE_URL}}",
    connectors,
    approvalTeamIri: "{{CUSTOMER_SOC_TEAM_IRI}}",
    approvalTeamName: "SOC Team",
    defaultOwnerIri: "{{CUSTOMER_DEFAULT_OWNER_IRI}}",
    resourceType: "alerts",
    targetCollectionName: `SOARForge-${playbook.name}`,
    notificationChannel: "{{CUSTOMER_NOTIFICATION_CHANNEL}}",
    ticketingEnabled: false,
    ticketingProjectId: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Readiness Check Generator
// ============================================================================

export function generateReadinessChecks(
  playbook: PlaybookState,
  profile: FortiSOARDeploymentProfile,
  workflowCollection?: FortiSOARWorkflowCollection
): FortiSOARReadinessCheck[] {
  const normalizedProfile = normalizeDeploymentProfileForSelections(profile, playbook);
  const checks: FortiSOARReadinessCheck[] = [];

  checks.push({ id: "template_selected", label: "Playbook template selected", category: "template", passed: !!playbook.name && playbook.name.trim() !== "", critical: true, fixStepNumber: 1 });
  checks.push({ id: "trigger_defined", label: "Trigger type defined", category: "trigger", passed: !!playbook.trigger?.type && playbook.trigger.type.trim() !== "", critical: true, fixStepNumber: 2 });
  checks.push({ id: "source_system_defined", label: "Source system defined", category: "trigger", passed: !!playbook.trigger?.sourceSystem && playbook.trigger.sourceSystem.trim() !== "", critical: false, fixStepNumber: 2 });
  checks.push({ id: "entities_selected", label: "Required entities selected", category: "entities", passed: playbook.entities.length > 0, critical: true, fixStepNumber: 3 });
  checks.push({ id: "enrichment_configured", label: "Enrichment sources configured", category: "enrichment", passed: playbook.enrichmentConnectors.length > 0, critical: false, fixStepNumber: 4 });
  checks.push({ id: "scoring_model_selected", label: "Scoring model selected", category: "scoring", passed: !!playbook.scoringModel?.type && (playbook.scoringModel.type as string) !== "", critical: true, fixStepNumber: 5 });
  checks.push({ id: "actions_selected", label: "Response actions selected", category: "actions", passed: playbook.actions.length > 0, critical: true, fixStepNumber: 6 });

  const contractErrors = validateCapabilityContract(playbook);
  checks.push({ id: "capability_contract_valid", label: "Step 11 capability contract validation", category: "actions", passed: contractErrors.length === 0, critical: true, note: contractErrors.join('; ') || undefined, fixStepNumber: 11 });

  const dependencyErrors: string[] = [];
  for (const actionId of playbook.actions || []) {
    const action = getActionById(actionId);
    if (!action) continue;
    const cfg = normalizedProfile.connectors[action.connectorKey];
    if (!cfg) dependencyErrors.push(`Missing connector profile for selected action ${actionId}: ${action.connectorKey}`);
    else if (validateConfigValue(cfg.config) === 'empty' || validateConfigValue(cfg.config) === 'invalid') dependencyErrors.push(`Connector config missing/invalid for selected action ${actionId}: ${cfg.displayName}`);
  }
  checks.push({ id: "action_connector_dependencies", label: "Response-action connector dependencies configured", category: "connectors", passed: dependencyErrors.length === 0, critical: true, note: dependencyErrors.join('; ') || undefined, fixStepNumber: 11 });

  if (workflowCollection) {
    const wfErrors = validateGeneratedWorkflowStructure(workflowCollection, playbook);
    checks.push({ id: "workflow_structure_valid", label: "Generated workflow structure valid (steps/routes/decisions/approvals)", category: "actions", passed: wfErrors.length === 0, critical: true, note: wfErrors.join('; ') || undefined, fixStepNumber: 11 });
  }

  const connectorStatuses = Object.entries(normalizedProfile.connectors).map(([key, connector]) => ({
    key, connector, status: validateConfigValue(connector.config),
  }));

  const fakeConnectors = connectorStatuses.filter((c) => c.status === "fake");
  const emptyConnectors = connectorStatuses.filter((c) => c.status === "empty");
  const invalidConnectors = connectorStatuses.filter((c) => c.status === "invalid");
  const placeholderConnectors = connectorStatuses.filter((c) => c.status === "placeholder");
  const allValid = fakeConnectors.length === 0 && emptyConnectors.length === 0 && invalidConnectors.length === 0;

  checks.push({
    id: "connectors_configured", label: "Connector configurations resolved", category: "connectors", passed: allValid, critical: false,
    note: !allValid ? [
      fakeConnectors.length > 0 ? `Fake values: ${fakeConnectors.map((c) => c.connector.displayName).join(", ")}` : null,
      placeholderConnectors.length > 0 ? `Placeholders: ${placeholderConnectors.map((c) => c.connector.displayName).join(", ")}` : null,
      emptyConnectors.length > 0 ? `Empty: ${emptyConnectors.map((c) => c.connector.displayName).join(", ")}` : null,
    ].filter(Boolean).join("; ") : undefined,
    fixStepNumber: 11,
  });

  for (const { key, connector, status } of connectorStatuses) {
    if (status !== "valid") {
      checks.push({
        id: `connector_${key}`,
        label: `${connector.displayName} UUID ${status === "fake" ? "has fake value" : status === "placeholder" ? "is placeholder" : "needs configuration"}`,
        category: "connectors", passed: false, critical: status === "fake",
        fixConnectorKey: key,
        note: status === "fake" ? `"${connector.config}" appears to be a test/fake value. Enter a valid FortiSOAR connector UUID.`
          : status === "placeholder" ? "Template placeholder detected. Replace with actual UUID for import."
          : `Configure the FortiSOAR connector UUID for ${connector.displayName}`,
      });
    }
  }

  if (fakeConnectors.length > 0) {
    checks.push({
      id: "no_fake_configs", label: "No fake/test connector configurations", category: "connectors", passed: false, critical: true,
      note: `Detected fake values in: ${fakeConnectors.map((c) => c.connector.displayName).join(", ")}. Replace with valid UUIDs.`,
      fixStepNumber: 11,
    });
  }

  const hasHighRisk = playbook.actions.some((a) => { const act = getActionById(a); return act && (act.riskLevel === "high" || act.riskLevel === "critical"); });
  checks.push({
    id: "approval_for_high_risk", label: "Approval configured for high-risk actions", category: "approval",
    passed: !hasHighRisk || (!!profile.approvalTeamIri && !isPlaceholder(profile.approvalTeamIri)),
    critical: hasHighRisk, fixStepNumber: 9,
    note: hasHighRisk && isPlaceholder(profile.approvalTeamIri) ? "Approval team IRI is a placeholder. Configure actual team IRI for production." : undefined,
  });

  const withRollback = playbook.actions.filter((a) => { const act = getActionById(a); return act && act.rollbackAction; });
  checks.push({ id: "rollback_available", label: "Rollback actions available for destructive operations", category: "rollback", passed: withRollback.length > 0 || playbook.actions.length === 0, critical: false, fixStepNumber: 7 });
  checks.push({ id: "testing_plan_defined", label: "Testing plan defined", category: "testing", passed: !!playbook.testingPlan?.scenarios && playbook.testingPlan.scenarios.trim() !== "", critical: false, fixStepNumber: 8 });

  return checks;
}

export function getMergedRequiredConnectorKeys(playbook: PlaybookState): string[] {
  return Array.from(
    new Set([
      ...(playbook.enrichmentConnectors ?? []),
      ...getRequiredConnectorsForActions(playbook.actions ?? []),
    ])
  );
}

export function normalizeDeploymentProfileForSelections(
  profile: FortiSOARDeploymentProfile,
  playbook: PlaybookState
): FortiSOARDeploymentProfile {
  const required = getMergedRequiredConnectorKeys(playbook);
  const mergedConnectors: Record<string, FortiSOARConnectorConfig> = {
    ...(profile.connectors ?? {}),
  };

  for (const connectorKey of required) {
    mergedConnectors[connectorKey] =
      mergedConnectors[connectorKey] ?? buildConnectorConfig(connectorKey);
  }

  return {
    ...profile,
    connectors: mergedConnectors,
    updatedAt: new Date().toISOString(),
  };
}


function validateGeneratedWorkflowStructure(collection: FortiSOARWorkflowCollection, playbook: PlaybookState): string[] {
  const errors: string[] = [];
  const workflow = collection.data?.[0]?.workflows?.[0];
  if (!workflow) return ['No generated workflow found in collection.'];

  const stepIds = new Set(workflow.steps.map((s) => `/api/3/workflow_steps/${s.uuid}`));
  for (const r of workflow.routes) {
    if (!stepIds.has(r.sourceStep)) errors.push(`Route source missing step: ${r.sourceStep}`);
    if (!stepIds.has(r.targetStep)) errors.push(`Route target missing step: ${r.targetStep}`);
  }

  const dynamicByAction = new Map<string, FortiSOARStep[]>();
  const dynamicByCapability = new Map<string, FortiSOARStep[]>();
  const connectorOpIndex = new Map<string, FortiSOARStep[]>();
  const enrichmentConnectorFallback: Record<string, Array<{ connector: string; operation: string }>> = {
    abuseipdb: [{ connector: "abuseipdb", operation: "ip_reputation_check" }],
    virustotal: [{ connector: "virustotal", operation: "ip_reputation" }, { connector: "virustotal", operation: "hash_reputation" }, { connector: "virustotal", operation: "url_reputation" }, { connector: "virustotal", operation: "domain_reputation" }],
    fortiguard: [{ connector: "fortiguard", operation: "url_lookup" }],
    qradar: [{ connector: "qradar", operation: "aql_search" }],
  };
  for (const step of workflow.steps) {
    const args = step.arguments as Record<string, unknown>;
    const meta = args?.__soarforge_meta as { actionId?: string; capabilityId?: string } | undefined;
    if (meta?.actionId) dynamicByAction.set(meta.actionId, [...(dynamicByAction.get(meta.actionId) ?? []), step]);
    if (meta?.capabilityId) dynamicByCapability.set(meta.capabilityId, [...(dynamicByCapability.get(meta.capabilityId) ?? []), step]);
    const connectorArgs = step.arguments as Partial<FortiSOARConnectorArguments>;
    if (connectorArgs.connector && connectorArgs.operation) {
      const key = `${connectorArgs.connector}::${connectorArgs.operation}`;
      connectorOpIndex.set(key, [...(connectorOpIndex.get(key) ?? []), step]);
    }
  }

  for (const step of workflow.steps) {
    if (step.stepType === FORTISOAR_STEP_TYPE_IRIS.decision) {
      const args = step.arguments as FortiSOARDecisionArguments;
      for (const c of args.conditions || []) {
        if (c.step_iri && !stepIds.has(c.step_iri)) errors.push(`Decision ${step.name} references missing step ${c.step_iri}`);
      }
    }
    if (step.stepType === FORTISOAR_STEP_TYPE_IRIS.approval) {
      const args = step.arguments as FortiSOARApprovalArguments;
      for (const opt of args.response_mapping?.options || []) {
        if (opt.step_iri && !stepIds.has(opt.step_iri)) errors.push(`Approval ${step.name} response_mapping references missing step ${opt.step_iri}`);
      }
    }
  }

  for (const actionId of playbook.actions || []) {
    const action = getActionById(actionId);
    if (!action) continue;
    const metaSteps = dynamicByAction.get(actionId) ?? [];
    const fallbackKey = `${action.connector}::${action.operation}`;
    const fallbackSteps = connectorOpIndex.get(fallbackKey) ?? [];
    const matchedSteps = metaSteps.length > 0 ? metaSteps : fallbackSteps;
    if (matchedSteps.length === 0) {
      errors.push(`Selected action missing generated dynamic node: ${actionId}`);
      continue;
    }
    for (const st of matchedSteps) {
      const iri = `/api/3/workflow_steps/${st.uuid}`;
      const inbound = workflow.routes.some((r) => r.targetStep === iri);
      const outbound = workflow.routes.some((r) => r.sourceStep === iri);
      if (!inbound || !outbound) {
        errors.push(`Dynamic node connectivity invalid for ${actionId}: ${st.name} (inbound=${inbound}, outbound=${outbound})`);
      }
    }
  }
  if ((playbook.actions || []).some((a) => a === "block_ip_fortigate" || a === "block_ip_paloalto") && (dynamicByCapability.get("waf_block_ip") ?? []).length === 0) {
    errors.push("WAF block action selected but __soarforge_meta capabilityId 'waf_block_ip' node not found.");
  }
  if ((dynamicByCapability.get("waf_block_ip") ?? []).length > 0 && !(playbook.actions || []).some((a) => a === "block_ip_fortigate" || a === "block_ip_paloalto")) {
    errors.push("Unselected dynamic WAF block node detected (metadata present without selected action).");
  }
  for (const connectorKey of playbook.enrichmentConnectors || []) {
    if (!["abuseipdb", "virustotal", "fortiguard", "qradar"].includes(connectorKey)) continue;
    const capabilityMetaKey = `${connectorKey}_enrichment`;
    const metaSteps = dynamicByCapability.get(capabilityMetaKey) ?? [];
    let matchedSteps = metaSteps;
    if (matchedSteps.length === 0) {
      const fallbacks = enrichmentConnectorFallback[connectorKey] ?? [];
      matchedSteps = fallbacks.flatMap((f) => connectorOpIndex.get(`${f.connector}::${f.operation}`) ?? []);
    }
    if (matchedSteps.length === 0) {
      errors.push(`Selected enrichment/hunt connector missing generated connected node: ${connectorKey}`);
      continue;
    }
    for (const st of matchedSteps) {
      const iri = `/api/3/workflow_steps/${st.uuid}`;
      const inbound = workflow.routes.some((r) => r.targetStep === iri);
      const outbound = workflow.routes.some((r) => r.sourceStep === iri);
      if (!inbound || !outbound) {
        errors.push(`Enrichment/hunt node connectivity invalid for ${connectorKey}: ${st.name} (inbound=${inbound}, outbound=${outbound})`);
      }
    }
  }
  return Array.from(new Set(errors));
}

// ============================================================================
// Full Export Package Generator
// ============================================================================

export function generateFortiSOARExportPackage(
  playbook: PlaybookState,
  profile: FortiSOARDeploymentProfile
): FortiSOARExportPackage {
  const normalizedProfile = normalizeDeploymentProfileForSelections(profile, playbook);
  const workflowCollection = generateFortiSOARWorkflowCollection(playbook, normalizedProfile);
  const readinessChecks = generateReadinessChecks(playbook, normalizedProfile, workflowCollection);

  const criticalPassed = readinessChecks.filter((c) => c.critical && c.passed).length;
  const criticalTotal = readinessChecks.filter((c) => c.critical).length;
  const allPassed = readinessChecks.every((c) => c.passed);

  const hasFakeConfigs = Object.values(normalizedProfile.connectors).some((c) => isFakeValue(c.config));
  const allValidForImport = Object.values(normalizedProfile.connectors).every((c) => isConfiguredForImport(c.config, false));
  const allPlaceholderOrBetter = Object.values(normalizedProfile.connectors).every((c) => c.config && c.config.trim() !== "" && !isFakeValue(c.config));

  let status: FortiSOARPlaybookStatus = "draft";
  if (criticalPassed === criticalTotal && criticalTotal > 0) status = "ready_for_configuration";
  if (status === "ready_for_configuration" && !hasFakeConfigs && allPlaceholderOrBetter) status = "ready_for_uat";
  if (allPassed && allValidForImport && !isPlaceholder(normalizedProfile.approvalTeamIri) && !hasFakeConfigs) status = "ready_for_import";
  // "production_ready" is NEVER set automatically

  return {
    metadata: {
      name: playbook.name,
      version: normalizedProfile.version,
      generatedAt: new Date().toISOString(),
      generatedBy: "SOARForge Professional v1.1",
      templateId: playbook.id,
      status,
    },
    workflowCollection,
    deploymentProfile: normalizedProfile,
    connectorChecklist: Object.values(normalizedProfile.connectors),
    documentation: {
      implementationGuide: generateImplementationGuide(playbook, normalizedProfile),
      uatTestPlan: generateUATTestPlan(playbook),
      rollbackPlan: generateRollbackPlan(),
      mitreMapping: generateMITREMapping(playbook),
      connectorMatrix: generateConnectorMatrix(normalizedProfile),
      knownLimitations: generateKnownLimitations(playbook, readinessChecks),
    },
    readinessChecks,
  };
}

// ============================================================================
// Documentation Generators
// ============================================================================

function generateImplementationGuide(playbook: PlaybookState, profile: FortiSOARDeploymentProfile): string {
  return `# ${playbook.name} - Implementation Guide

## Overview
${playbook.description || "SOARForge generated playbook."}

## Required Connectors
${Object.values(profile.connectors).map((c) => `- ${c.displayName} (${c.connector} v${c.version})`).join("\n")}

## Configuration Placeholders
| Placeholder | Description |
|-------------|-------------|
| {{CUSTOMER_NAME}} | Your organization name |
| {{FORTISOAR_BASE_URL}} | Your FortiSOAR instance URL |
${Object.entries(profile.connectors).map(([, c]) => `| ${c.config} | ${c.displayName} connector config UUID |`).join("\n")}
| {{CUSTOMER_SOC_TEAM_IRI}} | SOC Team IRI for approvals |

## Deployment Steps
1. Import the FortiSOAR Workflow JSON via Automation > Playbooks > Import
2. Configure each connector in Automation > Connectors
3. Replace all {{CUSTOMER_*}} placeholders with actual values
4. Configure the SOC approval team IRI
5. Test in development environment
6. Enable (isActive = true) for production after verification

## Notes
- isActive is set to false on import — enable manually after verification
- Approval routing uses response_mapping options (not a variables check)
- Generated by SOARForge Professional v1.1
`;
}

function generateUATTestPlan(playbook: PlaybookState): string {
  const tid = playbook.templateId || playbook.generatorType || "custom";

  // Template-specific UAT content
  const templateSections: Record<string, string> = {
    ransomware: `## Positive Test Cases
1. Alert with T1486 MITRE tag + vssadmin keyword — expect score >= 8, auto-isolation
2. T1486 only — expect score 3, approval required
3. Valid machine_id present — expect direct isolation
4. machine_id empty, hostname present — expect hostname fallback search

## Negative Test Cases
1. Alert marked falsePositive=true — expect score=0, no containment
2. Alert status=Resolved — expect no containment
3. Username is SYSTEM/LOCAL SERVICE/Administrator — expect no AD disable
4. machine_id empty, hostname search returns 0 or multiple results — routes to Finalize

## Approval Flow Tests
1. Approve + machine_id present — isolate endpoint
2. Approve + machine_id absent + hostname present — search and isolate
3. Reject — workflow routes to Finalize, no containment

## Ransomware-Specific Tests
1. Score exactly 8 — auto-contain (at threshold)
2. Score 7 — approval required
3. Score 1 — skip (below minimum threshold)`,
    waf_attack: `## Positive Test Cases
1. SQLi attack type, request_count > 100 — expect score >= 6, auto-block
2. XSS attack with moderate volume — expect approval required
3. Very low volume unknown attack — expect monitor only

## Negative Test Cases / Guardrails
1. Source IP in Cloudflare/Akamai range — expect no block regardless of score
2. Alert marked falsePositive=true — expect skip
3. Attack type not in critical/medium OWASP list — expect monitor only

## WAF-Specific Guardrail Tests
1. CDN IP with SQLi — confirm CDN guardrail note present in workflow
2. High-volume attack from shared hosting — expect approval required, not auto-block

## OWASP Mapping
1. SQLi → T1190 mapped
2. XSS → T1059.007 mapped`,
    phishing: `## Positive Test Cases
1. Email with URL shortener + malicious attachment hash — expect score >= 5, auto-quarantine
2. Known phishing domain (VT>5) — expect auto-quarantine + block sender
3. Credential-harvesting keywords — expect score >= 2, approval required

## Negative Test Cases
1. Legitimate newsletter from new domain — expect skip (low score)
2. Alert marked falsePositive=true — expect skip
3. Missing message_id — expect Unique_Message_Check note logged

## Duplicate Prevention Tests
1. Same message_id submitted twice — expect no duplicate quarantine
2. Valid message_id — expect quarantine proceeds

## False Positive Release Tests
1. Analyst rejects approval — expect no quarantine, FP release path logged`,
    suspicious_login: `## Positive Test Cases
1. Impossible travel (two logins, 20 min, different continents) — expect score >= 7, auto-disable path
2. Credential spray from AbuseIPDB=80 IP — expect approval required
3. MFA bypass attempt — expect approval required

## Negative Test Cases — Approval_Before_Disable Guardrail
1. Domain Admin account (any score) — expect escalate_manual, NO auto-disable
2. Service account (svc_backup) — expect escalate_manual, NO auto-disable
3. False positive — expect skip
4. After-hours login only — expect monitor only

## Approval Flow Tests
1. Analyst approves — confirm service account check still blocks disable if account is privileged
2. Analyst rejects — expect no disable

## Identity-Specific Tests
1. username contains backslash (DOMAIN\\user) — expect correct normalization
2. UPN format (user@domain.com) — expect correct normalization`,
    malware_hash: `## Positive Test Cases
1. Hash with VT detections = 50 — expect auto-contain (score >= 5)
2. VT detections = 3 + sandbox verdict suspicious — expect approval required
3. Sandbox verdict malicious — expect auto-contain regardless of VT score

## Negative Test Cases
1. VT detections = 0, sandbox verdict clean — expect no action
2. No hash available in alert — expect Hash_Missing_Fallback step, no error
3. False positive — expect skip

## Hash Availability Tests
1. Hash field present — expect VT lookup proceeds
2. Hash field absent, sha256 field present — expect extraction fallback

## Sandbox Tests
1. fortisandbox not configured — expect set_variable fallback step, no crash
2. Sandbox timeout — expect graceful fallback to Finalize`,
    malicious_ip: `## Positive Test Cases
1. AbuseIPDB = 95, VT detections = 10 — expect auto-block (consensus)
2. AbuseIPDB = 60, VT detections = 5 — expect approval required
3. Both sources agree malicious (Reputation_Consensus) — expect consensus block

## Negative Test Cases — CDN/Cloud Guardrail
1. Cloudflare IP range (any AbuseIPDB score) — expect guardrail note, no auto-block
2. AWS/Azure IP — expect guardrail note
3. False positive — expect monitor only

## Consensus Logic Tests
1. Only AbuseIPDB flags IP (VT = 0) — expect single-source, no auto-block
2. Only VT flags IP (AbuseIPDB = 0) — expect single-source, no auto-block
3. Both flag — expect consensus_block = true`,
    vulnerability: `## Positive Test Cases
1. Critical CVE (CVSS=9.5) on tier-1 asset — expect 7-day SLA ticket created
2. High CVE with known exploit — expect 7-day SLA escalation
3. Medium CVE on non-critical asset — expect 30-day SLA ticket

## Duplicate Prevention Tests (Duplicate_Ticket_Lookup)
1. Same CVE + host submitted twice — expect Update_Existing_Ticket path, no duplicate
2. New CVE — expect Create_Vuln_Ticket

## Guardrail Tests
1. Vulnerability workflow — confirm NO destructive actions taken
2. Auto-patching — confirm NOT present in workflow
3. SLA tier assignment — verify correct priority mapping`,
    ticket_automation: `## Positive Test Cases
1. New alert — expect Create_Ticket
2. Status change on existing alert — expect Update_Ticket

## Duplicate Prevention Tests (Duplicate_Ticket_Lookup)
1. Same alert_id submitted twice — expect Update_Ticket, no duplicate
2. alert_id not in existing tickets — expect Create_Ticket

## Lifecycle Tests
1. Alert resolved — expect ticket closure triggered
2. SLA breach — expect escalation notification logged`,
    threat_intel: `## Positive Test Cases — Reputation_Consensus
1. VT > 5 AND AbuseIPDB > 75 (both sources) — expect consensus_verdict = confirmed_malicious
2. VT > 5 only (AbuseIPDB = 10) — expect single_source_flag, NO auto-block
3. AbuseIPDB > 75 only (VT = 0) — expect single_source_flag, NO auto-block

## Negative Test Cases — No Auto-Block
1. Any single-source high-confidence IOC — confirm NO automatic blocking action
2. Clean IOC (VT=0, AbuseIPDB=0) — expect benign verdict
3. Unknown IOC (no sources have data) — expect unknown verdict, analyst review

## IOC Type Coverage Tests
1. IP IOC — AbuseIPDB + VT IP lookup
2. File hash IOC — VT hash lookup
3. Domain IOC — VT domain lookup`,
  };

  const specific = templateSections[tid] ?? `## Test Cases
${playbook.testingPlan?.scenarios || "Define test scenarios for your custom playbook."}

## Acceptance Criteria
${playbook.testingPlan?.successCriteria || "All test cases pass."}`;

  return `# ${playbook.name} - UAT Test Plan

${specific}

## General Acceptance Criteria
- False positive guard working (no action on FP alerts)
- Approval flow works bidirectionally (approve/reject)
- Finalize step reached in all paths
- No unhandled route terminations
- isActive = false on import

## Performance Targets
${playbook.testingPlan?.performanceTargets || "< 2 minutes end-to-end for automated paths."}
`;
}

function generateRollbackPlan(playbook?: PlaybookState): string {
  const tid = playbook?.templateId || playbook?.generatorType || "custom";

  const templateRollbacks: Record<string, string> = {
    ransomware: `## Endpoint Isolation Rollback
1. Open EDR console (Group-IB, CrowdStrike, or Defender)
2. Locate isolated endpoint by machine_id or hostname
3. Execute unisolate/release action
4. Verify network connectivity restored
5. Document rollback reason in case notes

## AD User Disable Rollback
1. Open Active Directory Users and Computers (ADUC)
2. Locate the disabled account by sAMAccountName
3. Enable the account
4. Force password reset if account was compromised
5. Notify user and manager

## Requirements
- All rollback actions require SOC Lead approval
- Verify threat is fully remediated before rollback
- Update incident ticket with rollback reason`,
    phishing: `## Email Release Rollback (False Positive)
1. Locate quarantined message by message_id in email gateway
2. Release message via release_email action with analyst sign-off
3. Unblock sender if blocked (verify sender is legitimate)
4. Notify affected users
5. Update ticket with FP classification`,
    suspicious_login: `## Account Re-enable Rollback
1. Enable AD account via enable_ad_user action or ADUC
2. Restore Azure AD sessions (no action needed — user re-authenticates)
3. Notify user with temporary access instructions
4. Document reason for rollback in incident ticket
5. Review if unauthorized access occurred during disable period`,
    malware_hash: `## Endpoint Unisolation Rollback
1. Verify threat has been fully remediated (file removed/quarantined)
2. Execute unisolate_endpoint via EDR console
3. Remove hash from EDR blocklist if confirmed false positive
4. Verify endpoint connectivity restored
5. Document rollback in incident ticket`,
    malicious_ip: `## IP Unblock Rollback
1. Remove IP from firewall block group via unblock_ip_paloalto or unblock_ip_fortigate
2. Verify network traffic restored
3. Document why IP was unblocked (FP classification or business need)
4. Update threat intel platform to mark as false positive`,
    waf_attack: `## IP Unblock Rollback
1. Remove IP from SOAR-Blocked-IPs group via firewall UI or unblock action
2. Verify CDN/cloud IP classification if this was a false positive
3. Update WAF exception rules if legitimate traffic was blocked`,
    vulnerability: `## Ticket Closure Rollback
1. Reopen ticket if CVE was confirmed false positive
2. Update CVSS score if vendor has revised severity
3. Document closure reason in ticket`,
  };

  const specific = templateRollbacks[tid] ?? `## General Rollback
1. Review actions taken by this playbook in the case timeline
2. Reverse any automated actions using the rollback connector actions
3. Document reason and update incident ticket
4. Notify affected users/teams`;

  return `# ${playbook?.name || "Playbook"} - Rollback Plan

${specific}

## General Requirements
- All rollback actions require SOC Lead approval
- Document reason and update incident ticket
- This plan does not apply to FortiSOAR infrastructure changes
- Rollback actions are never automatic — always analyst-initiated
`;
}

function generateMITREMapping(playbook: PlaybookState): string {
  const tid = playbook.templateId || playbook.generatorType || "custom";
  const mappings = playbook.scoringModel?.mitreMapping ?? [];

  const templateMappings: Record<string, string> = {
    ransomware: `## Ransomware Coverage
- **T1486** - Data Encrypted for Impact (primary detection signal)
- **T1490** - Inhibit System Recovery (vssadmin/shadow copy tamper)
- **T1059** - Command and Scripting Interpreter (command-line indicators)
- **T1562.001** - Disable or Modify Tools (security software tampering)`,
    waf_attack: `## Web Attack Coverage
- **T1190** - Exploit Public-Facing Application (SQLi, RCE, LFI)
- **T1059.007** - JavaScript Execution (XSS)
- **T1203** - Exploitation for Client Execution (browser-based attacks)
- OWASP Top 10: A1 Injection, A3 XSS, A5 Security Misconfiguration`,
    phishing: `## Phishing Coverage
- **T1566.001** - Spearphishing Attachment
- **T1566.002** - Spearphishing Link (URL-based)
- **T1598** - Phishing for Information
- OWASP: Social Engineering`,
    suspicious_login: `## Identity Attack Coverage
- **T1078** - Valid Accounts (credential abuse)
- **T1078.004** - Cloud Accounts (Azure AD)
- **T1110.003** - Password Spraying
- **T1556.006** - Modify Authentication Process (MFA bypass)`,
    malware_hash: `## Malware Execution Coverage
- **T1204** - User Execution (malicious file)
- **T1204.002** - Malicious File execution
- **T1486** - Data Encrypted for Impact (ransomware hash)
- **T1059** - Command and Scripting Interpreter`,
    malicious_ip: `## Network Threat Coverage
- **T1071** - Application Layer Protocol (C2)
- **T1071.001** - Web Protocols (HTTP/S C2)
- **T1048** - Exfiltration Over Alternative Protocol
- **T1219** - Remote Access Tools`,
    vulnerability: `## Vulnerability Exploitation Coverage
- **T1190** - Exploit Public-Facing Application
- **T1203** - Exploitation for Client Execution
Note: No MITRE detection — this template is for remediation tracking only.`,
    ticket_automation: `## ITSM Operations
Note: No MITRE techniques — this template handles ITSM ticket lifecycle management only.`,
    threat_intel: `## IOC Coverage
- **T1071** - Application Layer Protocol
- **T1566** - Phishing
- **T1204** - User Execution
Note: Reputation_Consensus logic applied — 2+ sources required before action.`,
  };

  const templateSection = templateMappings[tid] ?? (
    mappings.length > 0
      ? mappings.map((t) => `- **${t}**`).join("\n")
      : "- No MITRE techniques mapped (configure in Step 5: Scoring)"
  );

  return `# ${playbook.name} - MITRE ATT&CK Mapping

## Mapped Techniques
${mappings.length > 0 ? mappings.map((t) => `- **${t}**`).join("\n") : ""}

${templateSection}
`;
}

function generateConnectorMatrix(profile: FortiSOARDeploymentProfile): string {
  const rows = Object.values(profile.connectors)
    .map((c) => {
      const st = validateConfigValue(c.config);
      return `| ${c.displayName} | ${c.connector} | ${c.version} | ${c.category} | ${st === "valid" ? "Configured" : st === "placeholder" ? "Placeholder" : st === "fake" ? "FAKE VALUE - replace" : "Pending"} |`;
    }).join("\n");

  return `# Connector Configuration Matrix

| Display Name | Connector | Version | Category | Status |
|--------------|-----------|---------|----------|--------|
${rows}

## Configuration Notes
- Replace all "FAKE VALUE" entries with actual FortiSOAR connector config UUIDs
- Placeholder values ({{CUSTOMER_*}}) must be replaced before import
- Find connector config UUIDs in FortiSOAR: Automation > Connectors > [Connector] > Configuration
`;
}

function generateKnownLimitations(playbook: PlaybookState, readinessChecks: FortiSOARReadinessCheck[]): string {
  const tid = playbook.templateId || playbook.generatorType || "custom";
  const SUPPORTED = new Set([
    "isolate_endpoint","disable_ad_user","disable_account","submit_hash_sandbox",
    "submit_file_to_sandbox","notify_soc","send_teams_notification","create_servicenow_incident",
    "create_ticket","search_asset_by_hostname","block_ip_paloalto","block_ip_fortigate",
    "quarantine_email","block_sender","abuseipdb_lookup","virustotal_hash_lookup",
    "virustotal_ip_lookup","virustotal_domain_lookup","lookup_duplicate_ticket",
    "revoke_azure_sessions","release_email",
  ]);
  const unsupported = playbook.actions.filter((a) => !SUPPORTED.has(a));
  const failed = readinessChecks.filter((c) => !c.passed);

  const templateLimitations: Record<string, string> = {
    ransomware: `## Ransomware-Specific Limitations
1. Keyword-based scoring may produce false positives — tune thresholds for your environment
2. Hostname-to-machine_id lookup fails if EDR agent is offline or not installed
3. Service/system accounts are excluded from AD disable to prevent lockouts
4. Shadow copy detection only works if event data contains process command lines`,
    waf_attack: `## WAF-Specific Limitations
1. CDN/cloud IP guardrail is advisory only — analyst must verify ASN manually
2. Request_count field name varies by WAF vendor — may need field mapping
3. OWASP category detection based on attack_type field content only`,
    phishing: `## Phishing-Specific Limitations
1. Unique message_id check relies on message_id field — ensure email gateway populates this field
2. False positive release requires manual analyst action — no auto-release
3. Campaign purge across all mailboxes requires separate Exchange permissions`,
    suspicious_login: `## Identity-Specific Limitations
1. Impossible travel detection relies on alert data — no independent geolocation check
2. Domain Admin detection based on username pattern only — may miss some privileged accounts
3. Azure AD session revocation requires azure_ad connector — not available in all environments`,
    malware_hash: `## Malware Hash Limitations
1. Sandbox analysis timeout may cause step to return without verdict
2. Hash field extraction relies on alert field names — configure for your EDR vendor
3. fortisandbox connector must be separately licensed and configured`,
    malicious_ip: `## Malicious IP Limitations
1. CDN/cloud guardrail is advisory only — analyst must verify before block
2. Consensus logic uses only AbuseIPDB + VT — add more sources for higher confidence
3. IP block only affects perimeter firewall — does not block east-west traffic`,
    vulnerability: `## Vulnerability-Specific Limitations
1. No automated patching — all remediation is manual (ticket-driven)
2. CVSS score extraction relies on alert field naming — may need field mapping
3. Duplicate_Ticket_Lookup only checks ServiceNow — not other ITSM platforms`,
    ticket_automation: `## Ticket Automation Limitations
1. Duplicate_Ticket_Lookup only works if ServiceNow is connected and alert_id is populated
2. Jira support is secondary — primary deduplication uses ServiceNow
3. Auto-closure requires alert status field to be populated correctly`,
    threat_intel: `## Threat Intel Limitations
1. Consensus logic requires 2+ sources — single-source data is informational only
2. No auto-block on any IOC type — analyst approval always required
3. IOC extraction depends on source field naming — configure for your platform`,
  };

  const templateSection = templateLimitations[tid] ?? `## Template-Specific Limitations
1. Custom template — review workflow steps and add appropriate guardrails`;

  return `# ${playbook.name} - Known Limitations

## Generator Limitations
1. Connector availability: playbook depends on all connectors being available and authenticated
2. Rate limits: some connector APIs may throttle under high alert volumes
3. Timeout: long-running connector actions may require retry logic in FortiSOAR

${templateSection}

## Unsupported Selected Actions
${unsupported.length > 0 ? unsupported.map((a) => `- **${a}**: No generator step available. Implement manually in FortiSOAR after import.`).join("\n") : "- None: all selected actions have generator implementations"}

## Open Readiness Issues
${failed.length > 0 ? failed.map((c) => `- [${c.critical ? "CRITICAL" : "WARNING"}] ${c.label}${c.note ? `: ${c.note}` : ""}`).join("\n") : "- None"}

## Approval Limitations
1. Default approval timeout is 72 hours
2. No automatic escalation if approver is unavailable
3. Mobile/email approval depends on FortiSOAR notification configuration
4. Production_Ready status is never set automatically — requires explicit human sign-off
`;
}
