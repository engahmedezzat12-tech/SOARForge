import type { PlaybookTemplate } from "./soar-types";

// Minimal template factory to ensure all required fields
const createTemplate = (overrides: Partial<PlaybookTemplate>): PlaybookTemplate => ({
  id: "",
  name: "",
  category: "",
  description: "",
  severity: "medium",
  trigger: { type: "", description: "", sourceSystem: "" },
  entities: [],
  enrichmentConnectors: [],
  scoringModel: {
    type: "none",
    severity: "medium",
    rules: [],
    thresholds: [],
    approvalRecommendation: "",
    actionRecommendation: "",
    decisionLogic: "",
    mitreMapping: [],
  },
  actions: [],
  fallbackProcedure: { escalationPath: "", manualSteps: "", communicationTemplate: "" },
  testingPlan: { scenarios: "", successCriteria: "", performanceTargets: "" },
  approvalSignOff: { approvedBy: "", approvalDate: "", complianceNotes: "", reviewHistory: "" },
  ...overrides,
});

export const PLAYBOOK_TEMPLATES: PlaybookTemplate[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // 1. Ransomware Auto Containment
  // ──────────────────────────────────────────────────────────────────────────
  createTemplate({
    id: "ransomware",
    name: "Ransomware Auto Containment",
    category: "Endpoint Response",
    description:
      "Automated ransomware detection and endpoint containment using keyword-based additive scoring. Scores MITRE T1486/T1490, shadow-copy tamper, encryption keywords, and ransom-note patterns. Auto-isolates at score ≥ 8; requires analyst approval at score 2–7; skips below threshold or on false positive/resolved.",
    severity: "critical",
    generatorType: "ransomware",
    requiredConnectorKeys: ["groupib_edr", "active_directory", "virustotal"],
    trigger: {
      type: "EDR Alert / SIEM Correlation",
      description:
        "Triggered by EDR behavioral alert (CrowdStrike Falcon, Group-IB, Defender ATP) or SIEM correlation rule detecting ransomware indicators.",
      sourceSystem: "CrowdStrike Falcon / Group-IB TDS / Microsoft Defender for Endpoint",
    },
    entities: ["hostname", "machine_id", "username", "command_line", "file_hash"],
    enrichmentConnectors: ["groupib_edr", "virustotal"],
    scoringModel: {
      type: "additive",
      severity: "critical",
      rules: [
        { id: "r1", label: "MITRE T1486 detected", condition: "Alert text, MITRE tags, or rule name contains T1486 / Data Encrypted for Impact", points: 3, mitre: "T1486" },
        { id: "r2", label: "vssadmin/shadow copy tamper", condition: "command_line or raw_event_text contains vssadmin, delete shadows, wbadmin, or bcdedit", points: 3, mitre: "T1490" },
        { id: "r3", label: "Encryption keywords", condition: "Alert text contains 'encrypt', 'ransom', 'lockbit', 'blackcat', or 'conti'", points: 2, mitre: "T1486" },
        { id: "r4", label: "Known ransomware extension", condition: "File path or name ends with .lockbit, .encrypted, .crypt, .enc, or .locked", points: 2 },
        { id: "r5", label: "Ransom note keywords", condition: "Alert text contains 'bitcoin', 'decrypt', 'readme' in context of ransom payment", points: 2 },
        { id: "r6", label: "Exfiltration + encryption combo", condition: "Both exfil indicators ('exfil','upload') and encryption indicators present in same alert", points: 1 },
      ],
      thresholds: [
        { label: "Skip", minScore: 0, maxScore: 1, action: "skip", description: "Score too low — no containment action" },
        { label: "Analyst Approval Required", minScore: 2, maxScore: 7, action: "analyst_approval", description: "Moderate confidence — analyst must approve before isolation" },
        { label: "Auto Contain", minScore: 8, maxScore: 99, action: "auto_contain", description: "High confidence — automatic endpoint isolation without approval" },
      ],
      approvalRecommendation:
        "Verify endpoint is not a backup server or business-critical system. Check EDR agent status before approving.",
      actionRecommendation: "Isolate endpoint, disable AD account, collect forensics, submit hash to sandbox.",
      decisionLogic: "Auto-isolate if score >= 8 AND valid machine_id AND not false positive AND not resolved.",
      mitreMapping: ["T1486", "T1490", "T1059", "T1562.001"],
    },
    actions: ["isolate_endpoint", "disable_ad_user"],
    fallbackProcedure: {
      escalationPath: "EDR Team > SOC Lead > CISO > Incident Commander",
      manualSteps:
        "1. Verify machine on EDR console\n2. Manually isolate via EDR UI if automation fails\n3. Disable AD account via ADUC\n4. Escalate to CISO if C-level or backup system",
      communicationTemplate:
        "RANSOMWARE ALERT: Endpoint {hostname} (machine_id={machine_id}) isolated. User {username} disabled. Score={score}. Incident: #{record_id}",
    },
    testingPlan: {
      scenarios:
        "1. Benign vssadmin backup job — expect score < 2, no containment\n2. Single T1486 MITRE tag — expect score 3, approval required\n3. T1486 + vssadmin + encryption keywords — expect score 8, auto-contain\n4. Alert marked falsePositive=true — expect score 0, no action\n5. Alert status=Resolved — expect no action\n6. username=SYSTEM — expect no AD disable\n7. machine_id empty, hostname present — expect hostname fallback search",
      successCriteria:
        "Benign cases produce no containment. High-confidence cases auto-isolate. Approval flow works for medium-confidence. FP/resolved skip cleanly.",
      performanceTargets: "Detection to isolation < 2 minutes. Approval timeout 72 hours.",
    },
    approvalSignOff: {
      approvedBy: "SOC Manager",
      approvalDate: new Date().toISOString().split("T")[0],
      complianceNotes: "Complies with IR policy, GDPR Article 33, ISO 27035.",
      reviewHistory: "Initial SOARForge generation — review before production deployment.",
    },
    tags: ["ransomware", "endpoint", "critical", "auto-contain"],
    businessObjective: "Minimize ransomware dwell time and blast radius via automated containment",
    mitreTactics: ["T1486", "T1490", "T1059", "T1562.001"],
    rollbackPlan:
      "Execute unisolate_endpoint via EDR console. Enable AD account via ADUC. Verify connectivity restored. Document in case notes.",
  }),

  // ──────────────────────────────────────────────────────────────────────────
  // 2. WAF Attack Response
  // ──────────────────────────────────────────────────────────────────────────
  createTemplate({
    id: "waf_attack",
    name: "WAF Attack Response",
    category: "Web Security",
    description:
      "Automated response to WAF/CDN alerts for OWASP Top-10 attacks including SQLi, XSS, path traversal, and command injection. Scores severity and request volume; blocks attacker IPs at firewall layer after approval. Includes CDN IP guardrail to prevent blocking shared hosting or CDN provider ranges.",
    severity: "high",
    generatorType: "waf_attack",
    requiredConnectorKeys: ["fortigate_firewall", "abuseipdb", "virustotal"],
    trigger: {
      type: "WAF / CDN Alert",
      description:
        "Triggered by WAF rule match or CDN edge security alert detecting OWASP-classified attack patterns.",
      sourceSystem: "FortiWeb / Cloudflare WAF / AWS WAF / Akamai",
    },
    entities: ["source_ip", "target_url", "attack_type", "request_count", "user_agent"],
    enrichmentConnectors: ["abuseipdb", "virustotal"],
    scoringModel: {
      type: "additive",
      severity: "high",
      rules: [
        { id: "r1", label: "Critical OWASP category", condition: "attack_type is SQLi, RCE, LFI, or Command Injection", points: 3, mitre: "T1190" },
        { id: "r2", label: "High request volume (>100/min)", condition: "request_count > 100 within a 1-minute window", points: 2 },
        { id: "r3", label: "Known malicious IP (AbuseIPDB >= 80)", condition: "AbuseIPDB confidence score >= 80", points: 3 },
        { id: "r4", label: "XSS or path traversal", condition: "attack_type is XSS, path traversal, or SSRF", points: 1, mitre: "T1059.007" },
      ],
      thresholds: [
        { label: "Monitor", minScore: 0, maxScore: 2, action: "monitor", description: "Log and monitor — no blocking action" },
        { label: "Analyst Approval", minScore: 3, maxScore: 5, action: "analyst_approval", description: "Review before IP block" },
        { label: "Auto Block", minScore: 6, maxScore: 99, action: "auto_contain", description: "Block source IP at firewall" },
      ],
      approvalRecommendation:
        "GUARDRAIL: Verify source IP is not a CDN edge node, cloud provider NAT, or shared hosting IP before blocking.",
      actionRecommendation:
        "Block source IP at perimeter firewall. Create ServiceNow ticket. Notify security team.",
      decisionLogic:
        "Auto-block if score >= 6 AND IP is not CDN/cloud provider. Require approval for score 3-5. Monitor below 3.",
      mitreMapping: ["T1190", "T1059.007", "T1203"],
    },
    actions: ["block_ip_paloalto", "create_servicenow_incident"],
    fallbackProcedure: {
      escalationPath: "WAF Engineer > SOC Lead > CISO",
      manualSteps:
        "1. Validate IP is not CDN/cloud range using WHOIS\n2. Block manually in firewall if automation fails\n3. Escalate to WAF vendor if persistent",
      communicationTemplate:
        "WAF ALERT: {attack_type} attack from {source_ip} against {target_url}. Score={score}. IP blocked={blocked}.",
    },
    testingPlan: {
      scenarios:
        "1. Known CDN IP — expect no block, monitor only\n2. SQLi from malicious IP (AbuseIPDB=90) — expect auto-block\n3. Low-volume XSS — expect monitor\n4. High-volume attack (>100/min) from unknown IP — expect approval required",
      successCriteria:
        "CDN IPs never blocked. High-confidence attacks auto-blocked. Approval path working for medium confidence.",
      performanceTargets: "Block decision < 30 seconds. Ticket created within 1 minute.",
    },
    approvalSignOff: {
      approvedBy: "SOC Manager",
      approvalDate: new Date().toISOString().split("T")[0],
      complianceNotes: "OWASP alignment documented. CDN guardrail present.",
      reviewHistory: "Initial SOARForge generation.",
    },
    tags: ["waf", "web", "owasp", "firewall"],
    businessObjective: "Block web application attacks while preventing false-positive firewall blocks on CDN/cloud IPs",
    mitreTactics: ["T1190", "T1059.007"],
    rollbackPlan: "Remove IP from firewall block group via unblock_ip_paloalto. Document reversal in ticket.",
    errorHandlingNotes:
      "CRITICAL GUARDRAIL: Never auto-block IPs in Cloudflare, Akamai, AWS, or Azure IP ranges. Always validate against CDN IP list.",
  }),

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Phishing Campaign Response
  // ──────────────────────────────────────────────────────────────────────────
  createTemplate({
    id: "phishing",
    name: "Phishing Campaign Response",
    category: "Email Security",
    description:
      "End-to-end phishing detection and response. Checks URL reputation, sender domain age, attachment hashes, and campaign indicators. Quarantines matching emails, blocks sender, and purges similar messages from all mailboxes. Includes unique message_id check to prevent duplicate quarantine and false-positive release mechanism.",
    severity: "high",
    generatorType: "phishing",
    requiredConnectorKeys: ["exchange", "abuseipdb", "virustotal"],
    trigger: {
      type: "Email Security Alert",
      description:
        "Triggered by email gateway (Mimecast, Proofpoint) or user report of suspicious email.",
      sourceSystem: "Mimecast / Proofpoint / Exchange Online Protection",
    },
    entities: ["sender_email", "recipient_email", "subject_line", "url", "attachment_hash", "message_id"],
    enrichmentConnectors: ["virustotal", "abuseipdb"],
    scoringModel: {
      type: "additive",
      severity: "high",
      rules: [
        { id: "r1", label: "Known phishing domain (VT detections > 5)", condition: "VirusTotal URL reputation detections > 5", points: 3, mitre: "T1566.001" },
        { id: "r2", label: "URL shortener or redirect chain", condition: "Message contains bit.ly, tinyurl, or multi-hop redirect chain", points: 2, mitre: "T1566.002" },
        { id: "r3", label: "Malicious attachment hash", condition: "File hash detected as malicious by VirusTotal (>3 detections)", points: 3, mitre: "T1566.001" },
        { id: "r4", label: "Sender domain < 30 days old", condition: "Sending domain WHOIS age < 30 days", points: 2 },
        { id: "r5", label: "Credential harvesting keywords", condition: "Body contains 'verify account', 'reset password', 'urgent action required'", points: 1 },
      ],
      thresholds: [
        { label: "Skip", minScore: 0, maxScore: 1, action: "skip", description: "Low confidence — no action" },
        { label: "Quarantine", minScore: 2, maxScore: 4, action: "analyst_approval", description: "Quarantine and notify analyst" },
        { label: "Auto Quarantine + Block", minScore: 5, maxScore: 99, action: "auto_contain", description: "Auto quarantine and block sender" },
      ],
      approvalRecommendation:
        "Verify message_id uniqueness before quarantine. Check if sender is a known vendor or partner. Review false positive release process.",
      actionRecommendation:
        "Quarantine email by message_id, block sender domain, purge campaign from all mailboxes.",
      decisionLogic: "Auto-quarantine + block if score >= 5. Quarantine with approval for score 2–4. Skip below 2.",
      mitreMapping: ["T1566.001", "T1566.002", "T1598"],
    },
    actions: ["quarantine_email", "block_sender"],
    fallbackProcedure: {
      escalationPath: "Email Security > SOC > CISO",
      manualSteps:
        "1. Manually quarantine via email gateway UI\n2. Block sender in Exchange transport rules\n3. Alert users who received the email",
      communicationTemplate:
        "PHISHING ALERT: Email from {sender_email} (subject: {subject_line}) quarantined. {recipient_count} recipients affected. Message ID: {message_id}",
    },
    testingPlan: {
      scenarios:
        "1. Known phishing domain (VT=10 detections) — expect auto-quarantine\n2. Legitimate newsletter from new domain — expect skip\n3. Message with malicious attachment + URL — expect auto-quarantine + block\n4. Duplicate message_id — expect no duplicate quarantine\n5. False positive — expect release mechanism triggered",
      successCriteria:
        "Phishing quarantined in < 30 sec. Legitimate emails not quarantined. Duplicate guard working.",
      performanceTargets: "Quarantine < 30 seconds. Campaign purge < 5 minutes.",
    },
    approvalSignOff: {
      approvedBy: "SOC Manager",
      approvalDate: new Date().toISOString().split("T")[0],
      complianceNotes:
        "Unique message_id check prevents duplicate quarantine. False positive release process documented.",
      reviewHistory: "Initial SOARForge generation.",
    },
    tags: ["phishing", "email", "quarantine"],
    businessObjective: "Stop phishing campaigns before user credential theft or malware execution",
    mitreTactics: ["T1566.001", "T1566.002"],
    rollbackPlan:
      "Release quarantined message via exchange/release_email action with analyst sign-off. Unblock sender if confirmed false positive.",
    errorHandlingNotes:
      "GUARDRAIL: Check message_id uniqueness before quarantine. Provide false positive release mechanism. Never bulk-delete without supervisor approval.",
  }),

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Suspicious Login / Identity Response
  // ──────────────────────────────────────────────────────────────────────────
  createTemplate({
    id: "suspicious_login",
    name: "Suspicious Login Response",
    category: "Identity & Access",
    description:
      "Detects and responds to anomalous login activity including impossible travel, new device/country, after-hours access, and credential spray patterns. Scores login context against baseline; disables AD/Entra account and revokes sessions after analyst approval. Includes guardrail to prevent disabling service accounts and Domain Admins.",
    severity: "high",
    generatorType: "suspicious_login",
    requiredConnectorKeys: ["active_directory", "azure_ad"],
    trigger: {
      type: "Identity Alert / UEBA",
      description:
        "Triggered by SIEM/UEBA alert for impossible travel, new geolocation, credential spray, or anomalous MFA behavior.",
      sourceSystem: "Microsoft Entra ID Protection / Okta / CrowdStrike Falcon Identity",
    },
    entities: ["username", "source_ip", "login_country", "device_id", "user_agent", "auth_method"],
    enrichmentConnectors: ["active_directory", "azure_ad", "abuseipdb"],
    scoringModel: {
      type: "additive",
      severity: "high",
      rules: [
        { id: "r1", label: "Impossible travel (< 1 hour)", condition: "Login from two geolocations physically impossible within time delta", points: 4, mitre: "T1078" },
        { id: "r2", label: "New country first login", condition: "User has never logged in from this country before", points: 3, mitre: "T1078.004" },
        { id: "r3", label: "Credential spray pattern", condition: "> 10 failed logins across accounts within 5 minutes from same source", points: 3, mitre: "T1110.003" },
        { id: "r4", label: "MFA bypass attempt", condition: "Login succeeded without MFA after multiple failed MFA challenges", points: 3, mitre: "T1556.006" },
        { id: "r5", label: "After-hours login", condition: "Login at unusual time for this user (outside normal working hours baseline)", points: 1 },
        { id: "r6", label: "Source IP in AbuseIPDB (> 50)", condition: "Source IP has AbuseIPDB score > 50", points: 2 },
      ],
      thresholds: [
        { label: "Monitor", minScore: 0, maxScore: 2, action: "monitor", description: "Log and monitor — no account action" },
        { label: "Approval Required", minScore: 3, maxScore: 6, action: "analyst_approval", description: "Analyst must approve before disable" },
        { label: "Auto Disable + Revoke", minScore: 7, maxScore: 99, action: "auto_contain", description: "Automatically disable account and revoke sessions" },
      ],
      approvalRecommendation:
        "GUARDRAIL: Approval_Before_Disable is mandatory. Never disable SYSTEM, LOCAL SERVICE, Domain Admin, or service accounts. Verify user identity with manager before disable.",
      actionRecommendation:
        "Disable AD account, revoke Azure AD sessions, reset password on next login.",
      decisionLogic:
        "Auto-disable if score >= 7 AND not service account AND not privileged account. Require approval for score 3–6.",
      mitreMapping: ["T1078", "T1078.004", "T1110.003", "T1556.006"],
    },
    actions: ["disable_ad_user", "revoke_azure_sessions"],
    fallbackProcedure: {
      escalationPath: "Identity Team > SOC Lead > CISO > HR (if insider)",
      manualSteps:
        "1. Call user to verify identity\n2. Manually disable in ADUC if automation fails\n3. Revoke sessions in Azure AD portal\n4. Escalate to HR/Legal if insider threat suspected",
      communicationTemplate:
        "IDENTITY ALERT: Suspicious login for {username} from {source_ip} ({login_country}). Account disabled pending investigation.",
    },
    testingPlan: {
      scenarios:
        "1. Impossible travel (New York → London in 20 min) — expect auto-disable\n2. Normal after-hours login — expect monitor\n3. Credential spray from known bad IP — expect auto-disable\n4. Domain Admin account — expect no disable regardless of score\n5. Service account (svc_backup) — expect no disable\n6. Score 4, non-privileged user — expect approval required",
      successCriteria:
        "Impossible travel triggers disable. Service/DA accounts never disabled. Approval flow working.",
      performanceTargets: "Alert to disable < 5 minutes. Session revocation < 2 minutes.",
    },
    approvalSignOff: {
      approvedBy: "SOC Manager",
      approvalDate: new Date().toISOString().split("T")[0],
      complianceNotes:
        "Approval_Before_Disable guardrail present. Identity verification step included.",
      reviewHistory: "Initial SOARForge generation.",
    },
    tags: ["identity", "login", "ueba", "mfa"],
    businessObjective:
      "Prevent account takeover and credential-based lateral movement with minimal user disruption",
    mitreTactics: ["T1078", "T1110.003"],
    rollbackPlan:
      "Re-enable AD account via enable_ad_user. Restore Azure AD session capability. Notify user with temporary access instructions.",
    errorHandlingNotes:
      "CRITICAL GUARDRAIL: Identity must contain Approval_Before_Disable step. Never disable privileged or service accounts automatically.",
  }),

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Malware Hash Analysis
  // ──────────────────────────────────────────────────────────────────────────
  createTemplate({
    id: "malware_hash",
    name: "Malware Hash Analysis",
    category: "Threat Detection",
    description:
      "Automated file hash enrichment, reputation scoring, and sandbox submission workflow. Checks file hash against VirusTotal and FortiSandbox; scores detection counts and behavioral verdicts. Isolates endpoint and blocks hash organization-wide if confirmed malicious. Includes hash availability check and fallback for missing hash values.",
    severity: "high",
    generatorType: "malware_hash",
    requiredConnectorKeys: ["virustotal", "fortisandbox", "groupib_edr"],
    trigger: {
      type: "EDR / Antivirus Alert",
      description:
        "Triggered by EDR or AV engine detecting a suspicious file or behavior-based malware alert.",
      sourceSystem: "CrowdStrike Falcon / Group-IB TDS / Defender ATP / Carbon Black",
    },
    entities: ["file_hash", "file_path", "hostname", "machine_id", "process_name"],
    enrichmentConnectors: ["virustotal", "fortisandbox"],
    scoringModel: {
      type: "additive",
      severity: "high",
      rules: [
        { id: "r1", label: "VirusTotal detections > 5", condition: "VT positive detection count > 5 engines", points: 3, mitre: "T1204" },
        { id: "r2", label: "VirusTotal detections 1–5", condition: "VT positive detection count 1–5 engines", points: 2 },
        { id: "r3", label: "Sandbox verdict: malicious", condition: "FortiSandbox or Cuckoo behavioral analysis returns malicious verdict", points: 3, mitre: "T1204.002" },
        { id: "r4", label: "Sandbox verdict: suspicious", condition: "Sandbox analysis returns suspicious verdict", points: 1 },
        { id: "r5", label: "Known ransomware hash", condition: "Hash matches known ransomware family in threat intel feed", points: 3, mitre: "T1486" },
      ],
      thresholds: [
        { label: "No Action", minScore: 0, maxScore: 1, action: "skip", description: "Clean or insufficient data" },
        { label: "Analyst Review", minScore: 2, maxScore: 4, action: "analyst_approval", description: "Review sandbox results before action" },
        { label: "Auto Contain", minScore: 5, maxScore: 99, action: "auto_contain", description: "Isolate endpoint and block hash" },
      ],
      approvalRecommendation:
        "Review sandbox behavioral report before approving endpoint isolation. Check if file is a known legitimate tool.",
      actionRecommendation:
        "Submit hash to sandbox, isolate endpoint if confirmed malicious, add hash to EDR blocklist.",
      decisionLogic:
        "Submit to sandbox first. If VT detections > 5 OR sandbox verdict malicious, auto-contain. Otherwise require approval.",
      mitreMapping: ["T1204", "T1204.002", "T1486", "T1059"],
    },
    actions: ["isolate_endpoint"],
    fallbackProcedure: {
      escalationPath: "Malware Analyst > EDR Team > SOC Lead",
      manualSteps:
        "1. Download file for manual analysis if hash missing\n2. Submit to VirusTotal manually\n3. Isolate via EDR console if automation fails",
      communicationTemplate:
        "MALWARE ALERT: Hash {file_hash} on {hostname} — VT Score={vt_score}, Sandbox={sandbox_verdict}. Endpoint isolated={isolated}.",
    },
    testingPlan: {
      scenarios:
        "1. Known malware hash (VT detections=50) — expect auto-contain\n2. Clean file (VT=0, sandbox=clean) — expect no action\n3. No hash available — expect fallback to manual review step\n4. Sandbox timeout — expect graceful fallback\n5. VT detections=3, sandbox=suspicious — expect approval required",
      successCriteria:
        "Malicious hashes trigger isolation. Clean files not actioned. Hash-missing fallback clean.",
      performanceTargets: "Hash lookup < 30 seconds. Sandbox detonation < 5 minutes.",
    },
    approvalSignOff: {
      approvedBy: "SOC Manager",
      approvalDate: new Date().toISOString().split("T")[0],
      complianceNotes: "Sandbox submission logged for forensic chain of custody.",
      reviewHistory: "Initial SOARForge generation.",
    },
    tags: ["malware", "hash", "sandbox", "edr"],
    businessObjective: "Rapid file reputation check and automated endpoint containment for confirmed malware",
    mitreTactics: ["T1204", "T1486"],
    rollbackPlan:
      "Unisolate endpoint via EDR. Remove hash from EDR blocklist if confirmed false positive.",
    errorHandlingNotes:
      "Guardrail: Check hash availability before sandbox submission. Provide set_variable fallback if fortisandbox connector not configured.",
  }),

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Malicious IP Response
  // ──────────────────────────────────────────────────────────────────────────
  createTemplate({
    id: "malicious_ip",
    name: "Malicious IP Response",
    category: "Network Security",
    description:
      "Automated response to malicious IP activity including C2 callbacks, scanning, and exfiltration. Enriches IP via AbuseIPDB and VirusTotal; scores reputation, traffic volume, and known threat intel. Blocks IP at perimeter firewall after checking CDN/cloud provider guardrail. Includes automatic reputation consensus from multiple sources.",
    severity: "high",
    generatorType: "malicious_ip",
    requiredConnectorKeys: ["abuseipdb", "virustotal", "fortigate_firewall"],
    trigger: {
      type: "Network IDS/Firewall Alert",
      description:
        "Triggered by SIEM correlation or IDS/IPS rule detecting C2 traffic, scanning, or suspicious outbound connections.",
      sourceSystem: "FortiGate / Palo Alto / Zeek / Suricata / SIEM",
    },
    entities: ["source_ip", "dest_ip", "protocol", "port", "bytes_transferred"],
    enrichmentConnectors: ["abuseipdb", "virustotal"],
    scoringModel: {
      type: "consensus",
      severity: "high",
      rules: [
        { id: "r1", label: "AbuseIPDB >= 90", condition: "AbuseIPDB confidence score >= 90 — high abuse confidence", points: 4 },
        { id: "r2", label: "AbuseIPDB 50–89", condition: "AbuseIPDB confidence score 50–89", points: 2 },
        { id: "r3", label: "VirusTotal detections > 5", condition: "VirusTotal IP report detections > 5 engines", points: 3, mitre: "T1071" },
        { id: "r4", label: "Known C2 indicator", condition: "IP matches known C2 framework (Cobalt Strike, Sliver, Metasploit) in threat intel", points: 4, mitre: "T1071.001" },
        { id: "r5", label: "High data transfer (> 100 MB)", condition: "bytes_transferred > 100,000,000 to external IP", points: 2, mitre: "T1048" },
        { id: "r6", label: "Reputation_Consensus: both VT and AbuseIPDB agree", condition: "Both AbuseIPDB > 50 AND VT > 3 detections — consensus block", points: 2 },
      ],
      thresholds: [
        { label: "Monitor", minScore: 0, maxScore: 2, action: "monitor", description: "Enrich and log only" },
        { label: "Analyst Approval", minScore: 3, maxScore: 5, action: "analyst_approval", description: "Review before block" },
        { label: "Auto Block", minScore: 6, maxScore: 99, action: "auto_contain", description: "Block at perimeter firewall" },
      ],
      approvalRecommendation:
        "GUARDRAIL: Verify IP is not a CDN edge node, cloud provider IP, or shared hosting. Check WHOIS and ASN before approving block.",
      actionRecommendation:
        "Block IP at perimeter firewall, add to threat intel blocklist, create ticket.",
      decisionLogic:
        "Reputation_Consensus: block if AbuseIPDB > 90 OR (VT > 5 AND AbuseIPDB > 50). Require approval for partial match. Never block CDN/cloud IPs.",
      mitreMapping: ["T1071", "T1071.001", "T1048"],
    },
    actions: ["block_ip_paloalto", "create_servicenow_incident"],
    fallbackProcedure: {
      escalationPath: "Network Security > SOC Lead > CISO",
      manualSteps:
        "1. Validate ASN and WHOIS to ensure not CDN/cloud\n2. Block manually in firewall UI if automation fails\n3. Add to threat intel platform",
      communicationTemplate:
        "MALICIOUS IP ALERT: {source_ip} blocked. AbuseIPDB={abuseipdb_score}, VT detections={vt_detections}. Traffic: {bytes_transferred} bytes.",
    },
    testingPlan: {
      scenarios:
        "1. Known C2 IP (AbuseIPDB=95, VT=10) — expect auto-block\n2. Cloudflare CDN IP — expect no block regardless of score\n3. Medium confidence (AbuseIPDB=60, VT=2) — expect approval required\n4. Clean IP (AbuseIPDB=5, VT=0) — expect monitor only\n5. Reputation_Consensus: both sources agree malicious — expect auto-block",
      successCriteria:
        "C2 IPs auto-blocked. CDN IPs never blocked. Consensus logic working.",
      performanceTargets: "IP enrichment < 30 seconds. Block decision < 1 minute.",
    },
    approvalSignOff: {
      approvedBy: "SOC Manager",
      approvalDate: new Date().toISOString().split("T")[0],
      complianceNotes: "CDN/cloud guardrail documented. Reputation_Consensus logic included.",
      reviewHistory: "Initial SOARForge generation.",
    },
    tags: ["ip", "network", "c2", "firewall"],
    businessObjective: "Block malicious IPs based on multi-source reputation consensus with CDN safety guardrail",
    mitreTactics: ["T1071", "T1048"],
    rollbackPlan: "Remove IP from firewall block group via unblock_ip_paloalto. Document reversal reason.",
    errorHandlingNotes:
      "CRITICAL GUARDRAIL: Never auto-block CDN (Cloudflare, Akamai, Fastly) or cloud provider (AWS, Azure, GCP) IP ranges. Must validate ASN before block.",
  }),

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Vulnerability Management / ITSM
  // ──────────────────────────────────────────────────────────────────────────
  createTemplate({
    id: "vulnerability",
    name: "Vulnerability Remediation Workflow",
    category: "Vulnerability Management",
    description:
      "Automated vulnerability ticket creation and SLA tracking workflow. Ingests scanner findings, deduplicates via Duplicate_Ticket_Lookup, creates ITSM ticket with correct SLA priority, and assigns to remediation team. No destructive actions — designed for ticket-driven remediation tracking only.",
    severity: "medium",
    generatorType: "vulnerability",
    requiredConnectorKeys: ["servicenow", "jira"],
    trigger: {
      type: "Vulnerability Scanner Alert",
      description:
        "Triggered by vulnerability scanner (Tenable, Qualys, Nexpose) or CVSS score threshold breach.",
      sourceSystem: "Tenable / Qualys / Nexpose / Rapid7",
    },
    entities: ["cve_id", "cvss_score", "affected_host", "asset_criticality", "patch_available"],
    enrichmentConnectors: [],
    scoringModel: {
      type: "severity",
      severity: "medium",
      rules: [
        { id: "r1", label: "Critical CVSS (>= 9.0)", condition: "CVSS base score >= 9.0", points: 4 },
        { id: "r2", label: "High CVSS (7.0–8.9)", condition: "CVSS base score 7.0–8.9", points: 3 },
        { id: "r3", label: "Medium CVSS (4.0–6.9)", condition: "CVSS base score 4.0–6.9", points: 2 },
        { id: "r4", label: "Critical asset affected", condition: "Asset has business_criticality = critical or tier = 1", points: 2 },
        { id: "r5", label: "Exploit available in wild", condition: "CVE has known exploit in ExploitDB or CISA KEV list", points: 3 },
      ],
      thresholds: [
        { label: "30-Day SLA", minScore: 0, maxScore: 3, action: "ticket", description: "Create remediation ticket with 30-day SLA" },
        { label: "14-Day SLA", minScore: 4, maxScore: 5, action: "ticket", description: "Create remediation ticket with 14-day SLA" },
        { label: "7-Day Emergency SLA", minScore: 6, maxScore: 99, action: "ticket", description: "Create emergency ticket with 7-day SLA — critical priority" },
      ],
      approvalRecommendation:
        "No approval required for ticket creation. Remediation plan requires change manager approval.",
      actionRecommendation:
        "Create ITSM ticket with correct SLA. Assign to patch management team. No automated patching.",
      decisionLogic:
        "CVSS + asset criticality + exploit availability determines SLA tier. Ticket created via Duplicate_Ticket_Lookup to prevent duplicates.",
      mitreMapping: ["T1190", "T1203"],
    },
    actions: ["create_servicenow_incident"],
    fallbackProcedure: {
      escalationPath: "Vulnerability Team > Patch Manager > CISO",
      manualSteps:
        "1. Create ticket manually in ServiceNow\n2. Notify asset owner via email\n3. Track in vulnerability management platform",
      communicationTemplate:
        "VULN ALERT: {cve_id} (CVSS={cvss_score}) on {affected_host}. Ticket created: #{ticket_id}. SLA: {sla_days} days.",
    },
    testingPlan: {
      scenarios:
        "1. Critical CVE (CVSS=9.5) on tier-1 asset — expect 7-day SLA ticket\n2. Medium CVE on non-critical asset — expect 30-day SLA ticket\n3. Duplicate CVE on same host — expect Duplicate_Ticket_Lookup to skip\n4. No patch available — expect ticket with 'patch unavailable' note\n5. High CVE with known exploit — expect 7-day SLA escalation",
      successCriteria:
        "Correct SLA tier assigned. Duplicate tickets not created. No destructive actions taken.",
      performanceTargets: "Ticket creation < 2 minutes. Deduplication check < 10 seconds.",
    },
    approvalSignOff: {
      approvedBy: "Vulnerability Manager",
      approvalDate: new Date().toISOString().split("T")[0],
      complianceNotes:
        "No destructive remediation actions. SLA tiers aligned with vulnerability policy.",
      reviewHistory: "Initial SOARForge generation.",
    },
    tags: ["vulnerability", "itsm", "sla", "ticket"],
    businessObjective: "Automate vulnerability ticket creation with correct SLA and prevent duplicate tickets",
    mitreTactics: ["T1190"],
    rollbackPlan: "Close ticket if CVE is confirmed false positive. Document reason in ticket.",
    errorHandlingNotes:
      "GUARDRAIL: Vulnerability workflow must contain Duplicate_Ticket_Lookup step. No automated patching or system changes.",
  }),

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Ticket Automation / ITSM Sync
  // ──────────────────────────────────────────────────────────────────────────
  createTemplate({
    id: "ticket_automation",
    name: "Ticket Automation & ITSM Sync",
    category: "Operations",
    description:
      "Automated ITSM ticket lifecycle management — create, update, assign, and close tickets based on alert status. Includes Duplicate_Ticket_Lookup to prevent duplicate ticket creation, SLA monitoring, and auto-closure on resolution. Supports ServiceNow and Jira.",
    severity: "low",
    generatorType: "ticket_automation",
    requiredConnectorKeys: ["servicenow", "jira"],
    trigger: {
      type: "SOAR Alert / Status Change",
      description:
        "Triggered by alert status change, new SOAR incident creation, or scheduled SLA check.",
      sourceSystem: "FortiSOAR / ServiceNow / Jira",
    },
    entities: ["alert_id", "alert_name", "severity", "status", "assignee"],
    enrichmentConnectors: [],
    scoringModel: {
      type: "none",
      severity: "low",
      rules: [],
      thresholds: [],
      approvalRecommendation: "",
      actionRecommendation: "Create or update ticket based on alert status. Check for duplicates first.",
      decisionLogic:
        "Duplicate_Ticket_Lookup: check if ticket exists for this alert_id. If exists, update. If not, create new.",
      mitreMapping: [],
    },
    actions: ["create_servicenow_incident"],
    fallbackProcedure: {
      escalationPath: "SOC Analyst > SOC Lead",
      manualSteps:
        "1. Create ticket manually in ServiceNow/Jira\n2. Link to FortiSOAR incident\n3. Assign to correct queue",
      communicationTemplate:
        "TICKET: {alert_name} — Ticket #{ticket_id} created/updated. Assignee: {assignee}. Status: {ticket_status}.",
    },
    testingPlan: {
      scenarios:
        "1. New alert — expect ticket created\n2. Same alert again — expect Duplicate_Ticket_Lookup skips creation\n3. Alert resolved — expect ticket closed\n4. SLA breach — expect escalation notification\n5. Jira alternative connector — expect same behavior",
      successCriteria:
        "Duplicate tickets not created. Ticket lifecycle follows alert status. SLA tracked.",
      performanceTargets: "Ticket creation < 30 seconds. SLA check < 10 seconds.",
    },
    approvalSignOff: {
      approvedBy: "Operations Lead",
      approvalDate: new Date().toISOString().split("T")[0],
      complianceNotes: "Duplicate_Ticket_Lookup prevents duplicate tickets.",
      reviewHistory: "Initial SOARForge generation.",
    },
    tags: ["ticket", "itsm", "servicenow", "jira"],
    businessObjective: "Automated ITSM ticket lifecycle management with duplicate prevention",
    mitreTactics: [],
    rollbackPlan: "Close ticket and mark as false positive. Document closure reason.",
    errorHandlingNotes:
      "GUARDRAIL: Ticket Automation must contain Duplicate_Ticket_Lookup step to prevent duplicate ticket creation.",
  }),

  // ──────────────────────────────────────────────────────────────────────────
  // 9. Threat Intel Enrichment
  // ──────────────────────────────────────────────────────────────────────────
  createTemplate({
    id: "threat_intel",
    name: "Threat Intel IOC Enrichment",
    category: "Threat Intelligence",
    description:
      "Multi-source IOC enrichment and reputation consensus workflow. Extracts IPs, domains, URLs, and file hashes from alerts; enriches via VirusTotal, AbuseIPDB, and FortiGuard; applies Reputation_Consensus logic (requires 2+ sources to agree before blocking). No auto-block on single-source data. Updates FortiSOAR alert with enrichment data.",
    severity: "medium",
    generatorType: "threat_intel",
    requiredConnectorKeys: ["virustotal", "abuseipdb", "fortiguard"],
    trigger: {
      type: "Alert IOC Extraction",
      description:
        "Triggered on any alert containing IP, domain, URL, or file hash indicators.",
      sourceSystem: "FortiSOAR / SIEM / Threat Intel Platform (MISP, OpenCTI)",
    },
    entities: ["source_ip", "dest_ip", "domain", "url", "file_hash"],
    enrichmentConnectors: ["virustotal", "abuseipdb", "fortiguard"],
    scoringModel: {
      type: "consensus",
      severity: "medium",
      rules: [
        { id: "r1", label: "VT malicious (> 5 detections)", condition: "VirusTotal returns > 5 positive detections for any IOC", points: 3 },
        { id: "r2", label: "AbuseIPDB confidence > 75", condition: "AbuseIPDB reports confidence score > 75 for IP", points: 3 },
        { id: "r3", label: "FortiGuard malicious category", condition: "FortiGuard URL lookup returns malicious/phishing category", points: 3 },
        { id: "r4", label: "Reputation_Consensus (2+ sources agree)", condition: "2 or more reputation sources independently classify IOC as malicious", points: 2 },
        { id: "r5", label: "Single source only", condition: "Only one source flags IOC — insufficient for auto-action", points: 0 },
      ],
      thresholds: [
        { label: "Benign / Low Confidence", minScore: 0, maxScore: 2, action: "monitor", description: "Log enrichment only — no blocking" },
        { label: "Analyst Review", minScore: 3, maxScore: 5, action: "analyst_approval", description: "Analyst reviews enrichment before action" },
        { label: "Confirmed Malicious (Consensus)", minScore: 6, maxScore: 99, action: "analyst_approval", description: "Consensus reached — analyst may approve block" },
      ],
      approvalRecommendation:
        "Reputation_Consensus required: no auto-block on single-source data. Always require analyst approval even at high score for threat intel IOCs.",
      actionRecommendation:
        "Update alert with enrichment data. Tag alert with IOC verdicts. Analyst decides downstream blocking.",
      decisionLogic:
        "Reputation_Consensus: require 2+ independent sources to flag IOC before recommending action. Single-source data is informational only.",
      mitreMapping: ["T1071", "T1566", "T1204"],
    },
    actions: ["abuseipdb_lookup", "virustotal_hash_lookup"],
    fallbackProcedure: {
      escalationPath: "Threat Intel Analyst > SOC Lead",
      manualSteps:
        "1. Manually look up IOC in VT and AbuseIPDB\n2. Update alert with enrichment data\n3. Escalate to threat intel team if novel indicator",
      communicationTemplate:
        "THREAT INTEL: IOC enrichment complete for alert #{record_id}. Consensus verdict: {consensus_verdict}. Sources: VT={vt_score}, AbuseIPDB={abuseipdb_score}.",
    },
    testingPlan: {
      scenarios:
        "1. Known malicious IP (VT=10, AbuseIPDB=95) — expect consensus alert, analyst review\n2. Single-source flag only (VT=6, AbuseIPDB=5) — expect no auto-action\n3. Clean IOC (VT=0, AbuseIPDB=0) — expect benign verdict\n4. Novel domain (unknown to all sources) — expect unknown verdict, analyst review\n5. File hash with VT=50 detections — expect analyst review",
      successCriteria:
        "Consensus logic working. Single-source data not triggering auto-action. All IOC types enriched.",
      performanceTargets: "Full IOC enrichment < 2 minutes. Consensus evaluation < 5 seconds.",
    },
    approvalSignOff: {
      approvedBy: "Threat Intelligence Lead",
      approvalDate: new Date().toISOString().split("T")[0],
      complianceNotes:
        "Reputation_Consensus documented. No auto-block on single-source data. Analyst approval always required.",
      reviewHistory: "Initial SOARForge generation.",
    },
    tags: ["threat_intel", "ioc", "enrichment", "consensus"],
    businessObjective: "Multi-source IOC enrichment with consensus logic — no single-source auto-block",
    mitreTactics: ["T1071", "T1566"],
    rollbackPlan: "Remove IOC tags if confirmed false positive. Update enrichment data.",
    errorHandlingNotes:
      "GUARDRAIL: Threat Intel must contain Reputation_Consensus step. No auto-block on single-source data. Analyst approval mandatory.",
  }),

  // ──────────────────────────────────────────────────────────────────────────
  // 10. Custom / Blank Playbook
  // ──────────────────────────────────────────────────────────────────────────
  createTemplate({
    id: "custom_blank",
    name: "Custom Playbook (Blank)",
    category: "Custom",
    description:
      "Start from scratch. A blank template for building custom playbooks not covered by predefined templates. Uses generic workflow generator. All steps are left for the user to define.",
    severity: "medium",
    generatorType: "custom",
    requiredConnectorKeys: [],
    trigger: {
      type: "Manual / Custom",
      description: "Define your trigger type.",
      sourceSystem: "Define your source system.",
    },
    entities: [],
    enrichmentConnectors: [],
    scoringModel: {
      type: "additive",
      severity: "medium",
      rules: [],
      thresholds: [],
      approvalRecommendation: "",
      actionRecommendation: "",
      decisionLogic: "",
      mitreMapping: [],
    },
    actions: [],
    fallbackProcedure: {
      escalationPath: "",
      manualSteps: "",
      communicationTemplate: "",
    },
    testingPlan: {
      scenarios: "",
      successCriteria: "",
      performanceTargets: "",
    },
    approvalSignOff: {
      approvedBy: "",
      approvalDate: "",
      complianceNotes: "",
      reviewHistory: "",
    },
    tags: ["custom"],
  }),
];
