// ============================================================
// FortiSOAR Adapter — wraps existing generator
// ============================================================

import type { VendorAdapter, VendorExportResult, PlatformReadinessResult } from './platform-adapter';
import type { NormalizedPlaybook } from '../normalized/normalized-types';
import type { PlaybookState } from '../soar-types';
import {
  generateFortiSOARExportPackage,
  buildDefaultDeploymentProfile,
} from '../fortisoar-workflow-generator';

export class FortiSOARAdapter implements VendorAdapter {
  platformId = 'fortisoar' as const;
  platformName = 'Fortinet FortiSOAR';
  exportFormat = 'fortisoar_workflow_json';
  directImportSupported = true;
  blueprintOnly = false;
  requiresTenantVerification = true;

  generateExport(
    normalized: NormalizedPlaybook,
    deploymentProfile: Record<string, unknown>,
  ): VendorExportResult {
    // FortiSOAR adapter receives the raw PlaybookState via deploymentProfile._playbookState
    const playbookState = (deploymentProfile._playbookState ?? {}) as PlaybookState;
    const profile = buildDefaultDeploymentProfile(playbookState);
    const pkg = generateFortiSOARExportPackage(playbookState, profile);
    const slug = (normalized.name || 'soarforge').toLowerCase().replace(/\s+/g, '-');

    return {
      platform: 'fortisoar',
      platformName: this.platformName,
      exportType: 'direct_import',
      fileName: `${slug}_fortisoar_workflow.json`,
      mimeType: 'application/json',
      directImportSupported: true,
      blueprintOnly: false,
      requiresTenantVerification: true,
      warnings: [
        'Replace all {{CUSTOMER_*_CONFIG_UUID}} placeholders with actual connector UUIDs from your FortiSOAR instance.',
        'Verify connector operation names match the installed connector version.',
        'Set playbook to Inactive before first test run.',
      ],
      content: pkg.workflowCollection,
    };
  }

  generateFullPackage(
    normalized: NormalizedPlaybook,
    deploymentProfile: Record<string, unknown>,
  ): VendorExportResult {
    const playbookState = (deploymentProfile._playbookState ?? {}) as PlaybookState;
    const profile = buildDefaultDeploymentProfile(playbookState);
    const pkg = generateFortiSOARExportPackage(playbookState, profile);
    const slug = (normalized.name || 'soarforge').toLowerCase().replace(/\s+/g, '-');

    return {
      platform: 'fortisoar',
      platformName: this.platformName,
      exportType: 'direct_import',
      fileName: `${slug}_fortisoar_deployment_package.json`,
      mimeType: 'application/json',
      directImportSupported: true,
      blueprintOnly: false,
      requiresTenantVerification: true,
      warnings: [],
      content: pkg,
    };
  }

  validateReadiness(
    playbook: NormalizedPlaybook,
    deploymentProfile: Record<string, unknown>,
  ): PlatformReadinessResult {
    const items = [
      {
        id: 'connector_uuids',
        label: 'Connector Config UUIDs',
        passed: false,
        critical: true,
        message: 'Replace all {{CUSTOMER_*_CONFIG_UUID}} placeholders with valid UUIDs',
        recommendation: 'Open Step 11 Export Center > Connector Configuration tab to set UUIDs.',
      },
      {
        id: 'operation_names',
        label: 'Operation Names Verified',
        passed: false,
        critical: false,
        message: 'Verify connector operation names match your installed connector version',
        recommendation: 'Check FortiSOAR Connector marketplace for operation names.',
      },
      {
        id: 'playbook_inactive',
        label: 'Playbook Set to Inactive',
        passed: false,
        critical: false,
        message: 'Ensure playbook is Inactive before first test run to prevent accidental execution',
        recommendation: 'Set playbook status to Inactive in FortiSOAR after import.',
      },
    ];

    return {
      platform: 'fortisoar',
      overallReady: false,
      directImportReady: false,
      items,
      warnings: ['Replace UUID placeholders before importing to production.'],
      blockers: ['Connector Config UUIDs must be valid before production use.'],
    };
  }

  generateConnectorChecklist(playbook: NormalizedPlaybook): string {
    const lines = ['# FortiSOAR Connector Checklist\n'];
    for (const c of playbook.connectors) {
      lines.push(`## ${c.displayName} (${c.category})`);
      lines.push(`- [ ] Connector installed in FortiSOAR`);
      lines.push(`- [ ] Connector Config UUID obtained`);
      lines.push(`- [ ] Authentication verified`);
      lines.push(`- [ ] Test action executed successfully\n`);
    }
    return lines.join('\n');
  }

  generateDocumentation(playbook: NormalizedPlaybook): string {
    return [
      `# ${playbook.name} — FortiSOAR Deployment Guide`,
      '',
      `## Overview`,
      playbook.description,
      '',
      `## Steps`,
      ...playbook.steps.map((s) => `- **${s.name}** (${s.type})${s.description ? ': ' + s.description : ''}`),
      '',
      `## Tenant Verification`,
      ...playbook.documentation.tenantChecklist.map((c) => `- [ ] ${c}`),
    ].join('\n');
  }
}
