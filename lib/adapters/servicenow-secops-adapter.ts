// ============================================================
// ServiceNow SecOps Adapter — Flow Blueprint Only
// ============================================================

import type { VendorAdapter, VendorExportResult, PlatformReadinessResult } from './platform-adapter';
import type { NormalizedPlaybook } from '../normalized/normalized-types';

export class ServiceNowSecOpsAdapter implements VendorAdapter {
  platformId = 'servicenow_secops' as const;
  platformName = 'ServiceNow Security Operations';
  exportFormat = 'servicenow_flow_xml';
  directImportSupported = false;
  blueprintOnly = true;
  requiresTenantVerification = true;

  generateExport(
    playbook: NormalizedPlaybook,
    _deploymentProfile: Record<string, unknown>,
  ): VendorExportResult {
    const slug = (playbook.name || 'soarforge').toLowerCase().replace(/\s+/g, '-');

    const spokes = [...new Set(
      playbook.connectors.map((c) => `verify in tenant: ${c.displayName} IntegrationHub spoke`)
    )];

    const flowActions = playbook.steps.map((step) => ({
      id: step.id,
      name: step.name,
      type: step.type,
      spokeName: step.connectorCategory
        ? `verify in tenant: ${step.connectorCategory} spoke`
        : null,
      actionName: step.normalizedAction
        ? `verify in tenant: ${step.normalizedAction}`
        : null,
      parameters: step.parameters ?? {},
      approvalRequired: step.approvalRequired ?? false,
      description: step.description ?? '',
      verifyInTenant: true,
    }));

    const approvalSteps = playbook.steps.filter((s) => s.type === 'approval').map((s) => ({
      name: s.name,
      approverRole: 'security_analyst',
      approvalType: 'manual',
      description: s.description ?? '',
    }));

    const content = {
      platform: 'servicenow_secops',
      exportType: 'blueprint',
      directImportSupported: false,
      requiresTenantVerification: true,
      blueprintOnly: true,
      flowBlueprint: {
        name: playbook.name,
        description: playbook.description,
        table: 'sn_si_incident',
        trigger: {
          type: 'record_created_or_updated',
          table: 'sn_si_incident',
          condition: 'state=open^priority<=2',
        },
        spokes,
        actions: flowActions,
        approvalSteps,
        variables: playbook.entities.map((e) => ({
          name: e.id,
          type: 'string',
          description: e.label,
        })),
        verifyInTenant: [
          'Verify Security Incident Response module is active',
          'Verify IntegrationHub spokes are installed and licensed',
          'Verify table and field names match your ServiceNow instance',
          'Build flows using Flow Designer with this blueprint as a reference',
          'Avoid generating raw sys_hub_flow XML externally — build inside tenant',
          'Test with a manual Security Incident before enabling trigger',
        ],
        importNote: 'DO NOT attempt to use this as an XML Update Set. ServiceNow XML Update Sets contain sys_id relationships that are tenant-specific. Build flows in Flow Designer using this blueprint as a guide.',
      },
    };

    return {
      platform: 'servicenow_secops',
      platformName: this.platformName,
      exportType: 'blueprint',
      fileName: `${slug}_servicenow_secops_flow_blueprint.json`,
      mimeType: 'application/json',
      directImportSupported: false,
      blueprintOnly: true,
      requiresTenantVerification: true,
      warnings: [
        'Blueprint only — DO NOT use as XML Update Set import.',
        'ServiceNow XML Update Sets contain sys_ids that are tenant-specific.',
        'Build flows in Flow Designer using this blueprint as a reference guide.',
        'Verify all spoke/action names and table field mappings in your tenant.',
      ],
      content,
    };
  }

  validateReadiness(
    playbook: NormalizedPlaybook,
    _deploymentProfile: Record<string, unknown>,
  ): PlatformReadinessResult {
    const items = [
      {
        id: 'blueprint_only',
        label: 'Blueprint Only — No Direct Import',
        passed: true,
        critical: false,
        message: 'ServiceNow SecOps export is reference blueprint only. XML Update Set import not supported.',
        recommendation: 'Build flows in Flow Designer using this blueprint as a guide.',
      },
      {
        id: 'sir_module',
        label: 'Security IR Module Active',
        passed: false,
        critical: true,
        message: 'Verify Security Incident Response module is installed and active',
        recommendation: 'Activate SIR module in ServiceNow Plugins.',
      },
      {
        id: 'integration_hub',
        label: 'IntegrationHub Spokes Installed',
        passed: false,
        critical: true,
        message: 'Install IntegrationHub spokes for each required integration',
        recommendation: 'Install spokes from ServiceNow Store.',
      },
      {
        id: 'table_mapping',
        label: 'Table/Field Mappings',
        passed: false,
        critical: false,
        message: 'Verify table and field names match your ServiceNow instance configuration',
        recommendation: 'Check sn_si_incident table definition in your instance.',
      },
    ];

    return {
      platform: 'servicenow_secops',
      overallReady: false,
      directImportReady: false,
      items,
      warnings: ['Blueprint only — all flows must be built manually in Flow Designer.'],
      blockers: ['Cannot directly import — build flows inside the tenant using this guide.'],
    };
  }

  generateConnectorChecklist(playbook: NormalizedPlaybook): string {
    const lines = ['# ServiceNow SecOps Spoke Checklist\n'];
    for (const c of playbook.connectors) {
      lines.push(`## ${c.displayName} (${c.category})`);
      lines.push(`- [ ] IntegrationHub spoke installed from ServiceNow Store`);
      lines.push(`- [ ] Spoke connection configured`);
      lines.push(`- [ ] Action names verified`);
      lines.push(`- [ ] Tested with manual flow trigger\n`);
    }
    return lines.join('\n');
  }

  generateDocumentation(playbook: NormalizedPlaybook): string {
    return [
      `# ${playbook.name} — ServiceNow SecOps Blueprint`,
      ``,
      `> **Blueprint Only** — use as reference for Flow Designer. Do NOT import as XML Update Set.`,
      ``,
      `## Flow Steps`,
      ...playbook.steps.map((s) => `- **${s.name}** (${s.type})${s.normalizedAction ? ' → verify: ' + s.normalizedAction : ''}`),
      ``,
      `## Tenant Verification Checklist`,
      ...playbook.documentation.tenantChecklist.map((c) => `- [ ] ${c}`),
    ].join('\n');
  }
}
