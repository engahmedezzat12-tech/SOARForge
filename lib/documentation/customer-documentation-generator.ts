// ============================================================
// SOARForge Professional — Customer Documentation Generator
// ============================================================

import type { PlaybookState } from '../soar-types';
import type { NormalizedPlaybook } from '../normalized/normalized-types';
import type { SoarPlatformId } from '../soar-platforms';
import { getPlatformById } from '../soar-platforms';
import type {
  CustomerDocument,
  DocumentMetadata,
  ConfigurationSummary,
  DocumentWorkflowStep,
  DocumentScoringRule,
  DocumentThreshold,
  MitreMapping,
  ConnectorMatrixEntry,
  ResponseAction,
  FallbackItem,
  TestCase,
  ReadinessCheck,
  DeploymentStep,
  Limitation,
  DocumentExportFormat,
} from './documentation-types';
import { generateArchitectureDiagramSVG, generateDecisionFlowSVG } from './diagram-generator';
import { analyzeThreatCoverage } from '../threat-knowledge/threat-coverage-analyzer';

// Silence unused import warning
void (null as unknown as DocumentExportFormat);

// ── Connector display name map (canonical capitalisation) ────
const CONNECTOR_DISPLAY: Record<string, string> = {
  groupib_edr: 'Group-IB EDR',
  crowdstrike_edr: 'CrowdStrike EDR',
  sentinelone_edr: 'SentinelOne EDR',
  virustotal: 'VirusTotal',
  abuseipdb: 'AbuseIPDB',
  shodan: 'Shodan',
  activedirectory: 'Active Directory',
  active_directory: 'Active Directory',
  azure_ad: 'Azure Active Directory',
  jira: 'Jira',
  servicenow: 'ServiceNow',
  slack: 'Slack',
  teams: 'Microsoft Teams',
  email: 'Email (SMTP/Exchange)',
  fortigate: 'FortiGate Firewall',
  paloalto: 'Palo Alto Networks',
  fortiguard: 'FortiGuard',
  qradar: 'QRadar',
};

// ── Action display name map (canonical capitalisation) ───────
const ACTION_DISPLAY: Record<string, string> = {
  isolate_endpoint: 'Isolate Endpoint',
  disable_account: 'Disable Account',
  disable_ad_user: 'Disable Active Directory User',
  block_ip: 'Block IP Address',
  quarantine_email: 'Quarantine Email',
  create_ticket: 'Create Ticket',
  send_notification: 'Send Notification',
  enrich_ioc: 'Enrich IOC',
  block_ip_paloalto: 'Block IP on Palo Alto',
  create_servicenow_incident: 'Create ServiceNow Incident',
};

// ── MITRE technique descriptions ─────────────────────────────
const MITRE_TECHNIQUES: Record<string, string> = {
  T1486: 'Data Encrypted for Impact',
  T1490: 'Inhibit System Recovery',
  T1059: 'Command and Scripting Interpreter',
  'T1059.001': 'PowerShell',
  T1562: 'Impair Defenses',
  T1078: 'Valid Accounts',
  T1566: 'Phishing',
  'T1566.001': 'Spearphishing Attachment',
  'T1566.002': 'Spearphishing Link',
  T1190: 'Exploit Public-Facing Application',
  T1110: 'Brute Force',
  T1021: 'Remote Services',
  T1003: 'OS Credential Dumping',
  T1048: 'Exfiltration Over Alternative Protocol',
  T1204: 'User Execution',
};

// ── Action categories ────────────────────────────────────────
const ACTION_CATEGORIES: Record<string, string> = {
  isolate_endpoint: 'EDR',
  disable_account: 'Identity',
  disable_ad_user: 'Identity',
  block_ip: 'Firewall',
  quarantine_email: 'Email Security',
  create_ticket: 'Ticketing',
  send_notification: 'Communication',
  enrich_ioc: 'Threat Intel',
  block_ip_paloalto: 'Firewall',
  create_servicenow_incident: 'Ticketing',
};

// ── Connector categories ─────────────────────────────────────
const CONNECTOR_CATEGORIES: Record<string, string> = {
  groupib_edr: 'EDR',
  crowdstrike_edr: 'EDR',
  sentinelone_edr: 'EDR',
  virustotal: 'Threat Intel',
  abuseipdb: 'Threat Intel',
  shodan: 'Enrichment',
  activedirectory: 'Identity',
  active_directory: 'Identity',
  azure_ad: 'Identity',
  jira: 'Ticketing',
  servicenow: 'Ticketing',
  slack: 'Communication',
  teams: 'Communication',
  email: 'Communication',
  fortigate: 'Firewall',
  paloalto: 'Firewall',
  fortiguard: 'Threat Intel',
  qradar: 'SIEM',
};

// ── Display name helpers ─────────────────────────────────────
function connectorDisplayName(id: string): string {
  return CONNECTOR_DISPLAY[id] ?? id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function actionDisplayName(id: string): string {
  return ACTION_DISPLAY[id] ?? id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function normalizeDisplayText(text: string): string {
  return String(text ?? '')
    .replace(/\bWaf\b/g, 'WAF')
    .replace(/\bAbuseipdb\b/gi, 'AbuseIPDB')
    .replace(/\bFortiguard\b/gi, 'FortiGuard')
    .replace(/\bQradar\b/gi, 'QRadar')
    .replace(/\bServicenow\b/gi, 'ServiceNow')
    .replace(/\bPaloalto\b/gi, 'Palo Alto')
    .replace(/\bBlock Ip Paloalto\b/gi, 'Block IP on Palo Alto')
    .replace(/\bCreate Servicenow Incident\b/gi, 'Create ServiceNow Incident')
    .replace(/\bBlock Ip\b/gi, 'Block IP')
    .replace(/\bSoc\b/g, 'SOC')
    .replace(/\bMitre\b/g, 'MITRE')
    .replace(/\bEdr\b/g, 'EDR');
}

// ── Generate Customer Document ───────────────────────────────
export function generateCustomerDocument(
  playbook: PlaybookState,
  normalized: NormalizedPlaybook,
  targetPlatform: SoarPlatformId
): CustomerDocument {
  const platform = getPlatformById(targetPlatform);
  const now = new Date().toISOString().split('T')[0];

  // Fix: derive booleans directly from platform definition, never fall back to `true`
  const directImport = platform?.directImportSupported === true;
  const blueprintOnly = platform?.blueprintOnly === true;

  const metadata: DocumentMetadata = {
    playbookName: playbook.name,
    templateId: playbook.templateId || 'custom',
    targetPlatform,
    platformName: platform?.name ?? targetPlatform,
    exportType: directImport ? 'direct_import' : 'blueprint',
    directImportSupported: directImport,
    blueprintOnly,
    requiresTenantVerification: platform?.requiresTenantVerification ?? true,
    generatedAt: now,
    version: '1.0.0',
    preparedFor: 'Customer',
    preparedBy: 'Beta Integrated Solutions',
    classification: 'Customer Delivery / Implementation Guide',
  };

  const configSummary: ConfigurationSummary = {
    playbookName: playbook.name,
    useCase: normalizeDisplayText(playbook.templateId?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? 'Custom Playbook'),
    targetPlatform: platform?.name ?? targetPlatform,
    exportMode: directImport ? 'Direct Import' : 'Blueprint Only',
    directImportSupported: directImport,
    blueprintOnly,
    tenantVerificationRequired: platform?.requiresTenantVerification ?? true,
    severity: playbook.severity.toUpperCase(),
    owner: playbook.owner || 'SOC Team',
    status: playbook.status,
  };

  return {
    metadata,
    executiveSummary: buildExecutiveSummary(playbook, platform, normalized),
    configurationSummary: configSummary,
    workflowSteps: buildWorkflowSteps(normalized),
    scoringModel: buildScoringModel(playbook),
    mitreMapping: buildMitreMapping(playbook),
    threatCoverage: analyzeThreatCoverage(playbook, normalized, targetPlatform),
    connectorMatrix: buildConnectorMatrix(playbook, targetPlatform),
    vendorNotes: buildVendorNotes(targetPlatform),
    responseActions: buildResponseActions(playbook),
    approvalFlow: buildApprovalFlow(playbook, normalized),
    fallbackProcedure: buildFallbackProcedure(playbook),
    testCases: buildTestCases(),
    readinessChecks: buildReadinessChecks(playbook, targetPlatform),
    deploymentChecklist: buildDeploymentChecklist(targetPlatform),
    limitations: buildLimitations(targetPlatform, platform),
  };
}

// ── Executive Summary ────────────────────────────────────────
function buildExecutiveSummary(
  playbook: PlaybookState,
  platform: ReturnType<typeof getPlatformById>,
  normalized: NormalizedPlaybook
): string {
  const actionCount = playbook.actions.length;
  const enrichmentCount = playbook.enrichmentConnectors.length;
  const hasApproval = normalized.steps.some(s => s.type === 'approval');
  const directImport = platform?.directImportSupported === true;

  const lines: string[] = [];

  lines.push(
    `This implementation guide covers the automated deployment of the **${playbook.name}** playbook ` +
    `on **${platform?.name ?? targetPlatform(playbook)}**. The playbook extracts contextual entities ` +
    `from incoming alerts, applies ${playbook.scoringModel.type.replace(/_/g, ' ')} scoring ` +
    `across ${playbook.scoringModel.rules.length} configured rules, and triggers response actions ` +
    `based on calculated risk thresholds.`
  );

  lines.push('');
  lines.push('**Business Value**');
  lines.push('- Reduces mean time to response (MTTR) through automated triage and containment');
  lines.push('- Ensures consistent response procedures across all incidents of this type');
  lines.push('- Provides a full audit trail for compliance and forensic analysis');
  lines.push('- Minimises analyst fatigue by automating low-value investigation steps');

  lines.push('');
  lines.push('**Automation Scope**');
  lines.push(`- ${enrichmentCount} enrichment source${enrichmentCount !== 1 ? 's' : ''} queried per alert`);
  lines.push(`- ${actionCount} response action${actionCount !== 1 ? 's' : ''} available for containment`);
  lines.push(`- ${hasApproval ? 'Approval gate enabled — analyst sign-off required before destructive actions' : 'Fully automated response (no approval gate configured)'}`);

  lines.push('');
  if (directImport) {
    lines.push(
      '**Export Status:** This playbook is exported as a **direct-import workflow**. ' +
      'Replace template placeholders (connector UUID fields) with the actual values ' +
      'from your environment before importing.'
    );
  } else {
    lines.push(
      '**Export Status:** This export is a **blueprint only**. ' +
      `Integration instances, command/action names, and field mappings must be verified ` +
      `and manually configured in your ${platform?.name ?? 'SOAR'} tenant. ` +
      'A native import file is not generated for this platform.'
    );
  }

  return lines.join('\n');
}

// Helper used only in executive summary when platform ref is lost
function targetPlatform(playbook: PlaybookState): string {
  void playbook;
  return 'selected SOAR platform';
}

// ── Workflow Steps ───────────────────────────────────────────
function buildWorkflowSteps(normalized: NormalizedPlaybook): DocumentWorkflowStep[] {
  return normalized.steps.map((step, index) => ({
    stepNumber: index + 1,
    name: normalizeDisplayText(step.name),
    type: normalizeDisplayText(step.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())),
    purpose: normalizeDisplayText(step.description || getStepPurpose(step.type)),
    input: step.parameters ? Object.keys(step.parameters).join(', ') || 'Alert context' : 'Alert context',
    output: step.outputs ? Object.keys(step.outputs).join(', ') || 'Updated context' : 'Updated context',
    tenantVerification: step.verifyInTenant ?? false,
  }));
}

function getStepPurpose(type: string): string {
  const purposes: Record<string, string> = {
    trigger: 'Initiates playbook execution on incoming alert',
    context: 'Builds execution context from alert data',
    entity_extraction: 'Extracts IOCs and entities from alert fields',
    enrichment: 'Gathers additional context from external sources',
    scoring: 'Calculates risk score based on configured rules',
    decision: 'Evaluates thresholds and routes to appropriate response path',
    approval: 'Requests analyst approval before executing destructive actions',
    action: 'Executes containment or remediation action',
    notification: 'Sends alert or status update to configured channels',
    ticket: 'Creates or updates an incident ticket',
    final: 'Completes playbook execution and records outcome',
  };
  return purposes[type] || 'Executes workflow step';
}

// ── Scoring Model ────────────────────────────────────────────
function buildScoringModel(playbook: PlaybookState) {
  const rules: DocumentScoringRule[] = playbook.scoringModel.rules.map(rule => ({
    rule: rule.label,
    condition: rule.condition || 'Present in alert',
    points: rule.points,
    mitre: rule.mitre,
    purpose: rule.mitre ? `Detects ${MITRE_TECHNIQUES[rule.mitre] ?? rule.mitre}` : 'Risk indicator',
  }));

  const thresholds: DocumentThreshold[] = playbook.scoringModel.thresholds.map(t => ({
    scoreRange: `${t.minScore}${t.maxScore < 100 ? `–${t.maxScore}` : '+'}`,
    decision: t.label,
    action: t.action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    approvalRequired: t.action === 'analyst_approval',
    notes: t.description || '',
  }));

  const maxScore = rules.reduce((sum, r) => sum + r.points, 0);

  return {
    type: playbook.scoringModel.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    maxScore,
    rules,
    thresholds,
    decisionLogic: playbook.scoringModel.decisionLogic || 'Score evaluated against configured thresholds',
  };
}

// ── MITRE Mapping ────────────────────────────────────────────
function buildMitreMapping(playbook: PlaybookState): MitreMapping[] {
  const mappings: MitreMapping[] = [];

  for (const rule of playbook.scoringModel.rules) {
    if (rule.mitre && !mappings.find(m => m.technique === rule.mitre)) {
      mappings.push({
        technique: rule.mitre,
        name: MITRE_TECHNIQUES[rule.mitre] ?? 'Unknown Technique',
        whereUsed: `Scoring Rule: ${rule.label}`,
        riskContribution: `+${rule.points} points`,
      });
    }
  }

  for (const mitre of playbook.scoringModel.mitreMapping ?? []) {
    if (!mappings.find(m => m.technique === mitre)) {
      mappings.push({
        technique: mitre,
        name: MITRE_TECHNIQUES[mitre] ?? 'Unknown Technique',
        whereUsed: 'Playbook coverage',
        riskContribution: 'Detection coverage',
      });
    }
  }

  if (mappings.length === 0) {
    mappings.push({ technique: 'N/A', name: 'Not configured', whereUsed: 'N/A', riskContribution: 'N/A' });
  }

  return mappings;
}

// ── Connector Matrix ─────────────────────────────────────────
function buildConnectorMatrix(
  playbook: PlaybookState,
  targetPlatform: SoarPlatformId
): ConnectorMatrixEntry[] {
  const entries: ConnectorMatrixEntry[] = [];

  for (const conn of playbook.enrichmentConnectors) {
    entries.push({
      connector: connectorDisplayName(conn),
      category: CONNECTOR_CATEGORIES[conn] ?? 'Enrichment',
      usedFor: 'Entity enrichment and context gathering',
      required: true,
      platformEquivalent: getPlatformEquivalent(conn, targetPlatform),
      configurationRequired: 'API key / credentials, instance URL',
      verificationStatus: 'Verify in tenant',
      notes: 'Install and configure before activating the playbook',
    });
  }

  for (const action of playbook.actions) {
    const category = ACTION_CATEGORIES[action] ?? 'Response';
    if (!entries.find(e => e.category === category && e.usedFor !== 'Entity enrichment and context gathering')) {
      entries.push({
        connector: `${category} Connector`,
        category,
        usedFor: actionDisplayName(action),
        required: true,
        platformEquivalent: getPlatformEquivalent(action, targetPlatform),
        configurationRequired: 'API credentials, service account permissions',
        verificationStatus: 'Verify in tenant',
        notes: 'Confirm action/command names match your installed version',
      });
    }
  }

  if (entries.length === 0) {
    entries.push({
      connector: 'No connectors configured',
      category: 'N/A',
      usedFor: 'N/A',
      required: false,
      platformEquivalent: 'N/A',
      configurationRequired: 'N/A',
      verificationStatus: 'N/A',
      notes: 'Add enrichment and action connectors to the playbook',
    });
  }

  return entries;
}

function getPlatformEquivalent(connector: string, platform: SoarPlatformId): string {
  const map: Partial<Record<SoarPlatformId, Record<string, string>>> = {
    fortisoar: {
      groupib_edr: 'Group-IB Threat Hunting Framework connector',
      virustotal: 'VirusTotal connector',
      fortiguard: 'FortiGuard / FortiGuard Labs reputation connector',
      qradar: 'QRadar connector / SIEM search action',
      crowdstrike_edr: 'CrowdStrike Falcon connector',
      isolate_endpoint: 'Isolate Host action',
      disable_ad_user: 'Active Directory > Disable User action',
      disable_account: 'Active Directory > Disable User action',
    },
    cortex_xsoar: {
      groupib_edr: 'Group-IB THF integration',
      virustotal: 'VirusTotal v3 integration',
      crowdstrike_edr: 'CrowdStrike Falcon integration',
      isolate_endpoint: '!cs-falcon-contain-host',
      disable_ad_user: '!ad-disable-account',
      disable_account: '!ad-disable-account',
    },
    splunk_soar: {
      groupib_edr: 'Group-IB Threat Intelligence app',
      virustotal: 'VirusTotal app',
      crowdstrike_edr: 'CrowdStrike OAuth API app',
      isolate_endpoint: 'contain device',
      disable_ad_user: 'disable user (LDAP app)',
      disable_account: 'disable user (LDAP app)',
    },
    sentinel_logic_apps: {
      groupib_edr: 'Group-IB API custom connector',
      virustotal: 'VirusTotal Logic Apps connector',
      crowdstrike_edr: 'CrowdStrike Falcon API (HTTP action)',
      isolate_endpoint: 'HTTP action to EDR API',
      disable_ad_user: 'Azure AD — Disable User',
      disable_account: 'Azure AD — Disable User',
    },
    tines: {
      groupib_edr: 'HTTP Request agent to Group-IB API',
      virustotal: 'VirusTotal agent (built-in)',
      crowdstrike_edr: 'CrowdStrike HTTP agent',
      isolate_endpoint: 'HTTP Request to EDR API',
      disable_ad_user: 'Azure AD agent',
      disable_account: 'Azure AD agent',
    },
    shuffle: {
      groupib_edr: 'HTTP app — Group-IB endpoint',
      virustotal: 'VirusTotal app',
      crowdstrike_edr: 'CrowdStrike app',
      isolate_endpoint: 'EDR app — Isolate Device action',
      disable_ad_user: 'Active Directory app — Disable User action',
      disable_account: 'Active Directory app — Disable User action',
    },
    qradar_soar: {
      groupib_edr: 'Group-IB function package',
      virustotal: 'VirusTotal function package',
      crowdstrike_edr: 'CrowdStrike function package',
      isolate_endpoint: 'Isolate Endpoint function',
      disable_ad_user: 'Active Directory — Disable User function',
      disable_account: 'Active Directory — Disable User function',
    },
    servicenow_secops: {
      groupib_edr: 'IntegrationHub — Group-IB spoke',
      virustotal: 'IntegrationHub — VirusTotal spoke',
      crowdstrike_edr: 'IntegrationHub — CrowdStrike spoke',
      isolate_endpoint: 'EDR spoke — Isolate Device action',
      disable_ad_user: 'Active Directory spoke — Disable User action',
      disable_account: 'Active Directory spoke — Disable User action',
    },
  };

  const platformMap = map[platform] ?? {};
  return platformMap[connector] ?? 'Verify in tenant';
}

// ── Vendor Notes (structured, not Markdown) ──────────────────
function buildVendorNotes(targetPlatform: SoarPlatformId): string {
  const notes: Record<SoarPlatformId, string> = {
    fortisoar: [
      '## FortiSOAR — Implementation Notes',
      '',
      '### Import Process',
      '1. Navigate to **Automation > Playbooks** in your FortiSOAR instance',
      '2. Click **Import** and select the exported workflow JSON file',
      '3. The workflow is imported in **inactive** state — do not activate until configuration is complete',
      '',
      '### Connector UUID Placeholders',
      'The workflow JSON contains `{{CUSTOMER_*_CONFIG_UUID}}` placeholders. Replace each with the actual',
      'connector instance UUID from your tenant before activation.',
      '',
      '### Verification',
      '- Confirm operation names match your installed connector versions',
      '- Configure any custom module field mappings',
      '- Run a test execution with a non-production alert before enabling in production',
    ].join('\n'),

    cortex_xsoar: [
      '## Cortex XSOAR — Implementation Notes',
      '',
      '**Export type: Blueprint only.** Direct import is not supported.',
      '',
      '### Implementation Steps',
      '1. Create a new playbook in XSOAR and use this blueprint as a reference',
      '2. Ensure all required integration instances are installed and in a healthy state',
      '3. Map command names to the exact commands available in your installed integration versions',
      '4. Configure incident type field mappings for your incident types and context output paths',
      '',
      '### Verification Checklist',
      '- [ ] Integration instances are configured and healthy',
      '- [ ] Command names match your installed integration versions',
      '- [ ] Context path mappings are verified',
      '- [ ] Incident type field mappings are configured',
    ].join('\n'),

    splunk_soar: [
      '## Splunk SOAR — Implementation Notes',
      '',
      '**Export type: Blueprint only.** Use as a reference for manual playbook creation.',
      '',
      '### Implementation Steps',
      '1. Create a new playbook in Splunk SOAR using the visual playbook editor',
      '2. Add blocks matching the blueprint block structure',
      '3. Configure app assets for each required integration',
      '4. Verify action names against your installed app versions',
      '5. Configure CEF field mappings for artifact and container data',
      '',
      '### Verification Checklist',
      '- [ ] App assets installed and configured',
      '- [ ] Action names verified against app documentation',
      '- [ ] CEF field mappings are configured correctly',
      '- [ ] Custom function dependencies are installed',
    ].join('\n'),

    sentinel_logic_apps: [
      '## Microsoft Sentinel + Logic Apps — Implementation Notes',
      '',
      '**Export type: ARM template.** Deploy to your Azure subscription.',
      '',
      '### Deployment Steps',
      '1. Deploy the ARM template to your Azure subscription and resource group',
      '2. Authorise each API connection (Sentinel, Azure AD, etc.) after deployment',
      '3. Enable a Managed Identity on the Logic App if accessing Azure resources',
      '4. Create a Sentinel Automation Rule to trigger the Logic App on incident creation',
      '',
      '### Important Notes',
      '- All API connections must be authorised before the Logic App will execute successfully',
      '- Managed Identity permissions must be granted at the workspace or subscription level',
      '- Enable the Logic App from the Azure portal after all connections are configured',
      '- Review Logic App run history after the first test execution',
    ].join('\n'),

    tines: [
      '## Tines — Implementation Notes',
      '',
      '**Export type: Story JSON (direct import).**',
      '',
      '### Import Steps',
      '1. Navigate to your Tines tenant and create a new story',
      '2. Import the story JSON file',
      '3. Configure credentials for every agent that requires authentication',
      '4. Update HTTP request base URLs and resource references for your environment',
      '',
      '### Verification Checklist',
      '- [ ] All agent credentials are configured',
      '- [ ] HTTP endpoints are reachable from your Tines instance',
      '- [ ] Resource references are updated',
      '- [ ] Test execution passes with sample alert data',
    ].join('\n'),

    shuffle: [
      '## Shuffle — Implementation Notes',
      '',
      '**Export type: Workflow JSON (direct import).**',
      '',
      '### Import Steps',
      '1. Navigate to your Shuffle instance and import the workflow JSON',
      '2. Authenticate each app node in the workflow',
      '3. Verify app versions and action names match your Shuffle instance',
      '4. Configure the workflow trigger to connect to your alert source',
      '',
      '### Verification Checklist',
      '- [ ] All app nodes are authenticated',
      '- [ ] Workflow variables are set correctly',
      '- [ ] Trigger source is configured',
      '- [ ] Test execution completed without errors',
    ].join('\n'),

    qradar_soar: [
      '## IBM QRadar SOAR — Implementation Notes',
      '',
      '**Export type: Blueprint only.** The .resz import format is not generated.',
      '',
      '### Manual Implementation',
      '1. Create workflows in the QRadar SOAR App Host matching the blueprint',
      '2. Install the required function packages from the IBM App Exchange',
      '3. Configure message destinations and notification rules',
      '4. Map incident fields to your QRadar SOAR data model',
      '',
      '### Note',
      'Direct workflow import via .resz requires the IBM Resilient Circuits toolkit and',
      'is out of scope for this blueprint export.',
    ].join('\n'),

    servicenow_secops: [
      '## ServiceNow Security Operations — Implementation Notes',
      '',
      '**Export type: Blueprint only.** XML Update Set is not generated.',
      '',
      '### Manual Implementation',
      '1. Create flows in Flow Designer matching the blueprint',
      '2. Install and configure required IntegrationHub spokes',
      '3. Map Security Incident (SIR) table fields to flow inputs',
      '4. Configure record-based actions as needed',
      '',
      '### Note',
      'Automated deployment requires an XML Update Set, which is out of scope for this blueprint.',
      'The blueprint serves as a step-by-step implementation reference.',
    ].join('\n'),

    generic_soar: [
      '## Generic SOAR — Implementation Notes',
      '',
      '**Export type: Vendor-neutral normalized blueprint.**',
      '',
      '### Adaptation Steps',
      '1. Review the normalised workflow structure and step definitions',
      '2. Map each step to your SOAR platform\'s equivalent constructs',
      '3. Configure connectors and actions per your platform requirements',
      '4. Validate and test each step before production deployment',
    ].join('\n'),
  };

  return notes[targetPlatform] ?? notes.generic_soar;
}

// ── Response Actions ─────────────────────────────────────────
function buildResponseActions(playbook: PlaybookState): ResponseAction[] {
  const actionMeta: Record<string, Partial<ResponseAction>> = {
    isolate_endpoint: { category: 'EDR', destructive: true, approvalRecommended: true, rollbackSupported: true, rollbackAction: 'Unisolate endpoint / remove from containment' },
    disable_account:  { category: 'Identity', destructive: true, approvalRecommended: true, rollbackSupported: true, rollbackAction: 'Re-enable user account' },
    disable_ad_user:  { category: 'Identity', destructive: true, approvalRecommended: true, rollbackSupported: true, rollbackAction: 'Re-enable Active Directory user account' },
    block_ip:         { category: 'Firewall', destructive: true, approvalRecommended: true, rollbackSupported: true, rollbackAction: 'Remove IP address from block list' },
    block_ip_paloalto:{ category: 'Firewall', destructive: true, approvalRecommended: true, rollbackSupported: true, rollbackAction: 'Remove IP from Palo Alto block list' },
    quarantine_email: { category: 'Email Security', destructive: false, approvalRecommended: false, rollbackSupported: true, rollbackAction: 'Release email from quarantine' },
    create_ticket:    { category: 'Ticketing', destructive: false, approvalRecommended: false, rollbackSupported: false, rollbackAction: 'N/A' },
    create_servicenow_incident: { category: 'Ticketing', destructive: false, approvalRecommended: false, rollbackSupported: false, rollbackAction: 'N/A' },
    send_notification:{ category: 'Communication', destructive: false, approvalRecommended: false, rollbackSupported: false, rollbackAction: 'N/A' },
  };

  return playbook.actions.map(action => {
    const meta = actionMeta[action] ?? {};
    return {
      action: actionDisplayName(action),
      category: meta.category ?? ACTION_CATEGORIES[action] ?? 'Response',
      destructive: meta.destructive ?? false,
      approvalRecommended: meta.approvalRecommended ?? false,
      rollbackSupported: meta.rollbackSupported ?? false,
      rollbackAction: meta.rollbackAction ?? 'N/A',
      tenantVerification: true,
    };
  });
}

// ── Approval Flow ────────────────────────────────────────────
function buildApprovalFlow(playbook: PlaybookState, normalized: NormalizedPlaybook): string {
  const hasApproval = normalized.steps.some(s => s.type === 'approval');
  const approvalThreshold = playbook.scoringModel.thresholds.find(t => t.action === 'analyst_approval');

  if (!hasApproval && !approvalThreshold) {
    return [
      '## Approval Flow',
      '',
      '**Status:** Not configured',
      '',
      'This playbook does not include an approval gate. All response actions execute automatically',
      'based on scoring thresholds.',
      '',
      '**Recommendation:** Consider enabling an approval gate for destructive actions in production environments.',
    ].join('\n');
  }

  return [
    '## Approval Flow',
    '',
    '**Status:** Enabled',
    '',
    '### When Approval is Required',
    approvalThreshold
      ? `- Score range: ${approvalThreshold.minScore}–${approvalThreshold.maxScore} (${approvalThreshold.label})`
      : '- Determined by scoring threshold configuration',
    '- Required before any destructive containment action executes',
    '',
    '### Approval Process',
    '1. The Safety Gates decision step evaluates the calculated score',
    '2. If the score falls within the approval range, the workflow pauses',
    '3. The assigned analyst receives a notification with full incident context',
    '4. The analyst reviews the alert and selects Approve or Reject',
    '',
    '### Approved Path',
    '- Containment actions execute in sequence',
    '- SOC notification is sent confirming actions taken',
    '- Incident ticket is created or updated with results',
    '',
    '### Rejected Path',
    '- No destructive containment actions are executed',
    '- Incident is marked for manual review',
    '- Workflow proceeds to the Finalize step',
    '',
    '### Timeout Behaviour',
    '- Default timeout: 24 hours',
    '- On timeout: Escalate to SOC Lead',
  ].join('\n');
}

// ── Fallback Procedure ───────────────────────────────────────
function buildFallbackProcedure(playbook: PlaybookState): FallbackItem[] {
  const items: FallbackItem[] = [
    {
      failureScenario: 'Enrichment connector timeout',
      manualAction: 'Check connector health in the SOAR platform. Retry enrichment manually using the native tool.',
      responsibleTeam: 'SOC L1',
      escalationPath: 'SOC L2 after 15 minutes',
      notes: 'Continue the workflow with available context data',
    },
    {
      failureScenario: 'Containment action failure',
      manualAction: 'Execute the containment action manually via the native EDR / AD console.',
      responsibleTeam: 'SOC L2',
      escalationPath: 'IR Lead immediately',
      notes: 'Document all manual actions in the incident ticket',
    },
    {
      failureScenario: 'Approval timeout (24 h)',
      manualAction: 'Escalate to SOC Lead for a containment decision.',
      responsibleTeam: 'SOC Lead',
      escalationPath: 'CISO for critical severity',
      notes: 'Follow the documented escalation matrix',
    },
    {
      failureScenario: 'SOAR platform unavailable',
      manualAction: 'Execute the incident response runbook manually following documented SOPs.',
      responsibleTeam: 'SOC Team',
      escalationPath: 'Platform Administrator',
      notes: 'Ensure manual runbook is accessible offline',
    },
  ];

  // Only add the playbook-level manual step if it is meaningful and short
  const manualSteps = playbook.fallbackProcedure?.manualSteps;
  if (manualSteps && manualSteps.trim().length > 0 && manualSteps.trim().length <= 120) {
    items.push({
      failureScenario: 'Playbook-specific failure',
      manualAction: manualSteps.trim(),
      responsibleTeam: 'SOC Team',
      escalationPath: playbook.fallbackProcedure?.escalationPath ?? 'SOC Lead',
      notes: 'Refer to playbook documentation',
    });
  }

  return items;
}

// ── Test Cases ────────────  ──────────────────────────────
function buildTestCases(): TestCase[] {
  return [
    {
      testId: 'TC-001',
      scenario: 'Alert with complete entity data',
      expectedResult: 'All entities extracted, all enrichment steps complete, score calculated',
      passCriteria: 'Score matches expected value; all steps complete without error',
      notes: 'Use a known-good test alert with a full set of fields',
    },
    {
      testId: 'TC-002',
      scenario: 'Alert with missing optional fields',
      expectedResult: 'Workflow continues with available data; no fatal error',
      passCriteria: 'Graceful degradation — partial enrichment, no crash',
      notes: 'Validate fallback extraction logic',
    },
    {
      testId: 'TC-003',
      scenario: 'High-score alert — auto-contain path',
      expectedResult: 'Containment actions execute automatically',
      passCriteria: 'All containment actions complete; notification sent; ticket created',
      notes: 'Use a simulated high-severity alert',
    },
    {
      testId: 'TC-004',
      scenario: 'Medium-score alert — analyst approval path',
      expectedResult: 'Workflow pauses at approval gate',
      passCriteria: 'Approval request delivered to analyst; workflow in waiting state',
      notes: 'Test the full approval flow including Approve and Reject branches',
    },
    {
      testId: 'TC-005',
      scenario: 'Low-score alert — skip path',
      expectedResult: 'Workflow completes without any containment actions',
      passCriteria: 'Skip branch taken; no destructive actions executed; ticket created',
      notes: 'Verify threshold boundary logic',
    },
    {
      testId: 'TC-006',
      scenario: 'Rollback after containment',
      expectedResult: 'Previous containment action is reversed',
      passCriteria: 'Endpoint unisolated or user account re-enabled as applicable',
      notes: 'Test all rollback procedures before production deployment',
    },
  ];
}

// ── Readiness Checks ─────────────────────────────────────────
function buildReadinessChecks(playbook: PlaybookState, targetPlatform: SoarPlatformId): ReadinessCheck[] {
  const checks: ReadinessCheck[] = [
    {
      check: 'Playbook name and description configured',
      status: (playbook.name && playbook.description) ? 'pass' : 'warning',
      notes: playbook.name ? 'Configured' : 'Name or description is missing',
    },
    {
      check: 'Trigger source configured',
      status: playbook.trigger?.sourceSystem ? 'pass' : 'warning',
      notes: playbook.trigger?.sourceSystem ?? 'Configure the trigger source system',
    },
    {
      check: 'Entity extraction configured',
      status: (playbook.entities?.length ?? 0) > 0 ? 'pass' : 'warning',
      notes: `${playbook.entities?.length ?? 0} entities configured`,
    },
    {
      check: 'Enrichment connectors configured',
      status: (playbook.enrichmentConnectors?.length ?? 0) > 0 ? 'pass' : 'warning',
      notes: `${playbook.enrichmentConnectors?.length ?? 0} enrichment sources configured`,
    },
    {
      check: 'Scoring model configured',
      status: (playbook.scoringModel?.rules?.length ?? 0) > 0 ? 'pass' : 'fail',
      notes: `${playbook.scoringModel?.rules?.length ?? 0} rules, ${playbook.scoringModel?.thresholds?.length ?? 0} thresholds`,
    },
    {
      check: 'Response actions configured',
      status: (playbook.actions?.length ?? 0) > 0 ? 'pass' : 'warning',
      notes: `${playbook.actions?.length ?? 0} actions configured`,
    },
  ];

  const platform = getPlatformById(targetPlatform);

  if (platform?.requiresTenantVerification) {
    checks.push({
      check: 'Tenant verification required',
      status: 'warning',
      notes: 'Connector and action names must be verified against your tenant configuration',
    });
  }

  if (platform?.blueprintOnly) {
    checks.push({
      check: 'Blueprint-only export — manual creation required',
      status: 'warning',
      notes: `Manual workflow creation is required in ${platform?.name ?? 'the target platform'}`,
    });
  }

  return checks;
}

// ── Deployment Checklist ─────────────────────────────────────
function buildDeploymentChecklist(targetPlatform: SoarPlatformId): DeploymentStep[] {
  const platformSteps: Partial<Record<SoarPlatformId, DeploymentStep[]>> = {
    fortisoar: [
      { step: 'Replace all {{CUSTOMER_*_CONFIG_UUID}} placeholders with actual connector UUIDs', completed: false },
      { step: 'Verify operation names match installed connector versions', completed: false },
      { step: 'Import workflow JSON via Automation > Playbooks > Import', completed: false },
      { step: 'Activate workflow only after all verifications pass', completed: false },
    ],
    cortex_xsoar: [
      { step: 'Create playbook manually using the blueprint as a reference', completed: false },
      { step: 'Verify all integration instances are installed and healthy', completed: false },
      { step: 'Map command names to your installed integration versions', completed: false },
    ],
    splunk_soar: [
      { step: 'Create playbook in Splunk SOAR using the blueprint', completed: false },
      { step: 'Configure app assets for each required integration', completed: false },
      { step: 'Verify CEF field mappings for container and artifact data', completed: false },
    ],
    sentinel_logic_apps: [
      { step: 'Deploy ARM template to your Azure subscription', completed: false },
      { step: 'Authorise each API connection after deployment', completed: false },
      { step: 'Grant Managed Identity permissions if applicable', completed: false },
      { step: 'Create Sentinel Automation Rule to trigger the Logic App', completed: false },
    ],
    tines: [
      { step: 'Import story JSON into Tines', completed: false },
      { step: 'Configure credentials for all agents', completed: false },
      { step: 'Update HTTP endpoint URLs for your environment', completed: false },
    ],
    shuffle: [
      { step: 'Import workflow JSON into Shuffle', completed: false },
      { step: 'Authenticate all app nodes', completed: false },
      { step: 'Configure workflow trigger source', completed: false },
    ],
    qradar_soar: [
      { step: 'Create workflow from blueprint in QRadar SOAR', completed: false },
      { step: 'Install required function packages', completed: false },
      { step: 'Configure message destinations', completed: false },
    ],
    servicenow_secops: [
      { step: 'Create flows from blueprint in Flow Designer', completed: false },
      { step: 'Install and configure IntegrationHub spokes', completed: false },
      { step: 'Map SIR table fields to flow inputs', completed: false },
    ],
  };

  const common: DeploymentStep[] = [
    { step: 'Install all required integrations and connectors', completed: false },
    { step: 'Configure API credentials for each integration', completed: false },
    { step: 'Verify action/command names match your tenant', completed: false },
    { step: 'Map alert/incident fields to playbook parameters', completed: false },
    { step: 'Test enrichment actions with a sample alert', completed: false },
    { step: 'Test containment actions in a test environment', completed: false },
    { step: 'Test approval flow (if applicable)', completed: false },
    { step: 'Test rollback procedures', completed: false },
    { step: 'Run full UAT scenario suite', completed: false },
    { step: 'Document all customisations and field mappings', completed: false },
    { step: 'Obtain sign-off from SOC Lead before production enablement', completed: false },
    { step: 'Enable workflow in production', completed: false },
  ];

  return [...(platformSteps[targetPlatform] ?? []), ...common];
}

// ── Limitations ───────────────────────────────────────────
function buildLimitations(targetPlatform: SoarPlatformId, platform: ReturnType<typeof getPlatformById>): Limitation[] {
  const items: Limitation[] = [];

  if (!(platform?.directImportSupported)) {
    items.push({
      category: 'Export Format',
      description: 'Direct import is not supported for this platform. Manual workflow creation in the target tenant is required.',
    });
  }

  if (platform?.blueprintOnly) {
    items.push({
      category: 'Blueprint Only',
      description: 'This document and the accompanying export serve as a reference architecture. A native import file is not generated.',
    });
  }

  if (platform?.requiresTenantVerification) {
    items.push({
      category: 'Tenant Verification',
      description: 'Integration instances, command/action names, and alert field mappings must be verified and configured in your specific tenant.',
    });
  }

  if (targetPlatform === 'qradar_soar') {
    items.push({
      category: 'QRadar SOAR Import Format',
      description: '.resz import packages are not generated by SOARForge. Manual workflow assembly is required.',
    });
  }

  if (targetPlatform === 'servicenow_secops') {
    items.push({
      category: 'ServiceNow Update Set',
      description: 'XML Update Sets for automated Flow deployment are not generated by SOARForge. Manual flow creation is required.',
    });
  }

  items.push({
    category: 'Connector Dependencies',
    description: 'All referenced connectors must be installed and configured in the target tenant before the workflow is activated.',
  });

  items.push({
    category: 'Permissions',
    description: 'The SOAR service account must hold appropriate permissions for all configured enrichment and response actions.',
  });

  items.push({
    category: 'Field Mappings',
    description: 'Alert and incident field mappings may require customisation based on your data sources and SIEM configuration.',
  });

  return items;
}

// ============================================================
// Export to Markdown
// ============================================================

export function exportToMarkdown(doc: CustomerDocument): string {
  const L: string[] = [];

  // ── 1. Cover Page ──────────────────────────────────────────
  L.push(`# ${doc.metadata.playbookName}`);
  L.push('');
  L.push('## SOARForge Professional — Customer Implementation Guide');
  L.push('');
  L.push(`| Field | Value |`);
  L.push(`|-------|-------|`);
  L.push(`| Target Platform | ${doc.metadata.platformName} |`);
  L.push(`| Export Type | ${doc.metadata.directImportSupported ? 'Direct Import' : 'Blueprint Only'} |`);
  L.push(`| Direct Import Supported | ${doc.metadata.directImportSupported ? 'Yes' : 'No'} |`);
  L.push(`| Blueprint Only | ${doc.metadata.blueprintOnly ? 'Yes' : 'No'} |`);
  L.push(`| Generated | ${doc.metadata.generatedAt} |`);
  L.push(`| Version | ${doc.metadata.version} |`);
  L.push(`| Prepared For | ${doc.metadata.preparedFor} |`);
  L.push(`| Prepared By | ${doc.metadata.preparedBy} |`);
  L.push(`| Classification | ${doc.metadata.classification} |`);
  L.push('');
  L.push('---');
  L.push('');

  // ── 2. Executive Summary ───────────────────────────────────
  L.push('## Executive Summary');
  L.push('');
  L.push(doc.executiveSummary);
  L.push('');
  L.push('---');
  L.push('');

  // ── 3. Configuration Summary ──────────────────────────────
  L.push('## Selected Configuration Summary');
  L.push('');
  L.push('| Property | Value |');
  L.push('|----------|-------|');
  L.push(`| Playbook Name | ${doc.configurationSummary.playbookName} |`);
  L.push(`| Use Case | ${doc.configurationSummary.useCase} |`);
  L.push(`| Target Platform | ${doc.configurationSummary.targetPlatform} |`);
  L.push(`| Export Mode | ${doc.configurationSummary.exportMode} |`);
  L.push(`| Direct Import | ${doc.configurationSummary.directImportSupported ? 'Yes' : 'No'} |`);
  L.push(`| Blueprint Only | ${doc.configurationSummary.blueprintOnly ? 'Yes' : 'No'} |`);
  L.push(`| Tenant Verification | ${doc.configurationSummary.tenantVerificationRequired ? 'Required' : 'Not Required'} |`);
  L.push(`| Severity | ${doc.configurationSummary.severity} |`);
  L.push(`| Owner | ${doc.configurationSummary.owner} |`);
  L.push(`| Status | ${doc.configurationSummary.status} |`);
  L.push('');
  L.push('---');
  L.push('');

  // ── 4–5. Diagrams placeholder (described in text for Markdown) ──
  L.push('## Architecture Overview');
  L.push('');
  L.push('*Architecture diagram available in the HTML export of this document.*');
  L.push('');
  L.push('## Decision Flow Diagram');
  L.push('');
  L.push('*Decision flow diagram available in the HTML export of this document.*');
  L.push('');
  L.push('---');
  L.push('');

  // ── 6. Workflow Logic ──────────────────────────────────────
  L.push('## Workflow Logic');
  L.push('');
  L.push('| Step | Name | Type | Purpose | Verify in Tenant |');
  L.push('|------|------|------|---------|------------------|');
  for (const step of doc.workflowSteps) {
    const purpose = step.purpose.replace(/\|/g, '/');
    L.push(`| ${step.stepNumber} | ${step.name} | ${step.type} | ${purpose} | ${step.tenantVerification ? 'Yes' : 'No'} |`);
  }
  L.push('');
  L.push('---');
  L.push('');

  // ── 7. Scoring Model ───────────────────────────────────────
  L.push('## Scoring Model');
  L.push('');
  L.push(`**Type:** ${doc.scoringModel.type}  `);
  L.push(`**Maximum Score:** ${doc.scoringModel.maxScore}`);
  L.push('');
  L.push('### Scoring Rules');
  L.push('');
  L.push('| Rule | Condition | Points | MITRE | Purpose |');
  L.push('|------|-----------|--------|-------|---------|');
  for (const rule of doc.scoringModel.rules) {
    const purpose = rule.purpose.replace(/\|/g, '/');
    const condition = rule.condition.replace(/\|/g, '/');
    L.push(`| ${rule.rule} | ${condition} | +${rule.points} | ${rule.mitre ?? 'N/A'} | ${purpose} |`);
  }
  L.push('');
  L.push('### Decision Thresholds');
  L.push('');
  L.push('| Score Range | Decision | Action | Approval Required |');
  L.push('|-------------|----------|--------|-------------------|');
  for (const t of doc.scoringModel.thresholds) {
    L.push(`| ${t.scoreRange} | ${t.decision} | ${t.action} | ${t.approvalRequired ? 'Yes' : 'No'} |`);
  }
  L.push('');
  L.push('---');
  L.push('');

  // ── 8. MITRE Mapping ───────────────────────────────────────
  L.push('## MITRE ATT&CK Mapping');
  L.push('');
  if (doc.mitreMapping.length > 0 && doc.mitreMapping[0].technique !== 'N/A') {
    L.push('| Technique | Name | Where Used | Risk Contribution |');
    L.push('|-----------|------|------------|-------------------|');
    for (const m of doc.mitreMapping) {
      L.push(`| ${m.technique} | ${m.name} | ${m.whereUsed} | ${m.riskContribution} |`);
    }
  } else {
    L.push('*No MITRE mappings configured.*');
  }
  L.push('');

  if (doc.threatCoverage) {
    L.push('## Threat Coverage Summary');
    L.push('');
    L.push(`| Metric | Value |`);
    L.push(`|--------|-------|`);
    L.push(`| Threat Coverage Score | ${doc.threatCoverage.score}% |`);
    L.push(`| Status | ${doc.threatCoverage.status.replace(/_/g, ' ')} |`);
    L.push(`| Covered Required Techniques | ${doc.threatCoverage.coveredRequiredTechniques.join(', ') || 'None configured yet'} |`);
    L.push(`| Covered Optional Techniques | ${doc.threatCoverage.coveredOptionalTechniques.join(', ') || 'No optional techniques covered yet'} |`);
    L.push(`| Coverage Gaps | ${doc.threatCoverage.coverageGaps.join(', ') || 'No required technique gaps identified'} |`);
    L.push('');
    L.push('### Detection Coverage References');
    L.push('');
    for (const item of doc.threatCoverage.detectionCoverage.slice(0, 8)) L.push(`- ${item}`);
    if (doc.threatCoverage.detectionCoverage.length === 0) L.push('- No detection references mapped yet.');
    L.push('');
    L.push('### Recommended Enhancements');
    L.push('');
    for (const item of doc.threatCoverage.recommendedEnhancements.slice(0, 8)) L.push(`- ${item}`);
    if (doc.threatCoverage.recommendedEnhancements.length === 0) L.push('- No immediate enhancements recommended.');
    L.push('');
  }

  L.push('---');
  L.push('');
  // ── 9. Connector Matrix ────────────────────────────────────
  L.push('## Connector & Integration Matrix');
  L.push('');
  L.push('| Connector | Category | Used For | Required | Platform Equivalent | Verification |');
  L.push('|-----------|----------|----------|----------|---------------------|--------------|');
  for (const c of doc.connectorMatrix) {
    const usedFor = c.usedFor.replace(/\|/g, '/');
    const equiv = c.platformEquivalent.replace(/\|/g, '/');
    L.push(`| ${c.connector} | ${c.category} | ${usedFor} | ${c.required ? 'Yes' : 'No'} | ${equiv} | ${c.verificationStatus} |`);
  }
  L.push('');
  L.push('---');
  L.push('');

  // ── 10. Vendor Notes ───────────────────────────────────
  L.push(doc.vendorNotes);
  L.push('');
  L.push('---');
  L.push('');

  // ── 11. Response Actions ───────────────────────────────────
  L.push('## Response Actions & Safety Controls');
  L.push('');
  L.push('| Action | Category | Destructive | Approval Recommended | Rollback Supported | Rollback Procedure |');
  L.push('|--------|----------|-------------|----------------------|--------------------|-------------------|');
  for (const a of doc.responseActions) {
    const rollback = a.rollbackAction.replace(/\|/g, '/');
    L.push(`| ${a.action} | ${a.category} | ${a.destructive ? 'Yes' : 'No'} | ${a.approvalRecommended ? 'Yes' : 'No'} | ${a.rollbackSupported ? 'Yes' : 'No'} | ${rollback} |`);
  }
  L.push('');
  L.push('---');
  L.push('');

  // ── 12. Approval Flow ──────────────────────────────────────
  L.push(doc.approvalFlow);
  L.push('');
  L.push('---');
  L.push('');

  // ── 13. Fallback Procedure ─────────────────────────────────
  L.push('## Fallback & Manual Procedure');
  L.push('');
  for (const f of doc.fallbackProcedure) {
    L.push(`### ${f.failureScenario}`);
    L.push('');
    L.push(`**Manual Action:** ${f.manualAction}`);
    L.push('');
    L.push(`**Responsible Team:** ${f.responsibleTeam}`);
    L.push('');
    L.push(`**Escalation Path:** ${f.escalationPath}`);
    if (f.notes) {
      L.push('');
      L.push(`*${f.notes}*`);
    }
    L.push('');
  }
  L.push('---');
  L.push('');

  // ── 14. Testing & UAT ─────────────────────────────────────
  L.push('## Testing & UAT Plan');
  L.push('');
  L.push('| Test ID | Scenario | Expected Result | Pass Criteria |');
  L.push('|---------|----------|-----------------|---------------|');
  for (const t of doc.testCases) {
    const result = t.expectedResult.replace(/\|/g, '/');
    const criteria = t.passCriteria.replace(/\|/g, '/');
    const scenario = t.scenario.replace(/\|/g, '/');
    L.push(`| ${t.testId} | ${scenario} | ${result} | ${criteria} |`);
  }
  L.push('');
  L.push('---');
  L.push('');

  // ── 15. Readiness Summary ──────────────────────────────────
  L.push('## Readiness & Validation Summary');
  L.push('');
  L.push('| Check | Status | Notes |');
  L.push('|-------|--------|-------|');
  for (const r of doc.readinessChecks) {
    const icon = r.status === 'pass' ? 'PASS' : r.status === 'fail' ? 'FAIL' : 'WARN';
    L.push(`| ${r.check} | ${icon} | ${r.notes} |`);
  }
  L.push('');
  L.push('---');
  L.push('');

  // ── 16. Deployment Checklist ───────────────────────────────
  L.push('## Deployment Checklist');
  L.push('');
  for (const d of doc.deploymentChecklist) {
    L.push(`- [ ] ${d.step}`);
  }
  L.push('');
  L.push('---');
  L.push('');

  // ── 17. Limitations ───────────────────────────────────────
  L.push('## Limitations & Assumptions');
  L.push('');
  for (const lim of doc.limitations) {
    L.push(`**${lim.category}:** ${lim.description}`);
    L.push('');
  }
  L.push('---');
  L.push('');

  // ── 18. Appendix ──────────────────────────────────────────
  L.push('## Appendix');
  L.push('');
  L.push('**Document generated by:** SOARForge Professional');
  L.push('');
  L.push(`**Prepared by:** ${doc.metadata.preparedBy}`);
  L.push('');
  L.push(`**Generated:** ${doc.metadata.generatedAt}`);

  // Apply terminology normalization to the entire Markdown output
  return normalizeTerminology(L.join('\n'));
}

// ============================================================
// Export to HTML — generated directly from structured data
// ============================================================

export function exportToHTML(doc: CustomerDocument, embedLogo: boolean = false): string {
  const architectureDiagram = generateArchitectureDiagramSVG(doc);
  const decisionDiagram = generateDecisionFlowSVG(doc);

  // Embed logo as base64 for offline delivery, or reference for in-app use
  const logoSrc = embedLogo
    ? BETA_LOGO_BASE64
    : '/beta-logo.jpg';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(doc.metadata.playbookName)} — Customer Implementation Guide</title>
<style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-size: 15px; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #eef3f8;
      padding: 32px 16px 48px;
    }

    /* ── Document container ───────────────────────────────── */
    .document {
      background: #ffffff;
      max-width: 980px;
      margin: 0 auto;
      padding: 48px 56px;
      box-shadow: 0 20px 60px rgba(15, 42, 68, 0.12);
      border-radius: 12px;
    }

    /* ── Cover header ──────────────────────────────────────── */
    .cover {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 32px;
      padding: 28px 0 32px;
      border-bottom: 4px solid #0f2a44;
      margin-bottom: 32px;
    }
    .cover-logo {
  width: 240px;
  max-width: 240px;
  max-height: 95px;
  height: auto;
  object-fit: contain;
  display: block;
}
    .cover-title { text-align: right; flex: 1; }
    .cover-title h1 { font-size: 1.8rem; color: #0f2a44; margin-bottom: 8px; font-weight: 700; }
    .cover-title .sub { font-size: 1rem; color: #374151; margin-bottom: 4px; }
    .cover-title .meta { font-size: 0.85rem; color: #6b7280; margin-bottom: 2px; }
    .cover-title .classif { 
      font-size: 0.75rem; color: #0891b2; font-style: italic;
      margin-top: 8px; padding: 4px 10px; background: #f0f9ff; 
      border-radius: 4px; display: inline-block;
    }

    /* ── Section headings ─────────────────────────────────── */
    h2 {
      font-size: 1.375rem;
      color: #0f2a44;
      border-bottom: 3px solid #0891b2;
      padding-bottom: 10px;
      margin: 40px 0 18px;
      font-weight: 600;
    }
    h3 { font-size: 1.0625rem; color: #374151; margin: 28px 0 12px; font-weight: 600; }
    h4 { font-size: 0.9375rem; color: #4b5563; margin: 18px 0 10px; font-weight: 600; }
    p { margin-bottom: 12px; }

    /* ── Section cards ────────────────────────────────────── */
    section {
      background: #ffffff;
      margin-bottom: 8px;
    }

    /* ── Tables ───────────────────────────────────────────── */
    table { 
      width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 0.85rem;
      border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;
    }
    th {
      background: #0f2a44;
      color: #ffffff;
      padding: 12px 14px;
      text-align: left;
      font-weight: 600;
      font-size: 0.8125rem;
      border: none;
    }
    td { 
      border: 1px solid #e5e7eb; padding: 10px 14px; vertical-align: top;
      border-left: none; border-right: none;
    }
    tr:nth-child(even) td { background: #f8fafc; }
    tr:hover td { background: #f0f9ff; }

    /* ── Lists ────────────────────────────────────────────── */
    ul, ol { margin: 12px 0 12px 24px; }
    li { margin-bottom: 6px; }

    /* ── Inline code ──────────────────────────────────────── */
    code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 0.8125em;
      border: 1px solid #e5e7eb;
    }

    /* ── Badges ──────────────────────────────────────────── */
    .badge {
      display: inline-block; padding: 4px 10px; border-radius: 4px;
      font-size: 0.75rem; font-weight: 600;
    }
    .badge-yes  { background: #d1fae5; color: #065f46; }
    .badge-no   { background: #f3f4f6; color: #6b7280; }
    .badge-warn { background: #fef3c7; color: #92400e; }
    .badge-info { background: #dbeafe; color: #1e40af; }
    .badge-pass { background: #d1fae5; color: #065f46; }
    .badge-fail { background: #fee2e2; color: #991b1b; }

    /* ── Diagrams ─────────────────────────────────────────── */
    .diagram-wrap {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 24px;
      margin: 18px 0 28px;
      text-align: center;
      overflow-x: auto;
    }
    .diagram-wrap svg { max-width: 100%; height: auto; display: block; margin: 0 auto; }

    /* ── Checklist ────────────────────────────────────────── */
    .checklist { list-style: none; margin: 16px 0; padding: 0; }
    .checklist li { margin-bottom: 8px; }
    .checklist-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 0.9rem;
      line-height: 1.5;
      cursor: pointer;
      user-select: none;
    }
    .check-input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
    .check-custom {
      flex-shrink: 0;
      width: 18px;
      height: 18px;
      border: 2px solid #0891b2;
      border-radius: 3px;
      background: #ffffff;
      margin-top: 2px;
      position: relative;
    }
    .check-input:checked + .check-custom {
      background: #0891b2;
      border-color: #0891b2;
    }
    .check-input:checked + .check-custom::after {
      content: "";
      position: absolute;
      left: 5px;
      top: 1px;
      width: 5px;
      height: 10px;
      border: solid #ffffff;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
    .check-input:checked + .check-custom + span {
      color: #64748b;
      text-decoration: line-through;
    }

    /* ── Callout boxes ────────────────────────────────────── */
    .callout {
      background: #eff6ff; border-left: 4px solid #3b82f6;
      border-radius: 0 8px 8px 0; padding: 14px 18px; margin: 18px 0;
    }
    .callout.warn { background: #fffbeb; border-color: #f59e0b; }
    .callout.success { background: #f0fdf4; border-color: #22c55e; }

    /* ── Fallback sections ────────────────────────────────── */
    .fallback-item { 
      border: 1px solid #e5e7eb; border-radius: 8px; 
      padding: 18px 20px; margin: 16px 0;
      background: #fafbfc;
    }
    .fallback-item h4 { color: #0f2a44; margin-bottom: 12px; font-size: 1rem; }
    .fallback-item .row { display: flex; gap: 10px; margin-top: 8px; font-size: 0.875rem; }
    .fallback-item .row strong { min-width: 150px; color: #374151; }

    /* ── Dividers ─────────────────────────────────────────── */
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 40px 0; }

    /* ── Footer ───────────────────────────────────────────── */
    .doc-footer {
      margin-top: 56px; padding-top: 24px;
      border-top: 3px solid #0f2a44;
      display: flex; justify-content: space-between;
      font-size: 0.8rem; color: #6b7280;
    }
    .doc-footer strong { color: #0f2a44; }

    /* ── Links ────────────────────────────────────────────── */
    a { color: #0891b2; text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* ── Print ────────────────────────────────────────────── */
    @media print {
      body { background: white; padding: 0; }
      .document { 
        box-shadow: none; margin: 0; padding: 0; 
        max-width: none; border-radius: 0;
      }
      .cover { padding-top: 0; }
      h2 { page-break-after: avoid; }
      h2:nth-of-type(1), h2:nth-of-type(4), h2:nth-of-type(8), h2:nth-of-type(15) { 
        page-break-before: always; 
      }
      h3 { page-break-after: avoid; }
      table { page-break-inside: avoid; }
      .diagram-wrap { page-break-inside: avoid; }
      .fallback-item { page-break-inside: avoid; }
      .checklist-row { background: white; border-color: #ccc; }
      .check-custom { border-color: #555; background: white; }
    }
    @page { size: A4; margin: 2cm; }
  </style>
</head>
<body>
<div class="document">

  <!-- Section: Cover -->
  <div class="cover">
    <img src="${logoSrc}" alt="Beta Integrated Solutions" class="cover-logo">
    <div class="cover-title">
      <h1>SOARForge Professional</h1>
      <p class="sub"><strong>${esc(doc.metadata.playbookName)}</strong></p>
      <p class="sub">Customer Implementation Guide</p>
      <p class="meta">Platform: ${esc(doc.metadata.platformName)}</p>
      <p class="meta">Generated: ${esc(doc.metadata.generatedAt)} &nbsp;|&nbsp; v${esc(doc.metadata.version)}</p>
      <p class="classif">${esc(doc.metadata.classification)}</p>
    </div>
  </div>

  <!-- Section: Executive Summary -->
  ${htmlSection('Executive Summary',
    renderMarkdownBlock(doc.executiveSummary)
  )}

  <hr>

  <!-- Section: Configuration Summary -->
  ${htmlSection('Selected Configuration Summary',
    htmlTable(
      ['Property', 'Value'],
      [
        ['Playbook Name', esc(doc.configurationSummary.playbookName)],
        ['Use Case', esc(doc.configurationSummary.useCase)],
        ['Target Platform', esc(doc.configurationSummary.targetPlatform)],
        ['Export Mode', `<span class="badge ${doc.configurationSummary.directImportSupported ? 'badge-yes' : 'badge-info'}">${esc(doc.configurationSummary.exportMode)}</span>`],
        ['Direct Import Supported', yesNoBadge(doc.configurationSummary.directImportSupported, 'directImport')],
        ['Blueprint Only', yesNoBadge(doc.configurationSummary.blueprintOnly, 'blueprint')],
        ['Tenant Verification', yesNoBadge(doc.configurationSummary.tenantVerificationRequired, 'tenantVerification')],
        ['Severity', `<span class="badge badge-warn">${esc(doc.configurationSummary.severity)}</span>`],
        ['Owner', esc(doc.configurationSummary.owner)],
        ['Status', esc(doc.configurationSummary.status)],
      ]
    )
  )}

  <hr>

  <!-- Section: Architecture Diagram -->
  ${htmlSection('Architecture Overview',
    `<div class="diagram-wrap">${architectureDiagram}</div>`
  )}

  <!-- Section: Decision Flow -->
  ${htmlSection('Decision Flow Diagram',
    `<div class="diagram-wrap">${decisionDiagram}</div>`
  )}

  <hr>

  <!-- Section: Workflow Logic -->
  ${htmlSection('Workflow Logic',
    htmlTable(
      ['Step', 'Name', 'Type', 'Purpose', 'Verify in Tenant'],
      doc.workflowSteps.map(s => [
        String(s.stepNumber),
        esc(s.name),
        `<code>${esc(s.type)}</code>`,
        esc(s.purpose),
        yesNo(s.tenantVerification),
      ])
    )
  )}

  <hr>

  <!-- Section: Scoring Model -->
  ${htmlSection('Scoring Model', `
    <p><strong>Type:</strong> ${esc(doc.scoringModel.type)} &nbsp;&nbsp; <strong>Maximum Score:</strong> ${doc.scoringModel.maxScore}</p>
    <h3>Scoring Rules</h3>
    ${htmlTable(
      ['Rule', 'Condition', 'Points', 'MITRE', 'Purpose'],
      doc.scoringModel.rules.map(r => [
        esc(r.rule),
        esc(r.condition),
        `<strong>+${r.points}</strong>`,
        r.mitre ? `<code>${esc(r.mitre)}</code>` : 'N/A',
        esc(r.purpose),
      ])
    )}
    <h3>Decision Thresholds</h3>
    ${htmlTable(
      ['Score Range', 'Decision', 'Action', 'Approval Required'],
      doc.scoringModel.thresholds.map(t => [
        `<strong>${esc(t.scoreRange)}</strong>`,
        esc(t.decision),
        esc(t.action),
        yesNo(t.approvalRequired),
      ])
    )}
  `)}

  <hr>

  <!-- Section: MITRE Mapping -->
  ${htmlSection('MITRE ATT&CK Mapping',
    doc.mitreMapping.length > 0 && doc.mitreMapping[0].technique !== 'N/A'
      ? htmlTable(
          ['Technique', 'Name', 'Where Used', 'Risk Contribution'],
          doc.mitreMapping.map(m => [
            `<a href="https://attack.mitre.org/techniques/${esc(m.technique)}/" target="_blank"><code>${esc(m.technique)}</code></a>`,
            esc(m.name),
            esc(m.whereUsed),
            esc(m.riskContribution),
          ])
        )
      : '<p><em>No MITRE mappings configured.</em></p>'
  )}

  <hr>

  <!-- Section: Threat Coverage Summary -->
  ${doc.threatCoverage ? htmlSection('Threat Coverage Summary', `
    <table>
      <thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody>
        <tr><td>Threat Coverage Score</td><td><strong>${doc.threatCoverage.score}%</strong></td></tr>
        <tr><td>Status</td><td>${esc(doc.threatCoverage.status.replace(/_/g, ' '))}</td></tr>
        <tr><td>Covered Required Techniques</td><td>${esc(doc.threatCoverage.coveredRequiredTechniques.join(', ') || 'None configured yet')}</td></tr>
        <tr><td>Covered Optional Techniques</td><td>${esc(doc.threatCoverage.coveredOptionalTechniques.join(', ') || 'No optional techniques covered yet')}</td></tr>
        <tr><td>Coverage Gaps</td><td>${esc(doc.threatCoverage.coverageGaps.join(', ') || 'No required technique gaps identified')}</td></tr>
      </tbody>
    </table>
    <h3>Detection Coverage References</h3>
    <ul>${doc.threatCoverage.detectionCoverage.slice(0, 8).map(i => `<li>${esc(i)}</li>`).join('') || '<li>No detection references mapped yet.</li>'}</ul>
    <h3>Recommended Enhancements</h3>
    <ul>${doc.threatCoverage.recommendedEnhancements.slice(0, 8).map(i => `<li>${esc(i)}</li>`).join('') || '<li>No immediate enhancements recommended.</li>'}</ul>
  `) : ''}

  <hr>

  <!-- Section: Connector Matrix -->
  ${htmlSection('Connector & Integration Matrix',
    htmlTable(
      ['Connector', 'Category', 'Used For', 'Required', 'Platform Equivalent', 'Verification'],
      doc.connectorMatrix.map(c => [
        `<strong>${esc(c.connector)}</strong>`,
        esc(c.category),
        esc(c.usedFor),
        yesNo(c.required),
        esc(c.platformEquivalent),
        `<span class="badge badge-warn">${esc(c.verificationStatus)}</span>`,
      ])
    )
  )}

  <hr>

  <!-- Section: Vendor Notes -->
  ${htmlSection('Vendor-Specific Implementation Notes',
    renderMarkdownBlock(doc.vendorNotes)
  )}

  <hr>

  <!-- Section: Response Actions -->
  ${htmlSection('Response Actions & Safety Controls',
    htmlTable(
      ['Action', 'Category', 'Destructive', 'Approval Rec.', 'Rollback', 'Rollback Procedure'],
      doc.responseActions.map(a => [
        `<strong>${esc(a.action)}</strong>`,
        esc(a.category),
        yesNo(a.destructive),
        yesNo(a.approvalRecommended),
        yesNo(a.rollbackSupported),
        esc(a.rollbackAction),
      ])
    )
  )}

  <hr>

  <!-- Section: Approval Flow -->
  ${htmlSection('Approval Flow',
    renderMarkdownBlock(doc.approvalFlow)
  )}

  <hr>

  <!-- Section: Fallback Procedure -->
  ${htmlSection('Fallback & Manual Procedure',
    doc.fallbackProcedure.map(f => `
      <div class="fallback-item">
        <h4>${esc(f.failureScenario)}</h4>
        <div class="row"><strong>Manual Action</strong><span>${esc(f.manualAction)}</span></div>
        <div class="row"><strong>Responsible Team</strong><span>${esc(f.responsibleTeam)}</span></div>
        <div class="row"><strong>Escalation Path</strong><span>${esc(f.escalationPath)}</span></div>
        ${f.notes ? `<div class="row"><strong>Notes</strong><em>${esc(f.notes)}</em></div>` : ''}
      </div>
    `).join('')
  )}

  <hr>

  <!-- Section: Testing and UAT -->
  ${htmlSection('Testing & UAT Plan',
    htmlTable(
      ['Test ID', 'Scenario', 'Expected Result', 'Pass Criteria'],
      doc.testCases.map(t => [
        `<code>${esc(t.testId)}</code>`,
        esc(t.scenario),
        esc(t.expectedResult),
        esc(t.passCriteria),
      ])
    )
  )}

  <hr>

  <!-- Section: Readiness Summary -->
  ${htmlSection('Readiness & Validation Summary',
    htmlTable(
      ['Check', 'Status', 'Notes'],
      doc.readinessChecks.map(r => [
        esc(r.check),
        `<span class="badge badge-${r.status === 'pass' ? 'pass' : r.status === 'fail' ? 'fail' : 'warn'}">${r.status.toUpperCase()}</span>`,
        esc(r.notes),
      ])
    )
  )}

  <hr>

  <!-- Section: Deployment Checklist -->
  ${htmlSection('Deployment Checklist', `
    <ul class="checklist">
      ${doc.deploymentChecklist.map(d => `
        <li><label class="checklist-row"><input type="checkbox" class="check-input" /><span class="check-custom"></span><span>${esc(d.step)}</span></label></li>
      `).join('')}
    </ul>
  `)}

  <hr>

  <!-- Section: Limitations -->
  ${htmlSection('Limitations & Assumptions', `
    ${doc.limitations.map(lim => `
      <p><strong>${esc(lim.category)}:</strong> ${esc(lim.description)}</p>
    `).join('')}
  `)}

  <hr>

  <!-- Section: Appendix -->
  ${htmlSection('Appendix', `
    <p><strong>Document generated by:</strong> SOARForge Professional</p>
    <p><strong>Prepared by:</strong> ${esc(doc.metadata.preparedBy)}</p>
    <p><strong>Generated:</strong> ${esc(doc.metadata.generatedAt)}</p>
    <p><strong>Version:</strong> ${esc(doc.metadata.version)}</p>
  `)}

  <!-- Footer -->
  <div class="doc-footer">
    <div>
      <strong>Beta Integrated Solutions</strong><br>
      SOARForge Professional
    </div>
    <div style="text-align:right">
      <em>Confidential — Customer Delivery</em><br>
      Document v${esc(doc.metadata.version)}
    </div>
  </div>

</div>
</body>
</html>`;
}

// ── HTML helpers ─────────────────────────────────────────────

function esc(s: string): string {
  return normalizeTerminology(String(s))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function htmlSection(title: string, content: string): string {
  return `<section>\n  <h2>${esc(title)}</h2>\n  ${content}\n</section>`;
}

function htmlTable(headers: string[], rows: string[][]): string {
  if (rows.length === 0) return '<p><em>No data.</em></p>';
  const head = `<thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>`;
  const body = `<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`;
  return `<table>${head}${body}</table>`;
}

function yesNo(v: boolean): string {
  return v
    ? '<span class="badge badge-yes">Yes</span>'
    : '<span class="badge badge-no">No</span>';
}

/**
 * Context-aware badge rendering:
 * - blueprint: "No" = gray/neutral (neutral fact, not a failure)
 * - directImport: "Yes" = green, "No" = info/blue
 * - tenantVerification: true = amber "Required", false = gray "Not Required"
 */
function yesNoBadge(v: boolean, field: 'blueprint' | 'directImport' | 'tenantVerification' | 'default' = 'default'): string {
  if (field === 'blueprint') {
    return v
      ? '<span class="badge badge-info">Yes</span>'
      : '<span class="badge badge-no">No</span>';
  }
  if (field === 'directImport') {
    return v
      ? '<span class="badge badge-yes">Yes</span>'
      : '<span class="badge badge-info">No</span>';
  }
  if (field === 'tenantVerification') {
    return v
      ? '<span class="badge badge-warn">Required</span>'
      : '<span class="badge badge-no">Not Required</span>';
  }
  return yesNo(v);
}

/**
 * Render a Markdown-ish string to safe HTML using line-by-line logic.
 * Produces NO nested headings inside paragraphs.
 */
function renderMarkdownBlock(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let listType: 'ul' | 'ol' | 'checklist' | null = null;
  let inPara = false;

  const flushPara = () => {
    if (inPara) { out.push('</p>'); inPara = false; }
  };
  const flushList = () => {
    if (listType === 'ol') { out.push('</ol>'); }
    else if (listType) { out.push('</ul>'); }
    listType = null;
  };

  for (const raw of lines) {
    const line = raw.trim();

    // Headings
    if (line.startsWith('### ')) {
      flushPara(); flushList();
      out.push(`<h3>${esc(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith('## ')) {
      flushPara(); flushList();
      out.push(`<h3>${esc(line.slice(3))}</h3>`);
      continue;
    }
    if (line.startsWith('# ')) {
      flushPara(); flushList();
      out.push(`<h3>${esc(line.slice(2))}</h3>`);
      continue;
    }

    // Horizontal rule
    if (line === '---') {
      flushPara(); flushList();
      continue;
    }

    // Blank line
    if (line === '') {
      flushPara(); flushList();
      continue;
    }

    // Checkbox list items
    if (line.startsWith('- [ ] ')) {
      flushPara();
      if (listType !== 'checklist') { flushList(); out.push('<ul class="checklist">'); listType = 'checklist'; }
      out.push(`<li><label class="checklist-row"><input type="checkbox" class="check-input" /><span class="check-custom"></span><span>${inlineMarkdown(line.slice(6))}</span></label></li>`);
      continue;
    }

    // Regular list items
    if (line.startsWith('- ')) {
      flushPara();
      if (listType !== 'ul') { flushList(); out.push('<ul>'); listType = 'ul'; }
      out.push(`<li>${inlineMarkdown(line.slice(2))}</li>`);
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      flushPara();
      if (listType !== 'ol') { flushList(); out.push('<ol>'); listType = 'ol'; }
      out.push(`<li>${inlineMarkdown(line.replace(/^\d+\.\s/, ''))}</li>`);
      continue;
    }

    // Regular paragraph text
    flushList();
    if (!inPara) { out.push('<p>'); inPara = true; }
    else { out.push('<br>'); }
    out.push(inlineMarkdown(line));
  }

  flushPara();
  flushList();

  return out.join('\n');
}

function inlineMarkdown(s: string): string {
  return normalizeTerminology(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

/**
 * Normalizes terminology for customer-facing documents:
 * - Groupib -> Group-IB
 * - Virustotal -> VirusTotal
 * - Edr -> EDR
 * - Ad -> Active Directory (when referring to identity)
 * - Soc -> SOC
 * - Mitre -> MITRE
 */
function normalizeTerminology(text: string): string {
  return text
    .replace(/\bGroupib\b/gi, 'Group-IB')
    .replace(/\bVirustotal\b/gi, 'VirusTotal')
    .replace(/\bDisable AD User\b/gi, 'Disable Active Directory User')
    .replace(/\bAD User\b/gi, 'Active Directory User')
    .replace(/\bEdr\b/g, 'EDR')
    .replace(/\bSoc\b/g, 'SOC')
    .replace(/\bMitre\b/g, 'MITRE')
    .replace(/\bFortinet FortiSOAR\b/g, 'FortiSOAR');
}

// ── Beta logo base64 (inline for offline HTML delivery) ──────
// Embedded directly so exported HTML works offline without external dependencies.
// Also exported so the in-app preview can use the same source to avoid broken images.
export const BETA_LOGO_BASE64 = 'data:image/jpeg;base64,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';
