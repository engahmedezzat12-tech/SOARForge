// ============================================================================
// SOARForge Professional v1.1 — QA Matrix
// Template | Generator | Expected Steps | Required Connectors | Guardrails | Export Status
// ============================================================================

export interface QAMatrixEntry {
  templateId: string;
  templateName: string;
  generatorFunction: string;
  usesGenericWorkflow: false;
  expectedStepNames: string[];
  requiredConnectors: string[];
  guardrails: string[];
  exportValidationChecks: {
    mustContain: string[];
    mustNotContain: string[];
  };
  documentationRequired: string[];
}

export const SOAR_QA_MATRIX: QAMatrixEntry[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // 1. Ransomware
  // ──────────────────────────────────────────────────────────────────────────
  {
    templateId: "ransomware",
    templateName: "Ransomware Auto Containment",
    generatorFunction: "generateRansomwareWorkflow",
    usesGenericWorkflow: false,
    expectedStepNames: [
      "Start",
      "Build_Context",
      "User_Context",
      "Final_Context",
      "Decide_Base",
      "Decide_Final",
      "Safety_Gates",
      "Ransom_Action_Decision",
      "Decision_Ransom_Action",
      "Approval",
      "Approval_Post_Decision",
      "Isolate_Endpoint",
      "Search_Asset_by_Hostname",
      "Validate_Search_Result",
      "Decision_Search_Result",
      "Isolate_After_Search",
      "Notify_SOC",
      "Create_or_Update_Ticket",
      "Add_Case_Comment",
      "Finalize",
    ],
    requiredConnectors: ["groupib_edr", "active_directory", "fortisandbox", "microsoft_teams", "virustotal"],
    guardrails: [
      "Auto-isolate only if score >= 8 AND valid machine_id AND not false positive AND not resolved",
      "Service accounts (SYSTEM, LOCAL SERVICE, NETWORK SERVICE) never disabled",
      "Domain Admin accounts never disabled",
      "Approval required for score 2-7",
      "isActive=false on export",
    ],
    exportValidationChecks: {
      mustContain: ["Isolate_Endpoint", "Approval", "Approval_Post_Decision", "Safety_Gates", "Validate_Search_Result", "Finalize"],
      mustNotContain: [],
    },
    documentationRequired: [
      "Implementation guide with connector placeholders",
      "UAT test plan with ransomware-specific cases",
      "MITRE mapping T1486/T1490",
      "Rollback: unisolate_endpoint + enable_ad_user",
      "Known limitations: keyword scoring, hostname fallback",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 2. WAF Attack
  // ──────────────────────────────────────────────────────────────────────────
  {
    templateId: "waf_attack",
    templateName: "WAF Attack Response",
    generatorFunction: "generateWAFWorkflow",
    usesGenericWorkflow: false,
    expectedStepNames: [
      "Start",
      "Build_Context",
      "Extract_IOCs",
      "Score_WAF_Attack",
      "Compute_WAF_Score",
      "WAF_Action_Decision",
      "WAF_Approval",
      "WAF_Approval_Decision",
      "Block_IP",
      "CDN_Cloud_Guardrail",
      "Finalize",
    ],
    requiredConnectors: ["fortigate_firewall", "palo_alto_firewall", "abuseipdb", "virustotal", "microsoft_teams"],
    guardrails: [
      "CDN_Cloud_Guardrail step always present after IP block",
      "Approval required for score 3-5",
      "Auto-block only at score >= 6",
      "WAF_Approval description includes CDN verification note",
      "isActive=false on export",
    ],
    exportValidationChecks: {
      mustContain: ["CDN_Cloud_Guardrail", "WAF_Approval", "WAF_Approval_Decision", "Block_IP", "Finalize"],
      mustNotContain: [],
    },
    documentationRequired: [
      "OWASP mapping (T1190 for SQLi/RCE, T1059.007 for XSS)",
      "CDN/cloud guardrail documentation",
      "UAT test plan with OWASP categories",
      "Rollback: IP unblock procedure",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Phishing
  // ──────────────────────────────────────────────────────────────────────────
  {
    templateId: "phishing",
    templateName: "Phishing Campaign Response",
    generatorFunction: "generatePhishingWorkflow",
    usesGenericWorkflow: false,
    expectedStepNames: [
      "Start",
      "Build_Context",
      "Extract_Email_IOCs",
      "Unique_Message_Check",
      "Score_Phishing",
      "Compute_Phishing_Score",
      "Phishing_Action_Decision",
      "Phishing_Approval",
      "Phishing_Approval_Decision",
      "Quarantine_Email",
      "Finalize",
    ],
    requiredConnectors: ["exchange", "abuseipdb", "virustotal", "microsoft_teams"],
    guardrails: [
      "Unique_Message_Check prevents duplicate quarantine",
      "False positive release mechanism documented in Phishing_Approval description",
      "Quarantine only by unique message_id",
      "No bulk-delete without approval",
      "isActive=false on export",
    ],
    exportValidationChecks: {
      mustContain: ["Unique_Message_Check", "Quarantine_Email", "Phishing_Approval", "Phishing_Approval_Decision", "Finalize"],
      mustNotContain: [],
    },
    documentationRequired: [
      "Mailbox search procedure",
      "Unique message_id validation guardrail",
      "Quarantine procedure",
      "False positive release process",
      "MITRE mapping T1566.001/T1566.002",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Suspicious Login
  // ──────────────────────────────────────────────────────────────────────────
  {
    templateId: "suspicious_login",
    templateName: "Suspicious Login Response",
    generatorFunction: "generateSuspiciousLoginWorkflow",
    usesGenericWorkflow: false,
    expectedStepNames: [
      "Start",
      "Build_Context",
      "User_Context",
      "Score_Identity_Risk",
      "Identity_Safety_Gates",
      "Identity_Action_Decision",
      "Manual_Escalation",
      "Identity_Approval",
      "Identity_Approval_Decision",
      "Disable_AD_User",
      "Finalize",
    ],
    requiredConnectors: ["active_directory", "azure_ad", "abuseipdb", "microsoft_teams"],
    guardrails: [
      "Approval_Before_Disable is mandatory — hardcoded in Identity_Safety_Gates",
      "Service accounts never auto-disabled",
      "Domain Admin accounts escalated to Manual_Escalation, never disabled",
      "Double-check condition in Identity_Approval_Decision prevents disable even after approval for privileged accounts",
      "Reset password on next login recommended",
      "isActive=false on export",
    ],
    exportValidationChecks: {
      // "Approval_Before_Disable" is text inside the Identity_Approval description, not a step name.
      // The actual step name is "Identity_Approval". Identity_Approval_Decision is the post-approval
      // decision step. Both must be present for the approval chain to be complete.
      mustContain: ["Identity_Safety_Gates", "Identity_Approval", "Identity_Approval_Decision", "Disable_AD_User", "Manual_Escalation", "Finalize"],
      mustNotContain: [],
    },
    documentationRequired: [
      "AD/Entra ID integration notes",
      "Revoke sessions procedure",
      "Reset password procedure",
      "Identity_Approval (APPROVAL_BEFORE_DISABLE) guardrail rationale",
      "MITRE mapping T1078/T1110.003",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Malware Hash
  // ──────────────────────────────────────────────────────────────────────────
  {
    templateId: "malware_hash",
    templateName: "Malware Hash Analysis",
    generatorFunction: "generateMalwareHashWorkflow",
    usesGenericWorkflow: false,
    expectedStepNames: [
      "Start",
      "Build_Context",
      "Extract_Hash_Context",
      "Hash_Availability_Check",
      "Hash_Missing_Fallback",
      "VT_Hash_Lookup",
      "Parse_VT_Result",
      "Sandbox_Analysis",
      "Score_Hash_Reputation",
      "Hash_Action_Decision",
      "Malware_Approval",
      "Malware_Approval_Decision",
      "Isolate_Endpoint",
      "Finalize",
    ],
    requiredConnectors: ["groupib_edr", "virustotal", "fortisandbox", "microsoft_teams"],
    guardrails: [
      "Hash_Availability_Check prevents crash on missing hash",
      "Hash_Missing_Fallback provides graceful path when hash absent",
      "Sandbox analysis always performed before isolation decision",
      "Analyst approval required for score 2-4",
      "isActive=false on export",
    ],
    exportValidationChecks: {
      mustContain: ["VT_Hash_Lookup", "Sandbox_Analysis", "Score_Hash_Reputation", "Malware_Approval", "Malware_Approval_Decision", "Isolate_Endpoint", "Finalize"],
      mustNotContain: [],
    },
    documentationRequired: [
      "Hash reputation lookup procedure",
      "Sandbox submission procedure",
      "Endpoint context extraction",
      "MITRE mapping T1204/T1204.002",
      "Rollback: unisolate endpoint",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Malicious IP
  // ──────────────────────────────────────────────────────────────────────────
  {
    templateId: "malicious_ip",
    templateName: "Malicious IP Response",
    generatorFunction: "generateMaliciousIPWorkflow",
    usesGenericWorkflow: false,
    expectedStepNames: [
      "Start",
      "Build_Context",
      "Extract_IOCs",
      "AbuseIPDB_Lookup",
      "VT_IP_Lookup",
      "Reputation_Consensus",
      "IP_Action_Decision",
      "IP_Block_Approval",
      "IP_Block_Approval_Decision",
      "Temporary_Block_IP",
      "CDN_Cloud_Guardrail",
      "Finalize",
    ],
    requiredConnectors: ["abuseipdb", "virustotal", "fortigate_firewall", "palo_alto_firewall", "microsoft_teams"],
    guardrails: [
      "CDN_Cloud_Guardrail present after every IP block",
      "Temporary_Block_IP name indicates block is reversible",
      "Reputation_Consensus requires 2+ sources before auto-block",
      "IP_Block_Approval description includes CDN/cloud IP verification note",
      "isActive=false on export",
    ],
    exportValidationChecks: {
      mustContain: ["CDN_Cloud_Guardrail", "Temporary_Block_IP", "Reputation_Consensus", "IP_Block_Approval", "IP_Block_Approval_Decision", "Finalize"],
      mustNotContain: [],
    },
    documentationRequired: [
      "CDN/cloud IP guardrail documentation",
      "Temporary block procedure and rollback",
      "Reputation_Consensus logic explanation",
      "MITRE mapping T1071/T1048",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Vulnerability
  // ──────────────────────────────────────────────────────────────────────────
  {
    templateId: "vulnerability",
    templateName: "Vulnerability Remediation Workflow",
    generatorFunction: "generateVulnerabilityWorkflow",
    usesGenericWorkflow: false,
    expectedStepNames: [
      "Start",
      "Build_Context",
      "Extract_Vuln_Data",
      "Duplicate_Ticket_Lookup",
      "Vuln_Score_And_SLA",
      "SLA_Recommendation",
      "Duplicate_Check_Decision",
      "Update_Existing_Ticket",
      "Create_Vuln_Ticket",
      "Finalize",
    ],
    requiredConnectors: ["servicenow", "jira"],
    guardrails: [
      "Duplicate_Ticket_Lookup always present before ticket creation",
      "SLA_Recommendation step provides CVSS/EPSS-derived SLA",
      "No destructive remediation actions — ticket-driven only",
      "No automated patching",
      "ticketingEnabled=true set in loadTemplate for this template",
      "isActive=false on export",
    ],
    exportValidationChecks: {
      mustContain: ["Duplicate_Ticket_Lookup", "SLA_Recommendation", "Create_Vuln_Ticket", "Finalize"],
      mustNotContain: ["Isolate_Endpoint", "Disable_AD_User", "Block_IP"],
    },
    documentationRequired: [
      "CVSS/EPSS scoring explanation",
      "SLA tier assignment logic",
      "Duplicate_Ticket_Lookup procedure",
      "Remediation ticket lifecycle",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Ticket Automation
  // ──────────────────────────────────────────────────────────────────────────
  {
    templateId: "ticket_automation",
    templateName: "Ticket Automation & ITSM Sync",
    generatorFunction: "generateTicketAutomationWorkflow",
    usesGenericWorkflow: false,
    expectedStepNames: [
      "Start",
      "Build_Context",
      "Extract_Alert_Metadata",
      "Duplicate_Ticket_Lookup",
      "Check_Duplicate",
      "Create_Ticket",
      "Update_Ticket",
      "Finalize",
    ],
    requiredConnectors: ["servicenow", "jira"],
    guardrails: [
      "Duplicate_Ticket_Lookup always present",
      "Check_Duplicate decision routes to Update_Ticket or Create_Ticket",
      "No security response actions — ITSM only",
      "ticketingEnabled=true set in loadTemplate for this template",
      "isActive=false on export",
    ],
    exportValidationChecks: {
      mustContain: ["Duplicate_Ticket_Lookup", "Create_Ticket", "Update_Ticket", "Finalize"],
      mustNotContain: ["Isolate_Endpoint", "Disable_AD_User", "Block_IP", "Quarantine_Email"],
    },
    documentationRequired: [
      "Duplicate ticket lookup procedure",
      "Ticket lifecycle states",
      "ServiceNow and Jira integration notes",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 9. Threat Intel
  // ──────────────────────────────────────────────────────────────────────────
  {
    templateId: "threat_intel",
    templateName: "Threat Intel IOC Enrichment",
    generatorFunction: "generateThreatIntelWorkflow",
    usesGenericWorkflow: false,
    expectedStepNames: [
      "Start",
      "Build_Context",
      "Extract_IOCs",
      "VT_IOC_Lookup",
      "AbuseIPDB_IOC_Lookup",
      "Reputation_Consensus",
      "Update_Alert_With_Enrichment",
      "Analyst_Review",
      "Finalize",
    ],
    requiredConnectors: ["virustotal", "abuseipdb", "fortiguard", "microsoft_teams"],
    guardrails: [
      "Reputation_Consensus required — 2+ sources must agree",
      "No auto-block on any IOC type",
      "Analyst_Review step is mandatory — no automated downstream action",
      "Single-source flags are informational only",
      "auto_block_taken=false hardcoded in Analyst_Review",
      "isActive=false on export",
    ],
    exportValidationChecks: {
      mustContain: ["Reputation_Consensus", "Analyst_Review", "Update_Alert_With_Enrichment", "Finalize"],
      mustNotContain: ["Block_IP", "Temporary_Block_IP", "Isolate_Endpoint"],
    },
    documentationRequired: [
      "Reputation_Consensus logic documentation",
      "Watchlist update procedure",
      "Analyst review decision tree",
      "No auto-block rationale",
      "MITRE mapping T1071/T1566",
    ],
  },
];

// ============================================================================
// QA Matrix Validation Utility
// ============================================================================

export interface QAValidationResult {
  templateId: string;
  passed: boolean;
  failures: string[];
  warnings: string[];
}

/**
 * Validate a generated workflow's step names against the QA matrix.
 * Used for export-time validation.
 */
export function validateWorkflowAgainstQAMatrix(
  templateId: string,
  stepNames: string[]
): QAValidationResult {
  const entry = SOAR_QA_MATRIX.find((e) => e.templateId === templateId);
  if (!entry) {
    return {
      templateId,
      passed: true,
      failures: [],
      warnings: [`No QA matrix entry found for templateId "${templateId}" — skipping validation`],
    };
  }

  const failures: string[] = [];
  const warnings: string[] = [];
  const stepSet = new Set(stepNames);

  // Check mustContain
  for (const required of entry.exportValidationChecks.mustContain) {
    if (!stepSet.has(required)) {
      failures.push(`Required step "${required}" not found in generated workflow`);
    }
  }

  // Check mustNotContain
  for (const forbidden of entry.exportValidationChecks.mustNotContain) {
    if (stepSet.has(forbidden)) {
      failures.push(`Forbidden step "${forbidden}" found in template "${templateId}" — check generator routing`);
    }
  }

  // Warn on missing expected steps (non-critical — some are optional based on actions selected)
  for (const expected of entry.expectedStepNames) {
    if (!stepSet.has(expected)) {
      warnings.push(`Expected step "${expected}" not found — may be conditional on selected actions`);
    }
  }

  return {
    templateId,
    passed: failures.length === 0,
    failures,
    warnings,
  };
}

// ============================================================================
// QA Report Row — structured data for the Step 11 UI table
// ============================================================================

export interface QAReportRow {
  templateId: string;
  templateName: string;
  generatorFunction: string;
  usesGenericWorkflow: false;
  expectedStepCount: number;
  presentStepCount: number;
  missingMustContain: string[];
  forbiddenPresent: string[];
  requiredConnectors: string[];
  guardrailCount: number;
  status: 'pass' | 'fail' | 'not_checked';
}

/**
 * Run the full QA matrix report against the actual generated workflow steps for a single template.
 * Returns a structured row suitable for display in a table.
 */
export function runQAReportRow(
  templateId: string,
  actualStepNames: string[]
): QAReportRow {
  const entry = SOAR_QA_MATRIX.find((e) => e.templateId === templateId);
  if (!entry) {
    return {
      templateId,
      templateName: templateId,
      generatorFunction: 'unknown',
      usesGenericWorkflow: false,
      expectedStepCount: 0,
      presentStepCount: actualStepNames.length,
      missingMustContain: [],
      forbiddenPresent: [],
      requiredConnectors: [],
      guardrailCount: 0,
      status: 'not_checked',
    };
  }

  const stepSet = new Set(actualStepNames);
  const missingMustContain = entry.exportValidationChecks.mustContain.filter((s) => !stepSet.has(s));
  const forbiddenPresent = entry.exportValidationChecks.mustNotContain.filter((s) => stepSet.has(s));
  const status = missingMustContain.length === 0 && forbiddenPresent.length === 0 ? 'pass' : 'fail';

  return {
    templateId: entry.templateId,
    templateName: entry.templateName,
    generatorFunction: entry.generatorFunction,
    usesGenericWorkflow: false,
    expectedStepCount: entry.expectedStepNames.length,
    presentStepCount: entry.expectedStepNames.filter((s) => stepSet.has(s)).length,
    missingMustContain,
    forbiddenPresent,
    requiredConnectors: entry.requiredConnectors,
    guardrailCount: entry.guardrails.length,
    status,
  };
}

/**
 * Print a human-readable QA matrix summary.
 */
export function getQAMatrixSummary(): string {
  const rows = SOAR_QA_MATRIX.map((e) => [
    e.templateId.padEnd(20),
    e.generatorFunction.padEnd(35),
    `${e.expectedStepNames.length} steps`.padEnd(10),
    `${e.requiredConnectors.length} connectors`.padEnd(14),
    `${e.guardrails.length} guardrails`.padEnd(14),
    e.exportValidationChecks.mustContain.join(", "),
  ].join(" | ")).join("\n");

  return `SOARForge Professional v1.1 — QA Matrix
=========================================================
Template             | Generator                          | Steps     | Connectors    | Guardrails    | Must Contain
${rows}

All 9 predefined templates use real generators (usesGenericWorkflow: false).
custom_blank is the only template that uses generateCustomWorkflow.
Production_Ready status is never set automatically.
`;
}
