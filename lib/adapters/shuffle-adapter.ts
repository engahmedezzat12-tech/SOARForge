// ============================================================
// Shuffle Adapter — Hardened Workflow JSON Blueprint
// ============================================================

import type { VendorAdapter, VendorExportResult, PlatformReadinessResult } from './platform-adapter';
import type { NormalizedPlaybook, NormalizedStep } from '../normalized/normalized-types';

export class ShuffleAdapter implements VendorAdapter {
  platformId = 'shuffle' as const;
  platformName = 'Shuffle';
  exportFormat = 'shuffle_workflow_json';
  directImportSupported = true;
  blueprintOnly = false;
  requiresTenantVerification = true;

  generateExport(
    playbook: NormalizedPlaybook,
    _deploymentProfile: Record<string, unknown>,
  ): VendorExportResult {
    const slug = (playbook.name || 'soarforge').toLowerCase().replace(/\s+/g, '-');

    // Build Shuffle nodes from normalized steps
    const nodes = playbook.steps.map((step, idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const x = 120 + col * 260;
      const y = 80 + row * 200;
      return this.buildNode(step, x, y, playbook);
    });

    // Build edges from normalized routes
    const edges = playbook.routes
      .map((r) => ({
        id: `edge_${r.sourceStepId}_${r.targetStepId}`,
        source_id: r.sourceStepId,
        destination_id: r.targetStepId,
        label: r.label ?? r.condition ?? '',
        condition: r.condition ?? 'always',
        hasError: false,
      }))
      .filter((e) => e.source_id && e.destination_id);

    // Build variables from connectors
    const variables = playbook.connectors.map((c) => ({
      id: `var_${c.category}_auth`,
      name: `SHUFFLE_${c.category.toUpperCase()}_AUTH`,
      value: `verify in tenant: authentication credentials for ${c.displayName}`,
      description: `API key or auth token for ${c.displayName} (${c.category})`,
      verifyInTenant: true,
    }));
    variables.push({
      id: 'var_soc_email',
      name: 'SOC_EMAIL',
      value: 'verify in tenant: soc@yourcompany.com',
      description: 'SOC team email address for notifications',
      verifyInTenant: true,
    });

    const content = {
      schema_version: '1.0.0',
      id: `soarforge-${slug}`,
      name: playbook.name,
      description: playbook.description,
      start: playbook.steps[0]?.id ?? 'start',
      workflow: {
        nodes,
        edges,
        variables,
      },
      tags: ['soarforge', 'automated', 'soc'],
      verifyInTenant: [
        'Verify app names and action names match apps installed in your Shuffle instance',
        'Configure SHUFFLE_*_AUTH variables with actual credentials for each integration',
        'Verify app_version numbers match installed app versions',
        'Review and adjust x/y node positions in the Shuffle workflow editor',
        'Test individual nodes before running full workflow',
        'Verify decision/branching node conditions match your threat score format',
      ],
      normalizedSteps: playbook.steps.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        normalizedAction: s.normalizedAction ?? null,
        category: s.connectorCategory ?? null,
        isDestructive: s.isDestructive ?? false,
      })),
      normalizedRoutes: playbook.routes.map((r) => ({
        from: r.sourceStepId,
        to: r.targetStepId,
        condition: r.condition,
        label: r.label ?? r.condition,
      })),
    };

    return {
      platform: 'shuffle',
      platformName: this.platformName,
      exportType: 'blueprint',
      fileName: `${slug}_shuffle_workflow_blueprint.json`,
      mimeType: 'application/json',
      directImportSupported: true,
      blueprintOnly: false,
      requiresTenantVerification: true,
      warnings: [
        'Verify app names and action names against apps installed in your Shuffle instance.',
        'Configure SHUFFLE_*_AUTH variables with actual credentials before running.',
        'Review and adjust x/y node positions in the workflow editor.',
        'Decision node conditions must be verified against your actual event data structure.',
      ],
      content,
    };
  }

  private buildNode(
    step: NormalizedStep,
    x: number,
    y: number,
    playbook: NormalizedPlaybook,
  ): unknown {
    const base = {
      id: step.id,
      label: step.name,
      position: { x, y },
      description: step.description ?? '',
      isValid: true,
    };

    if (step.type === 'trigger') {
      return {
        ...base,
        app_name: 'Webhook',
        app_version: '1.0.0',
        name: 'trigger_webhook',
        app_id: 'verify in tenant: Webhook App ID',
        action: 'catch_webhook',
        parameters: [
          { name: 'info', value: `Webhook trigger for ${playbook.name}` },
        ],
        isStartNode: true,
        triggers: [{ type: 'WEBHOOK', status: 'unset' }],
        description: 'Webhook trigger — replace with your actual Shuffle trigger (schedule, external, etc.)',
      };
    }

    if (step.type === 'context' || step.type === 'entity_extraction' || step.type === 'scoring') {
      return {
        ...base,
        app_name: 'Shuffle Tools',
        app_version: '1.2.0',
        name: `function_${step.id}`,
        app_id: 'verify in tenant: Shuffle Tools App ID',
        action: 'execute_python_script',
        parameters: [
          {
            name: 'code',
            value: `# ${step.name}\n# type: ${step.type}\n# description: ${step.description ?? ''}\n# normalizedAction: ${step.normalizedAction ?? 'none'}\n\n# Extract entities from the input event\nhostname = data.get('hostname', '')\nusername = data.get('username', '')\nmachine_id = data.get('machine_id', '')\nfile_hash = data.get('file_hash', '')\n\nreturn {"status": "completed", "step": "${step.id}", "hostname": hostname, "username": username}`,
          },
        ],
        description: `${step.name} — customize this Python script with your entity extraction logic`,
      };
    }

    if (step.type === 'decision') {
      const safetyGatesRoutes = playbook.routes.filter((r) => r.sourceStepId === step.id);
      return {
        ...base,
        app_name: 'Shuffle Tools',
        app_version: '1.2.0',
        name: `branch_${step.id}`,
        app_id: 'verify in tenant: Shuffle Tools App ID',
        action: 'filter_list',
        parameters: [
          { name: 'input_list', value: '#DOLLAR#{threat_score}', description: 'Threat score from scoring step' },
          { name: 'field', value: 'threat_score' },
          { name: 'check', value: 'larger than or equal to' },
          { name: 'value', value: '2', description: 'Minimum score to take action' },
        ],
        branchingLogic: {
          autoContain: { threshold: 8, target: safetyGatesRoutes.find((r) => r.label?.includes('Auto Contain') || (r.condition === 'true' && !r.label?.includes('Analyst')))?.targetStepId ?? 'isolate_endpoint' },
          analystApproval: { minScore: 2, maxScore: 7, target: safetyGatesRoutes.find((r) => r.label?.includes('Analyst'))?.targetStepId ?? 'analyst_approval' },
          skip: { maxScore: 1, target: safetyGatesRoutes.find((r) => r.condition === 'false' || r.label?.includes('Skip'))?.targetStepId ?? 'finalize' },
        },
        description: 'Decision/branching node — verify conditions match your threat score data format and adjust as needed',
        verifyInTenant: true,
      };
    }

    if (step.type === 'approval') {
      return {
        ...base,
        app_name: 'Shuffle Tools',
        app_version: '1.2.0',
        name: `approval_${step.id}`,
        app_id: 'verify in tenant: Shuffle Tools App ID',
        action: 'send_email_shuffle',
        parameters: [
          { name: 'apikey', value: '#DOLLAR#{SHUFFLE_APIKEY}' },
          { name: 'email', value: '#DOLLAR#{SOC_EMAIL}' },
          { name: 'subject', value: `Approval Required: ${playbook.name}` },
          {
            name: 'body',
            value: step.description ?? 'SOC analyst review required. Approve or deny containment.',
          },
        ],
        approvalRoutes: {
          approved: playbook.routes.find((r) => r.sourceStepId === step.id && (r.condition === 'success' || r.label?.includes('Approved')))?.targetStepId ?? 'finalize',
          rejected: playbook.routes.find((r) => r.sourceStepId === step.id && (r.condition === 'failure' || r.label?.includes('Rejected')))?.targetStepId ?? 'finalize',
        },
        description: 'Approval gate — verify email app authentication and response handling logic',
        verifyInTenant: true,
      };
    }

    if (step.type === 'action' || step.type === 'enrichment') {
      const appInfo = this.getAppInfo(step);
      return {
        ...base,
        app_name: appInfo.appName,
        app_version: 'verify in tenant',
        name: step.id,
        app_id: `verify in tenant: ${appInfo.appName} App ID`,
        action: appInfo.actionName,
        parameters: Object.entries(step.parameters ?? {}).map(([k, v]) => ({
          name: k,
          value: `#DOLLAR#{${k}}`,
          default_value: v,
          description: `${k} — verify data reference path`,
        })),
        authentication: `#DOLLAR#{SHUFFLE_${(step.connectorCategory ?? 'CONNECTOR').toUpperCase()}_AUTH}`,
        normalizedAction: step.normalizedAction ?? null,
        category: step.connectorCategory ?? null,
        isDestructive: step.isDestructive ?? false,
        requiredInputs: Object.keys(step.parameters ?? {}),
        expectedOutputs: Object.keys(step.outputs ?? {}),
        verifyInTenant: true,
        description: `${step.name} — verify app name, action name, and authentication.\nnormalizedAction: ${step.normalizedAction ?? 'none'}\ncategory: ${step.connectorCategory ?? 'unknown'}`,
      };
    }

    if (step.type === 'notification') {
      return {
        ...base,
        app_name: 'verify in tenant: Email App',
        app_version: 'verify in tenant',
        name: `notify_${step.id}`,
        app_id: 'verify in tenant: Email App ID',
        action: 'send_email',
        parameters: [
          { name: 'to', value: step.parameters?.to ?? '#DOLLAR#{SOC_EMAIL}' },
          { name: 'subject', value: step.parameters?.subject ?? `SOAR Alert: ${playbook.name}` },
          { name: 'body', value: step.parameters?.body ?? 'Automated containment completed. Review case.' },
        ],
        authentication: '#DOLLAR#{SHUFFLE_NOTIFICATION_AUTH}',
        verifyInTenant: true,
      };
    }

    if (step.type === 'ticket') {
      return {
        ...base,
        app_name: 'verify in tenant: Jira / ServiceNow App',
        app_version: 'verify in tenant',
        name: `ticket_${step.id}`,
        app_id: 'verify in tenant: Ticketing App ID',
        action: 'create_ticket',
        parameters: [
          { name: 'title', value: step.parameters?.title ?? `${playbook.name} — Automated Response` },
          { name: 'severity', value: '#DOLLAR#{threat_severity}' },
          { name: 'description', value: '#DOLLAR#{case_summary}' },
        ],
        authentication: '#DOLLAR#{SHUFFLE_TICKETING_AUTH}',
        normalizedAction: 'ticket.issue.create',
        verifyInTenant: true,
      };
    }

    // Final / fallback
    return {
      ...base,
      app_name: 'Shuffle Tools',
      app_version: '1.2.0',
      name: step.id,
      app_id: 'verify in tenant: Shuffle Tools App ID',
      action: 'execute_python_script',
      parameters: [
        {
          name: 'code',
          value: `# ${step.name}\n# normalizedAction: ${step.normalizedAction ?? 'none'}\nreturn {"status": "completed", "step": "${step.id}", "playbook": "${playbook.name}"}`,
        },
      ],
      description: step.description ?? `${step.name} — customize with your platform logic`,
    };
  }

  private getAppInfo(step: NormalizedStep): { appName: string; actionName: string } {
    const action = step.normalizedAction ?? '';
    const category = step.connectorCategory ?? '';

    const actionMap: Record<string, { app: string; action: string }> = {
      'edr.device.isolate': { app: 'CrowdStrike Falcon / Microsoft Defender for Endpoint', action: 'quarantine_device' },
      'edr.device.unisolate': { app: 'CrowdStrike Falcon / Microsoft Defender for Endpoint', action: 'unquarantine_device' },
      'edr.device.search': { app: 'CrowdStrike Falcon / Microsoft Defender for Endpoint', action: 'get_device_info' },
      'iam.user.disable': { app: 'Active Directory / Microsoft Graph', action: 'disable_account' },
      'iam.user.enable': { app: 'Active Directory / Microsoft Graph', action: 'enable_account' },
      'iam.session.revoke': { app: 'Microsoft Graph / Okta', action: 'revoke_user_sessions' },
      'firewall.ip.block': { app: 'Palo Alto Firewall / Checkpoint', action: 'block_ip' },
      'edr.ioc.block': { app: 'CrowdStrike Falcon / Defender for Endpoint', action: 'upload_ioc' },
      'email.message.quarantine': { app: 'Microsoft Exchange / O365', action: 'quarantine_email' },
    };

    const info = actionMap[action];
    if (info) return { appName: `verify in tenant: ${info.app}`, actionName: `verify in tenant: ${info.action}` };

    const categoryMap: Record<string, { app: string; action: string }> = {
      edr: { app: 'EDR App (CrowdStrike / Defender / SentinelOne)', action: 'verify action in tenant' },
      identity: { app: 'Active Directory / Microsoft Graph App', action: 'verify action in tenant' },
      firewall: { app: 'Firewall App (Palo Alto / Checkpoint)', action: 'verify action in tenant' },
      email_security: { app: 'Email Security App', action: 'verify action in tenant' },
      enrichment: { app: 'TI / Enrichment App', action: 'verify action in tenant' },
    };

    const catInfo = categoryMap[category];
    return {
      appName: `verify in tenant: ${catInfo?.app ?? 'App'}`,
      actionName: `verify in tenant: ${catInfo?.action ?? 'action'}`,
    };
  }

  validateReadiness(
    playbook: NormalizedPlaybook,
    _deploymentProfile: Record<string, unknown>,
  ): PlatformReadinessResult {
    const hasDecisionNode = playbook.steps.some((s) => s.type === 'decision');
    const safetyGatesRoutes = playbook.routes.filter((r) => r.sourceStepId === 'safety_gates');
    const hasEdges = playbook.routes.length > 0;
    const hasActionNodes = playbook.steps.some((s) => s.type === 'action' || s.type === 'enrichment');

    const items = [
      {
        id: 'app_references',
        label: 'App/Action References Verified',
        passed: false,
        critical: true,
        message: 'Verify app names and action names for each node in Shuffle App Store',
        recommendation: 'Check Shuffle App Store for installed apps and their exact action names.',
      },
      {
        id: 'auth_variables',
        label: 'Authentication Variables Configured',
        passed: false,
        critical: true,
        message: 'Configure SHUFFLE_*_AUTH variables for each integration',
        recommendation: 'Set authentication variables in your Shuffle workflow.',
      },
      {
        id: 'decision_node',
        label: 'Decision Node with Branches',
        passed: hasDecisionNode && safetyGatesRoutes.length >= 2,
        critical: true,
        message: hasDecisionNode && safetyGatesRoutes.length >= 2
          ? `Decision node (Safety Gates) has ${safetyGatesRoutes.length} outgoing edges — correct`
          : 'Decision node must have multiple outgoing edges for branching',
        recommendation: 'Verify branchingLogic in the decision node.',
      },
      {
        id: 'edges',
        label: 'Edges Generated from Routes',
        passed: hasEdges,
        critical: false,
        message: hasEdges ? `${playbook.routes.length} edges generated from normalized routes` : 'No edges generated',
        recommendation: 'Review edges in Shuffle workflow editor.',
      },
      {
        id: 'action_nodes',
        label: 'Action Nodes with App References',
        passed: hasActionNodes,
        critical: false,
        message: hasActionNodes ? 'Action/enrichment nodes present with app references' : 'No action nodes found',
        recommendation: 'Verify each action node has correct app/action references.',
      },
      {
        id: 'layout',
        label: 'Visual Layout',
        passed: true,
        critical: false,
        message: 'x/y coordinates generated automatically — adjust in Shuffle editor if needed',
        recommendation: 'Open workflow in Shuffle editor to rearrange nodes.',
      },
    ];

    return {
      platform: 'shuffle',
      overallReady: false,
      directImportReady: false,
      items,
      warnings: ['App references and authentication must be verified before running workflow.'],
      blockers: ['App action names and authentication must be configured before production use.'],
    };
  }

  generateConnectorChecklist(playbook: NormalizedPlaybook): string {
    const lines = ['# Shuffle App Checklist\n'];
    for (const c of playbook.connectors) {
      lines.push(`## ${c.displayName} (${c.category})`);
      lines.push(`- [ ] App installed from Shuffle App Store or OpenAPI spec`);
      lines.push(`- [ ] Authentication variable: SHUFFLE_${c.category.toUpperCase()}_AUTH configured`);
      lines.push(`- [ ] App name verified against installed app`);
      lines.push(`- [ ] Action names verified against installed app version\n`);
    }
    return lines.join('\n');
  }

  generateDocumentation(playbook: NormalizedPlaybook): string {
    return [
      `# ${playbook.name} — Shuffle Workflow Blueprint`,
      ``,
      `> **Direct Import Supported** — verify app references and authentication before running.`,
      `> All app_name and action values require tenant verification.`,
      ``,
      `## Nodes (${playbook.steps.length} total)`,
      ...playbook.steps.map((s, i) => {
        const info = this.getAppInfo(s);
        return `- **[${i + 1}] ${s.name}** (${s.type})${s.normalizedAction ? ` → \`${s.normalizedAction}\`` : ''}${s.connectorCategory ? ` [${s.connectorCategory}]` : ''}${(s.type === 'action' || s.type === 'enrichment') ? `\n  - App: ${info.appName}\n  - Action: ${info.actionName}` : ''}`;
      }),
      ``,
      `## Authentication Variables`,
      ...playbook.connectors.map((c) => `- \`SHUFFLE_${c.category.toUpperCase()}_AUTH\` — ${c.displayName}`),
      ``,
      `## Tenant Checklist`,
      ...playbook.documentation.tenantChecklist.map((c) => `- [ ] ${c}`),
    ].join('\n');
  }
}
