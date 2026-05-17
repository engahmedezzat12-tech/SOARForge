// ============================================================
// SOARForge — Response Recommendation Mappings
// Safe action guidance aligned with existing action categories.
// ============================================================

import type { ResponseRecommendationMapping } from './threat-knowledge-types';

export const RESPONSE_RECOMMENDATION_MAPPINGS: ResponseRecommendationMapping[] = [
  {
    recommendationId: 'rec-ransomware-containment',
    title: 'Apply Endpoint Containment with Recovery Review',
    rationale: 'Data impact and recovery alteration behavior requires rapid containment while preserving recovery and rollback controls.',
    techniqueIds: ['T1486', 'T1490'],
    incidentTypeIds: ['ransomware'],
    enrichmentActions: ['EDR asset lookup', 'Recent process tree', 'Hash reputation', 'Backup status review'],
    investigationActions: ['Collect endpoint context', 'Review user privilege', 'Check similar endpoints'],
    containmentActions: ['Isolate endpoint when confidence is high', 'Disable AD user only with approval'],
    recoveryActions: ['Validate backups', 'Unisolate after cleanup', 'Re-enable user after approval'],
    notificationActions: ['Notify SOC', 'Create incident ticket', 'Notify infrastructure owner'],
    rollbackActions: ['Unisolate endpoint', 'Re-enable AD user'],
    approvalRequired: true,
    safetyGuardrails: ['Do not isolate domain controllers without explicit override', 'Do not disable privileged users without approval'],
    riskReductionScore: 9.1,
  },
  {
    recommendationId: 'rec-phishing-mailbox-containment',
    title: 'Apply Message Containment and Campaign Search',
    rationale: 'Suspicious message delivery requires sender, URL, and mailbox scope review before broad remediation.',
    techniqueIds: ['T1566', 'T1566.001', 'T1566.002'],
    incidentTypeIds: ['phishing'],
    enrichmentActions: ['URL reputation', 'Attachment hash reputation', 'Sender domain review'],
    investigationActions: ['Search similar messages', 'Review click activity', 'Check recipient exposure'],
    containmentActions: ['Quarantine message', 'Block sender/domain with review'],
    recoveryActions: ['Release email if false positive', 'Remove sender block'],
    notificationActions: ['Notify recipients', 'Create ticket', 'Notify SOC'],
    rollbackActions: ['Release quarantined message', 'Remove transport rule or sender block'],
    approvalRequired: true,
    safetyGuardrails: ['Do not delete emails without approval', 'Prefer quarantine over deletion'],
    riskReductionScore: 8.4,
  },
  {
    recommendationId: 'rec-identity-session-control',
    title: 'Review Identity Risk and Apply Session Control',
    rationale: 'Unusual account usage requires identity enrichment before session revocation or account restriction.',
    techniqueIds: ['T1078', 'T1110.003', 'T1098'],
    incidentTypeIds: ['suspicious_login'],
    enrichmentActions: ['GeoIP', 'ASN reputation', 'MFA status', 'Recent login history', 'Privileged group check'],
    investigationActions: ['Review device compliance', 'Check sign-in sequence', 'Validate travel/VPN context'],
    containmentActions: ['Revoke sessions', 'Force MFA reset', 'Disable user only with approval'],
    recoveryActions: ['Unlock/re-enable account after review', 'Restore conditional access state'],
    notificationActions: ['Notify identity team', 'Create ticket'],
    rollbackActions: ['Re-enable user', 'Restore MFA settings'],
    approvalRequired: true,
    safetyGuardrails: ['Never auto-disable privileged accounts without approval', 'Validate business travel/VPN before containment'],
    riskReductionScore: 8.7,
  },
  {
    recommendationId: 'rec-waf-contextual-block',
    title: 'Apply Contextual Web Protection',
    rationale: 'Public application security events require request context and source reputation before blocking.',
    techniqueIds: ['T1190'],
    incidentTypeIds: ['waf_attack', 'vulnerability'],
    enrichmentActions: ['IP reputation', 'ASN/CDN check', 'WAF rule details', 'Request volume'],
    investigationActions: ['Review URI/method', 'Check application owner', 'Verify scanner/pen-test ranges'],
    containmentActions: ['Block IP only after CDN/cloud check', 'Create AppSec ticket'],
    recoveryActions: ['Remove IP block', 'Restore WAF policy'],
    notificationActions: ['Notify SOC', 'Notify application owner'],
    rollbackActions: ['Unblock IP', 'Remove temporary WAF rule'],
    approvalRequired: false,
    safetyGuardrails: ['Do not auto-block CDN/cloud/shared IPs without context', 'WAF exceptions require approval'],
    riskReductionScore: 7.9,
  },
  {
    recommendationId: 'rec-network-c2-contextual-block',
    title: 'Validate Network Communication Before Blocking',
    rationale: 'Suspicious network communication should be enriched with reputation, asset, and shared-infrastructure context.',
    techniqueIds: ['T1071', 'T1048'],
    incidentTypeIds: ['malicious_ip', 'threat_intel'],
    enrichmentActions: ['Threat-intel lookup', 'Passive DNS', 'Internal sightings', 'ASN/CDN check'],
    investigationActions: ['Review affected hosts', 'Check destination category', 'Analyze recurrence'],
    containmentActions: ['Block IP/domain with context', 'Open network ticket'],
    recoveryActions: ['Unblock if false positive', 'Expire IOC block after review'],
    notificationActions: ['Notify network team', 'Create ticket'],
    rollbackActions: ['Remove firewall block', 'Mark IOC expired'],
    approvalRequired: false,
    safetyGuardrails: ['Do not block shared infrastructure automatically', 'Require TTL and rationale for blocks'],
    riskReductionScore: 7.6,
  },
];

export function getResponseRecommendations(incidentTypeId: string, techniqueIds: string[]): ResponseRecommendationMapping[] {
  return RESPONSE_RECOMMENDATION_MAPPINGS.filter((r) =>
    r.incidentTypeIds.includes(incidentTypeId) || r.techniqueIds.some((id) => techniqueIds.includes(id)),
  );
}
