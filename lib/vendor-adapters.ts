// ============================================================
// SOARForge Professional v1.1 — Vendor Adapter Architecture
// Platform-specific export adapters
// ============================================================

import type { SoarPlatformId } from './soar-platforms';
import type { 
  NormalizedPlaybook, 
  NormalizedWorkflowStep,
  NormalizedAction,
  PlatformCompatibility,
} from './normalized-soar-model';
import { NORMALIZED_ACTIONS, getPlatformActionMapping } from './normalized-soar-model';

// ──────────────────────────────────────────────────────────────────────────────
// ADAPTER INTERFACE
// ──────────────────────────────────────────────────────────────────────────────

export interface VendorAdapter {
  platformId: SoarPlatformId;
  platformName: string;
  
  // Export capabilities
  canExport: boolean;
  exportFormat: string;
  isDirectImport: boolean;
  
  // Validation
  validate(playbook: NormalizedPlaybook): ValidationResult;
  
  // Export
  export(playbook: NormalizedPlaybook): ExportResult;
  
  // Compatibility check
  checkCompatibility(playbook: NormalizedPlaybook): PlatformCompatibility;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  stepId?: string;
  field?: string;
  severity: 'error';
}

export interface ValidationWarning {
  code: string;
  message: string;
  stepId?: string;
  field?: string;
  severity: 'warning';
  suggestion?: string;
}

export interface ExportResult {
  success: boolean;
  format: string;
  filename: string;
  content: string | object;
  contentType: string;
  isBlueprint: boolean;
  verificationRequired: boolean;
  verificationSteps?: string[];
  errors?: string[];
}

// ──────────────────────────────────────────────────────────────────────────────
// BASE ADAPTER CLASS
// ──────────────────────────────────────────────────────────────────────────────

export abstract class BaseVendorAdapter implements VendorAdapter {
  abstract platformId: SoarPlatformId;
  abstract platformName: string;
  abstract canExport: boolean;
  abstract exportFormat: string;
  abstract isDirectImport: boolean;

  validate(playbook: NormalizedPlaybook): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Common validations
    if (!playbook.name || playbook.name.trim() === '') {
      errors.push({
        code: 'MISSING_NAME',
        message: 'Playbook name is required',
        severity: 'error',
      });
    }

    if (!playbook.steps || playbook.steps.length === 0) {
      errors.push({
        code: 'NO_STEPS',
        message: 'Playbook must have at least one step',
        severity: 'error',
      });
    }

    // Check each step for platform compatibility
    for (const step of playbook.steps || []) {
      if (step.type === 'action') {
        const actionConfig = step.config as { actionType?: string };
        if (actionConfig.actionType) {
          const mapping = getPlatformActionMapping(
            actionConfig.actionType as keyof typeof NORMALIZED_ACTIONS,
            this.platformId
          );
          if (!mapping || !mapping.isSupported) {
            warnings.push({
              code: 'UNSUPPORTED_ACTION',
              message: `Action "${actionConfig.actionType}" may not be supported on ${this.platformName}`,
              stepId: step.id,
              severity: 'warning',
              suggestion: 'Verify this action exists in your tenant',
            });
          } else if (mapping.requiresVerification) {
            warnings.push({
              code: 'VERIFY_IN_TENANT',
              message: `Action "${actionConfig.actionType}" requires verification in ${this.platformName} tenant`,
              stepId: step.id,
              severity: 'warning',
              suggestion: mapping.notes || 'Configure integration instance before importing',
            });
          }
        }
      }
    }

    // Platform-specific validations
    const platformValidation = this.validatePlatformSpecific(playbook);
    errors.push(...platformValidation.errors);
    warnings.push(...platformValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  abstract validatePlatformSpecific(playbook: NormalizedPlaybook): ValidationResult;
  abstract export(playbook: NormalizedPlaybook): ExportResult;

  checkCompatibility(playbook: NormalizedPlaybook): PlatformCompatibility {
    const validation = this.validate(playbook);
    const supportedFeatures: string[] = [];
    const unsupportedFeatures: string[] = [];
    const requiredVerifications: string[] = [];

    // Check each step
    for (const step of playbook.steps || []) {
      if (step.type === 'action') {
        const actionConfig = step.config as { actionType?: string };
        if (actionConfig.actionType) {
          const mapping = getPlatformActionMapping(
            actionConfig.actionType as keyof typeof NORMALIZED_ACTIONS,
            this.platformId
          );
          if (mapping?.isSupported) {
            supportedFeatures.push(actionConfig.actionType);
            if (mapping.requiresVerification) {
              requiredVerifications.push(`${actionConfig.actionType}: ${mapping.notes || 'Verify in tenant'}`);
            }
          } else {
            unsupportedFeatures.push(actionConfig.actionType);
          }
        }
      }
    }

    const compatibilityScore = supportedFeatures.length > 0
      ? Math.round((supportedFeatures.length / (supportedFeatures.length + unsupportedFeatures.length)) * 100)
      : 100;

    return {
      isCompatible: validation.isValid && unsupportedFeatures.length === 0,
      compatibilityScore,
      supportedFeatures: [...new Set(supportedFeatures)],
      unsupportedFeatures: [...new Set(unsupportedFeatures)],
      requiredVerifications: [...new Set(requiredVerifications)],
      exportFormat: this.exportFormat,
      notes: this.isDirectImport 
        ? 'Direct import supported' 
        : 'Blueprint export - manual configuration required in tenant',
    };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// FORTISOAR ADAPTER (Full Export)
// ──────────────────────────────────────────────────────────────────────────────

export class FortiSOARAdapter extends BaseVendorAdapter {
  platformId: SoarPlatformId = 'fortisoar';
  platformName = 'Fortinet FortiSOAR';
  canExport = true;
  exportFormat = 'FortiSOAR Workflow JSON';
  isDirectImport = true;

  validatePlatformSpecific(playbook: NormalizedPlaybook): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // FortiSOAR-specific validations
    // Check for connector configurations
    for (const connector of playbook.connectors || []) {
      const mapping = connector.platformMappings?.fortisoar;
      if (!mapping) {
        warnings.push({
          code: 'MISSING_CONNECTOR_MAPPING',
          message: `Connector "${connector.name}" has no FortiSOAR mapping`,
          severity: 'warning',
          suggestion: 'Configure connector manually after import',
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  export(playbook: NormalizedPlaybook): ExportResult {
    const validation = this.validate(playbook);
    if (!validation.isValid) {
      return {
        success: false,
        format: this.exportFormat,
        filename: '',
        content: '',
        contentType: 'application/json',
        isBlueprint: false,
        verificationRequired: false,
        errors: validation.errors.map((e) => e.message),
      };
    }

    // Convert normalized playbook to FortiSOAR workflow format
    const fortisoarWorkflow = this.convertToFortiSOARFormat(playbook);

    return {
      success: true,
      format: this.exportFormat,
      filename: `${playbook.name.replace(/\s+/g, '-').toLowerCase()}-fortisoar.json`,
      content: fortisoarWorkflow,
      contentType: 'application/json',
      isBlueprint: false,
      verificationRequired: false,
      verificationSteps: [
        'Import workflow JSON into FortiSOAR',
        'Configure connector instances with your credentials',
        'Test workflow with sample alert',
      ],
    };
  }

  private convertToFortiSOARFormat(playbook: NormalizedPlaybook): object {
    // This would contain the full FortiSOAR workflow structure
    // For now, return a structured blueprint
    return {
      '@type': 'Workflow',
      name: playbook.name,
      description: playbook.description,
      isActive: true,
      debug: false,
      singleRecordExecution: false,
      remoteExecutableFlag: false,
      parameters: [],
      triggerStep: this.convertTriggerStep(playbook.trigger),
      steps: playbook.steps.map((step) => this.convertStep(step)),
      routes: this.buildRoutes(playbook.steps),
      metadata: {
        version: playbook.version,
        author: playbook.metadata.author,
        created: playbook.metadata.created,
        tags: playbook.metadata.tags,
        mitreAttack: playbook.metadata.mitreTechniques,
      },
    };
  }

  private convertTriggerStep(trigger: NormalizedWorkflowStep): object {
    return {
      '@id': trigger.id,
      name: trigger.name,
      description: trigger.description,
      arguments: {},
      status: null,
      triggerType: trigger.config.type === 'trigger' ? (trigger.config as any).triggerType : 'manual',
    };
  }

  private convertStep(step: NormalizedWorkflowStep): object {
    return {
      '@id': step.id,
      name: step.name,
      description: step.description,
      type: this.mapStepType(step.type),
      arguments: step.config,
      status: null,
    };
  }

  private mapStepType(type: string): string {
    const typeMap: Record<string, string> = {
      action: 'Connector',
      condition: 'Condition',
      approval: 'ManualInput',
      notification: 'Connector',
      loop: 'ForEach',
      parallel: 'Parallel',
      wait: 'Wait',
      set_variable: 'SetVariable',
      manual_task: 'ManualTask',
      end: 'End',
    };
    return typeMap[type] || 'Connector';
  }

  private buildRoutes(steps: NormalizedWorkflowStep[]): object[] {
    const routes: object[] = [];
    for (const step of steps) {
      for (const nextStepId of step.nextSteps || []) {
        routes.push({
          sourceStep: step.id,
          targetStep: nextStepId,
          condition: '',
        });
      }
    }
    return routes;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// CORTEX XSOAR ADAPTER (Blueprint Export)
// ──────────────────────────────────────────────────────────────────────────────

export class CortexXSOARAdapter extends BaseVendorAdapter {
  platformId: SoarPlatformId = 'cortex_xsoar';
  platformName = 'Palo Alto Cortex XSOAR / Demisto';
  canExport = true;
  exportFormat = 'XSOAR Content Pack Draft';
  isDirectImport = false;

  validatePlatformSpecific(playbook: NormalizedPlaybook): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // XSOAR-specific validations
    warnings.push({
      code: 'BLUEPRINT_EXPORT',
      message: 'Export generates a content pack draft that requires manual configuration',
      severity: 'warning',
      suggestion: 'Configure integration instances in XSOAR before importing',
    });

    return { isValid: true, errors, warnings };
  }

  export(playbook: NormalizedPlaybook): ExportResult {
    const validation = this.validate(playbook);
    
    // Convert to XSOAR playbook YAML structure
    const xsoarPlaybook = this.convertToXSOARFormat(playbook);

    return {
      success: true,
      format: this.exportFormat,
      filename: `${playbook.name.replace(/\s+/g, '-').toLowerCase()}-xsoar-blueprint.yml`,
      content: xsoarPlaybook,
      contentType: 'application/x-yaml',
      isBlueprint: true,
      verificationRequired: true,
      verificationSteps: [
        'Create new content pack in XSOAR',
        'Import playbook YAML into content pack',
        'Configure integration instances for each connector',
        'Map command parameters to your environment',
        'Test playbook with sample incident',
      ],
      errors: validation.errors.map((e) => e.message),
    };
  }

  private convertToXSOARFormat(playbook: NormalizedPlaybook): object {
    return {
      id: playbook.id,
      name: playbook.name,
      description: playbook.description,
      version: -1,
      starttaskid: playbook.trigger?.id || '0',
      tasks: this.convertTasks(playbook),
      view: this.generateView(playbook),
      inputs: this.convertInputs(playbook),
      outputs: [],
      fromversion: '6.0.0',
      // Blueprint notice
      _blueprint: {
        notice: 'This is a blueprint export. Manual configuration required.',
        requiredIntegrations: this.getRequiredIntegrations(playbook),
        verificationSteps: [
          'Configure integration instances',
          'Verify command availability',
          'Test with sample data',
        ],
      },
    };
  }

  private convertTasks(playbook: NormalizedPlaybook): object {
    const tasks: Record<string, object> = {};
    
    // Add trigger as first task
    if (playbook.trigger) {
      tasks[playbook.trigger.id] = {
        id: playbook.trigger.id,
        taskid: playbook.trigger.id,
        type: 'start',
        task: {
          id: playbook.trigger.id,
          name: playbook.trigger.name,
          description: playbook.trigger.description,
        },
        nexttasks: { '#none#': playbook.steps[0]?.id ? [playbook.steps[0].id] : [] },
      };
    }

    // Add remaining steps
    for (let i = 0; i < playbook.steps.length; i++) {
      const step = playbook.steps[i];
      const nextStep = playbook.steps[i + 1];
      
      tasks[step.id] = {
        id: step.id,
        taskid: step.id,
        type: this.mapXSOARType(step.type),
        task: {
          id: step.id,
          name: step.name,
          description: step.description,
          script: this.getScriptForStep(step),
        },
        nexttasks: { '#none#': nextStep ? [nextStep.id] : [] },
      };
    }

    return tasks;
  }

  private mapXSOARType(type: string): string {
    const typeMap: Record<string, string> = {
      action: 'regular',
      condition: 'condition',
      approval: 'manual',
      notification: 'regular',
      loop: 'loop',
      parallel: 'collection',
      end: 'end',
    };
    return typeMap[type] || 'regular';
  }

  private getScriptForStep(step: NormalizedWorkflowStep): string | null {
    if (step.type === 'action') {
      const config = step.config as { actionType?: string };
      if (config.actionType) {
        const mapping = getPlatformActionMapping(
          config.actionType as keyof typeof NORMALIZED_ACTIONS,
          'cortex_xsoar'
        );
        return mapping?.commandName || null;
      }
    }
    return null;
  }

  private generateView(playbook: NormalizedPlaybook): object {
    return {
      linkLabelsPosition: {},
      paper: { dimensions: { height: 800, width: 1200 } },
    };
  }

  private convertInputs(playbook: NormalizedPlaybook): object[] {
    return playbook.variables
      .filter((v) => v.scope === 'input')
      .map((v) => ({
        key: v.name,
        value: {},
        required: false,
        description: '',
      }));
  }

  private getRequiredIntegrations(playbook: NormalizedPlaybook): string[] {
    const integrations = new Set<string>();
    for (const connector of playbook.connectors || []) {
      const mapping = connector.platformMappings?.cortex_xsoar;
      if (mapping?.integrationName) {
        integrations.add(mapping.integrationName);
      }
    }
    return Array.from(integrations);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// SPLUNK SOAR ADAPTER (Blueprint Export)
// ──────────────────────────────────────────────────────────────────────────────

export class SplunkSOARAdapter extends BaseVendorAdapter {
  platformId: SoarPlatformId = 'splunk_soar';
  platformName = 'Splunk SOAR (Phantom)';
  canExport = true;
  exportFormat = 'Splunk SOAR Playbook Blueprint';
  isDirectImport = false;

  validatePlatformSpecific(playbook: NormalizedPlaybook): ValidationResult {
    const warnings: ValidationWarning[] = [{
      code: 'BLUEPRINT_EXPORT',
      message: 'Export generates a playbook blueprint with app/action mapping checklist',
      severity: 'warning',
      suggestion: 'Configure app assets in Splunk SOAR before importing',
    }];

    return { isValid: true, errors: [], warnings };
  }

  export(playbook: NormalizedPlaybook): ExportResult {
    const splunkPlaybook = this.convertToSplunkFormat(playbook);

    return {
      success: true,
      format: this.exportFormat,
      filename: `${playbook.name.replace(/\s+/g, '-').toLowerCase()}-splunk-blueprint.json`,
      content: splunkPlaybook,
      contentType: 'application/json',
      isBlueprint: true,
      verificationRequired: true,
      verificationSteps: [
        'Create new playbook in Splunk SOAR',
        'Import blueprint structure',
        'Configure app assets for each connector',
        'Map action parameters to your environment',
        'Test playbook with sample container',
      ],
    };
  }

  private convertToSplunkFormat(playbook: NormalizedPlaybook): object {
    return {
      blockly: null,
      blockly_xml: null,
      category: playbook.metadata.category,
      coa: null,
      create_time: playbook.metadata.created,
      description: playbook.description,
      is_active: false,
      is_note_required: false,
      name: playbook.name,
      playbook_type: 'automation',
      python_playbook: {
        name: playbook.name,
        blocks: this.convertBlocks(playbook),
      },
      _blueprint: {
        notice: 'This is a blueprint export. App assets must be configured.',
        requiredApps: this.getRequiredApps(playbook),
        actionMapping: this.getActionMapping(playbook),
      },
    };
  }

  private convertBlocks(playbook: NormalizedPlaybook): object[] {
    return playbook.steps.map((step, index) => ({
      block_id: index,
      name: step.name,
      type: step.type,
      config: step.config,
    }));
  }

  private getRequiredApps(playbook: NormalizedPlaybook): string[] {
    const apps = new Set<string>();
    for (const connector of playbook.connectors || []) {
      const mapping = connector.platformMappings?.splunk_soar;
      if (mapping?.appName) {
        apps.add(mapping.appName);
      }
    }
    return Array.from(apps);
  }

  private getActionMapping(playbook: NormalizedPlaybook): object[] {
    const mapping: object[] = [];
    for (const step of playbook.steps || []) {
      if (step.type === 'action') {
        const config = step.config as { actionType?: string };
        if (config.actionType) {
          const platformMapping = getPlatformActionMapping(
            config.actionType as keyof typeof NORMALIZED_ACTIONS,
            'splunk_soar'
          );
          mapping.push({
            stepName: step.name,
            normalizedAction: config.actionType,
            splunkAction: platformMapping?.actionName || 'CONFIGURE_MANUALLY',
            requiresConfiguration: true,
          });
        }
      }
    }
    return mapping;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// GENERIC SOAR ADAPTER (Normalized Blueprint)
// ──────────────────────────────────────────────────────────────────────────────

export class GenericSOARAdapter extends BaseVendorAdapter {
  platformId: SoarPlatformId = 'generic_soar';
  platformName = 'Generic SOAR Platform';
  canExport = true;
  exportFormat = 'Normalized SOAR JSON';
  isDirectImport = false;

  validatePlatformSpecific(_playbook: NormalizedPlaybook): ValidationResult {
    return {
      isValid: true,
      errors: [],
      warnings: [{
        code: 'GENERIC_EXPORT',
        message: 'Export generates a vendor-agnostic blueprint for manual adaptation',
        severity: 'warning',
        suggestion: 'Adapt this blueprint to your specific SOAR platform',
      }],
    };
  }

  export(playbook: NormalizedPlaybook): ExportResult {
    // Export the normalized playbook directly
    return {
      success: true,
      format: this.exportFormat,
      filename: `${playbook.name.replace(/\s+/g, '-').toLowerCase()}-normalized.json`,
      content: playbook,
      contentType: 'application/json',
      isBlueprint: true,
      verificationRequired: true,
      verificationSteps: [
        'Review normalized playbook structure',
        'Map connectors to your platform equivalents',
        'Translate actions to platform-specific operations',
        'Configure authentication and parameters',
        'Import and test in your SOAR platform',
      ],
    };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// ADAPTER REGISTRY
// ──────────────────────────────────────────────────────────────────────────────

const VENDOR_ADAPTERS: Record<SoarPlatformId, VendorAdapter> = {
  fortisoar: new FortiSOARAdapter(),
  cortex_xsoar: new CortexXSOARAdapter(),
  splunk_soar: new SplunkSOARAdapter(),
  qradar_soar: new GenericSOARAdapter(),
  sentinel_logic_apps: new GenericSOARAdapter(),
  servicenow_secops: new GenericSOARAdapter(),
  tines: new GenericSOARAdapter(),
  shuffle: new GenericSOARAdapter(),
  generic_soar: new GenericSOARAdapter(),
};

/**
 * Get adapter for a specific platform
 */
export function getVendorAdapter(platformId: SoarPlatformId): VendorAdapter {
  return VENDOR_ADAPTERS[platformId] || VENDOR_ADAPTERS.generic_soar;
}

/**
 * Get all available adapters
 */
export function getAllAdapters(): VendorAdapter[] {
  return Object.values(VENDOR_ADAPTERS);
}

/**
 * Export playbook for a specific platform
 */
export function exportForPlatform(
  playbook: NormalizedPlaybook,
  platformId: SoarPlatformId
): ExportResult {
  const adapter = getVendorAdapter(platformId);
  return adapter.export(playbook);
}

/**
 * Validate playbook for a specific platform
 */
export function validateForPlatform(
  playbook: NormalizedPlaybook,
  platformId: SoarPlatformId
): ValidationResult {
  const adapter = getVendorAdapter(platformId);
  return adapter.validate(playbook);
}

/**
 * Check compatibility for a specific platform
 */
export function checkPlatformCompatibility(
  playbook: NormalizedPlaybook,
  platformId: SoarPlatformId
): PlatformCompatibility {
  const adapter = getVendorAdapter(platformId);
  return adapter.checkCompatibility(playbook);
}
