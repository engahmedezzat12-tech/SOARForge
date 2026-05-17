// ============================================================
// Splunk SOAR Adapter — Hardened Playbook Blueprint
// ============================================================

import type { VendorAdapter, VendorExportResult, PlatformReadinessResult } from './platform-adapter';
import type { NormalizedPlaybook, NormalizedStep } from '../normalized/normalized-types';

export class SplunkSOARAdapter implements VendorAdapter {
  platformId = 'splunk_soar' as const;
  platformName = 'Splunk SOAR (Phantom)';
  exportFormat = 'splunk_soar_playbook';
  directImportSupported = false;
  blueprintOnly = true;
  requiresTenantVerification = true;

  generateExport(
    playbook: NormalizedPlaybook,
    _deploymentProfile: Record<string, unknown>,
  ): VendorExportResult {
    const slug = (playbook.name || 'soarforge').toLowerCase().replace(/\s+/g, '-');

    // Map entities to CEF artifact fields
    const artifacts: string[] = playbook.artifacts.map((a) => a.cefField ?? a.id);
    if (!artifacts.includes('deviceHostName')) artifacts.push('deviceHostName');
    if (!artifacts.includes('sourceAddress')) artifacts.push('sourceAddress');
    if (!artifacts.includes('fileHash')) artifacts.push('fileHash');

    // Build blocks from normalized steps
    const blocks = playbook.steps.map((step) => {
      return this.buildBlock(step, playbook);
    });

    // Required apps from connectors
    const requiredApps = [...new Set(
      playbook.connectors.map((c) => this.getAppCandidate(c.category, c.id))
    )];

    // Required asset placeholders
    const requiredAssets = [...new Set(
      playbook.connectors.map((c) => `{{SPLUNK_${c.category.toUpperCase()}_ASSET}}`)
    )];

    // Build decision block branches for Safety Gates
    const safetyGatesRoutes = playbook.routes.filter((r) => r.sourceStepId === 'safety_gates');
    const decisionBranches = safetyGatesRoutes.map((r) => ({
      label: r.label ?? r.condition,
      condition: r.condition,
      targetStepId: r.targetStepId,
    }));

    const content = {
      platform: 'splunk_soar',
      exportType: 'blueprint',
      directImportSupported: false,
      requiresTenantVerification: true,
      playbookBlueprint: {
        name: playbook.name,
        description: playbook.description,
        container: {
          type: 'case',
          label: 'events',
          ingest_app: 'verify in tenant: SIEM/EDR ingest app',
        },
        artifacts,
        cefMappings: playbook.artifacts.map((a) => ({
          entityId: a.id,
          cefField: a.cefField ?? a.id,
          datapath: `artifact:*.cef.${a.cefField ?? a.id}`,
          description: a.label,
        })),
        blocks,
        decisionBranches,
        requiredApps,
        requiredAssets,
        datapathHints: {
          hostname: 'artifact:*.cef.deviceHostName',
          sourceIp: 'artifact:*.cef.sourceAddress',
          fileHash: 'artifact:*.cef.fileHash',
          username: 'artifact:*.cef.duser',
          commandLine: 'artifact:*.cef.cs1',
          isolationStatus: 'action_result.data.*.status',
          disableStatus: 'action_result.data.*.accountStatus',
          threatScore: 'container.custom_fields.threat_score',
        },
        verifyInTenant: [
          'Verify app assets are configured for each required app (Administration > Apps > Asset)',
          'Verify action names match installed app version — do not use app versions from this blueprint directly',
          'Replace {{SPLUNK_*_ASSET}} placeholders with actual asset names',
          'Verify CEF artifact field mappings in your container label configuration',
          'Verify action_result.data path references in filter/decision conditions',
          'Test each action block individually before running full playbook',
          'Verify decision block branches correctly for Safety Gates',
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
      platform: 'splunk_soar',
      platformName: this.platformName,
      exportType: 'blueprint',
      fileName: `${slug}_splunk_soar_blueprint.json`,
      mimeType: 'application/json',
      directImportSupported: false,
      blueprintOnly: true,
      requiresTenantVerification: true,
      warnings: [
        'Blueprint only — NOT a direct import.',
        'App assets must be configured and action names verified in your Splunk SOAR tenant.',
        'Replace {{SPLUNK_*_ASSET}} placeholders with actual asset names.',
        'Verify CEF field mappings match your container artifact configuration.',
      ],
      content,
    };
  }

  private buildBlock(step: NormalizedStep, playbook: NormalizedPlaybook): unknown {
    const outboundRoutes = playbook.routes.filter((r) => r.sourceStepId === step.id);

    if (step.type === 'trigger' || step.type === 'context' || step.type === 'entity_extraction' || step.type === 'scoring' || step.type === 'final') {
      return {
        id: step.id,
        blockType: 'custom_function',
        name: step.name,
        type: step.type,
        description: step.description ?? '',
        normalizedAction: step.normalizedAction ?? null,
        function_name: `soarforge_${step.id}`,
        code_hint: this.getCustomFunctionHint(step),
        successDestinations: outboundRoutes
          .filter((r) => r.condition !== 'false' && r.condition !== 'failure')
          .map((r) => r.targetStepId),
      };
    }

    if (step.type === 'decision') {
      return {
        id: step.id,
        blockType: 'decision',
        name: step.name,
        type: 'decision',
        description: step.description ?? 'Evaluate threat score and branch.',
        conditions: [
          {
            name: 'Auto Contain',
            displayName: 'Auto Contain (score >= 8)',
            conditionJson: [{ name: 'threat_score', datapath: 'container:custom_fields:threat_score', operator: '>=', value: 8 }],
            successDestinations: outboundRoutes.filter((r) => r.label?.includes('Auto Contain') || (r.condition === 'true' && !r.label?.includes('Analyst'))).map((r) => r.targetStepId),
          },
          {
            name: 'Analyst Approval Required',
            displayName: 'Analyst Approval Required (score 2-7)',
            conditionJson: [
              { name: 'threat_score', datapath: 'container:custom_fields:threat_score', operator: '>=', value: 2 },
              { name: 'threat_score', datapath: 'container:custom_fields:threat_score', operator: '<', value: 8 },
            ],
            successDestinations: outboundRoutes.filter((r) => r.label?.includes('Analyst')).map((r) => r.targetStepId),
          },
          {
            name: 'Skip',
            displayName: 'Skip / Out of Scope (score 0-1)',
            conditionJson: [{ name: 'threat_score', datapath: 'container:custom_fields:threat_score', operator: '<', value: 2 }],
            successDestinations: outboundRoutes.filter((r) => r.condition === 'false' || r.label?.includes('Skip')).map((r) => r.targetStepId),
          },
        ],
      };
    }

    if (step.type === 'approval') {
      return {
        id: step.id,
        blockType: 'prompt',
        name: step.name,
        type: 'approval',
        description: step.description ?? 'SOC analyst manual approval required.',
        message: `Approval required for: ${playbook.name}\n\nReview case details and approve or deny containment.`,
        approverRole: 'SOC Analyst',
        timeoutHours: 24,
        onTimeout: 'escalate',
        approvedDestinations: outboundRoutes.filter((r) => r.condition === 'success' || r.label?.includes('Approved')).map((r) => r.targetStepId),
        rejectedDestinations: outboundRoutes.filter((r) => r.condition === 'failure' || r.label?.includes('Rejected')).map((r) => r.targetStepId),
      };
    }

    if (step.type === 'action' || step.type === 'enrichment') {
      const nativeInfo = this.getActionInfo(step);
      return {
        id: step.id,
        blockType: 'action',
        name: step.name,
        type: step.type,
        description: step.description ?? '',
        normalizedAction: step.normalizedAction ?? null,
        category: step.connectorCategory ?? 'unknown',
        appCandidate: nativeInfo.appCandidate,
        actionCandidate: nativeInfo.actionCandidate,
        assetPlaceholder: `{{SPLUNK_${(step.connectorCategory ?? 'CONNECTOR').toUpperCase()}_ASSET}}`,
        parameters: Object.fromEntries(
          Object.entries(step.parameters ?? {}).map(([k, v]) => [
            k,
            { value: v, datapath: `artifact:*.cef.${k}`, verifyDatapath: true },
          ])
        ),
        datapathHints: Object.keys(step.outputs ?? {}).map((k) => `action_result.data.*.${k}`),
        verifyInTenant: true,
        isDestructive: step.isDestructive ?? false,
        requiredInputs: Object.keys(step.parameters ?? {}),
        expectedOutputs: Object.keys(step.outputs ?? {}),
        successDestinations: outboundRoutes.filter((r) => r.condition !== 'false').map((r) => r.targetStepId),
        failureDestinations: [],
      };
    }

    if (step.type === 'notification') {
      return {
        id: step.id,
        blockType: 'action',
        name: step.name,
        type: 'notification',
        description: step.description ?? '',
        normalizedAction: step.normalizedAction ?? null,
        appCandidate: 'verify in tenant: SMTP / Email App',
        actionCandidate: 'send email',
        assetPlaceholder: '{{SPLUNK_EMAIL_ASSET}}',
        parameters: step.parameters ?? {},
        verifyInTenant: true,
        successDestinations: outboundRoutes.filter((r) => r.condition !== 'false').map((r) => r.targetStepId),
      };
    }

    if (step.type === 'ticket') {
      return {
        id: step.id,
        blockType: 'action',
        name: step.name,
        type: 'ticket',
        description: step.description ?? '',
        normalizedAction: step.normalizedAction ?? null,
        appCandidate: 'verify in tenant: Jira / ServiceNow App',
        actionCandidate: 'create ticket',
        assetPlaceholder: '{{SPLUNK_TICKETING_ASSET}}',
        parameters: step.parameters ?? {},
        verifyInTenant: true,
        successDestinations: outboundRoutes.filter((r) => r.condition !== 'false').map((r) => r.targetStepId),
      };
    }

    // Default: custom function
    return {
      id: step.id,
      blockType: 'custom_function',
      name: step.name,
      type: step.type,
      description: step.description ?? '',
      normalizedAction: step.normalizedAction ?? null,
      code_hint: `# ${step.name}\n# normalizedAction: ${step.normalizedAction ?? 'none'}\n# category: ${step.connectorCategory ?? 'none'}\nreturn {"status": "completed", "step": "${step.id}"}`,
      successDestinations: outboundRoutes.filter((r) => r.condition !== 'false').map((r) => r.targetStepId),
    };
  }

  private getCustomFunctionHint(step: NormalizedStep): string {
    return `# ${step.name}\n# type: ${step.type}\n# description: ${step.description ?? ''}\n# normalizedAction: ${step.normalizedAction ?? 'none'}\nreturn {"status": "completed", "step_id": "${step.id}"}`;
  }

  private getActionInfo(step: NormalizedStep): { appCandidate: string; actionCandidate: string } {
    const action = step.normalizedAction ?? '';
    const category = step.connectorCategory ?? '';

    const actionInfoMap: Record<string, { app: string; action: string }> = {
      'edr.device.isolate': { app: 'CrowdStrike Falcon / Microsoft Defender for Endpoint', action: 'quarantine device' },
      'edr.device.unisolate': { app: 'CrowdStrike Falcon / Microsoft Defender for Endpoint', action: 'unquarantine device' },
      'edr.device.search': { app: 'CrowdStrike Falcon / Microsoft Defender for Endpoint', action: 'get device info' },
      'iam.user.disable': { app: 'Active Directory / Microsoft Graph', action: 'disable account' },
      'iam.user.enable': { app: 'Active Directory / Microsoft Graph', action: 'enable account' },
      'iam.session.revoke': { app: 'Microsoft Graph / Okta', action: 'revoke user sessions' },
      'firewall.ip.block': { app: 'Palo Alto Firewall / Checkpoint', action: 'block ip' },
      'edr.ioc.block': { app: 'CrowdStrike Falcon / Defender for Endpoint', action: 'block ip' },
      'email.message.quarantine': { app: 'Microsoft Exchange / O365 Email', action: 'quarantine email' },
      'notify.email.send': { app: 'SMTP / O365 Email', action: 'send email' },
      'ticket.issue.create': { app: 'Jira / ServiceNow', action: 'create ticket' },
      'case.comment.add': { app: 'Splunk SOAR (built-in)', action: 'add comment to container' },
      'case.close': { app: 'Splunk SOAR (built-in)', action: 'close container' },
    };

    const info = actionInfoMap[action];
    if (info) return { appCandidate: info.app, actionCandidate: `verify in tenant: ${info.action}` };

    const categoryMap: Record<string, { app: string; action: string }> = {
      edr: { app: 'verify in tenant: EDR App', action: 'verify action in tenant' },
      identity: { app: 'verify in tenant: Active Directory / Graph App', action: 'verify action in tenant' },
      firewall: { app: 'verify in tenant: Firewall App', action: 'verify action in tenant' },
      email_security: { app: 'verify in tenant: Email Security App', action: 'verify action in tenant' },
      enrichment: { app: 'verify in tenant: TI / Enrichment App', action: 'verify action in tenant' },
      notification: { app: 'SMTP App', action: 'send email' },
      ticketing: { app: 'Jira / ServiceNow App', action: 'create ticket' },
      case: { app: 'Splunk SOAR (built-in)', action: 'close container' },
    };

    const catInfo = categoryMap[category];
    return {
      appCandidate: catInfo?.app ?? 'verify in tenant',
      actionCandidate: `verify in tenant: ${catInfo?.action ?? 'verify action'}`,
    };
  }

  private getAppCandidate(category: string, connId: string): string {
    const map: Record<string, string> = {
      edr: 'verify in tenant: CrowdStrike Falcon / Microsoft Defender for Endpoint App',
      identity: 'verify in tenant: Active Directory / Microsoft Graph App',
      firewall: 'verify in tenant: Palo Alto Firewall / Checkpoint App',
      email_security: 'verify in tenant: Microsoft Exchange / O365 Email App',
      enrichment: `verify in tenant: ${connId.replace(/_/g, ' ')} enrichment app`,
      notification: 'SMTP / O365 Email App',
      ticketing: 'Jira / ServiceNow App',
      case: 'Splunk SOAR built-in',
    };
    return map[category] ?? `verify in tenant: ${connId} app`;
  }

  validateReadiness(
    playbook: NormalizedPlaybook,
    _deploymentProfile: Record<string, unknown>,
  ): PlatformReadinessResult {
    const hasDecisionBlock = playbook.steps.some((s) => s.type === 'decision');
    const safetyGatesRoutes = playbook.routes.filter((r) => r.sourceStepId === 'safety_gates');
    const hasIsolateEndpoint = playbook.steps.some((s) => s.normalizedAction === 'edr.device.isolate');
    const hasDisableADUser = playbook.steps.some(
      (s) => s.normalizedAction === 'iam.user.disable' && s.connectorCategory === 'identity'
    );

    const items = [
      {
        id: 'app_assets',
        label: 'App Assets Configured',
        passed: false,
        critical: true,
        message: 'Create app assets for each required app in Splunk SOAR',
        recommendation: 'Go to Administration > Apps > Asset to configure app assets.',
      },
      {
        id: 'action_names',
        label: 'Action Names Verified',
        passed: false,
        critical: true,
        message: 'Replace "verify in tenant" action names with exact action names from installed apps',
        recommendation: 'Check App docs for exact action names.',
      },
      {
        id: 'cef_mapping',
        label: 'CEF/Artifact Mapping',
        passed: false,
        critical: false,
        message: 'Map CEF artifact fields to playbook action parameters',
        recommendation: 'Configure label/artifact type in container settings.',
      },
      {
        id: 'decision_block',
        label: 'Decision Block Present',
        passed: hasDecisionBlock && safetyGatesRoutes.length >= 2,
        critical: true,
        message: hasDecisionBlock && safetyGatesRoutes.length >= 2
          ? `Decision block (Safety Gates) has ${safetyGatesRoutes.length} branches — correct`
          : 'Decision block (Safety Gates) must have multiple branches',
        recommendation: 'Verify decision conditions in the Safety Gates block.',
      },
      {
        id: 'normalize_isolate',
        label: 'Isolate Endpoint = edr.device.isolate',
        passed: hasIsolateEndpoint,
        critical: true,
        message: hasIsolateEndpoint ? 'Isolate Endpoint uses edr.device.isolate — correct' : 'Missing edr.device.isolate action',
        recommendation: 'Verify Isolate Endpoint action block.',
      },
      {
        id: 'normalize_disable_ad',
        label: 'Disable AD User = iam.user.disable (identity)',
        passed: hasDisableADUser,
        critical: true,
        message: hasDisableADUser ? 'Disable AD User uses iam.user.disable (identity) — correct' : 'Disable AD User must use iam.user.disable in identity category',
        recommendation: 'Verify Disable AD User block category.',
      },
    ];

    return {
      platform: 'splunk_soar',
      overallReady: false,
      directImportReady: false,
      items,
      warnings: ['Blueprint only — not a direct import. Tenant configuration required.'],
      blockers: ['App assets and action names must be configured before use.'],
    };
  }

  generateConnectorChecklist(playbook: NormalizedPlaybook): string {
    const lines = ['# Splunk SOAR App/Asset Checklist\n'];
    for (const c of playbook.connectors) {
      lines.push(`## ${c.displayName} (${c.category})`);
      lines.push(`- [ ] App installed from Splunk SOAR App Store`);
      lines.push(`- [ ] App asset created: {{SPLUNK_${c.category.toUpperCase()}_ASSET}}`);
      lines.push(`- [ ] Authentication credentials configured`);
      lines.push(`- [ ] Action names verified against installed app version\n`);
    }
    return lines.join('\n');
  }

  generateDocumentation(playbook: NormalizedPlaybook): string {
    const actionBlocks = playbook.steps.filter((s) => s.type === 'action' || s.type === 'enrichment');
    return [
      `# ${playbook.name} — Splunk SOAR Playbook Blueprint`,
      ``,
      `> **Blueprint Only** — configure app assets and verify action names in your Splunk SOAR tenant.`,
      ``,
      `## Container Setup`,
      `- Container Type: case`,
      `- Label: events`,
      `- CEF Fields: ${playbook.artifacts.map((a) => a.cefField ?? a.id).join(', ')}`,
      ``,
      `## Blocks`,
      ...playbook.steps.map((s) => {
        const info = this.getActionInfo(s);
        return `- **${s.name}** (${s.type})${s.normalizedAction ? ` → \`${s.normalizedAction}\`` : ''}${s.connectorCategory ? ` [${s.connectorCategory}]` : ''}${(s.type === 'action' || s.type === 'enrichment') ? `\n  - App: ${info.appCandidate}\n  - Action: ${info.actionCandidate}\n  - Asset: {{SPLUNK_${(s.connectorCategory ?? 'CONNECTOR').toUpperCase()}_ASSET}}` : ''}`;
      }),
      ``,
      `## Action Mapping`,
      ...actionBlocks.map((s) => {
        const info = this.getActionInfo(s);
        return `- **${s.name}**: \`${s.normalizedAction}\` (${s.connectorCategory}) → App: ${info.appCandidate}`;
      }),
      ``,
      `## Tenant Verification Checklist`,
      ...playbook.documentation.tenantChecklist.map((c) => `- [ ] ${c}`),
    ].join('\n');
  }
}
