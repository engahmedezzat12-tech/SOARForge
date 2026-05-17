// ============================================================
// Generic / CACAO SOAR Adapter — Normalized Blueprint
// ============================================================

import type { VendorAdapter, VendorExportResult, PlatformReadinessResult } from './platform-adapter';
import type { NormalizedPlaybook } from '../normalized/normalized-types';

export class GenericSOARAdapter implements VendorAdapter {
  platformId = 'generic_soar' as const;
  platformName = 'Generic SOAR / CACAO';
  exportFormat = 'normalized_soar_json';
  directImportSupported = false;
  blueprintOnly = true;
  requiresTenantVerification = true;

  generateExport(
    playbook: NormalizedPlaybook,
    _deploymentProfile: Record<string, unknown>,
  ): VendorExportResult {
    const slug = (playbook.name || 'soarforge').toLowerCase().replace(/\s+/g, '-');

    // Build CACAO v2 playbook structure
    const cacaoWorkflow: Record<string, unknown> = {};

    for (const step of playbook.steps) {
      const nextRoutes = playbook.routes.filter((r) => r.sourceStepId === step.id);
      const onSuccess = nextRoutes.find((r) => r.condition === 'success' || r.condition === 'always' || r.condition === 'true')?.targetStepId;
      const onFailure = nextRoutes.find((r) => r.condition === 'failure' || r.condition === 'false')?.targetStepId;

      cacaoWorkflow[`action--${step.id}`] = {
        type: this.mapToCacaoType(step.type),
        name: step.name,
        description: step.description ?? '',
        on_success: onSuccess ? `action--${onSuccess}` : undefined,
        on_failure: onFailure ? `action--${onFailure}` : undefined,
        commands: step.normalizedAction
          ? [{ type: 'manual', command: step.normalizedAction }]
          : [],
        ...(step.isDestructive ? { isDestructive: true } : {}),
        ...(step.approvalRequired ? { approvalRequired: true } : {}),
        ...(step.verifyInTenant ? { verifyInTenant: true } : {}),
      };
    }

    const cacaoPlaybook = {
      type: 'playbook',
      spec_version: 'cacao-2.0',
      id: `playbook--${slug}`,
      name: playbook.name,
      description: playbook.description,
      playbook_types: ['notification', 'investigation', 'remediation'],
      created_by: 'SOARForge',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      workflow_start: playbook.steps[0] ? `action--${playbook.steps[0].id}` : undefined,
      workflow: cacaoWorkflow,
      playbook_variables: Object.fromEntries(
        (playbook.entities ?? []).map((e) => [
          e.id,
          { type: 'string', description: e.label, external: true },
        ])
      ),
    };

    const content = {
      platform: 'generic_soar',
      exportType: 'blueprint',
      directImportSupported: false,
      requiresTenantVerification: true,
      normalizedPlaybook: playbook,
      cacaoV2Playbook: cacaoPlaybook,
    };

    return {
      platform: 'generic_soar',
      platformName: this.platformName,
      exportType: 'blueprint',
      fileName: `${slug}_normalized_soar_blueprint.json`,
      mimeType: 'application/json',
      directImportSupported: false,
      blueprintOnly: true,
      requiresTenantVerification: true,
      warnings: [
        'Normalized blueprint for documentation and cross-platform comparison.',
        'Use as input to custom adapters for other SOAR platforms.',
        'CACAO v2 structure included for standards-based documentation.',
      ],
      content,
    };
  }

  private mapToCacaoType(stepType: string): string {
    const map: Record<string, string> = {
      trigger: 'start',
      context: 'action',
      entity_extraction: 'action',
      enrichment: 'action',
      scoring: 'action',
      decision: 'if-condition',
      approval: 'manual-action',
      action: 'action',
      notification: 'action',
      ticket: 'action',
      manual: 'manual-action',
      comment: 'action',
      rollback: 'action',
      final: 'end',
    };
    return map[stepType] ?? 'action';
  }

  validateReadiness(
    playbook: NormalizedPlaybook,
    _deploymentProfile: Record<string, unknown>,
  ): PlatformReadinessResult {
    return {
      platform: 'generic_soar',
      overallReady: true,
      directImportReady: false,
      items: [
        {
          id: 'normalization',
          label: 'Normalized Blueprint Ready',
          passed: true,
          critical: false,
          message: 'Normalized SOAR blueprint and CACAO v2 playbook generated successfully.',
          recommendation: 'Use as reference for manual implementation on your target platform.',
        },
      ],
      warnings: ['Use as documentation/reference only — not a direct import.'],
      blockers: [],
    };
  }

  generateConnectorChecklist(playbook: NormalizedPlaybook): string {
    const lines = ['# Normalized Connector Checklist\n'];
    for (const c of playbook.connectors) {
      lines.push(`## ${c.displayName} (${c.category})`);
      lines.push(`- Normalized category: ${c.category}`);
      lines.push(`- Supported platforms: ${c.supportedPlatforms.join(', ')}`);
      lines.push(`- Verify in tenant: ${c.verifyInTenant}\n`);
    }
    return lines.join('\n');
  }

  generateDocumentation(playbook: NormalizedPlaybook): string {
    return [
      `# ${playbook.name} — Normalized SOAR Blueprint`,
      ``,
      `> CACAO v2 standard format for cross-platform documentation and comparison.`,
      ``,
      `## Steps`,
      ...playbook.steps.map((s) => `- **${s.name}** (${s.type})${s.normalizedAction ? ' → ' + s.normalizedAction : ''}`),
      ``,
      `## Platform Checklist`,
      ...playbook.documentation.tenantChecklist.map((c) => `- [ ] ${c}`),
    ].join('\n');
  }
}
