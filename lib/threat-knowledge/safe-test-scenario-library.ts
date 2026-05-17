// ============================================================
// SOARForge — Safe Test Scenario Library
// Synthetic payloads only. No destructive execution commands.
// ============================================================

import type { SafeTestScenario } from './threat-knowledge-types';

export const SAFE_TEST_SCENARIO_LIBRARY: SafeTestScenario[] = [
  {
    scenarioId: 'sts-ransomware-high-confidence',
    name: 'High-Confidence Ransomware Behavior Payload',
    description: 'Synthetic alert payload for validating scoring, containment path, and rollback documentation.',
    incidentTypeIds: ['ransomware'],
    techniqueIds: ['T1486', 'T1490'],
    syntheticPayload: {
      hostname: 'WIN-SAFE-TEST-01',
      machine_id: 'safe-test-machine-001',
      username: 'safe.test.user',
      command_line: 'SOARForge synthetic recovery alteration marker',
      mitre: ['T1486', 'T1490'],
      false_positive: false,
    },
    expectedEntities: ['hostname', 'machine_id', 'username', 'command_line'],
    expectedDecisionPath: 'High score path should reach containment or approval based on configured guardrails.',
    expectedApprovalBehavior: 'Disable-user or critical asset actions should require approval.',
    expectedRollbackBehavior: 'Unisolate endpoint and re-enable user procedures must be documented.',
    validationStatus: 'Approved_For_Production',
  },
  {
    scenarioId: 'sts-phishing-link',
    name: 'Suspicious Link Email Payload',
    description: 'Synthetic email alert for validating URL enrichment, mailbox actions, and false-positive release path.',
    incidentTypeIds: ['phishing'],
    techniqueIds: ['T1566', 'T1566.002'],
    syntheticPayload: {
      sender_email: 'external.sender@example.test',
      recipient_email: 'user@example.test',
      subject_line: 'SOARForge Safe Test Message',
      url: 'https://example.test/safe-validation',
      message_id: '<soarforge-safe-test@example.test>',
    },
    expectedEntities: ['sender_email', 'recipient_email', 'subject_line', 'url', 'message_id'],
    expectedDecisionPath: 'URL enrichment and quarantine review path.',
    expectedApprovalBehavior: 'Mass deletion must require approval; quarantine is preferred.',
    expectedRollbackBehavior: 'Release message and remove sender block if false positive.',
    validationStatus: 'Approved_For_Production',
  },
  {
    scenarioId: 'sts-identity-impossible-travel',
    name: 'Unusual Login Context Payload',
    description: 'Synthetic identity event for validating geolocation, ASN, and MFA/session recommendations.',
    incidentTypeIds: ['suspicious_login'],
    techniqueIds: ['T1078'],
    syntheticPayload: {
      username: 'safe.identity.user@example.test',
      source_ip: '203.0.113.10',
      geo: 'Test-Region-A',
      asn: 'AS64500',
      mfa_status: 'completed',
      previous_geo: 'Test-Region-B',
    },
    expectedEntities: ['username', 'source_ip', 'geo', 'asn', 'mfa_status'],
    expectedDecisionPath: 'Identity risk review path with session control recommendation.',
    expectedApprovalBehavior: 'Privileged-user disablement requires approval.',
    expectedRollbackBehavior: 'Restore access controls after verification.',
    validationStatus: 'Approved_For_Production',
  },
  {
    scenarioId: 'sts-waf-contextual-event',
    name: 'WAF Security Event Payload',
    description: 'Synthetic WAF event for validating request parsing, CDN guardrail, and AppSec notification.',
    incidentTypeIds: ['waf_attack'],
    techniqueIds: ['T1190'],
    syntheticPayload: {
      client_ip: '198.51.100.25',
      uri: '/safe-validation/path',
      method: 'GET',
      status_code: 403,
      waf_rule_id: 'SAFE-TEST-RULE',
      owasp_category: 'validation-test',
    },
    expectedEntities: ['client_ip', 'uri', 'method', 'status_code', 'waf_rule_id'],
    expectedDecisionPath: 'WAF enrichment path with CDN/cloud context check before blocking.',
    expectedApprovalBehavior: 'WAF exception or shared IP block requires approval.',
    expectedRollbackBehavior: 'Remove block or temporary policy after review.',
    validationStatus: 'Approved_For_Production',
  },
];

export function getSafeTestsForIncident(incidentTypeId: string): SafeTestScenario[] {
  return SAFE_TEST_SCENARIO_LIBRARY.filter((s) => s.incidentTypeIds.includes(incidentTypeId));
}
