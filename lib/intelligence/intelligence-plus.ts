// ============================================================
// SOARForge — Intelligence Plus Builders
// Deep advisory layer: logic analysis, risk matrix, validation,
// detection query pack, delivery pack, and deterministic Q&A.
// ============================================================

import type {
  ActionRiskMatrixItem,
  AskSoarForgeItem,
  ComplianceMappingItem,
  ConnectorPermissionAdvisorItem,
  CustomerDeliveryPackItem,
  DetectionQueryPackItem,
  EnvironmentProfileInsight,
  IntelligenceReviewResult,
  IntelligenceDepthItem,
  IntelligenceViewSummary,
  KnowledgeSourceStatusItem,
  KnowledgeUpdateInsight,
  PlatformCapabilityWarning,
  PlaybookLogicAnalysis,
  TenantValidationChecklistItem,
  WhatSoarForgeAnalyzedItem,
  AnalysisTraceStep,
  TestCaseRecommendation,
} from './intelligence-types';
import { buildDemoKnowledgeUpdateReview } from '@/lib/knowledge-updates/mock-update-data';

function incidentText(result: IntelligenceReviewResult): string {
  return `${result.context.incidentType} ${result.context.playbookName}`.toLowerCase();
}

function titleCaseStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function displayName(value: string): string {
  const raw = (value || '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!raw) return value;
  const normalized = raw.toLowerCase();

  const exact: Record<string, string> = {
    'groupib edr': 'Group-IB EDR',
    'group ib edr': 'Group-IB EDR',
    'virustotal': 'VirusTotal',
    'virus total': 'VirusTotal',
    'disable ad user': 'Disable AD User',
    'active directory': 'Active Directory',
    'email notification': 'Email / Notification',
    'notify soc': 'Notify SOC',
    'waf': 'WAF',
    'qradar': 'QRadar',
    'fortisoar': 'FortiSOAR',
    'xsoar': 'XSOAR',
    'siem': 'SIEM',
    'edr connector': 'EDR Connector',
    'identity connector': 'Identity Connector',
  };
  if (exact[normalized]) return exact[normalized];

  return raw
    .split(' ')
    .map((part) => {
      const lower = part.toLowerCase();
      const acronyms: Record<string, string> = {
        ad: 'AD', edr: 'EDR', soc: 'SOC', url: 'URL', ip: 'IP', waf: 'WAF', siem: 'SIEM',
        c2: 'C2', mfa: 'MFA', ou: 'OU', api: 'API', uuid: 'UUID', uat: 'UAT', id: 'ID',
        ioc: 'IOC', iocs: 'IOCs', dkim: 'DKIM', dmarc: 'DMARC', spf: 'SPF', asn: 'ASN',
        cdn: 'CDN', o365: 'O365', qradar: 'QRadar', fortisoar: 'FortiSOAR', virustotal: 'VirusTotal',
        groupib: 'Group-IB', group: 'Group', ib: 'IB'
      };
      if (acronyms[lower]) return acronyms[lower];
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ')
    .replace(/Group IB/g, 'Group-IB');
}

function isStateChangingLowRiskAction(label: string): boolean {
  const l = label.toLowerCase();
  return /ticket|comment|notify|notification|finalize/.test(l);
}


export function buildExecutiveSummaryText(result: IntelligenceReviewResult): string {
  const c = result.context;
  const label = titleCaseStatus(result.status);
  const readiness = c.exportReadiness.requiresTenantVerification
    ? 'Production activation remains gated until tenant-specific connector UUIDs, permissions, action names, and non-production validation are completed.'
    : 'Runtime validation evidence is available for this package.';

  return `This playbook demonstrates ${label.toLowerCase()} design maturity for ${c.incidentType}. SOARForge identified the core response logic, mapped threat coverage, reviewed safety controls, and produced a controlled improvement plan. ${readiness} No production action is changed by this intelligence review.`;
}

export function buildPlaybookLogicAnalysis(result: IntelligenceReviewResult): PlaybookLogicAnalysis {
  const t = incidentText(result);
  const c = result.context;
  const paths: string[] = [];
  const observations: string[] = [];
  const concerns: string[] = [];

  paths.push('Trigger → Context normalization → Entity extraction → Enrichment → Scoring/decision → Response/approval → Notification/ticketing → Finalization');
  if (c.exportBlockers.length > 0) paths.push('Export readiness path: format-valid package → tenant connector validation → non-production execution test → production enablement');
  if (c.approvals.length > 0) paths.push('Controlled action path: analyst approval remains available before high-impact response actions.');
  if (c.rollbackActions.length > 0) paths.push('Rollback path: reversal guidance is present for high-impact actions.');

  if (t.includes('ransom')) {
    observations.push('The logic prioritizes behavioral indicators rather than relying on a single indicator of compromise.');
    observations.push('The design separates high-confidence containment from medium-confidence analyst review.');
    observations.push('Recovery assurance is identified as a required post-containment concern.');
    if (!c.entities.some((e) => /machine|host|asset/i.test(e))) concerns.push('Host or asset identity should be strongly validated before endpoint containment.');
  } else if (t.includes('phish')) {
    observations.push('The logic recognizes sender, URL, attachment, and message identity as the core investigation anchors.');
    observations.push('The campaign-scope remediation path depends on unique message identity to reduce duplicate or over-broad email actions.');
    if (!c.entities.some((e) => /message|email/i.test(e))) concerns.push('Message identity should remain mandatory before automated mailbox remediation.');
  } else if (t.includes('waf') || t.includes('web')) {
    observations.push('The logic should treat client IP, URI, method, WAF rule ID, and payload context as primary decision evidence.');
    concerns.push('Permanent blocking should remain gated until CDN/cloud/shared infrastructure context is checked.');
  } else if (t.includes('login') || t.includes('identity')) {
    observations.push('The logic should correlate user risk, geolocation, ASN change, MFA behavior, and session state before containment.');
    concerns.push('Privileged-user and service-account actions should require explicit analyst approval.');
  }

  if (c.exportBlockers.length > 0) concerns.push('Tenant-specific connector blockers still prevent runtime certification.');

  return {
    summary: 'SOARForge analyzed the playbook as an execution graph and separated design maturity from runtime activation readiness.',
    detectedPaths: paths,
    positiveObservations: observations,
    potentialConcerns: concerns,
  };
}

function riskForAction(label: string): { risk: ActionRiskMatrixItem['riskLevel']; guardrail: string; rollback: string; validation: string } {
  const l = label.toLowerCase();
  if (/disable|account|user/.test(l)) return {
    risk: 'high',
    guardrail: 'Privileged-user and service-account approval guardrail',
    rollback: 'Re-enable account and document business-owner approval',
    validation: 'Validate AD/identity permissions in a non-production OU or test account',
  };
  if (/isolate|contain/.test(l)) return {
    risk: 'high',
    guardrail: 'Critical asset, domain controller, and backup-server exclusion',
    rollback: 'Unisolate endpoint and confirm network/service recovery',
    validation: 'Validate endpoint isolation and unisolation against a test host',
  };
  if (/block|deny|firewall|waf/.test(l)) return {
    risk: 'medium_high',
    guardrail: 'ASN/CDN/cloud ownership check before permanent blocking',
    rollback: 'Remove block object/rule and confirm traffic restoration',
    validation: 'Validate block and unblock against controlled test indicators',
  };
  if (/delete|purge/.test(l)) return {
    risk: 'high',
    guardrail: 'Evidence strength and analyst approval before deletion',
    rollback: 'Prefer quarantine/release path where possible; deletion rollback may be limited',
    validation: 'Validate on test mailbox/message only',
  };
  if (/quarantine|release/.test(l)) return {
    risk: 'medium',
    guardrail: 'Unique message/entity identity and false-positive release path',
    rollback: 'Release from quarantine if incorrectly contained',
    validation: 'Validate message ID targeting in non-production mailbox',
  };
  return {
    risk: 'low',
    guardrail: 'Standard action logging and tenant permission validation',
    rollback: 'Document reversal path if the action changes state',
    validation: 'Validate connector action and output schema',
  };
}

export function buildActionRiskMatrix(result: IntelligenceReviewResult): ActionRiskMatrixItem[] {
  const actions = result.context.actions.length > 0 ? result.context.actions : result.context.destructiveActions;
  const seen = new Set<string>();

  function rollbackForAction(label: string, rollbackSupported: boolean): string {
    const l = label.toLowerCase();
    if (/enrich|reputation|lookup|virustotal|threat intel|sandbox/.test(l)) return 'No rollback required; validate graceful failure handling and audit logging';
    if (/notify|notification|teams|slack|soc/.test(l)) return 'Send a corrected update if needed and preserve the notification audit trail';
    if (/ticket|jira|servicenow/.test(l)) return 'Update or close the ticket if it was created incorrectly';
    if (/comment|case comment/.test(l)) return 'Add a correction comment; preserve the original audit trail';
    if (/finalize|close/.test(l)) return 'Reopen or escalate the case if the final status is incorrect';
    if (rollbackSupported) return riskForAction(label).rollback;
    return 'Document the reversal or correction approach before production use';
  }

  return actions
    .filter((a) => {
      const key = normalizeKey(displayName(a.label));
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12)
    .map((a) => {
      const label = displayName(a.label);
      const r = riskForAction(label);
      const lowRiskStateChange = isStateChangingLowRiskAction(label);
      return {
        action: label,
        category: a.category || 'response',
        riskLevel: a.destructive ? r.risk : lowRiskStateChange ? 'low' : (r.risk === 'high' ? 'medium' : r.risk),
        requiredGuardrail: r.guardrail,
        rollbackPath: rollbackForAction(label, a.rollbackSupported),
        tenantValidation: r.validation,
      };
    });
}

export function buildWhyNotPerfect(result: IntelligenceReviewResult): string[] {
  const reasons: string[] = [];
  if (result.context.exportReadiness.requiresTenantVerification) reasons.push('Tenant connector UUIDs, permissions, and installed action names still require customer-environment validation.');
  if (result.context.exportBlockers.length > 0) reasons.push('Export readiness blockers are still open and must be resolved before production activation.');
  if (!result.context.exportReadiness.runtimeCertified) reasons.push('The package has not yet completed runtime certification in the target tenant.');
  if (result.context.destructiveActions.length > 0) reasons.push('High-impact response actions require safety guardrails, approval policy, and rollback validation.');
  if (result.recommendations.length > 0) reasons.push(`${result.recommendations.length} recommendation${result.recommendations.length === 1 ? '' : 's'} remain available for review and controlled improvement.`);
  reasons.push('Validation status updates can raise readiness confidence after connector checks, UAT paths, and rollback evidence are recorded.');
  if (reasons.length === 0) reasons.push('The score remains below perfect unless runtime evidence, tenant validation, and production sign-off are all recorded.');
  return reasons;
}

export function buildTenantValidationChecklist(result: IntelligenceReviewResult): TenantValidationChecklistItem[] {
  const items: TenantValidationChecklistItem[] = [];
  const seen = new Set<string>();
  const destructiveActionNames = new Set(result.context.actions.filter((a) => a.destructive).map((a) => normalizeKey(displayName(a.label))));

  function push(item: TenantValidationChecklistItem) {
    const key = normalizeKey(item.label);
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  }

  result.context.connectors.forEach((c, idx) => {
    const label = displayName(c.label);
    const key = normalizeKey(label);
    // Avoid duplicating action names that are represented separately as runtime action validations.
    if (destructiveActionNames.has(key)) return;

    push({
      id: `connector-${idx}`,
      label: `Validate ${label} connector instance`,
      status: c.tenantVerificationRequired ? 'pending' : 'not_applicable',
      owner: 'SOAR Administrator',
      validationEvidence: 'Connector UUID, operation name, credentials, and least-privilege permissions confirmed.',
    });
  });

  result.context.actions.filter((a) => a.destructive).slice(0, 8).forEach((a, idx) => {
    const label = displayName(a.label);
    push({
      id: `action-${idx}`,
      label: `Run non-production validation for ${label}`,
      status: 'pending',
      owner: 'SOC Automation Engineer',
      validationEvidence: 'Action executed safely in a test path with expected output, audit note, and rollback evidence.',
    });
  });

  push({ id: 'uat-alert', label: 'Run end-to-end non-production UAT alert', status: 'pending', owner: 'SOC Lead', validationEvidence: 'Expected path, score, approval behavior, notification, and ticket creation recorded.' });
  push({ id: 'rollback', label: 'Confirm rollback / reversal procedure', status: result.context.rollbackActions.length > 0 ? 'pending' : 'failed', owner: 'SOC Automation Engineer', validationEvidence: 'Rollback command or manual restoration process validated and documented.' });
  push({ id: 'readiness-score', label: 'Record validation outcome and update readiness evidence', status: 'pending', owner: 'SOC Lead', validationEvidence: 'Passed/failed connector and UAT results captured; readiness score can be recalculated from evidence.' });

  return items.slice(0, 16);
}

export function buildTestCaseRecommendations(result: IntelligenceReviewResult): TestCaseRecommendation[] {
  const t = incidentText(result);
  if (t.includes('ransom')) {
    return [
      { id: 'tc-ransom-fp', scenario: 'False-positive ransomware alert', expectedPath: 'Safe skip / no containment', expectedEvidence: ['false_positive=true', 'score forced to 0'], approvalExpected: false, rollbackExpected: false },
      { id: 'tc-ransom-medium', scenario: 'Medium-confidence ransomware behavior', expectedPath: 'Analyst approval', expectedEvidence: ['score between approval threshold and auto threshold'], approvalExpected: true, rollbackExpected: false },
      { id: 'tc-ransom-high', scenario: 'High-confidence alert with valid machine_id', expectedPath: 'Auto containment after safety checks', expectedEvidence: ['T1486/T1490 or encryption + shadow copy evidence', 'machine_id present'], approvalExpected: false, rollbackExpected: true },
      { id: 'tc-ransom-critical-asset', scenario: 'High-confidence alert on critical asset', expectedPath: 'Analyst approval / override required', expectedEvidence: ['critical asset tag', 'domain controller or backup role'], approvalExpected: true, rollbackExpected: true },
    ];
  }
  if (t.includes('phish')) {
    return [
      { id: 'tc-phish-missing-message', scenario: 'Phishing alert without message_id', expectedPath: 'Investigate, do not auto-quarantine campaign-wide', expectedEvidence: ['message_id missing'], approvalExpected: true, rollbackExpected: false },
      { id: 'tc-phish-url', scenario: 'Suspicious URL in email body', expectedPath: 'URL enrichment and scoring', expectedEvidence: ['url extracted', 'reputation result'], approvalExpected: false, rollbackExpected: false },
      { id: 'tc-phish-attachment', scenario: 'Attachment hash present', expectedPath: 'Hash/sandbox review before remediation', expectedEvidence: ['attachment_hash extracted'], approvalExpected: false, rollbackExpected: false },
      { id: 'tc-phish-shared-ip', scenario: 'Sender or URL infrastructure maps to shared provider', expectedPath: 'Approval before permanent block', expectedEvidence: ['ASN/CDN/cloud ownership detected'], approvalExpected: true, rollbackExpected: true },
    ];
  }
  return [
    { id: 'tc-low', scenario: 'Low-confidence alert', expectedPath: 'No destructive response', expectedEvidence: ['score below response threshold'], approvalExpected: false, rollbackExpected: false },
    { id: 'tc-medium', scenario: 'Medium-confidence alert', expectedPath: 'Analyst approval / investigation', expectedEvidence: ['score within review range'], approvalExpected: true, rollbackExpected: false },
    { id: 'tc-high', scenario: 'High-confidence alert', expectedPath: 'Controlled response with guardrails', expectedEvidence: ['required entities present', 'tenant validation complete'], approvalExpected: false, rollbackExpected: true },
  ];
}

export function buildDetectionQueryPack(result: IntelligenceReviewResult): DetectionQueryPackItem[] {
  const t = incidentText(result);
  if (t.includes('ransom')) {
    return [
      {
        name: 'Ransomware-like File Activity Pattern',
        logSource: 'EDR / Sysmon / File activity telemetry',
        requiredFields: ['host.name', 'user.name', 'process.command_line', 'file.path', 'event.action'],
        sigmaIdea: 'Process or file telemetry showing rapid file modifications with ransomware-like extension or ransom-note indicators.',
        kqlHint: 'DeviceFileEvents | where FileName has_any (".locked", ".encrypted") or FolderPath has_any ("readme", "decrypt")',
        splHint: 'index=edr (file_name="*.locked" OR file_name="*.encrypted" OR command_line="*vssadmin*")',
        falsePositiveFilters: ['Exclude approved backup/encryption tools', 'Exclude known administrative maintenance windows'],
      },
      {
        name: 'Recovery Control Alteration',
        logSource: 'Process creation telemetry',
        requiredFields: ['process.name', 'process.command_line', 'host.name', 'user.name'],
        sigmaIdea: 'Command-line activity referencing vssadmin, wbadmin, bcdedit, or delete shadows.',
        kqlHint: 'DeviceProcessEvents | where ProcessCommandLine has_any ("vssadmin", "delete shadows", "wbadmin", "bcdedit")',
        splHint: 'index=edr (process="*vssadmin*" OR command_line="*delete shadows*" OR command_line="*wbadmin*")',
        falsePositiveFilters: ['Known backup administrators', 'Approved recovery maintenance jobs'],
      },
    ];
  }
  if (t.includes('phish')) {
    return [
      {
        name: 'Suspicious URL Reputation and Click Context',
        logSource: 'Email security gateway / proxy / URL click telemetry',
        requiredFields: ['email.sender', 'email.recipient', 'url.full', 'message_id', 'event.outcome'],
        sigmaIdea: 'Email with suspicious URL and sender reputation anomalies.',
        kqlHint: 'EmailUrlInfo | join EmailEvents on NetworkMessageId | where Url has_any ("bit.ly", "tinyurl") or ThreatTypes has "Phish"',
        splHint: 'index=email (url="http*" AND (sender_domain_age<30 OR verdict="suspicious"))',
        falsePositiveFilters: ['Approved marketing platforms', 'Internal phishing simulation domains'],
      },
      {
        name: 'Mailbox Campaign Search and Duplicate Message Guardrail',
        logSource: 'Exchange/O365/Proofpoint message trace',
        requiredFields: ['message_id', 'internet_message_id', 'sender', 'recipient', 'subject'],
        sigmaIdea: 'Search for repeated sender/subject/message indicators with unique message ID targeting.',
        kqlHint: 'EmailEvents | summarize recipients=dcount(RecipientEmailAddress) by SenderFromAddress, Subject, NetworkMessageId',
        splHint: 'index=email | stats dc(recipient) as recipients by sender subject message_id',
        falsePositiveFilters: ['Approved newsletters', 'Known bulk senders'],
      },
    ];
  }
  return result.context.detectionReferences.slice(0, 4).map((d, idx) => ({
    name: d,
    logSource: 'SIEM / security telemetry',
    requiredFields: result.context.entities.slice(0, 6),
    sigmaIdea: `Defensive detection idea for ${d}.`,
    kqlHint: 'Use the normalized entity fields and mapped MITRE technique tags to build a tenant-specific query.',
    splHint: 'Use the normalized entity fields and mapped MITRE technique tags to build a tenant-specific search.',
    falsePositiveFilters: ['Known administrative activity', 'Approved business systems'],
  }));
}

export function buildConnectorPermissionAdvisor(result: IntelligenceReviewResult): ConnectorPermissionAdvisorItem[] {
  const seen = new Set<string>();
  return result.context.connectors
    .filter((c) => {
      const key = normalizeKey(displayName(c.label));
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10)
    .map((c) => {
      const label = displayName(c.label);
      const l = label.toLowerCase();
      const permissions = l.includes('active') || l.includes('identity') || /\bad\b/.test(l)
        ? ['Read user/account metadata', 'Disable user in scoped OU/test group', 'Enable user rollback permission', 'Audit action logging']
        : l.includes('edr') || l.includes('group-ib') || l.includes('crowd') || l.includes('defender')
          ? ['Read alerts/assets', 'Search endpoint by hostname/ID', 'Execute isolate/unisolate on test hosts', 'Collect action status']
          : l.includes('virus') || l.includes('threat') || l.includes('intel')
            ? ['Query reputation', 'Read enrichment result', 'Respect rate limits', 'Handle lookup failures gracefully']
            : l.includes('teams') || l.includes('slack') || l.includes('notification')
              ? ['Send notification to approved channel', 'Validate webhook/connector ownership', 'Avoid sensitive data leakage']
              : ['Validate connector credentials', 'Confirm action names', 'Record API failures'];
      return {
        connector: label,
        category: c.category,
        requiredPermissions: permissions,
        validationMethod: 'Validate using a non-production action execution and capture the resulting status/output evidence.',
        commonFailureModes: ['Expired credential', 'Missing action permission', 'Tenant-specific operation name mismatch', 'Rate limit or connector timeout'],
      };
    });
}

export function buildPlatformCapabilityWarnings(result: IntelligenceReviewResult): PlatformCapabilityWarning[] {
  const p = result.context.targetPlatform;
  const items: PlatformCapabilityWarning[] = [];
  if (p === 'fortisoar') {
    items.push({ platform: 'FortiSOAR', capability: 'Connector configuration UUIDs', warning: 'Connector instance UUIDs are tenant-specific and must be replaced before import or activation.', recommendation: 'Use the Connector/Action Checklist to map every placeholder to a validated tenant connector instance.' });
    items.push({ platform: 'FortiSOAR', capability: 'Operation names and picklists', warning: 'Connector operation names, picklists, and module fields can differ by tenant and connector version.', recommendation: 'Validate every enrichment and response action in a non-production tenant before enabling production execution.' });
  } else if (p === 'sentinel_logic_apps') {
    items.push({ platform: 'Microsoft Sentinel Logic Apps', capability: 'API connections', warning: 'Managed Identity and API connection IDs are environment-specific.', recommendation: 'Deploy to a test resource group and authorize connectors before attaching automation rules.' });
  } else if (p === 'splunk_soar') {
    items.push({ platform: 'Splunk SOAR', capability: 'Assets and Python execution', warning: 'Asset names and playbook datapaths are tenant-specific.', recommendation: 'Map generated actions to installed apps/assets and review Python logic before activation.' });
  } else {
    items.push({ platform: String(p), capability: 'Runtime validation', warning: 'Generated exports require platform-specific validation before production use.', recommendation: 'Run import, connector, and rollback tests before activation.' });
  }
  return items;
}

export function buildEnvironmentProfile(result: IntelligenceReviewResult): EnvironmentProfileInsight[] {
  const labels = result.context.connectors.map((c) => c.label.toLowerCase()).join(' ');
  const has = (s: string) => labels.includes(s);
  return [
    { capability: 'Endpoint response', observed: /edr|endpoint|group|crowd|defender/.test(labels), recommendation: /edr|endpoint|group|crowd|defender/.test(labels) ? 'Endpoint response capability is represented; validate isolation/rollback permissions.' : 'Add an EDR connector before enabling endpoint containment.' },
    { capability: 'Identity response', observed: /active|identity|ad|entra|okta/.test(labels), recommendation: /active|identity|ad|entra|okta/.test(labels) ? 'Identity response capability is represented; scope permissions and privileged-user approval.' : 'Add identity connector coverage for account containment and session response.' },
    { capability: 'Threat intelligence', observed: /virus|abuse|misp|fortiguard|threat/.test(labels), recommendation: /virus|abuse|misp|fortiguard|threat/.test(labels) ? 'Threat intelligence enrichment is represented; validate rate limits and fallback behavior.' : 'Add reputation enrichment before automated blocking or containment.' },
    { capability: 'Notification / collaboration', observed: /teams|slack|mail|notification/.test(labels), recommendation: /teams|slack|mail|notification/.test(labels) ? 'Notification capability is represented; validate sensitive data handling.' : 'Add SOC notification integration for analyst visibility.' },
  ];
}

export function buildComplianceMapping(result: IntelligenceReviewResult): ComplianceMappingItem[] {
  const t = incidentText(result);
  const base = [
    { framework: 'NIST CSF', control: 'Respond / Recover', alignment: 'Structured incident response, containment, recovery validation, and improvement tracking.' },
    { framework: 'CIS Controls', control: 'Control 17 — Incident Response Management', alignment: 'Defines repeatable incident handling, escalation, and response execution.' },
  ];
  if (t.includes('ransom')) base.push({ framework: 'CIS Controls', control: 'Control 10 — Malware Defenses', alignment: 'Supports malware/ransomware detection, containment, and recovery-focused procedures.' });
  if (t.includes('phish')) base.push({ framework: 'NIST CSF', control: 'Protect / Detect', alignment: 'Supports email threat detection, user-impact control, and controlled remediation.' });
  return base;
}

export function buildAskSoarForge(result: IntelligenceReviewResult): AskSoarForgeItem[] {
  const firstHigh = result.recommendations.find((r) => r.severity === 'critical' || r.severity === 'high');
  return [
    { question: 'Why is this playbook not production ready yet?', answer: buildWhyNotPerfect(result).join(' ') },
    { question: 'What should I fix first?', answer: firstHigh ? `Start with: ${firstHigh.title}. ${firstHigh.whyItMatters}` : 'Complete tenant validation and keep the deployment checklist updated.' },
    { question: 'What is the highest-risk action?', answer: result.actionRiskMatrix?.find((a) => a.riskLevel === 'high')?.action || 'No high-risk action was identified from the current context.' },
    { question: 'What should I test before import?', answer: result.testCaseRecommendations?.slice(0, 3).map((t) => t.scenario).join('; ') || 'Run the non-production UAT checklist and validate connector actions.' },
  ];
}

export function buildCustomerDeliveryPackManifest(result: IntelligenceReviewResult): CustomerDeliveryPackItem[] {
  return [
    { file: 'Platform workflow export', purpose: 'Target-platform workflow or blueprint package', included: true },
    { file: 'Customer implementation guide', purpose: 'Deployment architecture, scoring, workflow, connector matrix, and checklist', included: true },
    { file: 'SOARForge Intelligence Review', purpose: 'Best-practice assessment, recommendations, risk matrix, and patch plan', included: true },
    { file: 'Threat Coverage Report', purpose: 'Threat-informed coverage score, detection references, and defensive countermeasures', included: true },
    { file: 'Connector/Action Checklist', purpose: 'Tenant-specific connector UUID, operation name, and permission validation', included: true },
    { file: 'Tenant Validation Checklist', purpose: 'Step-by-step non-production validation requirements', included: true },
    { file: 'Suggested Test Plan', purpose: 'Expected paths for false positive, medium confidence, high confidence, and rollback scenarios', included: true },
    { file: 'Executive Summary', purpose: 'Management-friendly readiness and risk interpretation', included: true },
  ];
}


export function buildWhatSoarForgeAnalyzed(result: IntelligenceReviewResult): WhatSoarForgeAnalyzedItem[] {
  return [
    {
      area: 'Threat Mapping',
      analyzed: `${result.context.mitreTechniques.length} mapped techniques, ${result.context.detectionReferences.length} detection references, and incident-specific threat coverage.`,
      customerValue: 'Shows how the playbook aligns to expected adversary behavior rather than acting as a generic workflow.',
    },
    {
      area: 'Workflow Logic',
      analyzed: 'Trigger, normalization, enrichment, scoring, decision paths, response actions, notification, ticketing, and finalization flow.',
      customerValue: 'Confirms the generated workflow has a coherent investigation and response sequence.',
    },
    {
      area: 'Response Safety',
      analyzed: `${result.context.destructiveActions.length} high-impact actions, approval controls, rollback references, and safety guardrail needs.`,
      customerValue: 'Keeps high-speed response aligned with operational safety and business continuity.',
    },
    {
      area: 'Platform Readiness',
      analyzed: `${result.context.connectors.length} connector requirements, tenant validation blockers, manual requirements, and runtime certification status.`,
      customerValue: 'Separates design maturity from customer-environment readiness so production activation is not overstated.',
    },
    {
      area: 'Validation & Delivery',
      analyzed: 'Tenant validation checklist, suggested UAT paths, connector permission requirements, test evidence, and customer delivery package contents.',
      customerValue: 'Turns the generated playbook into an implementation-ready handover package.',
    },
  ];
}

export function buildAnalysisTrace(result: IntelligenceReviewResult): AnalysisTraceStep[] {
  const trace: AnalysisTraceStep[] = [];
  let step = 1;
  const t = incidentText(result);
  const brain = t.includes('ransom') ? 'Ransomware Brain' : t.includes('phish') ? 'Phishing Brain' : t.includes('waf') || t.includes('web') ? 'WAF/Web Attack Brain' : t.includes('login') || t.includes('identity') ? 'Identity Brain' : 'Generic SOC Automation Brain';
  trace.push({ step: step++, label: 'Normalized playbook context', detail: `Parsed ${result.context.playbookName} for ${result.context.targetPlatform} and extracted entities, actions, connectors, thresholds, approvals, rollback references, and documentation signals.`, layer: 'knowledge' });
  trace.push({ step: step++, label: 'Selected incident brain', detail: `Loaded ${brain} because the incident type was classified as ${result.context.incidentType}.`, layer: 'deterministic_reasoning' });
  trace.push({ step: step++, label: 'Mapped threat knowledge', detail: `Correlated ${result.context.mitreTechniques.length} MITRE techniques and ${result.context.detectionReferences.length} detection references with the selected template.`, layer: 'knowledge' });
  trace.push({ step: step++, label: 'Analyzed workflow paths', detail: 'Built an execution graph covering trigger, enrichment, scoring, decision, approval, response, notification, ticketing, and finalization paths.', layer: 'deterministic_reasoning' });
  trace.push({ step: step++, label: 'Classified action risk', detail: `Classified ${result.context.destructiveActions.length} high-impact response action(s) and checked approval, rollback, and tenant-validation requirements.`, layer: 'deterministic_reasoning' });
  trace.push({ step: step++, label: 'Checked platform readiness', detail: result.context.exportBlockers.length ? `Detected ${result.context.exportBlockers.length} runtime blocker(s), including tenant connector validation requirements.` : 'No blocking platform-readiness issue was detected in the available context.', layer: 'deterministic_reasoning' });
  trace.push({ step: step++, label: 'Generated prioritized recommendations', detail: `Produced ${result.recommendations.length} recommendation(s) with evidence basis, safety impact, expected benefit, and suggested implementation steps.`, layer: 'deterministic_reasoning' });
  trace.push({ step: step++, label: 'Prepared safe improvement plan', detail: `Created ${result.autoHardeningPlan.length} safe documentation/metadata patch preview(s). No production workflow action is changed by the review.`, layer: 'feedback_learning' });
  return trace;
}

export function buildIntelligenceDepth(result: IntelligenceReviewResult): IntelligenceDepthItem[] {
  const score = result.score;
  const level = (value: number): IntelligenceDepthItem['level'] => value >= 85 ? 'strong' : value >= 70 ? 'good' : value >= 50 ? 'needs_validation' : 'review_recommended';
  return [
    { area: 'Threat Understanding', level: level(score.threatCoverage), summary: `${score.threatCoverage}% threat coverage with mapped techniques, detections, and defensive context.` },
    { area: 'Workflow Reasoning', level: result.playbookLogicAnalysis?.potentialConcerns.length ? 'good' : 'strong', summary: 'Execution paths were analyzed from trigger through finalization and runtime validation.' },
    { area: 'Safety Analysis', level: level(score.responseSafety), summary: `${score.responseSafety}% response-safety score based on destructive actions, approvals, guardrails, and rollback evidence.` },
    { area: 'Tenant Readiness', level: level(score.platformReadiness), summary: `${score.platformReadiness}% platform readiness because tenant-specific connector validation is still required.` },
    { area: 'Detection Coverage', level: level(score.detectionCoverage), summary: `${score.detectionCoverage}% detection coverage with log-source and query-hint references.` },
    { area: 'Delivery Quality', level: level(score.documentationQuality), summary: `${score.documentationQuality}% documentation quality with implementation, validation, and delivery-package outputs.` },
  ];
}

export function buildKnowledgeSources(result: IntelligenceReviewResult): KnowledgeSourceStatusItem[] {
  return [
    { source: 'MITRE ATT&CK', purpose: 'Tactics, techniques, sub-techniques, and incident mapping', status: 'loaded', version: result.knowledgeBaseVersion?.threatKnowledge ?? '2026.05-local', lastChecked: 'Local knowledge pack', updateMode: 'local' },
    { source: 'MITRE D3FEND', purpose: 'Defensive countermeasure mapping', status: 'loaded', version: 'local-mapping-1.0', lastChecked: 'Local knowledge pack', updateMode: 'local' },
    { source: 'Sigma Detection Logic', purpose: 'Detection reference and query-pack guidance', status: 'configured', version: 'local-hints-1.0', lastChecked: 'Local knowledge pack', updateMode: 'manual_import' },
    { source: 'CISA KEV', purpose: 'Known exploited vulnerability impact awareness', status: 'configured', version: 'source-ready', lastChecked: 'Not checked from this workspace', updateMode: 'api_ready' },
    { source: 'LOLBAS', purpose: 'Living-off-the-land detection context', status: 'configured', version: 'source-ready', lastChecked: 'Not checked from this workspace', updateMode: 'manual_import' },
    { source: 'Atomic Test References', purpose: 'Safe validation scenario inspiration', status: 'configured', version: 'local-safe-tests-1.0', lastChecked: 'Local knowledge pack', updateMode: 'manual_import' },
    { source: 'Platform Capability Matrix', purpose: 'SOAR platform export/readiness limitations', status: 'loaded', version: result.knowledgeBaseVersion?.platformCompatibility ?? '1.0', lastChecked: 'Local compatibility pack', updateMode: 'local' },
    { source: 'Connector Permission Models', purpose: 'Permission and failure-mode guidance for tenant validation', status: 'loaded', version: '1.0', lastChecked: 'Local connector registry', updateMode: 'local' },
  ];
}

export function buildKnowledgeUpdateInsight(result: IntelligenceReviewResult): KnowledgeUpdateInsight {
  return {
    status: 'review_recommended',
    summary: 'Live Knowledge Update Engine is available in demo-safe mode. Trusted-source updates are staged, diffed, impact-analyzed, and require admin approval before local knowledge changes.',
    affectedTemplates: result.context.incidentType ? [result.context.playbookName] : [],
    recommendedAction: 'Use Knowledge Update Center to fetch, compare, review impact, and approve selected updates before changing local datasets or marking templates for review.',
  };
}

export function buildIntelligenceViews(result: IntelligenceReviewResult): IntelligenceViewSummary[] {
  const firstFix = result.topPriorityFix || result.recommendations[0]?.title || 'Complete tenant validation';
  return [
    {
      view: 'executive',
      title: 'Executive View',
      focus: 'Readiness, business risk, and next decision',
      summary: result.executiveSummary || result.summary,
      keyPoints: [
        `Status: ${titleCaseStatus(result.status)}`,
        `Primary blocker: ${result.primaryBlocker || 'Tenant validation still required'}`,
        `Top priority: ${firstFix}`,
      ],
    },
    {
      view: 'analyst',
      title: 'Analyst View',
      focus: 'Threat coverage, detection logic, evidence, and response path',
      summary: `The playbook maps ${result.context.mitreTechniques.length} techniques, ${result.context.detectionReferences.length} detection references, and ${result.testCaseRecommendations?.length ?? 0} validation scenarios.`,
      keyPoints: [
        `MITRE techniques: ${result.context.mitreTechniques.join(', ') || 'Not available'}`,
        `Detection references: ${result.context.detectionReferences.slice(0, 4).join(', ') || 'Not available'}`,
        `Safe tests: ${(result.testCaseRecommendations ?? []).map((t) => t.scenario).slice(0, 3).join('; ') || 'Not available'}`,
      ],
    },
    {
      view: 'engineer',
      title: 'Engineer View',
      focus: 'Connectors, UUIDs, action names, permissions, and UAT evidence',
      summary: `SOARForge found ${result.context.connectors.length} connector requirements, ${result.context.actions.length} response/action steps, and ${result.context.exportBlockers.length} export blocker(s).`,
      keyPoints: [
        `Connector checks: ${result.context.connectors.map((c) => displayName(c.label)).slice(0, 5).join(', ') || 'Not available'}`,
        `Validation items: ${result.tenantValidationChecklist?.length ?? 0}`,
        `Platform readiness: ${result.score.platformReadiness}%`,
      ],
    },
  ];
}

export function buildTopPriorityFix(result: IntelligenceReviewResult): string {
  const high = result.recommendations.find((r) => r.severity === 'critical' || r.severity === 'high');
  return high?.title || result.recommendations[0]?.title || 'Complete tenant validation and non-production UAT';
}

export function buildPrimaryBlocker(result: IntelligenceReviewResult): string {
  if (result.context.exportBlockers.length > 0) return result.context.exportBlockers[0];
  if (result.context.exportReadiness.requiresTenantVerification) return 'Tenant connector validation required';
  if (result.recommendations.length > 0) return result.recommendations[0].title;
  return 'No primary blocker detected';
}

export function buildRiskLevel(result: IntelligenceReviewResult): IntelligenceReviewResult['riskLevel'] {
  if (result.score.platformReadiness < 40 || result.context.exportBlockers.length > 0) return 'elevated';
  if (result.context.destructiveActions.length > 0 && result.score.responseSafety < 75) return 'high';
  if (result.recommendations.some((r) => r.severity === 'critical')) return 'critical';
  return 'controlled';
}

export function applyIntelligencePlus(result: IntelligenceReviewResult): IntelligenceReviewResult {
  const withCore: IntelligenceReviewResult = {
    ...result,
    executiveSummary: buildExecutiveSummaryText(result),
    playbookLogicAnalysis: buildPlaybookLogicAnalysis(result),
    actionRiskMatrix: buildActionRiskMatrix(result),
    whyNotPerfect: buildWhyNotPerfect(result),
    tenantValidationChecklist: buildTenantValidationChecklist(result),
    testCaseRecommendations: buildTestCaseRecommendations(result),
    detectionQueryPack: buildDetectionQueryPack(result),
    connectorPermissionAdvisor: buildConnectorPermissionAdvisor(result),
    platformCapabilityWarnings: buildPlatformCapabilityWarnings(result),
    environmentProfile: buildEnvironmentProfile(result),
    complianceMapping: buildComplianceMapping(result),
    customerDeliveryPackManifest: buildCustomerDeliveryPackManifest(result),
    knowledgeBaseVersion: {
      threatKnowledge: '2026.05-local',
      platformCompatibility: '1.0',
      recommendationRules: '1.0',
      generatedAt: new Date().toISOString(),
    },
  };

  const enriched: IntelligenceReviewResult = {
    ...withCore,
    topPriorityFix: buildTopPriorityFix(withCore),
    primaryBlocker: buildPrimaryBlocker(withCore),
    riskLevel: buildRiskLevel(withCore),
    whatSoarForgeAnalyzed: buildWhatSoarForgeAnalyzed(withCore),
    analysisTrace: buildAnalysisTrace(withCore),
    intelligenceDepth: buildIntelligenceDepth(withCore),
    knowledgeSources: buildKnowledgeSources(withCore),
    knowledgeUpdateInsight: buildKnowledgeUpdateInsight(withCore),
    liveKnowledgeUpdateReview: buildDemoKnowledgeUpdateReview({
      templateName: withCore.context.playbookName,
      incidentType: withCore.context.incidentType,
    }),
  };

  enriched.askSoarForge = buildAskSoarForge(enriched);
  enriched.intelligenceViews = buildIntelligenceViews(enriched);
  return enriched;
}
