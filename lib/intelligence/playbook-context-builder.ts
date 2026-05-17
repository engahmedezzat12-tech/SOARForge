// ============================================================
// SOARForge — Playbook Intelligence Context Builder
// Builds a normalized context for deterministic reasoning.
// ============================================================

import type { PlaybookState } from '@/lib/soar-types';
import type { NormalizedPlaybook, NormalizedStep } from '@/lib/normalized/normalized-types';
import type { SoarPlatformId } from '@/lib/soar-platforms';
import type { ThreatCoverageResult } from '@/lib/threat-knowledge/threat-knowledge-types';
import type { ExportReadinessResult } from '@/lib/evidence/evidence-types';
import type { PlaybookActionContext, PlaybookConnectorContext, PlaybookIntelligenceContext } from './intelligence-types';

function titleCase(value: string): string {
  const raw = (value || '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const exact: Record<string, string> = {
    'groupib edr': 'Group-IB EDR',
    'group ib edr': 'Group-IB EDR',
    'virustotal': 'VirusTotal',
    'virus total': 'VirusTotal',
    'disable ad user': 'Disable AD User',
    'notify soc': 'Notify SOC',
  };
  const normalized = raw.toLowerCase();
  if (exact[normalized]) return exact[normalized];
  const acronyms: Record<string, string> = {
    ad: 'AD', edr: 'EDR', soc: 'SOC', ip: 'IP', url: 'URL', waf: 'WAF', siem: 'SIEM',
    mfa: 'MFA', api: 'API', uuid: 'UUID', uat: 'UAT', id: 'ID', asn: 'ASN', cdn: 'CDN',
    qradar: 'QRadar', fortisoar: 'FortiSOAR', virustotal: 'VirusTotal', groupib: 'Group-IB',
  };
  return raw.split(' ').map((part) => {
    const lower = part.toLowerCase();
    if (acronyms[lower]) return acronyms[lower];
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(' ').replace(/Group IB/g, 'Group-IB');
}


function stepText(step: NormalizedStep): string {
  return `${step.id} ${step.name} ${step.type} ${step.description ?? ''} ${step.normalizedAction ?? ''}`.toLowerCase();
}

function inferActionCategory(label: string): string {
  const s = label.toLowerCase();
  if (s.includes('isolate') || s.includes('endpoint') || s.includes('process')) return 'endpoint';
  if (s.includes('user') || s.includes('account') || s.includes('session') || s.includes('mfa')) return 'identity';
  if (s.includes('email') || s.includes('sender') || s.includes('quarantine') || s.includes('message')) return 'email';
  if (s.includes('ip') || s.includes('firewall') || s.includes('waf') || s.includes('block')) return 'network';
  if (s.includes('ticket') || s.includes('case')) return 'ticketing';
  if (s.includes('notify') || s.includes('teams') || s.includes('slack')) return 'notification';
  return 'general';
}

function isDestructiveAction(label: string): boolean {
  const s = label.toLowerCase();
  return ['isolate', 'disable', 'delete', 'block', 'quarantine', 'revoke', 'terminate', 'detach', 'purge'].some((w) => s.includes(w));
}

function buildActions(playbook: PlaybookState, normalized: NormalizedPlaybook): PlaybookActionContext[] {
  const fromPlaybook = (playbook.actions ?? []).map((action) => ({
    id: action,
    label: titleCase(action),
    category: inferActionCategory(action),
    destructive: isDestructiveAction(action),
    approvalRecommended: isDestructiveAction(action),
    rollbackSupported: /(isolate|disable|block|quarantine|revoke)/i.test(action),
    source: 'playbook' as const,
  }));

  const fromSteps = (normalized.steps ?? [])
    .filter((s) => s.type === 'action' || s.normalizedAction)
    .map((s) => ({
      id: s.id,
      label: s.name || s.normalizedAction || s.id,
      category: s.connectorCategory ?? inferActionCategory(`${s.name} ${s.normalizedAction ?? ''}`),
      destructive: s.isDestructive ?? isDestructiveAction(`${s.name} ${s.normalizedAction ?? ''}`),
      approvalRecommended: s.approvalRequired ?? isDestructiveAction(`${s.name} ${s.normalizedAction ?? ''}`),
      rollbackSupported: s.rollbackSupported ?? /(isolate|disable|block|quarantine|revoke)/i.test(`${s.name} ${s.normalizedAction ?? ''}`),
      source: 'normalized_step' as const,
    }));

  const byKey = new Map<string, PlaybookActionContext>();
  [...fromPlaybook, ...fromSteps].forEach((a) => byKey.set(`${a.label}-${a.category}`, a));
  return [...byKey.values()];
}

function buildConnectors(normalized: NormalizedPlaybook): PlaybookConnectorContext[] {
  return (normalized.connectors ?? []).map((c) => ({
    id: c.id,
    label: titleCase(c.displayName),
    category: c.category,
    required: c.required,
    tenantVerificationRequired: c.verifyInTenant,
  }));
}

export function buildPlaybookIntelligenceContext(args: {
  playbook: PlaybookState;
  normalized: NormalizedPlaybook;
  targetPlatform: SoarPlatformId;
  threatCoverage: ThreatCoverageResult;
  exportReadiness: ExportReadinessResult;
}): PlaybookIntelligenceContext {
  const { playbook, normalized, targetPlatform, threatCoverage, exportReadiness } = args;
  const actions = buildActions(playbook, normalized);
  const destructiveActions = actions.filter((a) => a.destructive);
  const approvalSteps = (normalized.steps ?? []).filter((s) => s.type === 'approval' || stepText(s).includes('approval')).map((s) => s.name);
  const rollbackSteps = [
    ...(normalized.steps ?? []).filter((s) => s.type === 'rollback' || stepText(s).includes('rollback') || stepText(s).includes('unisolate') || stepText(s).includes('enable')).map((s) => s.name),
    playbook.fallbackProcedure?.manualSteps ?? '',
  ].filter(Boolean);

  const notifications = (normalized.steps ?? []).filter((s) => s.type === 'notification').map((s) => s.name);
  const ticketing = (normalized.steps ?? []).filter((s) => s.type === 'ticket').map((s) => s.name);
  const enrichmentSteps = (normalized.steps ?? []).filter((s) => s.type === 'enrichment').map((s) => s.name);
  const requiredEntities = threatCoverage.dataSourceCoverage.map((x) => x.split('→')[0]?.trim()).filter(Boolean);

  return {
    playbookId: playbook.id,
    playbookName: playbook.name,
    incidentType: threatCoverage.incidentDisplayName || playbook.templateId || playbook.name,
    incidentCategory: playbook.templateId?.split('_')[0] ?? 'security_operations',
    targetPlatform,
    triggerType: playbook.trigger?.type ?? normalized.trigger?.type ?? 'alert',
    entities: [...new Set([...(playbook.entities ?? []), ...(normalized.entities ?? []).map((e) => e.id)])],
    requiredEntities,
    connectors: buildConnectors(normalized),
    enrichmentSteps,
    scoringRules: (playbook.scoringModel?.rules ?? []).map((r) => r.label),
    thresholds: (playbook.scoringModel?.thresholds ?? []).map((t) => `${t.label}: ${t.minScore}-${t.maxScore} → ${t.action}`),
    actions,
    approvals: approvalSteps,
    rollbackActions: rollbackSteps,
    notifications,
    ticketing,
    mitreTechniques: [...new Set([...threatCoverage.coveredRequiredTechniques, ...threatCoverage.coveredOptionalTechniques])],
    detectionReferences: threatCoverage.detectionCoverage,
    defensiveCountermeasures: threatCoverage.defensiveCountermeasures.map((d) => `${d.name} (${d.tactic})`),
    safeTestScenarios: threatCoverage.testCoverage,
    readinessWarnings: exportReadiness.warnings,
    exportBlockers: exportReadiness.blockers,
    manualRequirements: exportReadiness.manualRequirements,
    tenantRequirements: [
      ...(exportReadiness.requiresTenantVerification ? ['Tenant validation required before production use'] : []),
      ...exportReadiness.manualRequirements,
    ],
    riskIndicators: destructiveActions.map((a) => `${a.label} is a high-impact response action`),
    destructiveActions,
    missingFields: [...threatCoverage.coverageGaps, ...threatCoverage.optionalEnhancements].slice(0, 8),
    optionalEnhancements: threatCoverage.recommendedEnhancements,
    threatCoverage,
    exportReadiness,
  };
}
