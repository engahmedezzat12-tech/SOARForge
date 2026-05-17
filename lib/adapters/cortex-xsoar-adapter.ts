// ============================================================
// Cortex XSOAR Adapter — Hardened Content Pack Blueprint
// ============================================================

import type { VendorAdapter, VendorExportResult, PlatformReadinessResult } from './platform-adapter';
import type { NormalizedPlaybook, NormalizedStep, NormalizedRoute } from '../normalized/normalized-types';

export class CortexXSOARAdapter implements VendorAdapter {
  platformId = 'cortex_xsoar' as const;
  platformName = 'Palo Alto Cortex XSOAR / Demisto';
  exportFormat = 'xsoar_content_pack';
  directImportSupported = false;
  blueprintOnly = true;
  requiresTenantVerification = true;

  generateExport(
    playbook: NormalizedPlaybook,
    _deploymentProfile: Record<string, unknown>,
  ): VendorExportResult {
    const slug = (playbook.name || 'soarforge').toLowerCase().replace(/\s+/g, '-');

    // Assign sequential task IDs
    const taskIdMap = new Map<string, string>();
    playbook.steps.forEach((step, idx) => {
      taskIdMap.set(step.id, String(idx));
    });

    // Build XSOAR tasks from normalized steps
    const tasks: Record<string, unknown> = {};

    playbook.steps.forEach((step, idx) => {
      const taskId = String(idx);

      // Compute nexttasks from routes
      const outboundRoutes = playbook.routes.filter((r) => r.sourceStepId === step.id);
      const nexttasks = this.buildNexttasks(step, outboundRoutes, taskIdMap);

      if (step.type === 'trigger') {
        tasks[taskId] = {
          id: taskId,
          taskid: step.id,
          type: 'start',
          task: {
            id: step.id,
            version: -1,
            name: step.name,
            type: 'start',
            description: step.description ?? '',
            iscommand: false,
          },
          nexttasks,
          conditions: [],
        };
      } else if (step.type === 'decision') {
        tasks[taskId] = {
          id: taskId,
          taskid: step.id,
          type: 'condition',
          task: {
            id: step.id,
            version: -1,
            name: step.name,
            type: 'condition',
            description: step.description ?? 'Evaluate score thresholds and branch accordingly.',
            iscommand: false,
          },
          nexttasks,
          conditions: this.buildXSOARConditions(step),
        };
      } else if (step.type === 'approval') {
        tasks[taskId] = {
          id: taskId,
          taskid: step.id,
          type: 'regular',
          task: {
            id: step.id,
            version: -1,
            name: step.name,
            type: 'regular',
            description: step.description ?? 'SOC analyst must review and approve before containment.',
            iscommand: false,
            tags: ['approval', 'manual-review'],
            requiresTenantVerification: true,
            approvalType: 'manual',
            approverRole: 'SOC Analyst',
            onTimeout: 'escalate',
            timeoutHours: 24,
          },
          nexttasks,
          conditions: [
            { label: 'Approved', condition: [{ left: { value: { simple: 'decision' } }, operator: 'isEqualString', right: { value: { simple: 'Approved' } } }] },
            { label: 'Rejected', condition: [{ left: { value: { simple: 'decision' } }, operator: 'isEqualString', right: { value: { simple: 'Rejected' } } }] },
          ],
        };
      } else if (step.type === 'action' || step.type === 'enrichment') {
        const nativeInfo = this.getNativeCommandInfo(step);
        tasks[taskId] = {
          id: taskId,
          taskid: step.id,
          type: 'regular',
          task: {
            id: step.id,
            version: -1,
            name: step.name,
            type: 'regular',
            description: step.description ?? '',
            iscommand: true,
            scriptName: nativeInfo.commandCandidate,
            normalizedAction: step.normalizedAction ?? null,
            integrationCandidate: nativeInfo.integrationCandidate,
            xsoarCommandCandidate: nativeInfo.commandCandidate,
            commandName: 'verify exact command in tenant',
            requiresTenantVerification: true,
            requiredInputs: nativeInfo.requiredInputs,
            expectedOutputs: nativeInfo.expectedOutputs,
            category: step.connectorCategory ?? 'unknown',
            ...(step.isDestructive ? { isDestructive: true } : {}),
          },
          nexttasks,
          scriptarguments: Object.fromEntries(
            Object.entries(step.parameters ?? {}).map(([k, v]) => [k, { simple: v }])
          ),
          results: Object.keys(step.outputs ?? {}).map((k) => `${step.id}.${k}`),
          ...(step.isDestructive ? { isDestructive: true } : {}),
          ...(step.verifyInTenant ? { verifyInTenant: true } : {}),
        };
      } else if (step.type === 'final') {
        tasks[taskId] = {
          id: taskId,
          taskid: step.id,
          type: 'title',
          task: {
            id: step.id,
            version: -1,
            name: step.name,
            type: 'title',
            description: step.description ?? 'Finalize case and close investigation.',
            iscommand: true,
            scriptName: 'closeInvestigation',
            normalizedAction: 'case.close',
          },
          nexttasks: {},
          scriptarguments: {
            closeReason: { simple: 'Resolved' },
            closeNotes: { simple: 'Automated response completed by SOARForge.' },
          },
        };
      } else {
        tasks[taskId] = {
          id: taskId,
          taskid: step.id,
          type: 'regular',
          task: {
            id: step.id,
            version: -1,
            name: step.name,
            type: 'regular',
            description: step.description ?? '',
            iscommand: false,
            normalizedAction: step.normalizedAction ?? null,
          },
          nexttasks,
        };
      }
    });

    // Required integrations from connectors
    const requiredIntegrations = playbook.connectors.map((c) => ({
      name: c.displayName,
      category: c.category,
      verifyInTenant: true,
      notes: `Verify exact integration name in your XSOAR Marketplace`,
    }));

    // Required commands from action steps
    const requiredCommands = playbook.steps
      .filter((s) => s.normalizedAction)
      .map((s) => {
        const info = this.getNativeCommandInfo(s);
        return {
          normalizedAction: s.normalizedAction,
          stepName: s.name,
          commandCandidate: info.commandCandidate,
          integrationCandidate: info.integrationCandidate,
          category: s.connectorCategory ?? 'unknown',
          verifyInTenant: true,
        };
      });

    const content = {
      platform: 'cortex_xsoar',
      exportType: 'blueprint',
      directImportSupported: false,
      requiresTenantVerification: true,
      contentPackDraft: {
        name: `SOARForge - ${playbook.name}`,
        description: playbook.description,
        version: '1.0.0',
        fromversion: '6.0.0',
        support: 'community',
        author: 'SOARForge',
        playbooks: [
          {
            id: slug,
            name: playbook.name,
            version: -1,
            fromversion: '6.0.0',
            description: playbook.description,
            starttaskid: '0',
            tasks,
            inputs: playbook.entities.map((e) => ({
              key: e.id,
              value: { simple: `incident.${e.id}` },
              required: e.required,
              description: e.label,
              playbookInputQuery: null,
            })),
            outputs: [
              { contextPath: 'SOARForge.Response.Status', description: 'Final response status', type: 'String' },
              { contextPath: 'SOARForge.Response.Actions', description: 'Actions taken', type: 'Array' },
            ],
            view: '{"linkLabelsPosition":{},"paper":{"dimensions":{"height":1800,"width":1200,"x":-20,"y":50}}}',
          },
        ],
        integrations: requiredIntegrations,
        requiredIntegrations: requiredIntegrations.map((i) => `verify in tenant: ${i.name}`),
        requiredCommands,
        scripts: [],
        incidentTypes: [
          {
            name: `SOARForge - ${playbook.name}`,
            description: playbook.description,
            color: '#FF6B00',
            preProcessingScript: '',
            closingScript: '',
          },
        ],
        incidentFields: playbook.entities.map((e) => ({
          name: `soarforge_${e.id}`,
          cliName: `soarforge_${e.id}`,
          type: 'Short Text',
          description: e.label,
          group: 0,
        })),
        verifyInTenant: [
          'Verify integration instances are configured for all required integrations',
          'Verify command names match installed integration version (replace "verify in tenant" with actual command)',
          'Verify incident type mapping and field names',
          'Verify context/output path references in task script arguments',
          'Verify Safety Gates task has correct branching conditions',
          'Test with manual incident before enabling automation',
        ],
        normalizedSteps: playbook.steps.map((s) => ({
          id: s.id,
          name: s.name,
          type: s.type,
          normalizedAction: s.normalizedAction ?? null,
          category: s.connectorCategory ?? null,
          isDestructive: s.isDestructive ?? false,
          verifyInTenant: s.verifyInTenant ?? false,
        })),
        normalizedRoutes: playbook.routes.map((r) => ({
          from: r.sourceStepId,
          to: r.targetStepId,
          condition: r.condition,
          label: r.label ?? r.condition,
        })),
      },
    };

    return {
      platform: 'cortex_xsoar',
      platformName: this.platformName,
      exportType: 'blueprint',
      fileName: `${slug}_cortex_xsoar_content_pack_blueprint.json`,
      mimeType: 'application/json',
      directImportSupported: false,
      blueprintOnly: true,
      requiresTenantVerification: true,
      warnings: [
        'This is a content pack / playbook blueprint — NOT a direct import.',
        'All scriptName values must be verified and replaced with exact command names from your tenant.',
        'Integration instances must be created in XSOAR before this playbook will function.',
        'Incident type and context path mappings must be configured manually.',
      ],
      content,
    };
  }

  private buildNexttasks(
    step: NormalizedStep,
    routes: NormalizedRoute[],
    taskIdMap: Map<string, string>,
  ): Record<string, string[]> {
    if (routes.length === 0) return {};

    if (step.type === 'decision') {
      // Multi-branch nexttasks
      const result: Record<string, string[]> = {};
      for (const route of routes) {
        const targetTaskId = taskIdMap.get(route.targetStepId);
        if (targetTaskId !== undefined) {
          const label = route.label ?? (route.condition === 'false' ? 'Skip / Out of Scope' : route.label ?? route.condition ?? '#none#');
          if (!result[label]) result[label] = [];
          result[label].push(targetTaskId);
        }
      }
      return result;
    }

    if (step.type === 'approval') {
      const result: Record<string, string[]> = {};
      for (const route of routes) {
        const targetTaskId = taskIdMap.get(route.targetStepId);
        if (targetTaskId !== undefined) {
          const label = route.label ?? (route.condition === 'success' ? 'Approved' : route.condition === 'failure' ? 'Rejected' : route.condition ?? '#none#');
          if (!result[label]) result[label] = [];
          result[label].push(targetTaskId);
        }
      }
      return result;
    }

    // Linear steps — use '#none#'
    const result: Record<string, string[]> = { '#none#': [] };
    for (const route of routes) {
      const targetTaskId = taskIdMap.get(route.targetStepId);
      if (targetTaskId !== undefined) {
        result['#none#'].push(targetTaskId);
      }
    }
    return result;
  }

  private buildXSOARConditions(step: NormalizedStep): unknown[] {
    if (step.type !== 'decision') return [];
    return [
      {
        label: 'Auto Contain (score >= 8)',
        condition: [
          {
            left: { value: { simple: 'threat_score' }, iscontext: true },
            operator: 'greaterThanOrEqual',
            right: { value: { simple: '8' } },
          },
        ],
      },
      {
        label: 'Analyst Approval Required (score 2-7)',
        condition: [
          {
            left: { value: { simple: 'threat_score' }, iscontext: true },
            operator: 'greaterThanOrEqual',
            right: { value: { simple: '2' } },
          },
          {
            left: { value: { simple: 'threat_score' }, iscontext: true },
            operator: 'lessThan',
            right: { value: { simple: '8' } },
          },
        ],
      },
      {
        label: 'Skip / Out of Scope (score 0-1)',
        condition: [
          {
            left: { value: { simple: 'threat_score' }, iscontext: true },
            operator: 'lessThan',
            right: { value: { simple: '2' } },
          },
        ],
      },
    ];
  }

  private getNativeCommandInfo(step: NormalizedStep): {
    commandCandidate: string;
    integrationCandidate: string;
    requiredInputs: string[];
    expectedOutputs: string[];
  } {
    const action = step.normalizedAction ?? '';
    const category = step.connectorCategory ?? '';

    const commandMap: Record<string, { command: string; integration: string }> = {
      'edr.device.isolate': { command: 'cs-falcon-contain-host OR defender-isolate-machine', integration: 'CrowdStrike Falcon / Microsoft Defender for Endpoint / Cortex XDR / Group-IB EDR' },
      'edr.device.unisolate': { command: 'cs-falcon-lift-host-containment OR defender-unisolate-machine', integration: 'CrowdStrike Falcon / Microsoft Defender for Endpoint' },
      'edr.device.search': { command: 'cs-falcon-search-device OR defender-get-machine', integration: 'CrowdStrike Falcon / Microsoft Defender for Endpoint' },
      'iam.user.disable': { command: 'ad-disable-account OR msgraph-disable-user', integration: 'Active Directory Query / Microsoft Graph API (Azure AD)' },
      'iam.user.enable': { command: 'ad-enable-account OR msgraph-enable-user', integration: 'Active Directory Query / Microsoft Graph API (Azure AD)' },
      'iam.session.revoke': { command: 'msgraph-revoke-user-signin-sessions', integration: 'Microsoft Graph API (Azure AD)' },
      'iam.mfa.reset': { command: 'verify in tenant', integration: 'Microsoft Graph API / Okta / Azure AD' },
      'firewall.ip.block': { command: 'verify in tenant: block-ip or add-to-blocklist', integration: 'Palo Alto Firewall / Checkpoint / Fortinet' },
      'edr.ioc.block': { command: 'cs-falcon-upload-ioc OR defender-add-indicator', integration: 'CrowdStrike Falcon / Microsoft Defender for Endpoint' },
      'email.message.quarantine': { command: 'msgraph-move-message OR ews-move-item', integration: 'Microsoft Graph Mail / EWS O365' },
      'notify.email.send': { command: 'send-mail', integration: 'Mail Sender / Microsoft Graph Mail' },
      'ticket.issue.create': { command: 'jira-create-issue OR servicenow-create-record', integration: 'Jira / ServiceNow' },
      'case.comment.add': { command: 'addComment OR setIncident', integration: 'Built-in XSOAR' },
      'case.close': { command: 'closeInvestigation', integration: 'Built-in XSOAR' },
    };

    const info = commandMap[action];
    if (info) {
      return {
        commandCandidate: info.command,
        integrationCandidate: info.integration,
        requiredInputs: Object.keys(step.parameters ?? {}),
        expectedOutputs: Object.keys(step.outputs ?? {}),
      };
    }

    // Fallback by category
    const categoryMap: Record<string, { command: string; integration: string }> = {
      edr: { command: 'verify exact command in tenant', integration: 'CrowdStrike / Defender / Cortex XDR / SentinelOne' },
      identity: { command: 'verify exact command in tenant', integration: 'Active Directory Query / Microsoft Graph API' },
      firewall: { command: 'verify exact command in tenant', integration: 'Palo Alto Firewall / Checkpoint / Fortinet' },
      email_security: { command: 'verify exact command in tenant', integration: 'Microsoft Graph Mail / EWS O365' },
      enrichment: { command: 'verify exact command in tenant', integration: 'VirusTotal / AbuseIPDB / ThreatIntelligence' },
      notification: { command: 'send-mail', integration: 'Mail Sender (built-in)' },
      ticketing: { command: 'jira-create-issue', integration: 'Jira / ServiceNow' },
      case: { command: 'setIncident', integration: 'Built-in XSOAR' },
    };

    const catInfo = categoryMap[category];
    return {
      commandCandidate: catInfo?.command ?? 'verify exact command in tenant',
      integrationCandidate: catInfo?.integration ?? 'verify integration in tenant',
      requiredInputs: Object.keys(step.parameters ?? {}),
      expectedOutputs: Object.keys(step.outputs ?? {}),
    };
  }

  validateReadiness(
    playbook: NormalizedPlaybook,
    _deploymentProfile: Record<string, unknown>,
  ): PlatformReadinessResult {
    const hasSafetyGates = playbook.steps.some((s) => s.id === 'safety_gates');
    const hasApprovalStep = playbook.steps.some((s) => s.type === 'approval');
    const safetyGatesRoutes = playbook.routes.filter((r) => r.sourceStepId === 'safety_gates');
    const approvalRoutes = playbook.routes.filter((r) => r.sourceStepId === 'analyst_approval');
    const hasIsolateEndpoint = playbook.steps.some((s) => s.normalizedAction === 'edr.device.isolate');
    const hasDisableADUser = playbook.steps.some(
      (s) => s.normalizedAction === 'iam.user.disable' && s.connectorCategory === 'identity'
    );

    const items = [
      {
        id: 'integration_instances',
        label: 'Integration Instances Configured',
        passed: false,
        critical: true,
        message: 'Create integration instances for each required integration in XSOAR',
        recommendation: 'Go to Settings > Integrations > Instances in XSOAR.',
      },
      {
        id: 'command_names',
        label: 'Command Names Verified',
        passed: false,
        critical: true,
        message: 'Replace "verify in tenant" script names with exact command names from your integrations',
        recommendation: 'Check integration documentation for exact command names.',
      },
      {
        id: 'incident_type',
        label: 'Incident Type Mapping',
        passed: false,
        critical: false,
        message: 'Map incident type fields to playbook inputs',
        recommendation: 'Configure incident types under Settings > Object Setup.',
      },
      {
        id: 'safety_gates_branches',
        label: 'Safety Gates Branching',
        passed: hasSafetyGates && safetyGatesRoutes.length >= 2,
        critical: true,
        message: hasSafetyGates && safetyGatesRoutes.length >= 2
          ? `Safety Gates has ${safetyGatesRoutes.length} branches — correct`
          : 'Safety Gates must have multiple branches (Auto Contain / Analyst Approval / Skip)',
        recommendation: 'Verify nexttasks in the Safety Gates condition task.',
      },
      {
        id: 'approval_path',
        label: 'Analyst Approval Task',
        passed: !hasApprovalStep || approvalRoutes.length >= 2,
        critical: false,
        message: hasApprovalStep
          ? (approvalRoutes.length >= 2 ? 'Analyst Approval has Approved/Rejected paths — correct' : 'Analyst Approval task must have Approved and Rejected paths')
          : 'No approval step needed',
        recommendation: 'Verify nexttasks in the Analyst Approval task.',
      },
      {
        id: 'normalize_isolate',
        label: 'Isolate Endpoint = edr.device.isolate',
        passed: hasIsolateEndpoint,
        critical: true,
        message: hasIsolateEndpoint ? 'Isolate Endpoint uses edr.device.isolate — correct' : 'Missing edr.device.isolate action',
        recommendation: 'Verify the Isolate Endpoint task uses edr connector.',
      },
      {
        id: 'normalize_disable_ad',
        label: 'Disable AD User = iam.user.disable (identity)',
        passed: hasDisableADUser,
        critical: true,
        message: hasDisableADUser ? 'Disable AD User uses iam.user.disable (identity) — correct' : 'Disable AD User must use iam.user.disable in identity category',
        recommendation: 'Verify Disable AD User is categorized as identity, not edr.',
      },
    ];

    return {
      platform: 'cortex_xsoar',
      overallReady: false,
      directImportReady: false,
      items,
      warnings: ['Blueprint only — not a direct import. All command names require tenant verification.'],
      blockers: ['Integration instances and exact command names must be configured before use.'],
    };
  }

  generateConnectorChecklist(playbook: NormalizedPlaybook): string {
    const lines = ['# Cortex XSOAR Integration Checklist\n'];
    for (const c of playbook.connectors) {
      lines.push(`## ${c.displayName} (${c.category})`);
      lines.push(`- [ ] Integration installed from XSOAR Marketplace`);
      lines.push(`- [ ] Integration instance created and configured`);
      lines.push(`- [ ] Command names verified against integration version`);
      lines.push(`- [ ] Context output paths confirmed in task script arguments\n`);
    }
    return lines.join('\n');
  }

  generateDocumentation(playbook: NormalizedPlaybook): string {
    const actionSteps = playbook.steps.filter((s) => s.type === 'action');
    return [
      `# ${playbook.name} — Cortex XSOAR Content Pack Blueprint`,
      ``,
      `> **Blueprint Only** — verify all integration instances and command names in your XSOAR tenant.`,
      `> DO NOT import directly — scriptName values are placeholders requiring tenant verification.`,
      ``,
      `## Playbook Steps`,
      ...playbook.steps.map((s) => {
        const info = this.getNativeCommandInfo(s);
        return `- **${s.name}** (${s.type})${s.normalizedAction ? ` → \`${s.normalizedAction}\`` : ''}${s.connectorCategory ? ` [${s.connectorCategory}]` : ''}${s.type === 'action' ? `\n  - Command: \`${info.commandCandidate}\`\n  - Integration: ${info.integrationCandidate}` : ''}`;
      }),
      ``,
      `## Required Integrations`,
      ...playbook.connectors.map((c) => `- **${c.displayName}** (${c.category}) — verify instance in tenant`),
      ``,
      `## Action → normalized command mapping`,
      ...actionSteps.map((s) => `- ${s.name}: \`${s.normalizedAction}\` (${s.connectorCategory}) → verify: ${this.getNativeCommandInfo(s).commandCandidate}`),
      ``,
      `## Tenant Verification Checklist`,
      ...playbook.documentation.tenantChecklist.map((c) => `- [ ] ${c}`),
    ].join('\n');
  }
}
