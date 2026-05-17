// ============================================================
// SOARForge — Build Normalized Playbook from PlaybookState
// ============================================================

import type { PlaybookState } from '../soar-types';
import type { SoarPlatformId } from '../soar-platforms';
import type {
  NormalizedPlaybook,
  NormalizedStep,
  NormalizedRoute,
  NormalizedTrigger,
  NormalizedEntity,
  NormalizedArtifact,
  NormalizedConnectorRequirement,
  NormalizedScoringModel,
  NormalizedApproval,
} from './normalized-types';

// ── Deterministic ID from step name ────────────────────────
function stepId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

// ── Canonical action mapping from legacy PlaybookState action IDs ──
interface ActionDescriptor {
  normalizedAction: string;
  displayName: string;
  category: string;
  isDestructive: boolean;
  approvalRequired: boolean;
  rollbackSupported: boolean;
  requiredInputs: string[];
  expectedOutputs: string[];
}

const ACTION_CANONICAL_MAP: Record<string, ActionDescriptor> = {
  isolate_endpoint: {
    normalizedAction: 'edr.device.isolate',
    displayName: 'Isolate Endpoint',
    category: 'edr',
    isDestructive: true,
    approvalRequired: true,
    rollbackSupported: true,
    requiredInputs: ['machine_id', 'hostname', 'endpoint_id'],
    expectedOutputs: ['isolation_status', 'device_id'],
  },
  disable_account: {
    normalizedAction: 'iam.user.disable',
    displayName: 'Disable User Account',
    category: 'identity',
    isDestructive: true,
    approvalRequired: true,
    rollbackSupported: true,
    requiredInputs: ['username', 'samAccountName'],
    expectedOutputs: ['disable_status', 'user_id'],
  },
  disable_ad_user: {
    normalizedAction: 'iam.user.disable',
    displayName: 'Disable AD User',
    category: 'identity',
    isDestructive: true,
    approvalRequired: true,
    rollbackSupported: true,
    requiredInputs: ['username', 'samAccountName', 'userPrincipalName'],
    expectedOutputs: ['disable_status', 'user_id'],
  },
  revoke_sessions: {
    normalizedAction: 'iam.session.revoke',
    displayName: 'Revoke User Sessions',
    category: 'identity',
    isDestructive: true,
    approvalRequired: false,
    rollbackSupported: false,
    requiredInputs: ['username', 'userPrincipalName'],
    expectedOutputs: ['revoke_status'],
  },
  reset_mfa: {
    normalizedAction: 'iam.mfa.reset',
    displayName: 'Reset MFA',
    category: 'identity',
    isDestructive: false,
    approvalRequired: false,
    rollbackSupported: false,
    requiredInputs: ['username', 'userPrincipalName'],
    expectedOutputs: ['mfa_reset_status'],
  },
  block_ip: {
    normalizedAction: 'firewall.ip.block',
    displayName: 'Block IP Address',
    category: 'firewall',
    isDestructive: true,
    approvalRequired: true,
    rollbackSupported: true,
    requiredInputs: ['ip_address'],
    expectedOutputs: ['block_status'],
  },
  block_hash: {
    normalizedAction: 'edr.ioc.block',
    displayName: 'Block File Hash IOC',
    category: 'edr',
    isDestructive: true,
    approvalRequired: true,
    rollbackSupported: true,
    requiredInputs: ['file_hash'],
    expectedOutputs: ['block_status'],
  },
  quarantine_email: {
    normalizedAction: 'email.message.quarantine',
    displayName: 'Quarantine Email',
    category: 'email_security',
    isDestructive: true,
    approvalRequired: false,
    rollbackSupported: true,
    requiredInputs: ['message_id', 'mailbox'],
    expectedOutputs: ['quarantine_status'],
  },
  kill_process: {
    normalizedAction: 'edr.process.kill',
    displayName: 'Kill Process',
    category: 'edr',
    isDestructive: true,
    approvalRequired: true,
    rollbackSupported: false,
    requiredInputs: ['process_id', 'hostname'],
    expectedOutputs: ['kill_status'],
  },
};

function resolveAction(actionId: string): ActionDescriptor {
  return ACTION_CANONICAL_MAP[actionId] ?? {
    normalizedAction: actionId.includes('.') ? actionId : `edr.${actionId}`,
    displayName: actionId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    category: 'edr',
    isDestructive: true,
    approvalRequired: false,
    rollbackSupported: false,
    requiredInputs: [],
    expectedOutputs: [],
  };
}

// ── Determine if scoring model has analyst approval threshold ──
function hasAnalystApprovalThreshold(playbook: PlaybookState): boolean {
  return (playbook.scoringModel?.thresholds ?? []).some(
    (t) => t.action === 'analyst_approval'
  );
}

function hasAutoContainThreshold(playbook: PlaybookState): boolean {
  return (playbook.scoringModel?.thresholds ?? []).some(
    (t) => t.action === 'auto_contain'
  );
}

// ── Map template actions to normalized steps ───────────────
function buildStepsFromActions(playbook: PlaybookState): NormalizedStep[] {
  const steps: NormalizedStep[] = [
    {
      id: 'start',
      name: 'Start',
      type: 'trigger',
      description: 'Playbook triggered by SOAR platform alert/incident',
    },
    {
      id: 'build_context',
      name: 'Build Context',
      type: 'context',
      description: 'Normalize incident fields and extract entities from alert data.',
    },
    {
      id: 'extract_entities',
      name: 'Extract Entities',
      type: 'entity_extraction',
      description: 'Extract hostname, username, IPs, hashes from alert context.',
    },
  ];

  // Enrichment steps from enrichmentConnectors (string IDs)
  const enrichmentConnectors = playbook.enrichmentConnectors ?? [];
  for (const connId of enrichmentConnectors) {
    steps.push({
      id: stepId(`enrich_${connId}`),
      name: `Enrich — ${connId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`,
      type: 'enrichment',
      normalizedAction: `${connId}.lookup`,
      connectorCategory: 'enrichment',
      parameters: { entity: '{{extracted_entity}}' },
      outputs: { reputation: '{{reputation_score}}', context: '{{enrichment_context}}' },
      verifyInTenant: true,
    });
  }

  // Scoring step if scoring model defined
  if (playbook.scoringModel?.type && playbook.scoringModel.type !== 'none') {
    steps.push({
      id: 'score_behavior',
      name: 'Score Behavior',
      type: 'scoring',
      description: `Apply ${playbook.scoringModel.type} scoring model to calculate threat score.`,
      outputs: { threat_score: '{{calculated_threat_score}}', severity: '{{severity_level}}' },
    });
  }

  // Safety gates / decision — this is the branching point
  const needsApproval = hasAnalystApprovalThreshold(playbook);
  const hasAutoContain = hasAutoContainThreshold(playbook);
  const containmentActions = playbook.actions ?? [];

  steps.push({
    id: 'safety_gates',
    name: 'Safety Gates',
    type: 'decision',
    description: 'Evaluate score against thresholds. Branch to Auto Contain, Analyst Approval, or Skip based on score.',
    conditions: [
      { field: 'threat_score', operator: 'gte', value: 8 },
      { field: 'threat_score', operator: 'gte', value: 2 },
    ],
    outputs: { decision: '{{gate_decision}}' },
  });

  // Analyst approval step if threshold requires it
  if (needsApproval || containmentActions.length > 0) {
    steps.push({
      id: 'analyst_approval',
      name: 'Analyst Approval',
      type: 'approval',
      description: 'Request SOC analyst approval before executing containment actions.',
      approvalRequired: true,
      parameters: {
        approverRole: 'SOC Analyst',
        timeoutHours: '24',
        context: '{{case_summary}}',
        justification: 'Threat score requires manual analyst verification before containment.',
      },
      outputs: { approval_decision: '{{approval_result}}' },
    });
  }

  // Containment action steps — each with proper normalized action
  for (const actionId of containmentActions) {
    const descriptor = resolveAction(actionId);
    steps.push({
      id: stepId(actionId),
      name: descriptor.displayName,
      type: 'action',
      description: `${descriptor.displayName} — automated response action.`,
      normalizedAction: descriptor.normalizedAction,
      connectorCategory: descriptor.category,
      parameters: Object.fromEntries(descriptor.requiredInputs.map((k) => [k, `{{${k}}}`])),
      outputs: Object.fromEntries(descriptor.expectedOutputs.map((k) => [k, `{{${k}}}`])),
      isDestructive: descriptor.isDestructive,
      approvalRequired: descriptor.approvalRequired,
      rollbackSupported: descriptor.rollbackSupported,
      verifyInTenant: true,
    });
  }

  // Notification
  steps.push({
    id: 'notify_soc',
    name: 'Notify SOC',
    type: 'notification',
    normalizedAction: 'notify.email.send',
    connectorCategory: 'notification',
    description: 'Send automated notification to SOC team with case summary.',
    parameters: {
      to: '{{soc_email}}',
      subject: `SOAR Alert: ${playbook.name}`,
      body: 'Automated containment completed. Review case.',
    },
    outputs: { delivery_status: '{{notification_status}}' },
    verifyInTenant: true,
  });

  // Ticket
  steps.push({
    id: 'create_ticket',
    name: 'Create Ticket',
    type: 'ticket',
    normalizedAction: 'ticket.issue.create',
    connectorCategory: 'ticketing',
    description: 'Create incident ticket with automated response details.',
    parameters: {
      title: `${playbook.name} — Automated Response`,
      severity: '{{threat_severity}}',
      description: '{{case_summary}}',
    },
    outputs: { ticket_id: '{{created_ticket_id}}', ticket_url: '{{ticket_url}}' },
    verifyInTenant: true,
  });

  // Case comment
  steps.push({
    id: 'add_case_comment',
    name: 'Add Case Comment',
    type: 'comment',
    normalizedAction: 'case.comment.add',
    connectorCategory: 'case',
    description: 'Add automated response summary to SOAR case.',
    parameters: { comment: 'Automated response completed by SOARForge playbook.' },
  });

  // Finalize
  steps.push({
    id: 'finalize',
    name: 'Finalize',
    type: 'final',
    description: 'Update case status and close or escalate based on outcome.',
    normalizedAction: 'case.close',
    connectorCategory: 'case',
  });

  return steps;
}

// ── Build routes reflecting the multi-branch decision logic ──
function buildRoutes(steps: NormalizedStep[], playbook: PlaybookState): NormalizedRoute[] {
  const routes: NormalizedRoute[] = [];
  const stepIds = new Set(steps.map((s) => s.id));
  const needsApproval = hasAnalystApprovalThreshold(playbook);
  const hasAutoContain = hasAutoContainThreshold(playbook);
  const containmentActions = playbook.actions ?? [];
  const firstContainmentId = containmentActions.length > 0
    ? stepId(containmentActions[0])
    : 'finalize';
  const hasApprovalStep = steps.some((s) => s.id === 'analyst_approval');

  // Chain steps from start up to (not including) safety_gates
  const preGateOrder = ['start', 'build_context', 'extract_entities'];

  // Add enrichment steps in order
  for (const connId of playbook.enrichmentConnectors ?? []) {
    preGateOrder.push(stepId(`enrich_${connId}`));
  }

  // Add scoring if present
  if (steps.some((s) => s.id === 'score_behavior')) {
    preGateOrder.push('score_behavior');
  }

  // Linear chain before safety gates
  for (let i = 0; i < preGateOrder.length - 1; i++) {
    const src = preGateOrder[i];
    const tgt = preGateOrder[i + 1];
    if (stepIds.has(src) && stepIds.has(tgt)) {
      routes.push({ sourceStepId: src, targetStepId: tgt, condition: 'always' });
    }
  }

  // Last pre-gate step -> safety_gates
  const lastPreGate = preGateOrder[preGateOrder.length - 1];
  if (stepIds.has(lastPreGate) && stepIds.has('safety_gates')) {
    routes.push({ sourceStepId: lastPreGate, targetStepId: 'safety_gates', condition: 'always' });
  }

  // Safety Gates branching logic
  if (stepIds.has('safety_gates')) {
    if (hasAutoContain && stepIds.has(firstContainmentId)) {
      routes.push({
        sourceStepId: 'safety_gates',
        targetStepId: firstContainmentId,
        condition: 'true',
        label: 'Auto Contain (score >= 8)',
      });
    }
    if (needsApproval && hasApprovalStep) {
      routes.push({
        sourceStepId: 'safety_gates',
        targetStepId: 'analyst_approval',
        condition: 'true',
        label: 'Analyst Approval Required (score 2–7)',
      });
    }
    routes.push({
      sourceStepId: 'safety_gates',
      targetStepId: 'finalize',
      condition: 'false',
      label: 'Skip / Out of Scope (score 0–1)',
    });
  }

  // Analyst Approval branching
  if (hasApprovalStep && stepIds.has('analyst_approval')) {
    if (stepIds.has(firstContainmentId)) {
      routes.push({
        sourceStepId: 'analyst_approval',
        targetStepId: firstContainmentId,
        condition: 'success',
        label: 'Approved',
      });
    }
    routes.push({
      sourceStepId: 'analyst_approval',
      targetStepId: 'finalize',
      condition: 'failure',
      label: 'Rejected / Denied',
    });
  }

  // Containment actions chain
  for (let i = 0; i < containmentActions.length; i++) {
    const curId = stepId(containmentActions[i]);
    const nextId = i < containmentActions.length - 1 ? stepId(containmentActions[i + 1]) : 'notify_soc';
    if (stepIds.has(curId) && stepIds.has(nextId)) {
      routes.push({ sourceStepId: curId, targetStepId: nextId, condition: 'always' });
    }
  }

  // Notify -> Ticket -> Comment -> Finalize
  const postChain = ['notify_soc', 'create_ticket', 'add_case_comment', 'finalize'];
  for (let i = 0; i < postChain.length - 1; i++) {
    const src = postChain[i];
    const tgt = postChain[i + 1];
    if (stepIds.has(src) && stepIds.has(tgt)) {
      // avoid duplicate finalize routes
      const alreadyExists = routes.some((r) => r.sourceStepId === src && r.targetStepId === tgt);
      if (!alreadyExists) {
        routes.push({ sourceStepId: src, targetStepId: tgt, condition: 'always' });
      }
    }
  }

  return routes;
}

// ── Map PlaybookState trigger to NormalizedTrigger ──────────
function buildTrigger(playbook: PlaybookState): NormalizedTrigger {
  const raw = playbook.trigger?.type ?? 'alert';
  const type = (['alert','incident','webhook','scheduled','manual','email','custom'].includes(raw)
    ? raw
    : 'alert') as NormalizedTrigger['type'];

  return {
    type,
    sourcePlatform: playbook.trigger?.sourceSystem ?? undefined,
    filters: undefined,
    description: playbook.trigger?.description ?? `Triggered on ${type}`,
  };
}

// ── Build connectors list from actions ─────────────────────
function buildConnectors(playbook: PlaybookState, targetPlatform: SoarPlatformId): NormalizedConnectorRequirement[] {
  const seen = new Set<string>();
  const connectors: NormalizedConnectorRequirement[] = [];
  const allPlatforms: SoarPlatformId[] = ['fortisoar', 'cortex_xsoar', 'splunk_soar', 'tines', 'shuffle', 'generic_soar'];

  // Enrichment connectors
  for (const connId of playbook.enrichmentConnectors ?? []) {
    if (seen.has(connId)) continue;
    seen.add(connId);
    connectors.push({
      id: connId,
      category: 'enrichment',
      displayName: connId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      required: true,
      supportedPlatforms: allPlatforms,
      verifyInTenant: targetPlatform !== 'fortisoar',
    });
  }

  // Action connectors — use resolved category
  for (const actionId of playbook.actions ?? []) {
    const desc = resolveAction(actionId);
    const connKey = `${desc.category}_connector`;
    if (seen.has(connKey)) continue;
    seen.add(connKey);
    connectors.push({
      id: actionId,
      category: desc.category,
      displayName: desc.displayName,
      required: true,
      supportedPlatforms: allPlatforms,
      verifyInTenant: targetPlatform !== 'fortisoar',
    });
  }

  // Always include notification connector
  if (!seen.has('notification')) {
    seen.add('notification');
    connectors.push({
      id: 'notification',
      category: 'notification',
      displayName: 'Email / Notification',
      required: true,
      supportedPlatforms: allPlatforms,
      verifyInTenant: false,
    });
  }

  // Ticketing connector
  if (!seen.has('ticketing')) {
    seen.add('ticketing');
    connectors.push({
      id: 'ticketing',
      category: 'ticketing',
      displayName: 'Ticketing System',
      required: false,
      supportedPlatforms: allPlatforms,
      verifyInTenant: true,
    });
  }

  return connectors;
}

// ── Main builder function ──────────────────────────────────
export function buildNormalizedPlaybook(
  playbook: PlaybookState,
  targetPlatform: SoarPlatformId,
): NormalizedPlaybook {
  const steps = buildStepsFromActions(playbook);
  const routes = buildRoutes(steps, playbook);

  const entities: NormalizedEntity[] = (playbook.entities ?? []).map((e) => ({
    id: typeof e === 'string' ? e : (e as { id: string }).id,
    label: typeof e === 'string' ? e : ((e as { displayLabel?: string; id: string }).displayLabel ?? (e as { id: string }).id),
    type: inferEntityType(typeof e === 'string' ? e : (e as { id: string }).id),
    required: true,
    extractedFrom: 'alert_data',
  }));

  const artifacts: NormalizedArtifact[] = (playbook.entities ?? []).map((e) => {
    const id = typeof e === 'string' ? e : (e as { id: string }).id;
    return {
      id,
      label: id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      cefField: cefFieldFor(id),
      required: true,
    };
  });

  const approvalSteps = steps.filter((s) => s.type === 'approval');
  const approvals: NormalizedApproval[] = approvalSteps.map((s) => ({
    id: `approval_${s.id}`,
    stepId: s.id,
    approverRole: 'SOC Analyst',
    timeoutHours: 24,
    onTimeout: 'escalate' as const,
  }));

  const scoringModel: NormalizedScoringModel = {
    type: playbook.scoringModel?.type ?? 'none',
    rules: (playbook.scoringModel?.rules ?? []).map((r) => ({
      label: r.label,
      points: r.points,
      condition: r.condition,
    })),
    thresholds: (playbook.scoringModel?.thresholds ?? []).map((t) => ({
      label: t.label,
      minScore: t.minScore,
      maxScore: t.maxScore,
      action: t.action,
    })),
  };

  return {
    id: playbook.id,
    name: playbook.name || 'Unnamed Playbook',
    description: playbook.description ?? '',
    version: '1.0.0',
    templateId: playbook.templateId ?? 'custom',
    targetPlatform,
    trigger: buildTrigger(playbook),
    entities,
    artifacts,
    connectors: buildConnectors(playbook, targetPlatform),
    scoringModel,
    steps,
    routes,
    approvals,
    fallback: {
      enabled: true,
      onError: 'notify' as const,
      notifyChannel: 'email',
    },
    testing: {
      uatScenarios: [
        'Alert with complete entity data — all enrichments succeed',
        'Alert with missing hostname — entity extraction partial',
        'Alert with low threat score (0–1) — should skip to finalize',
        'Alert with medium score (2–7) — should route to analyst approval',
        'Alert with high score (>= 8) — should auto-contain',
        'Approval denied path — finalize without containment',
      ],
      rollbackSteps: [
        'Un-isolate endpoint (edr.device.unisolate)',
        'Re-enable user account (iam.user.enable)',
        'Remove IP block (firewall.ip.unblock)',
      ],
      acceptanceCriteria: [
        'All enrichment steps complete without timeout',
        'Correct threshold evaluated against calculated score',
        'Safety Gates branches correctly to Auto Contain / Analyst Approval / Skip',
        'Notification delivered to SOC',
        'Ticket created with correct fields',
        'Disable AD User uses iam.user.disable (identity category)',
        'Isolate Endpoint uses edr.device.isolate (edr category)',
      ],
    },
    documentation: {
      summary: `${playbook.name} — Automated SOAR playbook targeting ${targetPlatform}`,
      connectorMatrix: [
        ...(playbook.enrichmentConnectors ?? []).map((c) => `enrichment: ${c}`),
        ...(playbook.actions ?? []).map((a) => {
          const d = resolveAction(a);
          return `${d.category}: ${d.displayName} (${d.normalizedAction})`;
        }),
      ],
      deploymentNotes: [
        targetPlatform === 'fortisoar'
          ? 'Replace {{CUSTOMER_*_CONFIG_UUID}} placeholders with actual connector UUIDs.'
          : 'This is a blueprint export. Verify all actions and connectors in your tenant before deploying.',
        'Test in a non-production environment before deploying to production.',
        'Ensure all required connectors are installed and properly configured.',
        'Disable AD User must be categorized as identity (iam.user.disable).',
        'Isolate Endpoint must use edr.device.isolate.',
      ],
      tenantChecklist: buildTenantChecklist(targetPlatform, playbook),
    },
  };
}

// ── CEF field hints for common entity types ─────────────────
function cefFieldFor(entityId: string): string {
  const map: Record<string, string> = {
    hostname: 'deviceHostName',
    machine_id: 'deviceExternalId',
    username: 'duser',
    command_line: 'cs1',
    file_hash: 'fileHash',
    ip: 'sourceAddress',
    source_ip: 'sourceAddress',
    dest_ip: 'destinationAddress',
    email: 'destinationUserName',
    url: 'requestURL',
    domain: 'destinationDnsDomain',
  };
  return map[entityId] ?? entityId;
}

// ── Infer entity type from common IDs ───────────────────────
function inferEntityType(entityId: string): NormalizedEntity['type'] {
  if (entityId.includes('host') || entityId.includes('machine')) return 'hostname';
  if (entityId.includes('user') || entityId.includes('account') || entityId === 'username') return 'user';
  if (entityId.includes('ip') || entityId.includes('address')) return 'ip';
  if (entityId.includes('hash') || entityId.includes('md5') || entityId.includes('sha')) return 'hash';
  if (entityId.includes('url')) return 'url';
  if (entityId.includes('email') || entityId.includes('mail')) return 'email';
  if (entityId.includes('domain')) return 'domain';
  if (entityId.includes('process') || entityId.includes('pid')) return 'process';
  if (entityId.includes('file') || entityId.includes('path')) return 'file';
  if (entityId.includes('command') || entityId.includes('cmd')) return 'process';
  return 'custom';
}

function buildTenantChecklist(platform: SoarPlatformId, playbook: PlaybookState): string[] {
  const base = [
    'Confirm all required integrations/connectors are installed',
    'Confirm authentication credentials are configured',
    'Test each action individually before running the full playbook',
    'Verify Isolate Endpoint uses edr.device.isolate (EDR connector)',
    'Verify Disable AD User uses iam.user.disable (Identity/AD connector)',
  ];

  const platformChecks: Partial<Record<SoarPlatformId, string[]>> = {
    fortisoar: [
      'Replace all {{CUSTOMER_*_CONFIG_UUID}} placeholders with actual UUIDs',
      'Verify connector operation names match installed connector version',
      'Set playbook to Inactive before first test run',
    ],
    cortex_xsoar: [
      'Create integration instances for each required integration',
      'Map incident type fields to playbook inputs',
      'Verify command names match installed integration version (not "verify in tenant" — find exact name)',
      'Test with a manual incident before enabling automation',
      'Verify nexttasks branching from Safety Gates task',
    ],
    splunk_soar: [
      'Create app assets for each required app',
      'Map CEF artifact fields to playbook action parameters',
      'Verify action names match installed app version',
      'Test with a manual container before enabling triggers',
      'Verify decision block branches correctly',
    ],
    sentinel_logic_apps: [
      'Deploy ARM template to Azure subscription',
      'Configure API connections for each Logic App connector',
      'Assign managed identity permissions (Sentinel Responder role)',
      'Configure Sentinel automation rule to trigger playbook',
    ],
    qradar_soar: [
      'Install required App Host integrations from IBM App Exchange',
      'Create message destinations for workflow routing',
      'Configure functions and scripts using tenant tooling',
      'Generate .resz export only from within QRadar SOAR tenant — DO NOT use this blueprint as .resz',
    ],
    servicenow_secops: [
      'Install required IntegrationHub spokes from ServiceNow Store',
      'Map table/field names to your ServiceNow instance (sn_si_incident)',
      'Build flows using Flow Designer with this blueprint as reference',
      'Test with a manual Security Incident before automation',
      'DO NOT import as XML Update Set — sys_ids are tenant-specific',
    ],
    tines: [
      'Create credentials for each external service in Tines workspace',
      'Verify HTTP endpoint URLs for each integration',
      'Configure manual approval pages if approval is required',
      'Test story with sample event before enabling triggers',
    ],
    shuffle: [
      'Install required apps from Shuffle App Store or OpenAPI',
      'Configure app credentials and authentication variables',
      'Verify x/y layout in workflow editor',
      'Test workflow execution before scheduling',
    ],
    generic_soar: [
      'Adapt normalized blueprint to your SOAR platform API',
      'Map normalized actions to platform-native actions',
      'Verify all connector/action mappings before deployment',
    ],
  };

  return [...base, ...(platformChecks[platform] ?? [])];
}
