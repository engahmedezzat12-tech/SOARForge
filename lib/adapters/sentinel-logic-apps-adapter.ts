// ============================================================
// Microsoft Sentinel + Logic Apps Adapter — Hardened ARM Blueprint
// ============================================================

import type { VendorAdapter, VendorExportResult, PlatformReadinessResult } from './platform-adapter';
import type { NormalizedPlaybook, NormalizedStep } from '../normalized/normalized-types';

export class SentinelLogicAppsAdapter implements VendorAdapter {
  platformId = 'sentinel_logic_apps' as const;
  platformName = 'Microsoft Sentinel + Logic Apps';
  exportFormat = 'azure_logic_app_arm';
  directImportSupported = true;
  blueprintOnly = false;
  requiresTenantVerification = true;

  generateExport(
    playbook: NormalizedPlaybook,
    _deploymentProfile: Record<string, unknown>,
  ): VendorExportResult {
    const slug = (playbook.name || 'soarforge').toLowerCase().replace(/\s+/g, '-');
    const logicAppName = playbook.name.replace(/[^a-zA-Z0-9-]/g, '-');

    // Determine connections needed
    const needsTicketing = playbook.steps.some((s) => s.type === 'ticket');
    const needsTeams = playbook.connectors.some((c) => c.category === 'notification');
    const needsDefender = playbook.connectors.some((c) => c.category === 'edr');
    const needsGraph = playbook.connectors.some((c) => c.category === 'identity');

    // Build Logic App actions from normalized steps
    const logicActions = this.buildLogicActions(playbook);

    const armParameters: Record<string, unknown> = {
      logicAppName: { type: 'string', defaultValue: logicAppName },
      sentinelConnectionId: {
        type: 'string',
        metadata: { description: 'Azure Sentinel API connection resource ID — get from Azure portal after creating connection' },
      },
      location: { type: 'string', defaultValue: '[resourceGroup().location]' },
    };

    if (needsDefender) {
      armParameters.defenderConnectionId = {
        type: 'string',
        metadata: { description: 'Microsoft Defender for Endpoint API connection resource ID' },
      };
    }
    if (needsGraph) {
      armParameters.graphConnectionId = {
        type: 'string',
        metadata: { description: 'Microsoft Graph API connection resource ID (for Azure AD / identity actions)' },
      };
    }
    if (needsTeams) {
      armParameters.teamsConnectionId = {
        type: 'string',
        metadata: { description: 'Microsoft Teams API connection resource ID' },
      };
    }
    if (needsTicketing) {
      armParameters.serviceNowConnectionId = {
        type: 'string',
        metadata: { description: 'ServiceNow / Jira API connection resource ID (for ticketing)' },
      };
    }

    // Build $connections value object
    const connectionsValue: Record<string, unknown> = {
      azuresentinel: {
        connectionId: "[parameters('sentinelConnectionId')]",
        connectionName: 'azuresentinel',
        id: '/subscriptions/{subscriptionId}/providers/Microsoft.Web/locations/{location}/managedApis/azuresentinel',
      },
    };
    if (needsDefender) {
      connectionsValue.microsoftdefender = {
        connectionId: "[parameters('defenderConnectionId')]",
        connectionName: 'microsoftdefender',
        id: '/subscriptions/{subscriptionId}/providers/Microsoft.Web/locations/{location}/managedApis/microsoftdefender',
      };
    }
    if (needsGraph) {
      connectionsValue.microsoftgraph = {
        connectionId: "[parameters('graphConnectionId')]",
        connectionName: 'microsoftgraph',
        id: '/subscriptions/{subscriptionId}/providers/Microsoft.Web/locations/{location}/managedApis/microsoftgraph',
      };
    }
    if (needsTeams) {
      connectionsValue.teams = {
        connectionId: "[parameters('teamsConnectionId')]",
        connectionName: 'teams',
        id: '/subscriptions/{subscriptionId}/providers/Microsoft.Web/locations/{location}/managedApis/teams',
      };
    }
    if (needsTicketing) {
      connectionsValue.servicenow = {
        connectionId: "[parameters('serviceNowConnectionId')]",
        connectionName: 'servicenow',
        id: '/subscriptions/{subscriptionId}/providers/Microsoft.Web/locations/{location}/managedApis/servicenow',
      };
    }

    const armTemplate = {
      '$schema': 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
      contentVersion: '1.0.0.0',
      parameters: armParameters,
      resources: [
        {
          type: 'Microsoft.Logic/workflows',
          apiVersion: '2019-05-01',
          name: "[parameters('logicAppName')]",
          location: "[parameters('location')]",
          identity: {
            type: 'SystemAssigned',
          },
          properties: {
            state: 'Disabled',
            definition: {
              '$schema': 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
              contentVersion: '1.0.0.0',
              parameters: {
                '$connections': { defaultValue: {}, type: 'Object' },
              },
              triggers: {
                Microsoft_Sentinel_incident: {
                  type: 'ApiConnectionWebhook',
                  inputs: {
                    host: {
                      connection: {
                        name: "@parameters('$connections')['azuresentinel']['connectionId']",
                      },
                    },
                    body: { callback_url: '@listCallbackUrl()' },
                    path: '/incident-creation',
                  },
                },
              },
              actions: logicActions,
            },
            parameters: {
              '$connections': { value: connectionsValue },
            },
          },
        },
      ],
    };

    const content = {
      platform: 'sentinel_logic_apps',
      exportType: 'blueprint',
      directImportSupported: true,
      requiresTenantVerification: true,
      armTemplateDraft: armTemplate,
      verifyInTenant: [
        'Deploy ARM template to your Azure subscription (az deployment group create or Azure portal)',
        'Configure API connections: Sentinel, Defender (if EDR actions), Teams (if notification), Graph (if identity actions)',
        'Assign managed identity the Sentinel Responder role and Microsoft Defender for Endpoint permissions',
        'Configure Sentinel automation rule to trigger this Logic App on incident creation',
        'Verify runAfter dependencies are correct for all actions',
        'Test Logic App with a manual trigger before enabling automation rule',
        'Replace placeholder subscription/location values in connection IDs',
      ],
      normalizedSteps: playbook.steps.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        normalizedAction: s.normalizedAction ?? null,
        category: s.connectorCategory ?? null,
      })),
      normalizedRoutes: playbook.routes.map((r) => ({
        from: r.sourceStepId,
        to: r.targetStepId,
        condition: r.condition,
        label: r.label ?? r.condition,
      })),
    };

    return {
      platform: 'sentinel_logic_apps',
      platformName: this.platformName,
      exportType: 'blueprint',
      fileName: `${slug}_sentinel_logic_app_arm.json`,
      mimeType: 'application/json',
      directImportSupported: true,
      blueprintOnly: false,
      requiresTenantVerification: true,
      warnings: [
        'Deploy to Azure with API connections configured before enabling.',
        'Replace {subscriptionId} and {location} placeholders in connection ID paths.',
        'Assign managed identity the Sentinel Responder role before enabling.',
        'Logic App is deployed in Disabled state — enable only after testing.',
      ],
      content,
    };
  }

  private buildLogicActions(playbook: NormalizedPlaybook): Record<string, unknown> {
    const logicActions: Record<string, unknown> = {};
    const actionKeyMap = new Map<string, string>();

    // Pre-compute action keys
    for (const step of playbook.steps) {
      if (step.type === 'trigger') continue;
      const key = this.actionKey(step.name);
      actionKeyMap.set(step.id, key);
    }

    // Build dependency map from routes
    const runAfterMap = new Map<string, string[]>();
    for (const route of playbook.routes) {
      if (route.sourceStepId === route.targetStepId) continue;
      const srcKey = actionKeyMap.get(route.sourceStepId);
      const tgtId = route.targetStepId;
      if (!srcKey) continue;
      if (!runAfterMap.has(tgtId)) runAfterMap.set(tgtId, []);
      runAfterMap.get(tgtId)!.push(srcKey);
    }

    for (const step of playbook.steps) {
      if (step.type === 'trigger') continue;

      const key = actionKeyMap.get(step.id) ?? this.actionKey(step.name);
      const runAfterDeps = runAfterMap.get(step.id) ?? [];
      const runAfter = runAfterDeps.length > 0
        ? Object.fromEntries(runAfterDeps.map((dep) => [dep, ['Succeeded']]))
        : {};

      if (step.type === 'decision') {
        // Safety Gates -> If condition with branched actions
        const autoContainRoute = playbook.routes.find((r) => r.sourceStepId === step.id && (r.label?.includes('Auto Contain') || (r.condition === 'true' && !r.label?.includes('Analyst'))));
        const approvalRoute = playbook.routes.find((r) => r.sourceStepId === step.id && r.label?.includes('Analyst'));
        const skipRoute = playbook.routes.find((r) => r.sourceStepId === step.id && (r.condition === 'false' || r.label?.includes('Skip')));

        logicActions[key] = {
          type: 'If',
          expression: {
            or: [
              { greaterOrEquals: ["@variables('threat_score')", 8] },
            ],
          },
          actions: {
            Auto_Contain_Branch: {
              type: 'Compose',
              inputs: {
                branch: 'Auto Contain',
                target: autoContainRoute?.targetStepId ?? 'containment',
                normalizedCondition: 'threat_score >= 8',
              },
            },
          },
          else: {
            actions: {
              Low_Score_Or_Approval_Branch: {
                type: 'If',
                expression: {
                  and: [
                    { greaterOrEquals: ["@variables('threat_score')", 2] },
                    { less: ["@variables('threat_score')", 8] },
                  ],
                },
                actions: {
                  Analyst_Approval_Required_Branch: {
                    type: 'Compose',
                    inputs: {
                      branch: 'Analyst Approval Required',
                      target: approvalRoute?.targetStepId ?? 'analyst_approval',
                      normalizedCondition: 'threat_score >= 2 AND threat_score < 8',
                    },
                  },
                },
                else: {
                  actions: {
                    Skip_Branch: {
                      type: 'Compose',
                      inputs: {
                        branch: 'Skip / Out of Scope',
                        target: skipRoute?.targetStepId ?? 'finalize',
                        normalizedCondition: 'threat_score < 2',
                      },
                    },
                  },
                },
              },
            },
          },
          runAfter,
        };
      } else if (step.type === 'approval') {
        logicActions[key] = {
          type: 'ApiConnection',
          inputs: {
            host: {
              connection: { name: "@parameters('$connections')['approvals']['connectionId']" },
            },
            method: 'post',
            path: '/approvalrequest',
            body: {
              title: `Approval Required: ${playbook.name}`,
              message: step.description ?? 'SOC analyst review required before executing containment actions.',
              to: '@{triggerBody()?[\'object\']?[\'properties\']?[\'owner\']}',
            },
          },
          runAfter,
          description: 'Manual approval gate — verify approval connector is configured in tenant',
        };
      } else if (step.type === 'action') {
        const actionDef = this.getLogicAppAction(step);
        logicActions[key] = {
          ...actionDef,
          runAfter,
        };
      } else if (step.type === 'enrichment') {
        logicActions[key] = {
          type: 'Compose',
          inputs: {
            step: step.name,
            normalizedAction: step.normalizedAction ?? null,
            category: step.connectorCategory ?? null,
            entity: "@triggerBody()?['object']?['properties']?['relatedEntities']",
            verifyInTenant: true,
            hint: `Replace this Compose with appropriate ${step.connectorCategory ?? 'enrichment'} API connection action`,
          },
          runAfter,
        };
      } else if (step.type === 'notification') {
        logicActions[key] = {
          type: 'ApiConnection',
          inputs: {
            host: {
              connection: { name: "@parameters('$connections')['office365']['connectionId']" },
            },
            method: 'post',
            path: '/v2/Mail',
            body: {
              To: step.parameters?.to ?? '@{variables(\'soc_email\')}',
              Subject: step.parameters?.subject ?? `SOAR Alert: ${playbook.name}`,
              Body: `<p>${step.parameters?.body ?? 'Automated containment completed. Review case.'}</p>`,
              Importance: 'High',
            },
          },
          runAfter,
        };
      } else if (step.type === 'ticket') {
        logicActions[key] = {
          type: 'Compose',
          inputs: {
            step: 'Create Ticket',
            normalizedAction: 'ticket.issue.create',
            title: step.parameters?.title ?? `${playbook.name} — Automated Response`,
            severity: "@variables('threat_severity')",
            description: "@variables('case_summary')",
            hint: 'Replace this Compose with ServiceNow/Jira API connection action from your tenant',
            verifyInTenant: true,
          },
          runAfter,
        };
      } else if (step.type === 'comment') {
        logicActions[key] = {
          type: 'ApiConnection',
          inputs: {
            host: {
              connection: { name: "@parameters('$connections')['azuresentinel']['connectionId']" },
            },
            method: 'post',
            path: "/Incidents/subscriptions/@{encodeURIComponent(triggerBody()?['workspaceInfo']?['SubscriptionId'])}/resourceGroups/@{encodeURIComponent(triggerBody()?['workspaceInfo']?['ResourceGroupName'])}/workspaces/@{encodeURIComponent(triggerBody()?['workspaceInfo']?['WorkspaceName'])}/IncidentComments",
            body: {
              message: step.parameters?.comment ?? 'Automated response completed by SOARForge playbook.',
            },
          },
          runAfter,
        };
      } else if (step.type === 'final') {
        logicActions[key] = {
          type: 'ApiConnection',
          inputs: {
            host: {
              connection: { name: "@parameters('$connections')['azuresentinel']['connectionId']" },
            },
            method: 'put',
            path: "/Incidents/subscriptions/@{encodeURIComponent(triggerBody()?['workspaceInfo']?['SubscriptionId'])}/resourceGroups/@{encodeURIComponent(triggerBody()?['workspaceInfo']?['ResourceGroupName'])}/workspaces/@{encodeURIComponent(triggerBody()?['workspaceInfo']?['WorkspaceName'])}/Incidents/@{encodeURIComponent(triggerBody()?['object']?['name'])}",
            body: {
              properties: {
                status: 'Closed',
                classification: 'TruePositive',
                classificationComment: 'Automated response completed by SOARForge.',
              },
            },
          },
          runAfter,
        };
      } else {
        logicActions[key] = {
          type: 'Compose',
          inputs: {
            step: step.name,
            type: step.type,
            normalizedAction: step.normalizedAction ?? null,
            description: step.description ?? '',
          },
          runAfter,
        };
      }
    }

    return logicActions;
  }

  private getLogicAppAction(step: NormalizedStep): Record<string, unknown> {
    const action = step.normalizedAction ?? '';

    if (action === 'edr.device.isolate') {
      return {
        type: 'ApiConnection',
        inputs: {
          host: { connection: { name: "@parameters('$connections')['microsoftdefender']['connectionId']" } },
          method: 'post',
          path: '/machines/@{variables(\'machine_id\')}/isolate',
          body: { isolationType: 'Full', comment: 'SOARForge automated isolation' },
        },
        description: 'Isolate-MgDeviceManagementManagedDevice — verify action in Defender connector',
      };
    }

    if (action === 'edr.device.unisolate') {
      return {
        type: 'ApiConnection',
        inputs: {
          host: { connection: { name: "@parameters('$connections')['microsoftdefender']['connectionId']" } },
          method: 'post',
          path: '/machines/@{variables(\'machine_id\')}/unisolate',
          body: { comment: 'SOARForge automated unisolation' },
        },
        description: 'Release device isolation — verify action in Defender connector',
      };
    }

    if (action === 'iam.user.disable') {
      return {
        type: 'ApiConnection',
        inputs: {
          host: { connection: { name: "@parameters('$connections')['microsoftgraph']['connectionId']" } },
          method: 'patch',
          path: '/v1.0/users/@{variables(\'username\')}',
          body: { accountEnabled: false },
        },
        description: 'Update-MgUser (accountEnabled: false) — disable user via Microsoft Graph',
      };
    }

    if (action === 'iam.session.revoke') {
      return {
        type: 'ApiConnection',
        inputs: {
          host: { connection: { name: "@parameters('$connections')['microsoftgraph']['connectionId']" } },
          method: 'post',
          path: '/v1.0/users/@{variables(\'username\')}/revokeSignInSessions',
        },
        description: 'Revoke-MgUserSignInSession — revoke all active sessions via Microsoft Graph',
      };
    }

    if (action === 'firewall.ip.block') {
      return {
        type: 'Compose',
        inputs: {
          normalizedAction: 'firewall.ip.block',
          hint: 'Replace with Palo Alto / Fortinet / Azure Firewall API connection',
          ipAddress: "@variables('ip_address')",
          verifyInTenant: true,
        },
        description: 'Block IP on firewall — verify with your firewall connector',
      };
    }

    // Default: Compose placeholder
    return {
      type: 'Compose',
      inputs: {
        step: step.name,
        normalizedAction: action,
        category: step.connectorCategory ?? null,
        parameters: step.parameters ?? {},
        verifyInTenant: step.verifyInTenant ?? true,
        hint: `Replace with ${step.connectorCategory ?? 'integration'} API connection action from your tenant`,
      },
      description: `${step.name} — verify and replace with correct API connection`,
    };
  }

  private actionKey(name: string): string {
    return name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  }

  validateReadiness(
    playbook: NormalizedPlaybook,
    _deploymentProfile: Record<string, unknown>,
  ): PlatformReadinessResult {
    const hasDecision = playbook.steps.some((s) => s.type === 'decision');
    const hasRunAfterLogic = playbook.routes.length > 0;

    const items = [
      {
        id: 'api_connections',
        label: 'API Connections Configured',
        passed: false,
        critical: true,
        message: 'Create and authorize API connections for Sentinel, Defender, Graph, Teams',
        recommendation: 'Create connections in Azure portal before deploying ARM template.',
      },
      {
        id: 'managed_identity',
        label: 'Managed Identity Permissions',
        passed: false,
        critical: true,
        message: 'Assign managed identity the Sentinel Responder and relevant roles',
        recommendation: 'Go to Logic App > Identity and assign roles via Azure RBAC.',
      },
      {
        id: 'sentinel_trigger',
        label: 'Sentinel Incident Trigger',
        passed: false,
        critical: false,
        message: 'Configure Sentinel automation rule to trigger this Logic App',
        recommendation: 'Create automation rule in Sentinel > Automation.',
      },
      {
        id: 'if_branching',
        label: 'If/Else Branching (Safety Gates)',
        passed: hasDecision,
        critical: false,
        message: hasDecision ? 'Safety Gates If/Else condition present — verify conditions match your threat score logic' : 'No decision/branch step found',
        recommendation: 'Validate If expression in Azure portal Logic App designer.',
      },
      {
        id: 'runafter_chain',
        label: 'runAfter Chain Valid',
        passed: hasRunAfterLogic,
        critical: false,
        message: hasRunAfterLogic ? 'runAfter dependencies generated from normalized routes' : 'No routes to build runAfter from',
        recommendation: 'Validate Logic App definition in Azure portal designer.',
      },
    ];

    return {
      platform: 'sentinel_logic_apps',
      overallReady: false,
      directImportReady: false,
      items,
      warnings: ['API connection IDs are placeholders — replace with actual resource IDs before deploying.'],
      blockers: ['API connections and managed identity permissions required before deployment.'],
    };
  }

  generateConnectorChecklist(playbook: NormalizedPlaybook): string {
    const lines = ['# Sentinel Logic Apps Connection Checklist\n'];
    for (const c of playbook.connectors) {
      lines.push(`## ${c.displayName} (${c.category})`);
      lines.push(`- [ ] API connection created in Azure portal`);
      lines.push(`- [ ] Connection authorized with correct credentials`);
      lines.push(`- [ ] Connection resource ID captured for ARM template parameters`);
      lines.push(`- [ ] Managed identity assigned appropriate RBAC role\n`);
    }
    return lines.join('\n');
  }

  generateDocumentation(playbook: NormalizedPlaybook): string {
    return [
      `# ${playbook.name} — Microsoft Sentinel Logic Apps Blueprint`,
      ``,
      `> **Deployable ARM Template** — configure API connections and managed identity before deploying.`,
      `> The Logic App is deployed in Disabled state — enable only after successful testing.`,
      ``,
      `## ARM Deployment Steps`,
      `1. Create API connections in Azure portal (Sentinel, Defender, Microsoft Graph, Teams)`,
      `2. Deploy ARM template: \`az deployment group create --template-file ${playbook.name.toLowerCase().replace(/\s+/g, '-')}_sentinel_logic_app_arm.json\``,
      `3. Assign managed identity roles (Sentinel Responder, MDE Machine Administrator)`,
      `4. Create Sentinel automation rule pointing to this Logic App`,
      `5. Test with manual trigger, then enable`,
      ``,
      `## Logic App Actions`,
      ...playbook.steps
        .filter((s) => s.type !== 'trigger')
        .map((s) => `- **${this.actionKey(s.name)}** (${s.type})${s.normalizedAction ? ` → \`${s.normalizedAction}\`` : ''}${s.connectorCategory ? ` [${s.connectorCategory}]` : ''}`),
      ``,
      `## Tenant Checklist`,
      ...playbook.documentation.tenantChecklist.map((c) => `- [ ] ${c}`),
    ].join('\n');
  }
}
