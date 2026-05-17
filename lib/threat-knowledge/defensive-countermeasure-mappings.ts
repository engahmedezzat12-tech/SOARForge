// ============================================================
// SOARForge — Defensive Countermeasure Mappings (D3FEND-inspired)
// ============================================================

import type { DefensiveCountermeasureMapping } from './threat-knowledge-types';

export const DEFENSIVE_COUNTERMEASURE_MAPPINGS: DefensiveCountermeasureMapping[] = [
  {
    d3fendId: 'D3-FAM',
    name: 'File Activity Monitoring',
    tactic: 'Detect',
    definition: 'Monitor file activity patterns to identify abnormal volume, rename, extension, and creation behavior.',
    mappedAttackTechniques: ['T1486'],
    responseActions: ['collect_file_activity_context', 'isolate_endpoint_with_review'],
    enrichmentActions: ['query_edr_recent_file_events', 'check_backup_context'],
    documentationNotes: ['Used to support ransomware behavior coverage and file impact validation.'],
    status: 'Approved_For_Production',
  },
  {
    d3fendId: 'D3-BV',
    name: 'Backup Validation',
    tactic: 'Restore',
    definition: 'Validate backup availability and recovery readiness when data impact behavior is observed.',
    mappedAttackTechniques: ['T1486', 'T1490'],
    responseActions: ['validate_backup_status', 'notify_infrastructure_team'],
    enrichmentActions: ['query_backup_job_status', 'query_asset_criticality'],
    documentationNotes: ['Recommended for high-confidence ransomware paths before recovery planning.'],
    status: 'Approved_For_Production',
  },
  {
    d3fendId: 'D3-AL',
    name: 'Account Locking / Session Control',
    tactic: 'Evict',
    definition: 'Temporarily restrict suspicious account activity while maintaining approval safeguards for privileged users.',
    mappedAttackTechniques: ['T1078', 'T1110.003', 'T1098'],
    responseActions: ['revoke_sessions', 'force_mfa_reset', 'disable_user_with_approval'],
    enrichmentActions: ['query_identity_risk', 'query_privileged_groups'],
    documentationNotes: ['Requires privileged-user guardrail and rollback to restore access after review.'],
    status: 'Approved_For_Production',
  },
  {
    d3fendId: 'D3-NTA',
    name: 'Network Traffic Analysis',
    tactic: 'Detect',
    definition: 'Analyze outbound network traffic for suspicious communication patterns and context-driven blocking decisions.',
    mappedAttackTechniques: ['T1071', 'T1048'],
    responseActions: ['block_ip_with_context', 'create_ticket', 'notify_network_team'],
    enrichmentActions: ['threat_intel_lookup', 'asn_cdn_check', 'internal_asset_lookup'],
    documentationNotes: ['Automatic blocking requires CDN/cloud/shared infrastructure validation.'],
    status: 'Approved_For_Production',
  },
  {
    d3fendId: 'D3-WAF',
    name: 'Application Access Filtering',
    tactic: 'Harden',
    definition: 'Use WAF policy and application-layer filtering to reduce exposure to public application security events.',
    mappedAttackTechniques: ['T1190'],
    responseActions: ['block_ip_with_context', 'create_appsec_ticket', 'notify_application_owner'],
    enrichmentActions: ['waf_rule_context', 'request_volume_analysis', 'source_reputation'],
    documentationNotes: ['WAF policy changes and exceptions must require approval.'],
    status: 'Approved_For_Production',
  },
  {
    d3fendId: 'D3-EMF',
    name: 'Email Message Filtering',
    tactic: 'Detect',
    definition: 'Inspect and contain suspicious messages based on sender, URL, attachment, and campaign context.',
    mappedAttackTechniques: ['T1566', 'T1566.001', 'T1566.002'],
    responseActions: ['quarantine_email', 'search_similar_emails', 'block_sender_with_review'],
    enrichmentActions: ['url_reputation', 'hash_reputation', 'sender_domain_review'],
    documentationNotes: ['Mass message deletion should require approval; quarantine is safer by default.'],
    status: 'Approved_For_Production',
  },
];

export function getCountermeasuresForTechniques(techniqueIds: string[]): DefensiveCountermeasureMapping[] {
  return DEFENSIVE_COUNTERMEASURE_MAPPINGS.filter((m) => m.mappedAttackTechniques.some((id) => techniqueIds.includes(id)));
}
