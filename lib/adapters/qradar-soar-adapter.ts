// ============================================================
// QRadar SOAR Adapter — Hardened Blueprint Only
// ============================================================

import type { VendorAdapter, VendorExportResult, PlatformReadinessResult } from './platform-adapter';
import type { NormalizedPlaybook } from '../normalized/normalized-types';

export class QRadarSOARAdapter implements VendorAdapter {
  platformId = 'qradar_soar' as const;
  platformName = 'IBM QRadar SOAR (Resilient)';
  exportFormat = 'qradar_soar_resz';
  directImportSupported = false;
  blueprintOnly = true;
  requiresTenantVerification = true;

  generateExport(
    playbook: NormalizedPlaybook,
    _deploymentProfile: Record<string, unknown>,
  ): VendorExportResult {
    const slug = (playbook.name || 'soarforge').toLowerCase().replace(/\s+/g, '-');

    // Incident fields from entities
    const incidentFields = playbook.entities.map((e) => ({
      api_name: `soarforge_${e.id}`,
      label: e.label,
      type: 'text',
      required: e.required,
      placeholder: `{{${e.id}}}`,
      description: `Mapped from alert: ${e.id}`,
    }));

    // Artifact types from entities
    const artifacts = playbook.entities.map((e) => ({
      type: e.type,
      fieldName: e.id,
      cefMapping: e.id,
      description: e.label,
    }));

    // Functions from action/enrichment steps
    const functions = playbook.steps
      .filter((s) => s.type === 'action' || s.type === 'enrichment')
      .map((s) => ({
        name: `verify in tenant: ${s.normalizedAction ?? s.name}`,
        display_name: s.name,
        description: s.description ?? '',
        normalizedAction: s.normalizedAction ?? null,
        category: s.connectorCategory ?? null,
        inputs: Object.keys(s.parameters ?? {}).map((k) => ({
          name: k,
          type: 'text',
          required: true,
          placeholder: `{{${k}}}`,
        })),
        outputs: Object.keys(s.outputs ?? {}).map((k) => ({
          name: k,
          type: 'text',
        })),
        isDestructive: s.isDestructive ?? false,
        verifyInTenant: true,
        notes: `Function must be defined in App Host. Verify exact name and parameters in your QRadar SOAR tenant.`,
      }));

    // Manual tasks from approval/manual steps
    const tasks = playbook.steps
      .filter((s) => s.type === 'approval' || s.type === 'manual')
      .map((s) => ({
        name: s.name,
        display_name: s.name,
        description: s.description ?? '',
        required: s.approvalRequired ?? false,
        instructions: `Manual task: ${s.name}.\n${s.description ?? ''}\nVerify analyst action is appropriate before proceeding.`,
        owner_role: 'SOC Analyst',
      }));

    // Scripts from scoring/decision steps
    const scripts = playbook.steps
      .filter((s) => s.type === 'scoring' || s.type === 'decision')
      .map((s) => ({
        name: s.name,
        language: 'python3',
        description: s.description ?? '',
        object_type: 'incident',
        script_text: `# ${s.name}\n# normalizedAction: ${s.normalizedAction ?? 'none'}\n# description: ${s.description ?? ''}\n\n# Example scoring logic — adapt to your environment\nthreat_score = incident.properties.soarforge_threat_score\n\nif threat_score >= 8:\n    incident.properties.soarforge_decision = 'auto_contain'\nelif threat_score >= 2:\n    incident.properties.soarforge_decision = 'analyst_approval'\nelse:\n    incident.properties.soarforge_decision = 'skip'\n\n# Verify field names match your QRadar SOAR configuration`,
        verifyInTenant: true,
      }));

    // Message destinations from connectors
    const messageDestinations = playbook.connectors.map((c) => ({
      name: `verify in tenant: ${c.displayName} message destination`,
      display_name: c.displayName,
      type: 'queue',
      category: c.category,
      notes: 'Message destination name and queue configuration must be verified in your QRadar SOAR tenant.',
    }));

    // Workflow steps
    const workflowSteps = playbook.steps.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      normalizedAction: s.normalizedAction ?? null,
      category: s.connectorCategory ?? null,
      isDestructive: s.isDestructive ?? false,
    }));

    const content = {
      platform: 'qradar_soar',
      exportType: 'blueprint',
      directImportSupported: false,
      requiresTenantVerification: true,
      blueprintOnly: true,
      importWarning: 'DO NOT attempt to use this file as a .resz import. .resz packages contain tenant-specific database IDs (type_ids) and must be generated from within a live QRadar SOAR instance using the Resilient tooling.',
      qradarBlueprint: {
        name: playbook.name,
        description: playbook.description,
        objectModel: ['Incident', 'Artifact', 'Task', 'Function', 'Message Destination', 'Script'],
        incidentFields,
        artifacts,
        tasks,
        functions,
        scripts,
        messageDestinations,
        phases: [
          {
            name: 'Detection & Enrichment',
            steps: playbook.steps.filter((s) => ['trigger', 'context', 'entity_extraction', 'enrichment', 'scoring'].includes(s.type)).map((s) => s.name),
          },
          {
            name: 'Decision & Approval',
            steps: playbook.steps.filter((s) => ['decision', 'approval'].includes(s.type)).map((s) => s.name),
          },
          {
            name: 'Containment & Response',
            steps: playbook.steps.filter((s) => s.type === 'action').map((s) => s.name),
          },
          {
            name: 'Notification & Closure',
            steps: playbook.steps.filter((s) => ['notification', 'ticket', 'comment', 'final'].includes(s.type)).map((s) => s.name),
          },
        ],
        workflowSteps,
        routes: playbook.routes.map((r) => ({
          from: r.sourceStepId,
          to: r.targetStepId,
          condition: r.condition,
          label: r.label ?? r.condition,
        })),
        verifyInTenant: [
          'Verify App Host integrations are installed from IBM App Exchange',
          'Verify functions are defined and mapped to correct message destinations',
          'Verify message destinations exist in your QRadar SOAR instance',
          'Verify incident field names match your QRadar SOAR configuration',
          'Create scripts using the Script Editor in QRadar SOAR Admin',
          'Generate .resz export only from within QRadar SOAR tenant — DO NOT use this blueprint as .resz',
          'Verify Isolate Endpoint function uses edr.device.isolate (EDR App Host integration)',
          'Verify Disable AD User function uses iam.user.disable (Active Directory integration)',
        ],
      },
    };

    return {
      platform: 'qradar_soar',
      platformName: this.platformName,
      exportType: 'blueprint',
      fileName: `${slug}_qradar_soar_blueprint.json`,
      mimeType: 'application/json',
      directImportSupported: false,
      blueprintOnly: true,
      requiresTenantVerification: true,
      warnings: [
        'Blueprint ONLY — DO NOT use as .resz import.',
        '.resz packages contain tenant-specific database IDs and must be generated inside QRadar SOAR.',
        'Use this blueprint as a reference for manual workflow creation in QRadar SOAR.',
        'Verify all function names and message destinations in your tenant.',
      ],
      content,
    };
  }

  validateReadiness(
    playbook: NormalizedPlaybook,
    _deploymentProfile: Record<string, unknown>,
  ): PlatformReadinessResult {
    const hasIsolateEndpoint = playbook.steps.some((s) => s.normalizedAction === 'edr.device.isolate');
    const hasDisableADUser = playbook.steps.some(
      (s) => s.normalizedAction === 'iam.user.disable' && s.connectorCategory === 'identity'
    );
    const hasFunctions = playbook.steps.some((s) => s.type === 'action' || s.type === 'enrichment');
    const hasTasks = playbook.steps.some((s) => s.type === 'approval' || s.type === 'manual');

    const items = [
      {
        id: 'blueprint_only',
        label: 'Blueprint Only — No .resz Import',
        passed: true,
        critical: false,
        message: 'QRadar SOAR export is reference blueprint only. Direct .resz import not supported.',
        recommendation: 'Use this blueprint as a guide for manual workflow creation in QRadar SOAR.',
      },
      {
        id: 'app_host',
        label: 'App Host Integrations',
        passed: false,
        critical: true,
        message: 'Install required App Host integrations in QRadar SOAR from IBM App Exchange',
        recommendation: 'Install apps from IBM App Exchange for each required integration.',
      },
      {
        id: 'functions',
        label: 'Functions Defined',
        passed: hasFunctions,
        critical: true,
        message: hasFunctions ? `${playbook.steps.filter((s) => s.type === 'action' || s.type === 'enrichment').length} function blueprints generated — verify in tenant` : 'No function steps found',
        recommendation: 'Use Resilient App Editor to create and configure functions in your instance.',
      },
      {
        id: 'tasks',
        label: 'Manual Tasks',
        passed: true,
        critical: false,
        message: hasTasks ? `${playbook.steps.filter((s) => s.type === 'approval').length} manual task(s) defined` : 'No manual tasks required',
        recommendation: 'Create tasks in QRadar SOAR incident management.',
      },
      {
        id: 'message_destinations',
        label: 'Message Destinations',
        passed: false,
        critical: true,
        message: 'Verify message destinations for each function are configured in QRadar SOAR',
        recommendation: 'Create message destinations in QRadar SOAR Admin > Apps.',
      },
      {
        id: 'normalize_isolate',
        label: 'Isolate Endpoint = edr.device.isolate',
        passed: hasIsolateEndpoint,
        critical: false,
        message: hasIsolateEndpoint ? 'Isolate Endpoint uses edr.device.isolate — correct' : 'No edr.device.isolate action found',
        recommendation: 'Verify the Isolate Endpoint function blueprint.',
      },
      {
        id: 'normalize_disable_ad',
        label: 'Disable AD User = iam.user.disable (identity)',
        passed: hasDisableADUser,
        critical: false,
        message: hasDisableADUser ? 'Disable AD User uses iam.user.disable (identity) — correct' : 'Check Disable AD User category',
        recommendation: 'Verify Disable AD User function is identity category.',
      },
    ];

    return {
      platform: 'qradar_soar',
      overallReady: false,
      directImportReady: false,
      items,
      warnings: ['Blueprint only — all components must be created manually in QRadar SOAR tenant.'],
      blockers: ['Cannot directly import — .resz must be generated inside the tenant.'],
    };
  }

  generateConnectorChecklist(playbook: NormalizedPlaybook): string {
    const lines = ['# QRadar SOAR Integration Checklist\n'];
    for (const c of playbook.connectors) {
      lines.push(`## ${c.displayName} (${c.category})`);
      lines.push(`- [ ] App installed from IBM App Exchange`);
      lines.push(`- [ ] Message destination created and queue configured`);
      lines.push(`- [ ] Functions defined and mapped to message destinations`);
      lines.push(`- [ ] Authentication configured in App Host\n`);
    }
    return lines.join('\n');
  }

  generateDocumentation(playbook: NormalizedPlaybook): string {
    const functions = playbook.steps.filter((s) => s.type === 'action' || s.type === 'enrichment');
    return [
      `# ${playbook.name} — IBM QRadar SOAR Blueprint`,
      ``,
      `> **Blueprint Only** — use as reference for manual workflow creation.`,
      `> DO NOT import as .resz — .resz packages contain tenant-specific type_ids.`,
      ``,
      `## Object Model`,
      `- Incident (sn_si_incident equivalent: qradar_incident)`,
      `- Artifacts: ${playbook.entities.map((e) => e.id).join(', ')}`,
      `- Functions: ${functions.length} automation functions`,
      `- Message Destinations: ${playbook.connectors.length} destinations`,
      ``,
      `## Functions (automation steps)`,
      ...functions.map((s) => `- **${s.name}** → \`${s.normalizedAction ?? s.id}\` [${s.connectorCategory ?? 'unknown'}] — verify in tenant`),
      ``,
      `## Workflow Phases`,
      `1. Detection & Enrichment`,
      `2. Decision & Approval (Safety Gates)`,
      `3. Containment & Response (${playbook.steps.filter((s) => s.type === 'action').map((s) => s.name).join(', ')})`,
      `4. Notification & Closure`,
      ``,
      `## Tenant Verification Checklist`,
      ...playbook.documentation.tenantChecklist.map((c) => `- [ ] ${c}`),
    ].join('\n');
  }
}
