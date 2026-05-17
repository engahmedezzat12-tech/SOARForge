// ============================================================
// SOARForge — Platform Compatibility Registry
// Internal source evidence is hidden. UI shows professional labels only.
// ============================================================

import type { SoarPlatformId } from '@/lib/soar-platforms';
import type { PlatformEvidenceProfile } from './evidence-types';

export const PLATFORM_EVIDENCE_REGISTRY: Record<SoarPlatformId, PlatformEvidenceProfile> = {
  fortisoar: {
    platformId: 'fortisoar',
    displayName: 'FortiSOAR',
    customerFacingValidationLabel: 'Format Validated',
    internalValidationLevel: 'schema_validated',
    confidence: 82,
    runtimeCertified: false,
    exportStrategy: 'schema_validated_export',
    fileExtension: '.json',
    requiresTenantVerification: true,
    manualRequirements: [
      'Replace connector configuration placeholders with real FortiSOAR connector UUIDs.',
      'Verify connector operation names match the installed connector versions.',
      'Import and test first in a non-production FortiSOAR tenant.',
      'Keep the playbook inactive during the first validation run.',
    ],
    limitations: [
      'Connector UUIDs and tenant-specific operation names cannot be guaranteed before import.',
      'Complex tenant-specific modules, picklists, and global variables require verification.',
    ],
    safeToGenerate: [
      'Workflow structure',
      'Decision branches',
      'Approval gates',
      'Connector step placeholders',
      'Documentation and implementation checklist',
    ],
  },

  cortex_xsoar: {
    platformId: 'cortex_xsoar',
    displayName: 'Cortex XSOAR',
    customerFacingValidationLabel: 'Format Validated',
    internalValidationLevel: 'schema_validated',
    confidence: 78,
    runtimeCertified: false,
    exportStrategy: 'schema_validated_export',
    fileExtension: '.yml / .json',
    requiresTenantVerification: true,
    manualRequirements: [
      'Configure required integration instances in XSOAR.',
      'Verify native command names against installed content packs.',
      'Validate incident field mappings and context paths.',
      'Import and test in a non-production XSOAR tenant.',
    ],
    limitations: [
      'Integration instance names are tenant-specific.',
      'Content pack versions may change command names or arguments.',
      'Manual tasks and layout behavior require tenant verification.',
    ],
    safeToGenerate: [
      'Playbook task structure',
      'Decision routing',
      'Manual review steps',
      'Command placeholder mappings',
      'Content-pack style draft',
    ],
  },

  splunk_soar: {
    platformId: 'splunk_soar',
    displayName: 'Splunk SOAR',
    customerFacingValidationLabel: 'Guided Build',
    internalValidationLevel: 'blueprint_only',
    confidence: 58,
    runtimeCertified: false,
    exportStrategy: 'guided_build_package',
    fileExtension: '.json / .py',
    requiresTenantVerification: true,
    manualRequirements: [
      'Map required apps to configured Splunk SOAR assets.',
      'Replace asset placeholders with real asset names.',
      'Validate CEF artifact fields and datapaths.',
      'Implement or review generated Python playbook logic before production.',
    ],
    limitations: [
      'Splunk SOAR playbooks often depend on Python logic and tenant-specific assets.',
      'Direct runtime behavior cannot be guaranteed without tenant execution.',
    ],
    safeToGenerate: [
      'Guided playbook package',
      'CEF mapping hints',
      'Action block blueprint',
      'Asset checklist',
      'Manual implementation guide',
    ],
  },

  qradar_soar: {
    platformId: 'qradar_soar',
    displayName: 'IBM QRadar SOAR',
    customerFacingValidationLabel: 'Guided Build',
    internalValidationLevel: 'blueprint_only',
    confidence: 55,
    runtimeCertified: false,
    exportStrategy: 'partial_export',
    fileExtension: '.json / .resz guide',
    requiresTenantVerification: true,
    manualRequirements: [
      'Verify App Host functions and action processors.',
      'Create or map incident fields in QRadar SOAR.',
      'Validate artifact types and workflow rules in tenant.',
      'Review scripts and function parameters before production.',
    ],
    limitations: [
      'Function names and App Host dependencies are tenant-specific.',
      'Direct .resz generation is not guaranteed without packaging validation.',
    ],
    safeToGenerate: [
      'Incident field blueprint',
      'Artifact mapping',
      'Function checklist',
      'Manual task structure',
      'Implementation documentation',
    ],
  },

  sentinel_logic_apps: {
    platformId: 'sentinel_logic_apps',
    displayName: 'Microsoft Sentinel + Logic Apps',
    customerFacingValidationLabel: 'Platform Pattern Validated',
    internalValidationLevel: 'platform_pattern_validated',
    confidence: 84,
    runtimeCertified: false,
    exportStrategy: 'platform_pattern_validated_export',
    fileExtension: '.json',
    requiresTenantVerification: true,
    manualRequirements: [
      'Create or select Logic App API connections.',
      'Configure Managed Identity or OAuth permissions.',
      'Verify Microsoft Sentinel automation rule trigger.',
      'Deploy to a test resource group first.',
    ],
    limitations: [
      'API connection IDs and Managed Identity permissions are tenant-specific.',
      'Some connectors require manual consent in Azure.',
    ],
    safeToGenerate: [
      'ARM template structure',
      'Logic App actions',
      'Condition and runAfter routing',
      'Connection parameters',
      'Deployment checklist',
    ],
  },

  servicenow_secops: {
    platformId: 'servicenow_secops',
    displayName: 'ServiceNow SecOps',
    customerFacingValidationLabel: 'Guided Build',
    internalValidationLevel: 'blueprint_only',
    confidence: 45,
    runtimeCertified: false,
    exportStrategy: 'manual_implementation_guide',
    fileExtension: '.json guide',
    requiresTenantVerification: true,
    manualRequirements: [
      'Verify SecOps module is active and licensed.',
      'Validate table names, fields, and Flow Designer actions.',
      'Create the flow manually using the generated implementation guide.',
      'Validate IntegrationHub spokes and credentials.',
    ],
    limitations: [
      'Update sets, sys_ids, and Flow Designer internals are tenant-specific.',
      'Direct XML update set generation is not safe without tenant validation.',
    ],
    safeToGenerate: [
      'Flow Designer guide',
      'Variable list',
      'Approval steps',
      'Spoke checklist',
      'Implementation documentation',
    ],
  },

  tines: {
    platformId: 'tines',
    displayName: 'Tines',
    customerFacingValidationLabel: 'Platform Pattern Validated',
    internalValidationLevel: 'platform_pattern_validated',
    confidence: 86,
    runtimeCertified: false,
    exportStrategy: 'direct_import_candidate',
    fileExtension: '.json',
    requiresTenantVerification: true,
    manualRequirements: [
      'Create required credentials in Tines.',
      'Create required resources such as base URLs.',
      'Replace team/story placeholders.',
      'Test with a sample event before enabling production triggers.',
    ],
    limitations: [
      'Credentials, resources, team IDs, and pages are workspace-specific.',
      'Liquid templating must be validated in the Tines tenant.',
    ],
    safeToGenerate: [
      'Story JSON structure',
      'Agents and links',
      'Credential placeholders',
      'Resource placeholders',
      'Manual intervention agents',
    ],
  },

  shuffle: {
    platformId: 'shuffle',
    displayName: 'Shuffle',
    customerFacingValidationLabel: 'Platform Pattern Validated',
    internalValidationLevel: 'platform_pattern_validated',
    confidence: 80,
    runtimeCertified: false,
    exportStrategy: 'direct_import_candidate',
    fileExtension: '.json',
    requiresTenantVerification: true,
    manualRequirements: [
      'Verify installed apps and app versions.',
      'Configure workflow variables and credentials.',
      'Test each node before full workflow execution.',
      'Adjust node positions and branch conditions if needed.',
    ],
    limitations: [
      'App names, versions, and auth variables are environment-specific.',
      'Some nodes may require manual app configuration.',
    ],
    safeToGenerate: [
      'Workflow JSON structure',
      'Nodes and edges',
      'Variable placeholders',
      'Branch conditions',
      'Execution checklist',
    ],
  },

  generic_soar: {
    platformId: 'generic_soar',
    displayName: 'Generic SOAR / CACAO',
    customerFacingValidationLabel: 'Format Validated',
    internalValidationLevel: 'schema_validated',
    confidence: 75,
    runtimeCertified: false,
    exportStrategy: 'schema_validated_export',
    fileExtension: '.json',
    requiresTenantVerification: true,
    manualRequirements: [
      'Map generic actions to the target SOAR platform.',
      'Validate connector support in the target environment.',
      'Convert or adapt the normalized schema before production use.',
    ],
    limitations: [
      'Generic exports are not directly executable by vendor platforms.',
      'Platform-specific adapters are required for runtime execution.',
    ],
    safeToGenerate: [
      'Vendor-neutral schema',
      'Normalized workflow',
      'Action and entity documentation',
      'Implementation guide',
    ],
  },
};

export function getPlatformEvidenceProfile(platformId: SoarPlatformId): PlatformEvidenceProfile {
  return PLATFORM_EVIDENCE_REGISTRY[platformId] ?? PLATFORM_EVIDENCE_REGISTRY.generic_soar;
}
