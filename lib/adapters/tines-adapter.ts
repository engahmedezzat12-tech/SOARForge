// ============================================================
// Tines Adapter — Hardened Story JSON Blueprint
// ============================================================

import type { VendorAdapter, VendorExportResult, PlatformReadinessResult } from './platform-adapter';
import type { NormalizedPlaybook, NormalizedStep } from '../normalized/normalized-types';

export class TinesAdapter implements VendorAdapter {
  platformId = 'tines' as const;
  platformName = 'Tines';
  exportFormat = 'tines_story_json';
  directImportSupported = true;
  blueprintOnly = false;
  requiresTenantVerification = true;

  generateExport(
    playbook: NormalizedPlaybook,
    _deploymentProfile: Record<string, unknown>,
  ): VendorExportResult {
    const slug = (playbook.name || 'soarforge').toLowerCase().replace(/\s+/g, '-');

    // Build Tines agents from normalized steps
    const agentIdMap = new Map<string, number>();
    playbook.steps.forEach((step, idx) => {
      agentIdMap.set(step.id, idx + 1);
    });

    const agents = playbook.steps.map((step, idx) => {
      return this.buildAgent(step, idx + 1, playbook, slug);
    });

    // Build links from normalized routes
    const links = playbook.routes
      .map((r) => {
        const sourceId = agentIdMap.get(r.sourceStepId);
        const targetId = agentIdMap.get(r.targetStepId);
        if (sourceId === undefined || targetId === undefined) return null;
        return {
          source_id: sourceId,
          receiver_id: targetId,
          label: r.label ?? r.condition ?? '',
        };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);

    // Collect required credentials
    const credentialNames = [...new Set(
      playbook.connectors.map((c) => `${c.category.toUpperCase()}_API_KEY`)
    )];
    credentialNames.push('SOC_EMAIL');
    credentialNames.push('soarforge_webhook_secret');

    // Collect required resources
    const resourceNames = [...new Set(
      playbook.connectors.map((c) => `${c.category.toUpperCase()}_BASE_URL`)
    )];

    const content = {
      schema_version: 3,
      name: playbook.name,
      description: playbook.description,
      guid: `soarforge-story-${slug}`,
      agents,
      links,
      team_id: '{{TINES_TEAM_ID}}',
      tags: ['soarforge', 'automated', 'soc'],
      verifyInTenant: [
        'Replace {{TINES_TEAM_ID}} with your actual Tines team ID',
        'Create credentials for each external service listed in credentialsRequired',
        'Create resources (base URLs) for each integration listed in resourcesRequired',
        'Verify HTTP endpoint URLs and authentication headers for each HTTPRequestAgent',
        'Configure ManualInterventionAgent approval pages in Tines > Pages if approval steps exist',
        'Test story with a sample event before enabling triggers',
        'Verify TriggerAgent condition paths match your expected event data structure',
      ],
      credentialsRequired: credentialNames.map((name) => ({
        name,
        type: 'text',
        credentialRef: `{{.CREDENTIAL.${name}}}`,
        description: `Verify and create this credential in your Tines workspace`,
        verifyInTenant: true,
      })),
      resourcesRequired: resourceNames.map((name) => ({
        name,
        type: 'text',
        resourceRef: `{{.RESOURCE.${name}}}`,
        description: `Verify and create this resource (base URL) in your Tines workspace`,
        verifyInTenant: true,
      })),
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
      platform: 'tines',
      platformName: this.platformName,
      exportType: 'blueprint',
      fileName: `${slug}_tines_story_blueprint.json`,
      mimeType: 'application/json',
      directImportSupported: true,
      blueprintOnly: false,
      requiresTenantVerification: true,
      warnings: [
        'Credentials and resources must be created in your Tines workspace before importing.',
        'Verify all HTTP endpoint URLs for each integration — URLs are placeholders.',
        'Replace {{TINES_TEAM_ID}} with your actual team ID.',
        'TriggerAgent conditions must be verified against your actual event data structure.',
      ],
      content,
    };
  }

  private buildAgent(
    step: NormalizedStep,
    agentId: number,
    playbook: NormalizedPlaybook,
    slug: string,
  ): unknown {
    const base = {
      id: agentId,
      guid: `soarforge-${step.id}`,
      name: step.name,
      description: step.description ?? '',
      position: { x: 120, y: 80 + (agentId - 1) * 160 },
    };

    if (step.type === 'trigger') {
      return {
        ...base,
        type: 'Agents::WebhookAgent',
        options: {
          secret: '{{.CREDENTIAL.soarforge_webhook_secret}}',
          verbs: 'get,post',
          path: `/api/v1/${slug}/trigger`,
          payload_type: 'json',
        },
        description: 'Receives SOAR platform alert/incident trigger. Replace with your actual webhook or scheduled trigger.',
      };
    }

    if (step.type === 'context' || step.type === 'entity_extraction') {
      return {
        ...base,
        type: 'Agents::EventTransformationAgent',
        options: {
          mode: 'explode',
          path: '{{.data}}',
          to: 'item',
          message: {
            hostname: '{{.data.hostname}}',
            username: '{{.data.username}}',
            machine_id: '{{.data.machine_id}}',
            file_hash: '{{.data.file_hash}}',
            command_line: '{{.data.command_line}}',
            source_ip: '{{.data.source_ip}}',
            normalized_step: step.name,
          },
        },
        description: 'Extract and normalize entities from the incident/alert event data.',
      };
    }

    if (step.type === 'scoring') {
      return {
        ...base,
        type: 'Agents::EventTransformationAgent',
        options: {
          mode: 'message_only',
          message: {
            threat_score: '{{.data.threat_score}}',
            severity: '{{.data.severity}}',
            scoring_model: step.description ?? 'additive',
            normalized_step: step.name,
          },
        },
        description: 'Evaluate behavior scoring model and calculate threat score.',
      };
    }

    if (step.type === 'decision') {
      // TriggerAgent with multiple conditions for branching
      const safetyGatesRoutes = playbook.routes.filter((r) => r.sourceStepId === step.id);
      return {
        ...base,
        type: 'Agents::TriggerAgent',
        options: {
          rules: [
            {
              type: 'regex',
              value: '^[8-9][0-9]*$|^[1-9][0-9]+$',
              path: '{{.threat_score}}',
              label: 'Auto Contain (score >= 8)',
            },
            {
              type: 'regex',
              value: '^[2-7]$',
              path: '{{.threat_score}}',
              label: 'Analyst Approval Required (score 2-7)',
            },
            {
              type: 'regex',
              value: '^[01]$',
              path: '{{.threat_score}}',
              label: 'Skip / Out of Scope (score 0-1)',
            },
          ],
        },
        description: 'Evaluate threat score and route to appropriate branch. Verify regex patterns match your score format.',
        branchRoutes: safetyGatesRoutes.map((r) => ({
          label: r.label ?? r.condition,
          targetStepId: r.targetStepId,
          condition: r.condition,
        })),
        verifyInTenant: true,
      };
    }

    if (step.type === 'approval') {
      return {
        ...base,
        type: 'Agents::ManualInterventionAgent',
        options: {
          title: `Approval Required: ${playbook.name}`,
          description: step.description ?? 'SOC analyst must review case details and approve or deny containment actions.',
          allow_multiple_responses: false,
          inputs: [
            { name: 'decision', label: 'Decision', type: 'select', options: ['Approved', 'Rejected'] },
            { name: 'notes', label: 'Analyst Notes', type: 'textarea' },
          ],
        },
        description: 'Manual approval gate — configure approval page in Tines > Pages before testing.',
        verifyInTenant: true,
      };
    }

    if (step.type === 'action' || step.type === 'enrichment') {
      const apiInfo = this.getApiInfo(step);
      return {
        ...base,
        type: 'Agents::HTTPRequestAgent',
        options: {
          url: apiInfo.urlTemplate,
          method: apiInfo.method,
          content_type: 'json',
          headers: {
            Authorization: `Bearer {{.CREDENTIAL.${(step.connectorCategory ?? 'integration').toUpperCase()}_API_KEY}}`,
            'Content-Type': 'application/json',
          },
          payload: Object.fromEntries(
            Object.entries(step.parameters ?? {}).map(([k, v]) => [k, `{{.${k} | default: "${v}"}}`])
          ),
          log_error_on_status: [400, 401, 403, 404, 500],
        },
        description: `${step.name} — verify URL and authentication in your Tines workspace.\nnormalizedAction: ${step.normalizedAction ?? 'none'}\ncategory: ${step.connectorCategory ?? 'unknown'}`,
        normalizedAction: step.normalizedAction ?? null,
        category: step.connectorCategory ?? null,
        isDestructive: step.isDestructive ?? false,
        verifyInTenant: true,
      };
    }

    if (step.type === 'notification') {
      return {
        ...base,
        type: 'Agents::SendEmailAgent',
        options: {
          recipients: step.parameters?.to ?? '{{.CREDENTIAL.SOC_EMAIL}}',
          subject: step.parameters?.subject ?? `SOAR Alert: ${playbook.name}`,
          body: step.parameters?.body ?? 'Automated containment completed. Please review the case.',
          content_type: 'text/html',
        },
        description: 'Send email notification to SOC team.',
      };
    }

    if (step.type === 'ticket') {
      return {
        ...base,
        type: 'Agents::HTTPRequestAgent',
        options: {
          url: `{{.RESOURCE.TICKETING_BASE_URL}}/api/tickets`,
          method: 'POST',
          content_type: 'json',
          headers: {
            Authorization: 'Bearer {{.CREDENTIAL.TICKETING_API_KEY}}',
          },
          payload: {
            title: step.parameters?.title ?? `${playbook.name} — Automated Response`,
            severity: '{{.threat_severity}}',
            description: '{{.case_summary}}',
            normalizedAction: 'ticket.issue.create',
          },
        },
        description: 'Create incident ticket — verify URL and authentication for your ticketing system.',
        verifyInTenant: true,
      };
    }

    if (step.type === 'comment') {
      return {
        ...base,
        type: 'Agents::EventTransformationAgent',
        options: {
          mode: 'message_only',
          message: {
            comment: step.parameters?.comment ?? 'Automated response completed by SOARForge playbook.',
            case_id: '{{.case_id}}',
            normalizedAction: 'case.comment.add',
          },
        },
        description: 'Add automated comment to SOAR case — replace with your SOAR API call if needed.',
      };
    }

    // Final / fallback
    return {
      ...base,
      type: 'Agents::EventTransformationAgent',
      options: {
        mode: 'message_only',
        message: {
          status: 'completed',
          step: step.name,
          normalizedAction: step.normalizedAction ?? 'case.close',
          playbook: playbook.name,
          completedAt: '{{.DATE}}',
        },
      },
      description: step.description ?? `${step.name} — finalize playbook execution`,
    };
  }

  private getApiInfo(step: NormalizedStep): { urlTemplate: string; method: string } {
    const action = step.normalizedAction ?? '';
    const category = step.connectorCategory ?? 'integration';

    const actionUrlMap: Record<string, { url: string; method: string }> = {
      'edr.device.isolate': {
        url: `{{.RESOURCE.EDR_BASE_URL}}/machines/{{.machine_id}}/isolate`,
        method: 'POST',
      },
      'edr.device.unisolate': {
        url: `{{.RESOURCE.EDR_BASE_URL}}/machines/{{.machine_id}}/unisolate`,
        method: 'POST',
      },
      'edr.device.search': {
        url: `{{.RESOURCE.EDR_BASE_URL}}/machines?$filter=computerDnsName+eq+'{{.hostname}}'`,
        method: 'GET',
      },
      'iam.user.disable': {
        url: `{{.RESOURCE.IDENTITY_BASE_URL}}/users/{{.username}}`,
        method: 'PATCH',
      },
      'iam.session.revoke': {
        url: `{{.RESOURCE.IDENTITY_BASE_URL}}/users/{{.username}}/revokeSignInSessions`,
        method: 'POST',
      },
      'firewall.ip.block': {
        url: `{{.RESOURCE.FIREWALL_BASE_URL}}/api/block`,
        method: 'POST',
      },
      'edr.ioc.block': {
        url: `{{.RESOURCE.EDR_BASE_URL}}/indicators`,
        method: 'POST',
      },
      'email.message.quarantine': {
        url: `{{.RESOURCE.EMAIL_BASE_URL}}/messages/{{.message_id}}/move`,
        method: 'POST',
      },
    };

    const info = actionUrlMap[action];
    if (info) return { urlTemplate: info.url, method: info.method };

    return {
      urlTemplate: `{{.RESOURCE.${category.toUpperCase()}_BASE_URL}}/verify-endpoint-in-tenant`,
      method: 'POST',
    };
  }

  validateReadiness(
    playbook: NormalizedPlaybook,
    _deploymentProfile: Record<string, unknown>,
  ): PlatformReadinessResult {
    const hasDecision = playbook.steps.some((s) => s.type === 'decision');
    const hasApproval = playbook.steps.some((s) => s.type === 'approval');
    const hasLinks = playbook.routes.length > 0;
    const agentCount = playbook.steps.length;

    const items = [
      {
        id: 'credentials',
        label: 'Credentials Configured',
        passed: false,
        critical: true,
        message: 'Create credentials for each external service in Tines workspace',
        recommendation: 'Go to Tines > Credentials to add API keys.',
      },
      {
        id: 'resources',
        label: 'Resources (Base URLs) Configured',
        passed: false,
        critical: true,
        message: 'Create resources for base URLs and configuration values',
        recommendation: 'Go to Tines > Resources to add URL resources.',
      },
      {
        id: 'http_endpoints',
        label: 'HTTP Endpoints Verified',
        passed: false,
        critical: true,
        message: 'Verify all HTTP request URLs are correct for your environment',
        recommendation: 'Test each HTTPRequestAgent individually with sample data.',
      },
      {
        id: 'trigger_agent',
        label: 'Decision / TriggerAgent Branching',
        passed: hasDecision && hasLinks,
        critical: false,
        message: hasDecision ? 'Decision TriggerAgent present — verify condition paths match your event structure' : 'No decision/branching agent found',
        recommendation: 'Verify TriggerAgent rules match your threat score data format.',
      },
      {
        id: 'approval_pages',
        label: 'Approval Pages Configured',
        passed: !hasApproval,
        critical: hasApproval,
        message: hasApproval ? 'ManualInterventionAgent requires approval page configuration in Tines > Pages' : 'No approval steps — no action needed',
        recommendation: 'Create approval pages in Tines > Pages.',
      },
      {
        id: 'agent_count',
        label: 'Agent Count',
        passed: agentCount > 0,
        critical: false,
        message: `${agentCount} agents generated from ${playbook.steps.length} normalized steps`,
        recommendation: 'Review agents in Tines Story Editor after import.',
      },
    ];

    return {
      platform: 'tines',
      overallReady: false,
      directImportReady: false,
      items,
      warnings: ['Verify all credentials and HTTP endpoints before enabling triggers.'],
      blockers: ['Credentials, resources, and HTTP endpoints must be verified before production use.'],
    };
  }

  generateConnectorChecklist(playbook: NormalizedPlaybook): string {
    const lines = ['# Tines Credential/Resource Checklist\n'];
    for (const c of playbook.connectors) {
      lines.push(`## ${c.displayName} (${c.category})`);
      lines.push(`- [ ] Credential: ${c.category.toUpperCase()}_API_KEY created in Tines workspace`);
      lines.push(`- [ ] Resource: ${c.category.toUpperCase()}_BASE_URL created with correct base URL`);
      lines.push(`- [ ] HTTP endpoint tested with sample payload\n`);
    }
    return lines.join('\n');
  }

  generateDocumentation(playbook: NormalizedPlaybook): string {
    return [
      `# ${playbook.name} — Tines Story Blueprint`,
      ``,
      `> **Direct Import Supported** — configure credentials and resources before importing.`,
      `> Replace all {{.CREDENTIAL.*}} and {{.RESOURCE.*}} references with actual values.`,
      ``,
      `## Agents (${playbook.steps.length} total)`,
      ...playbook.steps.map((s, i) => `- **[${i + 1}] ${s.name}** (${s.type})${s.normalizedAction ? ` → \`${s.normalizedAction}\`` : ''}${s.connectorCategory ? ` [${s.connectorCategory}]` : ''}`),
      ``,
      `## Required Credentials`,
      ...playbook.connectors.map((c) => `- \`${c.category.toUpperCase()}_API_KEY\` — ${c.displayName} authentication`),
      `- \`SOC_EMAIL\` — SOC team email address`,
      ``,
      `## Required Resources (Base URLs)`,
      ...playbook.connectors.map((c) => `- \`${c.category.toUpperCase()}_BASE_URL\` — ${c.displayName} API base URL`),
      ``,
      `## Tenant Checklist`,
      ...playbook.documentation.tenantChecklist.map((c) => `- [ ] ${c}`),
    ].join('\n');
  }
}
