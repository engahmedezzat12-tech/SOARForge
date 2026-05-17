import type { ScoringModel, ScoringType } from './soar-types';

type TemplateId = 'ransomware' | 'waf_attack' | 'phishing' | 'suspicious_login' | 'malware_hash' | 'malicious_ip' | 'vulnerability' | 'ticket_automation' | 'threat_intel';

const SCORING_PRESETS: Record<TemplateId, Record<ScoringType, ScoringModel>> = {
  ransomware: {
    additive: {
      type: 'additive',
      severity: 'critical',
      rules: [
        { id: 'r1', label: 'MITRE T1486 detected', condition: 'Alert contains encryption keywords or T1486 tag', points: 3, mitre: 'T1486' },
        { id: 'r2', label: 'Shadow copy tampering', condition: 'vssadmin, wbadmin, or bcdedit commands detected', points: 3, mitre: 'T1490' },
        { id: 'r3', label: 'Encryption keywords', condition: 'Alert mentions encrypt, lockbit, conti, or ransom', points: 2, mitre: 'T1486' },
        { id: 'r4', label: 'Known ransomware extension', condition: 'File has known ransomware extension', points: 3, mitre: 'T1486' },
        { id: 'r5', label: 'Ransom note keywords', condition: 'Ransom note file detected in filesystem', points: 2, mitre: 'T1486' },
        { id: 'r6', label: 'Exfiltration + encryption', condition: 'Exfil traffic before encryption detected', points: 3, mitre: 'T1486' },
      ],
      thresholds: [
        { label: 'Monitor', minScore: 0, maxScore: 1, action: 'skip', description: 'Low risk' },
        { label: 'Analyst', minScore: 2, maxScore: 5, action: 'analyst_approval', description: 'Medium risk' },
        { label: 'Isolate', minScore: 6, maxScore: 99, action: 'auto_contain', description: 'High risk' },
      ],
      approvalRecommendation: 'Verify endpoint is not backup system. Check EDR status.',
      actionRecommendation: 'Score 6+: isolate immediately. 2-5: analyst approval.',
      decisionLogic: 'score >= 6 -> isolate',
      mitreMapping: ['T1486', 'T1490'],
    },
    weighted: {
      type: 'weighted',
      severity: 'critical',
      rules: [
        { id: 'w1', label: 'EDR confidence', condition: 'Primary detection confidence level', points: 40, mitre: 'T1486' },
        { id: 'w2', label: 'MITRE T1486', condition: 'Data encryption technique detected', points: 30, mitre: 'T1486' },
        { id: 'w3', label: 'Shadow copy disable', condition: 'T1490 inhibit recovery detected', points: 20, mitre: 'T1490' },
        { id: 'w4', label: 'History correlation', condition: 'Previous indicators in SIEM', points: 10, mitre: '' },
      ],
      thresholds: [
        { label: 'Low', minScore: 0, maxScore: 49, action: 'skip', description: '<50% confidence' },
        { label: 'Medium', minScore: 50, maxScore: 74, action: 'analyst_approval', description: '50-74% confidence' },
        { label: 'High', minScore: 75, maxScore: 100, action: 'auto_contain', description: '75%+ confidence' },
      ],
      approvalRecommendation: 'Weighted by EDR (40%), MITRE (50%), history (10%).',
      actionRecommendation: '75+: isolate. 50-74: approval. <50: monitor.',
      decisionLogic: 'weighted >= 75 -> isolate',
      mitreMapping: ['T1486', 'T1490'],
    },
    consensus: {
      type: 'consensus',
      severity: 'critical',
      rules: [
        { id: 'c1', label: 'EDR verdict', condition: 'Primary EDR marks as malicious', points: 1, mitre: 'T1486' },
        { id: 'c2', label: 'Sandbox result', condition: 'Sandbox marks as malicious', points: 1, mitre: 'T1486' },
        { id: 'c3', label: 'Threat intel', condition: 'External threat intel confirms', points: 1, mitre: 'T1486' },
        { id: 'c4', label: 'SIEM pattern', condition: 'SIEM shows ransomware pattern', points: 1, mitre: 'T1486' },
      ],
      thresholds: [
        { label: 'Monitor', minScore: 0, maxScore: 1, action: 'skip', description: '<2 sources' },
        { label: 'Review', minScore: 2, maxScore: 2, action: 'analyst_approval', description: '2 sources' },
        { label: 'Isolate', minScore: 3, maxScore: 99, action: 'auto_contain', description: '3+ sources' },
      ],
      approvalRecommendation: 'Consensus from 3+ sources indicates high confidence.',
      actionRecommendation: '3+ sources: isolate. 2: approval.',
      decisionLogic: 'consensus >= 3 -> isolate',
      mitreMapping: ['T1486', 'T1490'],
    },
    severity: {
      type: 'severity',
      severity: 'critical',
      rules: [
        { id: 's1', label: 'Critical alert', condition: 'Severity = critical', points: 4, mitre: 'T1486' },
        { id: 's2', label: 'High alert', condition: 'Severity = high', points: 3, mitre: 'T1486' },
        { id: 's3', label: 'Medium alert', condition: 'Severity = medium', points: 1, mitre: '' },
      ],
      thresholds: [
        { label: 'Monitor', minScore: 1, maxScore: 2, action: 'skip', description: 'Medium/low' },
        { label: 'Approve', minScore: 3, maxScore: 3, action: 'analyst_approval', description: 'High' },
        { label: 'Isolate', minScore: 4, maxScore: 4, action: 'auto_contain', description: 'Critical' },
      ],
      approvalRecommendation: 'Alert severity directly maps to action.',
      actionRecommendation: 'Critical: isolate. High: approval. Medium: monitor.',
      decisionLogic: 'critical -> isolate',
      mitreMapping: ['T1486'],
    },
    mitre: {
      type: 'mitre',
      severity: 'critical',
      rules: [
        { id: 'm1', label: 'T1486 Data Encryption', condition: 'T1486 detected', points: 3, mitre: 'T1486' },
        { id: 'm2', label: 'T1490 Inhibit Recovery', condition: 'T1490 detected', points: 3, mitre: 'T1490' },
        { id: 'm3', label: 'T1529 System Shutdown', condition: 'T1529 detected', points: 2, mitre: '' },
      ],
      thresholds: [
        { label: 'Monitor', minScore: 1, maxScore: 2, action: 'skip', description: '1 technique' },
        { label: 'Review', minScore: 3, maxScore: 4, action: 'analyst_approval', description: '2 techniques' },
        { label: 'Isolate', minScore: 5, maxScore: 99, action: 'auto_contain', description: '3+ techniques' },
      ],
      approvalRecommendation: 'Multiple MITRE techniques indicate sophisticated attack.',
      actionRecommendation: 'T1486+: isolate. Multi-technique: escalate.',
      decisionLogic: 'mitre_count >= 2 -> escalate',
      mitreMapping: ['T1486', 'T1490', 'T1529'],
    },
    asset_criticality: {
      type: 'asset_criticality',
      severity: 'critical',
      rules: [
        { id: 'a1', label: 'Critical business asset', condition: 'Criticality=critical', points: 4, mitre: 'T1486' },
        { id: 'a2', label: 'Production server', condition: 'Production=true', points: 3, mitre: '' },
        { id: 'a3', label: 'Domain controller', condition: 'Service=domain_controller', points: 4, mitre: '' },
        { id: 'a4', label: 'Standard workstation', condition: 'Workstation standard tier', points: 1, mitre: '' },
      ],
      thresholds: [
        { label: 'Monitor', minScore: 1, maxScore: 1, action: 'skip', description: 'Non-critical' },
        { label: 'Review', minScore: 2, maxScore: 2, action: 'analyst_approval', description: 'Standard' },
        { label: 'Isolate', minScore: 3, maxScore: 99, action: 'auto_contain', description: 'Critical/DC' },
      ],
      approvalRecommendation: 'Critical assets get escalated response. Verify DC before action.',
      actionRecommendation: 'Critical/DC: isolate immediately. Production: approval.',
      decisionLogic: 'criticality >= 3 -> isolate',
      mitreMapping: ['T1486'],
    },
    user_risk: {
      type: 'user_risk',
      severity: 'critical',
      rules: [
        { id: 'u1', label: 'Privileged user', condition: 'User has admin rights', points: 4, mitre: 'T1078' },
        { id: 'u2', label: 'High-risk user', condition: 'User marked high-risk', points: 3, mitre: '' },
        { id: 'u3', label: 'Standard user', condition: 'Regular user account', points: 1, mitre: '' },
        { id: 'u4', label: 'Service account', condition: 'Automated service account', points: 2, mitre: '' },
      ],
      thresholds: [
        { label: 'Monitor', minScore: 1, maxScore: 1, action: 'skip', description: 'Non-admin' },
        { label: 'Review', minScore: 2, maxScore: 2, action: 'analyst_approval', description: 'Service' },
        { label: 'Isolate', minScore: 3, maxScore: 99, action: 'auto_contain', description: 'Admin' },
      ],
      approvalRecommendation: 'Admin compromise = critical. Verify user permissions first.',
      actionRecommendation: 'Admin: immediate isolation. Standard: approval.',
      decisionLogic: 'admin_account -> isolate',
      mitreMapping: ['T1078', 'T1486'],
    },
    hybrid: {
      type: 'hybrid',
      severity: 'critical',
      rules: [
        { id: 'h1', label: 'EDR + MITRE + Intel', condition: 'All three confirm', points: 3, mitre: 'T1486' },
        { id: 'h2', label: 'EDR + SIEM correlation', condition: 'EDR and SIEM both trigger', points: 2, mitre: '' },
        { id: 'h3', label: 'Threat intel + SIEM', condition: 'Known IOC with history', points: 2, mitre: '' },
      ],
      thresholds: [
        { label: 'Low', minScore: 0, maxScore: 1, action: 'skip', description: 'Single source' },
        { label: 'Medium', minScore: 2, maxScore: 3, action: 'analyst_approval', description: 'Two sources' },
        { label: 'High', minScore: 4, maxScore: 99, action: 'auto_contain', description: 'Multiple sources' },
      ],
      approvalRecommendation: 'Hybrid scoring combines best signals from multiple methods.',
      actionRecommendation: 'High confidence signals: isolate. Mixed: approval.',
      decisionLogic: 'max(edr_score, siem_score, ti_score) >= threshold',
      mitreMapping: ['T1486', 'T1490'],
    },
    confidence: {
      type: 'confidence',
      severity: 'critical',
      rules: [
        { id: 'cf1', label: 'Very high confidence', condition: 'Multiple sources + behavior match', points: 5, mitre: 'T1486' },
        { id: 'cf2', label: 'High confidence', condition: 'Strong signals from 2+ sources', points: 4, mitre: 'T1486' },
        { id: 'cf3', label: 'Medium confidence', condition: 'Single source or weak signals', points: 2, mitre: '' },
        { id: 'cf4', label: 'Low confidence', condition: 'Insufficient evidence', points: 1, mitre: '' },
      ],
      thresholds: [
        { label: 'Monitor', minScore: 1, maxScore: 2, action: 'skip', description: 'Low-medium' },
        { label: 'Review', minScore: 3, maxScore: 3, action: 'analyst_approval', description: 'Medium-high' },
        { label: 'Isolate', minScore: 4, maxScore: 99, action: 'auto_contain', description: 'Very high' },
      ],
      approvalRecommendation: 'Confidence-based scoring weights decision on certainty level.',
      actionRecommendation: 'Very high: isolate. High: approval. Medium: monitor.',
      decisionLogic: 'confidence >= 4 -> isolate',
      mitreMapping: ['T1486'],
    },
    none: {
      type: 'none',
      severity: 'critical',
      rules: [],
      thresholds: [{ label: 'Manual', minScore: 0, maxScore: 99, action: 'skip', description: 'Manual review' }],
      approvalRecommendation: 'No numeric scoring. Use manual approval or fixed routing.',
      actionRecommendation: 'Approver makes decision based on playbook rules.',
      decisionLogic: 'manual routing based on playbook conditions',
      mitreMapping: [],
    },
  },
  waf_attack: {
    additive: {
      type: 'additive',
      severity: 'high',
      rules: [
        { id: 'r1', label: 'WAF signature match', condition: 'WAF detected attack pattern', points: 2, mitre: 'T1190' },
        { id: 'r2', label: 'IP reputation', condition: 'IP in threat feed', points: 2, mitre: 'T1190' },
        { id: 'r3', label: 'Repeated attacks', condition: 'Multiple attack attempts from IP', points: 1, mitre: 'T1595' },
        { id: 'r4', label: 'OWASP violation', condition: 'Known OWASP attack pattern', points: 2, mitre: 'T1190' },
        { id: 'r5', label: 'Firewall block', condition: 'Firewall rule triggered', points: 1, mitre: '' },
      ],
      thresholds: [
        { label: 'Monitor', minScore: 0, maxScore: 1, action: 'skip', description: 'Low' },
        { label: 'Review', minScore: 2, maxScore: 3, action: 'analyst_approval', description: 'Medium' },
        { label: 'Block', minScore: 4, maxScore: 99, action: 'auto_contain', description: 'High' },
      ],
      approvalRecommendation: 'Each rule adds confidence. WAF + IP reputation = strong signal.',
      actionRecommendation: '4+: block immediately. 2-3: analyst review.',
      decisionLogic: 'points >= 4 -> block',
      mitreMapping: ['T1190', 'T1595', 'T1059'],
    },
    weighted: {
      type: 'weighted',
      severity: 'high',
      rules: [
        { id: 'w1', label: 'WAF confidence', condition: 'WAF confidence score', points: 50, mitre: 'T1190' },
        { id: 'w2', label: 'IP reputation', condition: 'Reputation score', points: 30, mitre: 'T1190' },
        { id: 'w3', label: 'Attack pattern', condition: 'Attack pattern history', points: 20, mitre: 'T1595' },
      ],
      thresholds: [
        { label: 'Low', minScore: 0, maxScore: 49, action: 'skip', description: '<50%' },
        { label: 'Medium', minScore: 50, maxScore: 74, action: 'analyst_approval', description: '50-74%' },
        { label: 'High', minScore: 75, maxScore: 100, action: 'auto_contain', description: '75%+' },
      ],
      approvalRecommendation: 'Weighted by confidence sources (WAF 50%, IP 30%, pattern 20%).',
      actionRecommendation: '75+: block. 50-74: approval. <50: monitor.',
      decisionLogic: 'weighted >= 75 -> block',
      mitreMapping: ['T1190'],
    },
    consensus: {
      type: 'consensus',
      severity: 'high',
      rules: [
        { id: 'c1', label: 'WAF detection', condition: 'WAF marks as attack', points: 1, mitre: 'T1190' },
        { id: 'c2', label: 'IP reputation', condition: 'IP feed confirms', points: 1, mitre: 'T1190' },
        { id: 'c3', label: 'SIEM pattern', condition: 'SIEM shows attack pattern', points: 1, mitre: 'T1595' },
      ],
      thresholds: [
        { label: 'Monitor', minScore: 0, maxScore: 1, action: 'skip', description: '<2' },
        { label: 'Review', minScore: 2, maxScore: 2, action: 'analyst_approval', description: '2' },
        { label: 'Block', minScore: 3, maxScore: 99, action: 'auto_contain', description: '3+' },
      ],
      approvalRecommendation: '3+ sources = high confidence attack.',
      actionRecommendation: '3+ sources: block. 2: approval.',
      decisionLogic: 'consensus >= 3 -> block',
      mitreMapping: ['T1190'],
    },
    severity: {
      type: 'severity',
      severity: 'high',
      rules: [
        { id: 's1', label: 'Critical', condition: 'Severity=critical', points: 3, mitre: 'T1190' },
        { id: 's2', label: 'High', condition: 'Severity=high', points: 2, mitre: 'T1190' },
        { id: 's3', label: 'Medium', condition: 'Severity=medium', points: 1, mitre: '' },
      ],
      thresholds: [
        { label: 'Monitor', minScore: 1, maxScore: 1, action: 'skip', description: 'Medium' },
        { label: 'Review', minScore: 2, maxScore: 2, action: 'analyst_approval', description: 'High' },
        { label: 'Block', minScore: 3, maxScore: 3, action: 'auto_contain', description: 'Critical' },
      ],
      approvalRecommendation: 'Alert severity maps to response.',
      actionRecommendation: 'Critical: block. High: approval.',
      decisionLogic: 'severity >= critical -> block',
      mitreMapping: ['T1190'],
    },
    mitre: {
      type: 'mitre',
      severity: 'high',
      rules: [
        { id: 'm1', label: 'T1190 exploit', condition: 'T1190 detected', points: 3, mitre: 'T1190' },
        { id: 'm2', label: 'T1595 scanning', condition: 'T1595 detected', points: 2, mitre: 'T1595' },
        { id: 'm3', label: 'T1059 command', condition: 'T1059 detected', points: 2, mitre: 'T1059' },
      ],
      thresholds: [
        { label: 'Monitor', minScore: 1, maxScore: 2, action: 'skip', description: '1 tech' },
        { label: 'Review', minScore: 3, maxScore: 4, action: 'analyst_approval', description: '2 tech' },
        { label: 'Block', minScore: 5, maxScore: 99, action: 'auto_contain', description: '3+ tech' },
      ],
      approvalRecommendation: 'Multiple MITRE techniques = sophisticated attack.',
      actionRecommendation: 'T1190+: block.',
      decisionLogic: 'mitre_score >= 3 -> block',
      mitreMapping: ['T1190', 'T1595', 'T1059'],
    },
    asset_criticality: {
      type: 'asset_criticality',
      severity: 'high',
      rules: [
        { id: 'a1', label: 'Critical asset', condition: 'Criticality=critical', points: 4, mitre: 'T1190' },
        { id: 'a2', label: 'Production', condition: 'Production=true', points: 3, mitre: '' },
        { id: 'a3', label: 'Standard', condition: 'Standard asset', points: 1, mitre: '' },
      ],
      thresholds: [
        { label: 'Monitor', minScore: 1, maxScore: 1, action: 'skip', description: 'Non-critical' },
        { label: 'Review', minScore: 2, maxScore: 2, action: 'analyst_approval', description: 'Standard' },
        { label: 'Block', minScore: 3, maxScore: 99, action: 'auto_contain', description: 'Critical' },
      ],
      approvalRecommendation: 'Critical assets get escalated response.',
      actionRecommendation: 'Critical: block. Production: approval.',
      decisionLogic: 'criticality >= 3 -> block',
      mitreMapping: ['T1190'],
    },
    user_risk: {
      type: 'user_risk',
      severity: 'high',
      rules: [
        { id: 'u1', label: 'Admin user', condition: 'Admin privileges', points: 3, mitre: 'T1078' },
        { id: 'u2', label: 'High-risk user', condition: 'High-risk category', points: 2, mitre: '' },
        { id: 'u3', label: 'Standard user', condition: 'Regular user', points: 1, mitre: '' },
      ],
      thresholds: [
        { label: 'Monitor', minScore: 1, maxScore: 1, action: 'skip', description: 'User' },
        { label: 'Review', minScore: 2, maxScore: 2, action: 'analyst_approval', description: 'High-risk' },
        { label: 'Block', minScore: 3, maxScore: 99, action: 'auto_contain', description: 'Admin' },
      ],
      approvalRecommendation: 'Privileged user account compromise = elevated response.',
      actionRecommendation: 'Admin account: escalate. Standard: normal response.',
      decisionLogic: 'admin_account -> escalate',
      mitreMapping: ['T1078', 'T1190'],
    },
    hybrid: {
      type: 'hybrid',
      severity: 'high',
      rules: [
        { id: 'h1', label: 'WAF + IP + SIEM', condition: 'All three confirm', points: 3, mitre: 'T1190' },
        { id: 'h2', label: 'WAF + IP reputation', condition: 'Two strong signals', points: 2, mitre: '' },
        { id: 'h3', label: 'WAF + threat intel', condition: 'WAF + known IOC', points: 2, mitre: '' },
      ],
      thresholds: [
        { label: 'Low', minScore: 0, maxScore: 1, action: 'skip', description: 'Single' },
        { label: 'Medium', minScore: 2, maxScore: 3, action: 'analyst_approval', description: 'Double' },
        { label: 'High', minScore: 4, maxScore: 99, action: 'auto_contain', description: 'Triple' },
      ],
      approvalRecommendation: 'Hybrid scoring combines signals from multiple methods.',
      actionRecommendation: 'High confidence: block. Mixed: approval.',
      decisionLogic: 'max(waf, ip, siem) >= threshold',
      mitreMapping: ['T1190', 'T1595'],
    },
    confidence: {
      type: 'confidence',
      severity: 'high',
      rules: [
        { id: 'cf1', label: 'Very high confidence', condition: 'Multiple sources align', points: 5, mitre: 'T1190' },
        { id: 'cf2', label: 'High confidence', condition: 'Strong signals', points: 4, mitre: 'T1190' },
        { id: 'cf3', label: 'Medium confidence', condition: 'Weak signals', points: 2, mitre: '' },
        { id: 'cf4', label: 'Low confidence', condition: 'Insufficient evidence', points: 1, mitre: '' },
      ],
      thresholds: [
        { label: 'Monitor', minScore: 1, maxScore: 2, action: 'skip', description: 'Low-med' },
        { label: 'Review', minScore: 3, maxScore: 3, action: 'analyst_approval', description: 'Med-high' },
        { label: 'Block', minScore: 4, maxScore: 99, action: 'auto_contain', description: 'Very high' },
      ],
      approvalRecommendation: 'Confidence-based decision on evidence quality.',
      actionRecommendation: 'Very high: block. High: approval.',
      decisionLogic: 'confidence >= 4 -> block',
      mitreMapping: ['T1190'],
    },
    none: {
      type: 'none',
      severity: 'high',
      rules: [],
      thresholds: [{ label: 'Manual', minScore: 0, maxScore: 99, action: 'skip', description: 'Manual' }],
      approvalRecommendation: 'No numeric scoring. Manual review required.',
      actionRecommendation: 'Analyst makes blocking decision.',
      decisionLogic: 'manual routing based on WAF rules',
      mitreMapping: [],
    },
  },
  phishing: {
    additive: { type: 'additive', severity: 'high', rules: [{ id: 'r1', label: 'Sender reputation', condition: 'Sender in threat feed', points: 2, mitre: 'T1566' }, { id: 'r2', label: 'URL reputation', condition: 'URL in malicious domain list', points: 2, mitre: 'T1566' }, { id: 'r3', label: 'Attachment hash', condition: 'Hash in malware database', points: 2, mitre: 'T1566' }, { id: 'r4', label: 'Sandbox verdict', condition: 'Attachment detonated malicious', points: 3, mitre: 'T1566' }, { id: 'r5', label: 'Mailbox validation', condition: 'Unique message or mass send', points: 1, mitre: 'T1204' }], thresholds: [{ label: 'Monitor', minScore: 0, maxScore: 2, action: 'skip', description: 'Low' }, { label: 'Review', minScore: 3, maxScore: 5, action: 'analyst_approval', description: 'Medium' }, { label: 'Quarantine', minScore: 6, maxScore: 99, action: 'auto_contain', description: 'High' }], approvalRecommendation: 'Review sender, URL, and content reputation.', actionRecommendation: '6+: quarantine. 3-5: analyst review. <3: deliver.', decisionLogic: 'points >= 6 -> quarantine', mitreMapping: ['T1566', 'T1204', 'T1598'] },
    weighted: { type: 'weighted', severity: 'high', rules: [{ id: 'w1', label: 'Sender score', condition: 'Sender reputation score', points: 35, mitre: 'T1566' }, { id: 'w2', label: 'URL/domain rep', condition: 'Domain reputation', points: 30, mitre: 'T1566' }, { id: 'w3', label: 'Sandbox', condition: 'Sandbox malicious verdict', points: 25, mitre: 'T1566' }, { id: 'w4', label: 'Blast', condition: 'Sent to many recipients', points: 10, mitre: 'T1204' }], thresholds: [{ label: 'Low', minScore: 0, maxScore: 39, action: 'skip', description: '<40%' }, { label: 'Medium', minScore: 40, maxScore: 69, action: 'analyst_approval', description: '40-69%' }, { label: 'High', minScore: 70, maxScore: 100, action: 'auto_contain', description: '70%+' }], approvalRecommendation: 'Weight factors by confidence levels.', actionRecommendation: '70+: quarantine. 40-69: approval.', decisionLogic: 'weighted >= 70 -> quarantine', mitreMapping: ['T1566', 'T1204'] },
    consensus: { type: 'consensus', severity: 'high', rules: [{ id: 'c1', label: 'Sender check', condition: 'Sender reputation bad', points: 1, mitre: 'T1566' }, { id: 'c2', label: 'URL check', condition: 'URL in feeds', points: 1, mitre: 'T1566' }, { id: 'c3', label: 'Sandbox check', condition: 'Sandbox malicious', points: 1, mitre: 'T1566' }, { id: 'c4', label: 'Content check', condition: 'Content analysis confirms', points: 1, mitre: 'T1204' }], thresholds: [{ label: 'Monitor', minScore: 0, maxScore: 1, action: 'skip', description: '<2' }, { label: 'Review', minScore: 2, maxScore: 2, action: 'analyst_approval', description: '2' }, { label: 'Quarantine', minScore: 3, maxScore: 99, action: 'auto_contain', description: '3+' }], approvalRecommendation: '3+ sources confirm phishing.', actionRecommendation: '3+: quarantine. 2: approval.', decisionLogic: 'consensus >= 3 -> quarantine', mitreMapping: ['T1566', 'T1204'] },
    severity: { type: 'severity', severity: 'high', rules: [{ id: 's1', label: 'Critical', condition: 'Severity=critical', points: 3, mitre: 'T1566' }, { id: 's2', label: 'High', condition: 'Severity=high', points: 2, mitre: 'T1566' }, { id: 's3', label: 'Medium', condition: 'Severity=medium', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 1, maxScore: 1, action: 'skip', description: 'Med' }, { label: 'Review', minScore: 2, maxScore: 2, action: 'analyst_approval', description: 'High' }, { label: 'Quarantine', minScore: 3, maxScore: 3, action: 'auto_contain', description: 'Critical' }], approvalRecommendation: 'Severity maps to phishing response.', actionRecommendation: 'Critical: quarantine. High: approval.', decisionLogic: 'severity >= high -> quarantine', mitreMapping: ['T1566'] },
    mitre: { type: 'mitre', severity: 'high', rules: [{ id: 'm1', label: 'T1566 phishing', condition: 'T1566 detected', points: 3, mitre: 'T1566' }, { id: 'm2', label: 'T1204 user exec', condition: 'T1204 detected', points: 2, mitre: 'T1204' }, { id: 'm3', label: 'T1598 info phishing', condition: 'T1598 detected', points: 2, mitre: 'T1598' }], thresholds: [{ label: 'Monitor', minScore: 1, maxScore: 2, action: 'skip', description: '1' }, { label: 'Review', minScore: 3, maxScore: 4, action: 'analyst_approval', description: '2' }, { label: 'Quarantine', minScore: 5, maxScore: 99, action: 'auto_contain', description: '3+' }], approvalRecommendation: 'Multiple MITRE phishing techniques detected.', actionRecommendation: 'T1566+: quarantine.', decisionLogic: 'mitre_score >= 3 -> quarantine', mitreMapping: ['T1566', 'T1204', 'T1598'] },
    asset_criticality: { type: 'asset_criticality', severity: 'high', rules: [{ id: 'a1', label: 'CEO/executive', condition: 'Target=c_level', points: 4, mitre: 'T1566' }, { id: 'a2', label: 'Finance dept', condition: 'Target=finance', points: 3, mitre: '' }, { id: 'a3', label: 'Standard user', condition: 'Regular mailbox', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 1, maxScore: 1, action: 'skip', description: 'Standard' }, { label: 'Review', minScore: 2, maxScore: 2, action: 'analyst_approval', description: 'Finance' }, { label: 'Quarantine', minScore: 3, maxScore: 99, action: 'auto_contain', description: 'Executive' }], approvalRecommendation: 'High-value targets get priority response.', actionRecommendation: 'C-level target: quarantine. Finance: approval.', decisionLogic: 'target_criticality >= 3 -> quarantine', mitreMapping: ['T1566'] },
    user_risk: { type: 'user_risk', severity: 'high', rules: [{ id: 'u1', label: 'Admin user', condition: 'Admin privileges', points: 3, mitre: 'T1078' }, { id: 'u2', label: 'High-risk user', condition: 'Known clicker', points: 2, mitre: '' }, { id: 'u3', label: 'Standard user', condition: 'Regular user', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 1, maxScore: 1, action: 'skip', description: 'Standard' }, { label: 'Review', minScore: 2, maxScore: 2, action: 'analyst_approval', description: 'High-risk' }, { label: 'Quarantine', minScore: 3, maxScore: 99, action: 'auto_contain', description: 'Admin' }], approvalRecommendation: 'Privileged users need protection.', actionRecommendation: 'Admin: quarantine. High-risk: approval.', decisionLogic: 'admin -> quarantine', mitreMapping: ['T1078', 'T1566'] },
    hybrid: { type: 'hybrid', severity: 'high', rules: [{ id: 'h1', label: 'Rep + Sandbox', condition: 'Reputation bad + sandbox malicious', points: 3, mitre: 'T1566' }, { id: 'h2', label: 'Sender + content', condition: 'Bad sender + malicious content', points: 2, mitre: '' }, { id: 'h3', label: 'All factors', condition: 'Multiple indicators', points: 2, mitre: '' }], thresholds: [{ label: 'Low', minScore: 0, maxScore: 1, action: 'skip', description: 'Single' }, { label: 'Medium', minScore: 2, maxScore: 3, action: 'analyst_approval', description: 'Double' }, { label: 'High', minScore: 4, maxScore: 99, action: 'auto_contain', description: 'Multiple' }], approvalRecommendation: 'Combine multiple scoring factors.', actionRecommendation: 'High score: quarantine. Mixed: approval.', decisionLogic: 'max(factors) >= threshold', mitreMapping: ['T1566', 'T1204'] },
    confidence: { type: 'confidence', severity: 'high', rules: [{ id: 'cf1', label: 'Very high confidence', condition: 'Multiple confirms', points: 5, mitre: 'T1566' }, { id: 'cf2', label: 'High confidence', condition: 'Strong signals', points: 4, mitre: 'T1566' }, { id: 'cf3', label: 'Medium confidence', condition: 'Weak signals', points: 2, mitre: '' }, { id: 'cf4', label: 'Low confidence', condition: 'Single indicator', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 1, maxScore: 2, action: 'skip', description: 'Low' }, { label: 'Review', minScore: 3, maxScore: 3, action: 'analyst_approval', description: 'Medium' }, { label: 'Quarantine', minScore: 4, maxScore: 99, action: 'auto_contain', description: 'High' }], approvalRecommendation: 'Confidence-based decision.', actionRecommendation: 'High confidence: quarantine.', decisionLogic: 'confidence >= 4 -> quarantine', mitreMapping: ['T1566'] },
    none: { type: 'none', severity: 'high', rules: [], thresholds: [{ label: 'Manual', minScore: 0, maxScore: 99, action: 'skip', description: 'Manual' }], approvalRecommendation: 'Manual phishing assessment.', actionRecommendation: 'Analyst decides quarantine.', decisionLogic: 'manual review', mitreMapping: [] },
  },
  suspicious_login: {
    additive: { type: 'additive', severity: 'high', rules: [{ id: 'r1', label: 'Impossible travel', condition: 'GeoIP location change too fast', points: 3, mitre: 'T1078' }, { id: 'r2', label: 'MFA anomaly', condition: 'MFA bypass or new device', points: 2, mitre: 'T1621' }, { id: 'r3', label: 'New device', condition: 'Device not seen before', points: 1, mitre: 'T1621' }, { id: 'r4', label: 'Failed logins', condition: 'Multiple failed then success', points: 2, mitre: 'T1110' }, { id: 'r5', label: 'Privileged user', condition: 'Admin account login', points: 2, mitre: 'T1078' }], thresholds: [{ label: 'Monitor', minScore: 0, maxScore: 2, action: 'skip', description: 'Low' }, { label: 'Review', minScore: 3, maxScore: 5, action: 'analyst_approval', description: 'Medium' }, { label: 'Block', minScore: 6, maxScore: 99, action: 'auto_contain', description: 'High' }], approvalRecommendation: 'Review travel/device/MFA factors.', actionRecommendation: '6+: block. 3-5: approval. <3: allow.', decisionLogic: 'points >= 6 -> block', mitreMapping: ['T1078', 'T1110', 'T1621'] },
    weighted: { type: 'weighted', severity: 'high', rules: [{ id: 'w1', label: 'Travel score', condition: 'Impossible travel score', points: 40, mitre: 'T1078' }, { id: 'w2', label: 'Device score', condition: 'New device score', points: 30, mitre: 'T1621' }, { id: 'w3', label: 'MFA score', condition: 'MFA anomaly score', points: 20, mitre: 'T1621' }, { id: 'w4', label: 'History', condition: 'Account history', points: 10, mitre: '' }], thresholds: [{ label: 'Low', minScore: 0, maxScore: 39, action: 'skip', description: '<40%' }, { label: 'Medium', minScore: 40, maxScore: 69, action: 'analyst_approval', description: '40-69%' }, { label: 'High', minScore: 70, maxScore: 100, action: 'auto_contain', description: '70%+' }], approvalRecommendation: 'Weight by detection confidence.', actionRecommendation: '70+: block. 40-69: approval.', decisionLogic: 'weighted >= 70 -> block', mitreMapping: ['T1078', 'T1621'] },
    consensus: { type: 'consensus', severity: 'high', rules: [{ id: 'c1', label: 'GeoIP anomaly', condition: 'GeoIP check fails', points: 1, mitre: 'T1078' }, { id: 'c2', label: 'Device check', condition: 'Device unknown', points: 1, mitre: 'T1621' }, { id: 'c3', label: 'MFA check', condition: 'MFA anomaly', points: 1, mitre: 'T1621' }, { id: 'c4', label: 'History check', condition: 'Pattern anomaly', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 0, maxScore: 1, action: 'skip', description: '<2' }, { label: 'Review', minScore: 2, maxScore: 2, action: 'analyst_approval', description: '2' }, { label: 'Block', minScore: 3, maxScore: 99, action: 'auto_contain', description: '3+' }], approvalRecommendation: '3+ indicators = high confidence.', actionRecommendation: '3+: block. 2: approval.', decisionLogic: 'consensus >= 3 -> block', mitreMapping: ['T1078', 'T1621'] },
    severity: { type: 'severity', severity: 'high', rules: [{ id: 's1', label: 'Critical', condition: 'Severity=critical', points: 3, mitre: 'T1078' }, { id: 's2', label: 'High', condition: 'Severity=high', points: 2, mitre: 'T1078' }, { id: 's3', label: 'Medium', condition: 'Severity=medium', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 1, maxScore: 1, action: 'skip', description: 'Med' }, { label: 'Review', minScore: 2, maxScore: 2, action: 'analyst_approval', description: 'High' }, { label: 'Block', minScore: 3, maxScore: 3, action: 'auto_contain', description: 'Critical' }], approvalRecommendation: 'Severity indicates response level.', actionRecommendation: 'Critical: block. High: approval.', decisionLogic: 'severity >= high -> block', mitreMapping: ['T1078', 'T1110'] },
    mitre: { type: 'mitre', severity: 'high', rules: [{ id: 'm1', label: 'T1078 valid acct', condition: 'T1078 detected', points: 3, mitre: 'T1078' }, { id: 'm2', label: 'T1110 brute force', condition: 'T1110 detected', points: 3, mitre: 'T1110' }, { id: 'm3', label: 'T1621 MFA', condition: 'T1621 detected', points: 2, mitre: 'T1621' }], thresholds: [{ label: 'Monitor', minScore: 1, maxScore: 2, action: 'skip', description: '1' }, { label: 'Review', minScore: 3, maxScore: 4, action: 'analyst_approval', description: '2' }, { label: 'Block', minScore: 5, maxScore: 99, action: 'auto_contain', description: '3+' }], approvalRecommendation: 'MITRE techniques mapped to attack chain.', actionRecommendation: 'T1078+T1110: block.', decisionLogic: 'mitre_count >= 2 -> block', mitreMapping: ['T1078', 'T1110', 'T1621'] },
    asset_criticality: { type: 'asset_criticality', severity: 'high', rules: [{ id: 'a1', label: 'Domain admin', condition: 'DA privileges', points: 4, mitre: 'T1078' }, { id: 'a2', label: 'Service account', condition: 'Automated account', points: 2, mitre: '' }, { id: 'a3', label: 'Regular user', condition: 'Standard user', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 1, maxScore: 1, action: 'skip', description: 'User' }, { label: 'Review', minScore: 2, maxScore: 2, action: 'analyst_approval', description: 'Service' }, { label: 'Block', minScore: 3, maxScore: 99, action: 'auto_contain', description: 'Admin' }], approvalRecommendation: 'Admin compromise = immediate action.', actionRecommendation: 'DA: block. Service: approval.', decisionLogic: 'admin_account -> block', mitreMapping: ['T1078'] },
    user_risk: { type: 'user_risk', severity: 'high', rules: [{ id: 'u1', label: 'Admin', condition: 'Admin rights', points: 3, mitre: 'T1078' }, { id: 'u2', label: 'Power user', condition: 'Power user group', points: 2, mitre: '' }, { id: 'u3', label: 'Standard', condition: 'Regular user', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 1, maxScore: 1, action: 'skip', description: 'Standard' }, { label: 'Review', minScore: 2, maxScore: 2, action: 'analyst_approval', description: 'Power' }, { label: 'Block', minScore: 3, maxScore: 99, action: 'auto_contain', description: 'Admin' }], approvalRecommendation: 'Privileged user login = escalated response.', actionRecommendation: 'Admin: block. Power: approval.', decisionLogic: 'admin -> block', mitreMapping: ['T1078'] },
    hybrid: { type: 'hybrid', severity: 'high', rules: [{ id: 'h1', label: 'Travel + Device', condition: 'Both anomalies', points: 3, mitre: 'T1078' }, { id: 'h2', label: 'Travel + MFA', condition: 'Travel + MFA fail', points: 2, mitre: '' }, { id: 'h3', label: 'Device + MFA', condition: 'New device + MFA', points: 2, mitre: '' }], thresholds: [{ label: 'Low', minScore: 0, maxScore: 1, action: 'skip', description: 'Single' }, { label: 'Medium', minScore: 2, maxScore: 3, action: 'analyst_approval', description: 'Double' }, { label: 'High', minScore: 4, maxScore: 99, action: 'auto_contain', description: 'Triple' }], approvalRecommendation: 'Multiple anomalies = high suspicion.', actionRecommendation: 'Multiple: block. Double: approval.', decisionLogic: 'max(factors) >= threshold', mitreMapping: ['T1078', 'T1110', 'T1621'] },
    confidence: { type: 'confidence', severity: 'high', rules: [{ id: 'cf1', label: 'Definite', condition: 'Multiple factors align', points: 5, mitre: 'T1078' }, { id: 'cf2', label: 'Very likely', condition: 'Strong indicators', points: 4, mitre: 'T1078' }, { id: 'cf3', label: 'Likely', condition: 'Some indicators', points: 2, mitre: '' }, { id: 'cf4', label: 'Possible', condition: 'Weak indicator', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 1, maxScore: 2, action: 'skip', description: 'Low' }, { label: 'Review', minScore: 3, maxScore: 3, action: 'analyst_approval', description: 'Medium' }, { label: 'Block', minScore: 4, maxScore: 99, action: 'auto_contain', description: 'High' }], approvalRecommendation: 'Confidence-based suspicious login decision.', actionRecommendation: 'High confidence: block.', decisionLogic: 'confidence >= 4 -> block', mitreMapping: ['T1078'] },
    none: { type: 'none', severity: 'high', rules: [], thresholds: [{ label: 'Manual', minScore: 0, maxScore: 99, action: 'skip', description: 'Manual' }], approvalRecommendation: 'Manual login review.', actionRecommendation: 'Analyst decides action.', decisionLogic: 'manual review', mitreMapping: [] },
  },
  malware_hash: {
    additive: { type: 'additive', severity: 'high', rules: [{ id: 'r1', label: 'Hash reputation', condition: 'Hash in malware database', points: 3, mitre: 'T1204' }, { id: 'r2', label: 'Sandbox verdict', condition: 'Detonation = malicious', points: 3, mitre: 'T1204' }, { id: 'r3', label: 'Process context', condition: 'Suspicious process execution', points: 2, mitre: 'T1059' }, { id: 'r4', label: 'Threat family', condition: 'Known malware family', points: 2, mitre: 'T1027' }, { id: 'r5', label: 'Unsigned binary', condition: 'Unsigned or invalid signature', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 0, maxScore: 2, action: 'skip', description: 'Low' }, { label: 'Review', minScore: 3, maxScore: 5, action: 'analyst_approval', description: 'Medium' }, { label: 'Isolate', minScore: 6, maxScore: 99, action: 'auto_contain', description: 'High' }], approvalRecommendation: 'Hash + Sandbox = strong malware signal.', actionRecommendation: '6+: isolate. 3-5: approval. <3: allow.', decisionLogic: 'points >= 6 -> isolate', mitreMapping: ['T1204', 'T1059', 'T1027'] },
    weighted: { type: 'weighted', severity: 'high', rules: [{ id: 'w1', label: 'Hash rep', condition: 'Hash reputation score', points: 35, mitre: 'T1204' }, { id: 'w2', label: 'Sandbox', condition: 'Sandbox confidence', points: 40, mitre: 'T1204' }, { id: 'w3', label: 'Process', condition: 'Process behavior score', points: 15, mitre: 'T1059' }, { id: 'w4', label: 'Path', condition: 'Suspicious path score', points: 10, mitre: '' }], thresholds: [{ label: 'Low', minScore: 0, maxScore: 39, action: 'skip', description: '<40%' }, { label: 'Medium', minScore: 40, maxScore: 69, action: 'analyst_approval', description: '40-69%' }, { label: 'High', minScore: 70, maxScore: 100, action: 'auto_contain', description: '70%+' }], approvalRecommendation: 'Weight by detection confidence sources.', actionRecommendation: '70+: isolate. 40-69: approval.', decisionLogic: 'weighted >= 70 -> isolate', mitreMapping: ['T1204', 'T1059'] },
    consensus: { type: 'consensus', severity: 'high', rules: [{ id: 'c1', label: 'Hash rep', condition: 'Hash reputation bad', points: 1, mitre: 'T1204' }, { id: 'c2', label: 'Sandbox', condition: 'Sandbox malicious', points: 1, mitre: 'T1204' }, { id: 'c3', label: 'Behavior', condition: 'Malicious behavior', points: 1, mitre: 'T1059' }, { id: 'c4', label: 'Signature', condition: 'Signature match', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 0, maxScore: 1, action: 'skip', description: '<2' }, { label: 'Review', minScore: 2, maxScore: 2, action: 'analyst_approval', description: '2' }, { label: 'Isolate', minScore: 3, maxScore: 99, action: 'auto_contain', description: '3+' }], approvalRecommendation: '3+ confirmations = malware.', actionRecommendation: '3+: isolate. 2: approval.', decisionLogic: 'consensus >= 3 -> isolate', mitreMapping: ['T1204', 'T1059'] },
    severity: { type: 'severity', severity: 'high', rules: [{ id: 's1', label: 'Critical', condition: 'Severity=critical', points: 3, mitre: 'T1204' }, { id: 's2', label: 'High', condition: 'Severity=high', points: 2, mitre: 'T1204' }, { id: 's3', label: 'Medium', condition: 'Severity=medium', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 1, maxScore: 1, action: 'skip', description: 'Med' }, { label: 'Review', minScore: 2, maxScore: 2, action: 'analyst_approval', description: 'High' }, { label: 'Isolate', minScore: 3, maxScore: 3, action: 'auto_contain', description: 'Critical' }], approvalRecommendation: 'Severity maps to malware response.', actionRecommendation: 'Critical: isolate. High: approval.', decisionLogic: 'severity >= high -> isolate', mitreMapping: ['T1204'] },
    mitre: { type: 'mitre', severity: 'high', rules: [{ id: 'm1', label: 'T1204 user exec', condition: 'User execution detected', points: 3, mitre: 'T1204' }, { id: 'm2', label: 'T1059 command', condition: 'Command shell detected', points: 3, mitre: 'T1059' }, { id: 'm3', label: 'T1105 transfer', condition: 'Data transfer detected', points: 2, mitre: 'T1105' }, { id: 'm4', label: 'T1027 obfuscation', condition: 'Obfuscation detected', points: 2, mitre: 'T1027' }], thresholds: [{ label: 'Monitor', minScore: 1, maxScore: 2, action: 'skip', description: '1' }, { label: 'Review', minScore: 3, maxScore: 4, action: 'analyst_approval', description: '2' }, { label: 'Isolate', minScore: 5, maxScore: 99, action: 'auto_contain', description: '3+' }], approvalRecommendation: 'Multiple MITRE techniques = sophisticated malware.', actionRecommendation: 'Multi-technique: isolate.', decisionLogic: 'mitre_score >= 5 -> isolate', mitreMapping: ['T1204', 'T1059', 'T1105', 'T1027'] },
    asset_criticality: { type: 'asset_criticality', severity: 'high', rules: [{ id: 'a1', label: 'Production server', condition: 'Production system', points: 4, mitre: 'T1204' }, { id: 'a2', label: 'Exchange/DC', condition: 'Critical service', points: 3, mitre: '' }, { id: 'a3', label: 'Workstation', condition: 'Standard workstation', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 1, maxScore: 1, action: 'skip', description: 'WS' }, { label: 'Review', minScore: 2, maxScore: 2, action: 'analyst_approval', description: 'Critical' }, { label: 'Isolate', minScore: 3, maxScore: 99, action: 'auto_contain', description: 'Prod' }], approvalRecommendation: 'Production/critical = immediate isolation.', actionRecommendation: 'Prod/Critical: isolate. WS: approval.', decisionLogic: 'criticality >= 3 -> isolate', mitreMapping: ['T1204'] },
    user_risk: { type: 'user_risk', severity: 'high', rules: [{ id: 'u1', label: 'Admin', condition: 'Admin privileges', points: 3, mitre: 'T1078' }, { id: 'u2', label: 'Power user', condition: 'Power user', points: 2, mitre: '' }, { id: 'u3', label: 'Standard', condition: 'Standard user', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 1, maxScore: 1, action: 'skip', description: 'Standard' }, { label: 'Review', minScore: 2, maxScore: 2, action: 'analyst_approval', description: 'Power' }, { label: 'Isolate', minScore: 3, maxScore: 99, action: 'auto_contain', description: 'Admin' }], approvalRecommendation: 'Admin compromise = critical.', actionRecommendation: 'Admin: isolate. Power: approval.', decisionLogic: 'admin -> isolate', mitreMapping: ['T1078', 'T1204'] },
    hybrid: { type: 'hybrid', severity: 'high', rules: [{ id: 'h1', label: 'Rep + Sandbox', condition: 'Bad reputation + sandbox', points: 3, mitre: 'T1204' }, { id: 'h2', label: 'Sandbox + Behavior', condition: 'Malicious behavior detected', points: 2, mitre: '' }, { id: 'h3', label: 'Rep + Behavior', condition: 'Bad rep + behavior', points: 2, mitre: '' }], thresholds: [{ label: 'Low', minScore: 0, maxScore: 1, action: 'skip', description: 'Single' }, { label: 'Medium', minScore: 2, maxScore: 3, action: 'analyst_approval', description: 'Double' }, { label: 'High', minScore: 4, maxScore: 99, action: 'auto_contain', description: 'Multiple' }], approvalRecommendation: 'Multiple indicators = confirmed malware.', actionRecommendation: 'Multiple: isolate. Double: approval.', decisionLogic: 'max(factors) >= threshold', mitreMapping: ['T1204', 'T1059'] },
    confidence: { type: 'confidence', severity: 'high', rules: [{ id: 'cf1', label: 'Confirmed', condition: 'Multiple sources confirm', points: 5, mitre: 'T1204' }, { id: 'cf2', label: 'Very likely', condition: 'Strong indicators', points: 4, mitre: 'T1204' }, { id: 'cf3', label: 'Likely', condition: 'Some indicators', points: 2, mitre: '' }, { id: 'cf4', label: 'Possible', condition: 'Weak indicator', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 1, maxScore: 2, action: 'skip', description: 'Low' }, { label: 'Review', minScore: 3, maxScore: 3, action: 'analyst_approval', description: 'Medium' }, { label: 'Isolate', minScore: 4, maxScore: 99, action: 'auto_contain', description: 'High' }], approvalRecommendation: 'Confidence-based malware decision.', actionRecommendation: 'High confidence: isolate.', decisionLogic: 'confidence >= 4 -> isolate', mitreMapping: ['T1204'] },
    none: { type: 'none', severity: 'high', rules: [], thresholds: [{ label: 'Manual', minScore: 0, maxScore: 99, action: 'skip', description: 'Manual' }], approvalRecommendation: 'Manual malware review.', actionRecommendation: 'Analyst decides isolation.', decisionLogic: 'manual review', mitreMapping: [] },
  },
  malicious_ip: {
    additive: { type: 'additive', severity: 'high', rules: [{ id: 'r1', label: 'AbuseIPDB', condition: 'High abuse score', points: 2, mitre: 'T1190' }, { id: 'r2', label: 'VirusTotal', condition: 'Multiple vendors flag', points: 2, mitre: 'T1190' }, { id: 'r3', label: 'SIEM sightings', condition: 'Seen in SIEM detections', points: 2, mitre: 'T1595' }, { id: 'r4', label: 'Firewall blocks', condition: 'Firewall rule triggered', points: 1, mitre: '' }, { id: 'r5', label: 'CDN guardrail', condition: 'CDN blocks IP', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 0, maxScore: 2, action: 'skip', description: 'Low' }, { label: 'Review', minScore: 3, maxScore: 5, action: 'analyst_approval', description: 'Medium' }, { label: 'Block', minScore: 6, maxScore: 99, action: 'auto_contain', description: 'High' }], approvalRecommendation: 'Multiple intel sources = high confidence.', actionRecommendation: '6+: block. 3-5: approval. <3: allow.', decisionLogic: 'points >= 6 -> block', mitreMapping: ['T1190', 'T1595'] },
    weighted: { type: 'weighted', severity: 'high', rules: [{ id: 'w1', label: 'AbuseIPDB', condition: 'Confidence score', points: 30, mitre: 'T1190' }, { id: 'w2', label: 'VirusTotal', condition: 'Detection percentage', points: 25, mitre: 'T1190' }, { id: 'w3', label: 'SIEM', condition: 'Sighting volume', points: 25, mitre: 'T1595' }, { id: 'w4', label: 'Geo risk', condition: 'Geolocation risk score', points: 20, mitre: '' }], thresholds: [{ label: 'Low', minScore: 0, maxScore: 39, action: 'skip', description: '<40%' }, { label: 'Medium', minScore: 40, maxScore: 69, action: 'analyst_approval', description: '40-69%' }, { label: 'High', minScore: 70, maxScore: 100, action: 'auto_contain', description: '70%+' }], approvalRecommendation: 'Weight by confidence level.', actionRecommendation: '70+: block. 40-69: approval.', decisionLogic: 'weighted >= 70 -> block', mitreMapping: ['T1190', 'T1595'] },
    consensus: { type: 'consensus', severity: 'high', rules: [{ id: 'c1', label: 'AbuseIPDB', condition: 'Report filed', points: 1, mitre: 'T1190' }, { id: 'c2', label: 'VirusTotal', condition: 'Detection match', points: 1, mitre: 'T1190' }, { id: 'c3', label: 'SIEM', condition: 'Sightings', points: 1, mitre: 'T1595' }, { id: 'c4', label: 'Firewall', condition: 'Blocked', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 0, maxScore: 1, action: 'skip', description: '<2' }, { label: 'Review', minScore: 2, maxScore: 2, action: 'analyst_approval', description: '2' }, { label: 'Block', minScore: 3, maxScore: 99, action: 'auto_contain', description: '3+' }], approvalRecommendation: '3+ sources = malicious IP.', actionRecommendation: '3+: block. 2: approval.', decisionLogic: 'consensus >= 3 -> block', mitreMapping: ['T1190', 'T1595'] },
    severity: { type: 'severity', severity: 'high', rules: [{ id: 's1', label: 'Critical', condition: 'Severity=critical', points: 3, mitre: 'T1190' }, { id: 's2', label: 'High', condition: 'Severity=high', points: 2, mitre: 'T1190' }, { id: 's3', label: 'Medium', condition: 'Severity=medium', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 1, maxScore: 1, action: 'skip', description: 'Med' }, { label: 'Review', minScore: 2, maxScore: 2, action: 'analyst_approval', description: 'High' }, { label: 'Block', minScore: 3, maxScore: 3, action: 'auto_contain', description: 'Critical' }], approvalRecommendation: 'Severity-based IP blocking.', actionRecommendation: 'Critical: block. High: approval.', decisionLogic: 'severity >= high -> block', mitreMapping: ['T1190'] },
    mitre: { type: 'mitre', severity: 'high', rules: [{ id: 'm1', label: 'T1190 exploit', condition: 'Exploit detected', points: 3, mitre: 'T1190' }, { id: 'm2', label: 'T1566 phishing', condition: 'Phishing source', points: 2, mitre: 'T1566' }, { id: 'm3', label: 'T1595 scanning', condition: 'Scanning detected', points: 2, mitre: 'T1595' }], thresholds: [{ label: 'Monitor', minScore: 1, maxScore: 2, action: 'skip', description: '1' }, { label: 'Review', minScore: 3, maxScore: 4, action: 'analyst_approval', description: '2' }, { label: 'Block', minScore: 5, maxScore: 99, action: 'auto_contain', description: '3+' }], approvalRecommendation: 'MITRE techniques map to IP threat.', actionRecommendation: 'T1190+: block.', decisionLogic: 'mitre_score >= 3 -> block', mitreMapping: ['T1190', 'T1566', 'T1595'] },
    asset_criticality: { type: 'asset_criticality', severity: 'high', rules: [{ id: 'a1', label: 'Internet-facing', condition: 'Exposed to internet', points: 4, mitre: 'T1190' }, { id: 'a2', label: 'DMZ', condition: 'In DMZ segment', points: 3, mitre: '' }, { id: 'a3', label: 'Internal', condition: 'Internal network', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 1, maxScore: 1, action: 'skip', description: 'Internal' }, { label: 'Review', minScore: 2, maxScore: 2, action: 'analyst_approval', description: 'DMZ' }, { label: 'Block', minScore: 3, maxScore: 99, action: 'auto_contain', description: 'Exposed' }], approvalRecommendation: 'Internet-facing = priority block.', actionRecommendation: 'Exposed: block. DMZ: approval.', decisionLogic: 'exposed -> block', mitreMapping: ['T1190'] },
    user_risk: { type: 'user_risk', severity: 'high', rules: [], thresholds: [{ label: 'Standard', minScore: 0, maxScore: 99, action: 'skip', description: 'IP-based' }], approvalRecommendation: 'IP-based blocking (no user context).', actionRecommendation: 'Block based on IP reputation.', decisionLogic: 'reputation >= threshold -> block', mitreMapping: [] },
    hybrid: { type: 'hybrid', severity: 'high', rules: [{ id: 'h1', label: 'Rep + SIEM', condition: 'Bad rep + sightings', points: 3, mitre: 'T1190' }, { id: 'h2', label: 'SIEM + Intel', condition: 'Sightings + threat intel', points: 2, mitre: '' }, { id: 'h3', label: 'All factors', condition: 'Multiple indicators', points: 2, mitre: '' }], thresholds: [{ label: 'Low', minScore: 0, maxScore: 1, action: 'skip', description: 'Single' }, { label: 'Medium', minScore: 2, maxScore: 3, action: 'analyst_approval', description: 'Double' }, { label: 'High', minScore: 4, maxScore: 99, action: 'auto_contain', description: 'Multiple' }], approvalRecommendation: 'Multiple indicators = confirmed malicious IP.', actionRecommendation: 'Multiple: block. Double: approval.', decisionLogic: 'max(factors) >= threshold', mitreMapping: ['T1190', 'T1595'] },
    confidence: { type: 'confidence', severity: 'high', rules: [{ id: 'cf1', label: 'Definitely malicious', condition: 'Multiple sources align', points: 5, mitre: 'T1190' }, { id: 'cf2', label: 'Very likely', condition: 'Strong indicators', points: 4, mitre: 'T1190' }, { id: 'cf3', label: 'Likely', condition: 'Some indicators', points: 2, mitre: '' }, { id: 'cf4', label: 'Possible', condition: 'Weak indicator', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 1, maxScore: 2, action: 'skip', description: 'Low' }, { label: 'Review', minScore: 3, maxScore: 3, action: 'analyst_approval', description: 'Medium' }, { label: 'Block', minScore: 4, maxScore: 99, action: 'auto_contain', description: 'High' }], approvalRecommendation: 'Confidence-based IP blocking.', actionRecommendation: 'High confidence: block.', decisionLogic: 'confidence >= 4 -> block', mitreMapping: ['T1190'] },
    none: { type: 'none', severity: 'high', rules: [], thresholds: [{ label: 'Manual', minScore: 0, maxScore: 99, action: 'skip', description: 'Manual' }], approvalRecommendation: 'Manual IP review.', actionRecommendation: 'Analyst decides blocking.', decisionLogic: 'manual review', mitreMapping: [] },
  },
  vulnerability: {
    additive: { type: 'additive', severity: 'high', rules: [{ id: 'r1', label: 'CVSS >= 7.0', condition: 'CVSS score >= 7.0', points: 3, mitre: 'T1190' }, { id: 'r2', label: 'EPSS >= 50%', condition: 'EPSS score >= 50%', points: 2, mitre: '' }, { id: 'r3', label: 'Public exploit', condition: 'POC available', points: 2, mitre: '' }, { id: 'r4', label: 'Internet exposed', condition: 'Exposed to internet', points: 2, mitre: '' }, { id: 'r5', label: 'Criticality', condition: 'Asset criticality high', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 0, maxScore: 2, action: 'skip', description: 'Low' }, { label: 'Review', minScore: 3, maxScore: 5, action: 'analyst_approval', description: 'Medium' }, { label: 'Escalate', minScore: 6, maxScore: 99, action: 'auto_contain', description: 'High' }], approvalRecommendation: 'CVSS + EPSS + exposure = priority.', actionRecommendation: '6+: escalate. 3-5: approval. <3: monitor.', decisionLogic: 'points >= 6 -> escalate', mitreMapping: ['T1190'] },
    weighted: { type: 'weighted', severity: 'high', rules: [{ id: 'w1', label: 'CVSS', condition: 'CVSS score', points: 30, mitre: 'T1190' }, { id: 'w2', label: 'EPSS', condition: 'EPSS score', points: 35, mitre: '' }, { id: 'w3', label: 'Exploit', condition: 'POC availability', points: 20, mitre: '' }, { id: 'w4', label: 'Exposure', condition: 'Internet exposure', points: 15, mitre: '' }], thresholds: [{ label: 'Low', minScore: 0, maxScore: 39, action: 'skip', description: '<40%' }, { label: 'Medium', minScore: 40, maxScore: 69, action: 'analyst_approval', description: '40-69%' }, { label: 'High', minScore: 70, maxScore: 100, action: 'auto_contain', description: '70%+' }], approvalRecommendation: 'Weight by actionability.', actionRecommendation: '70+: escalate. 40-69: approval.', decisionLogic: 'weighted >= 70 -> escalate', mitreMapping: ['T1190'] },
    consensus: { type: 'consensus', severity: 'high', rules: [{ id: 'c1', label: 'CVSS', condition: 'CVSS >= 7', points: 1, mitre: 'T1190' }, { id: 'c2', label: 'EPSS', condition: 'EPSS >= 50%', points: 1, mitre: '' }, { id: 'c3', label: 'Exploit', condition: 'Exploit available', points: 1, mitre: '' }, { id: 'c4', label: 'Exposure', condition: 'Exposed', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 0, maxScore: 1, action: 'skip', description: '<2' }, { label: 'Review', minScore: 2, maxScore: 2, action: 'analyst_approval', description: '2' }, { label: 'Escalate', minScore: 3, maxScore: 99, action: 'auto_contain', description: '3+' }], approvalRecommendation: '3+ factors = critical vuln.', actionRecommendation: '3+: escalate. 2: approval.', decisionLogic: 'consensus >= 3 -> escalate', mitreMapping: ['T1190'] },
    severity: { type: 'severity', severity: 'high', rules: [{ id: 's1', label: 'Critical', condition: 'Severity=critical', points: 3, mitre: 'T1190' }, { id: 's2', label: 'High', condition: 'Severity=high', points: 2, mitre: 'T1190' }, { id: 's3', label: 'Medium', condition: 'Severity=medium', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 1, maxScore: 1, action: 'skip', description: 'Med' }, { label: 'Review', minScore: 2, maxScore: 2, action: 'analyst_approval', description: 'High' }, { label: 'Escalate', minScore: 3, maxScore: 3, action: 'auto_contain', description: 'Critical' }], approvalRecommendation: 'Severity maps to remediation priority.', actionRecommendation: 'Critical: escalate. High: approval.', decisionLogic: 'severity >= high -> escalate', mitreMapping: ['T1190'] },
    mitre: { type: 'mitre', severity: 'high', rules: [{ id: 'm1', label: 'T1190 exploit', condition: 'Exploit vector', points: 3, mitre: 'T1190' }, { id: 'm2', label: 'T1200 hardcode', condition: 'Hardcoded credential', points: 2, mitre: 'T1200' }, { id: 'm3', label: 'T1565 integrity', condition: 'Integrity impact', points: 2, mitre: 'T1565' }], thresholds: [{ label: 'Monitor', minScore: 1, maxScore: 2, action: 'skip', description: '1' }, { label: 'Review', minScore: 3, maxScore: 4, action: 'analyst_approval', description: '2' }, { label: 'Escalate', minScore: 5, maxScore: 99, action: 'auto_contain', description: '3+' }], approvalRecommendation: 'MITRE impact analysis.', actionRecommendation: 'T1190+: escalate.', decisionLogic: 'mitre_score >= 3 -> escalate', mitreMapping: ['T1190', 'T1200', 'T1565'] },
    asset_criticality: { type: 'asset_criticality', severity: 'high', rules: [{ id: 'a1', label: 'Critical', condition: 'Criticality=critical', points: 4, mitre: 'T1190' }, { id: 'a2', label: 'Production', condition: 'Production system', points: 3, mitre: '' }, { id: 'a3', label: 'Standard', condition: 'Standard system', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 1, maxScore: 1, action: 'skip', description: 'Standard' }, { label: 'Review', minScore: 2, maxScore: 2, action: 'analyst_approval', description: 'Production' }, { label: 'Escalate', minScore: 3, maxScore: 99, action: 'auto_contain', description: 'Critical' }], approvalRecommendation: 'Critical assets = priority patching.', actionRecommendation: 'Critical: escalate. Prod: approval.', decisionLogic: 'criticality >= 3 -> escalate', mitreMapping: ['T1190'] },
    user_risk: { type: 'user_risk', severity: 'high', rules: [], thresholds: [{ label: 'Standard', minScore: 0, maxScore: 99, action: 'skip', description: 'Asset-based' }], approvalRecommendation: 'Vulnerability remediation (no user context).', actionRecommendation: 'Patch based on criticality.', decisionLogic: 'criticality >= threshold -> patch', mitreMapping: [] },
    hybrid: { type: 'hybrid', severity: 'high', rules: [{ id: 'h1', label: 'CVSS + EPSS', condition: 'Both high scores', points: 3, mitre: 'T1190' }, { id: 'h2', label: 'Exposure + Critical', condition: 'Exposed critical', points: 2, mitre: '' }, { id: 'h3', label: 'All factors', condition: 'Multiple indicators', points: 2, mitre: '' }], thresholds: [{ label: 'Low', minScore: 0, maxScore: 1, action: 'skip', description: 'Single' }, { label: 'Medium', minScore: 2, maxScore: 3, action: 'analyst_approval', description: 'Double' }, { label: 'High', minScore: 4, maxScore: 99, action: 'auto_contain', description: 'Multiple' }], approvalRecommendation: 'Multiple risk factors = critical vuln.', actionRecommendation: 'Multiple: escalate. Double: approval.', decisionLogic: 'max(factors) >= threshold', mitreMapping: ['T1190'] },
    confidence: { type: 'confidence', severity: 'high', rules: [{ id: 'cf1', label: 'Confirmed', condition: 'Multiple confirmations', points: 5, mitre: 'T1190' }, { id: 'cf2', label: 'Very likely', condition: 'Strong indicators', points: 4, mitre: 'T1190' }, { id: 'cf3', label: 'Likely', condition: 'Some indicators', points: 2, mitre: '' }, { id: 'cf4', label: 'Possible', condition: 'Weak indicator', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 1, maxScore: 2, action: 'skip', description: 'Low' }, { label: 'Review', minScore: 3, maxScore: 3, action: 'analyst_approval', description: 'Medium' }, { label: 'Escalate', minScore: 4, maxScore: 99, action: 'auto_contain', description: 'High' }], approvalRecommendation: 'Confidence-based vuln prioritization.', actionRecommendation: 'High confidence: escalate.', decisionLogic: 'confidence >= 4 -> escalate', mitreMapping: ['T1190'] },
    none: { type: 'none', severity: 'high', rules: [], thresholds: [{ label: 'Manual', minScore: 0, maxScore: 99, action: 'skip', description: 'Manual' }], approvalRecommendation: 'Manual vulnerability assessment.', actionRecommendation: 'Analyst prioritizes patching.', decisionLogic: 'manual review', mitreMapping: [] },
  },
  ticket_automation: {
    additive: { type: 'additive', severity: 'medium', rules: [{ id: 'r1', label: 'Priority score', condition: 'Issue priority', points: 2, mitre: '' }, { id: 'r2', label: 'Urgency', condition: 'Time-sensitive', points: 2, mitre: '' }, { id: 'r3', label: 'Impact', condition: 'Number of users', points: 1, mitre: '' }, { id: 'r4', label: 'SLA breach', condition: 'SLA at risk', points: 2, mitre: '' }, { id: 'r5', label: 'Duplicate', condition: 'Duplicate ticket', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 0, maxScore: 2, action: 'skip', description: 'Low' }, { label: 'Normal', minScore: 3, maxScore: 5, action: 'analyst_approval', description: 'Medium' }, { label: 'Urgent', minScore: 6, maxScore: 99, action: 'auto_contain', description: 'High' }], approvalRecommendation: 'Routing based on priority factors.', actionRecommendation: '6+: urgent queue. 3-5: normal. <3: backlog.', decisionLogic: 'points >= 6 -> urgent', mitreMapping: [] },
    weighted: { type: 'weighted', severity: 'medium', rules: [{ id: 'w1', label: 'Priority', condition: 'Priority weight', points: 25, mitre: '' }, { id: 'w2', label: 'Urgency', condition: 'Urgency weight', points: 25, mitre: '' }, { id: 'w3', label: 'Impact', condition: 'Impact weight', points: 25, mitre: '' }, { id: 'w4', label: 'SLA', condition: 'SLA weight', points: 25, mitre: '' }], thresholds: [{ label: 'Low', minScore: 0, maxScore: 33, action: 'skip', description: '<33%' }, { label: 'Medium', minScore: 34, maxScore: 66, action: 'analyst_approval', description: '34-66%' }, { label: 'High', minScore: 67, maxScore: 100, action: 'auto_contain', description: '67%+' }], approvalRecommendation: 'Balanced routing by factors.', actionRecommendation: '67+: urgent. 34-66: normal.', decisionLogic: 'weighted >= 67 -> urgent', mitreMapping: [] },
    consensus: { type: 'consensus', severity: 'medium', rules: [{ id: 'c1', label: 'Priority check', condition: 'P1 priority', points: 1, mitre: '' }, { id: 'c2', label: 'Urgency check', condition: 'Time-critical', points: 1, mitre: '' }, { id: 'c3', label: 'Impact check', condition: 'Multiple users', points: 1, mitre: '' }, { id: 'c4', label: 'SLA check', condition: 'SLA breach', points: 1, mitre: '' }], thresholds: [{ label: 'Normal', minScore: 0, maxScore: 1, action: 'skip', description: '<2' }, { label: 'Medium', minScore: 2, maxScore: 2, action: 'analyst_approval', description: '2' }, { label: 'Urgent', minScore: 3, maxScore: 99, action: 'auto_contain', description: '3+' }], approvalRecommendation: '3+ factors = urgent ticket.', actionRecommendation: '3+: urgent. 2: normal.', decisionLogic: 'consensus >= 3 -> urgent', mitreMapping: [] },
    severity: { type: 'severity', severity: 'medium', rules: [{ id: 's1', label: 'Critical', condition: 'Severity=critical', points: 3, mitre: '' }, { id: 's2', label: 'High', condition: 'Severity=high', points: 2, mitre: '' }, { id: 's3', label: 'Medium', condition: 'Severity=medium', points: 1, mitre: '' }], thresholds: [{ label: 'Normal', minScore: 1, maxScore: 1, action: 'skip', description: 'Med' }, { label: 'Medium', minScore: 2, maxScore: 2, action: 'analyst_approval', description: 'High' }, { label: 'Urgent', minScore: 3, maxScore: 3, action: 'auto_contain', description: 'Critical' }], approvalRecommendation: 'Severity-based ticket routing.', actionRecommendation: 'Critical: urgent. High: medium.', decisionLogic: 'severity >= high -> urgent', mitreMapping: [] },
    mitre: { type: 'mitre', severity: 'medium', rules: [], thresholds: [{ label: 'Standard', minScore: 0, maxScore: 99, action: 'skip', description: 'No MITRE' }], approvalRecommendation: 'No MITRE mapping for ticket automation.', actionRecommendation: 'Use priority/urgency instead.', decisionLogic: 'no mitre mapping', mitreMapping: [] },
    asset_criticality: { type: 'asset_criticality', severity: 'medium', rules: [{ id: 'a1', label: 'Infrastructure', condition: 'Critical infrastructure', points: 3, mitre: '' }, { id: 'a2', label: 'Business critical', condition: 'Business system', points: 2, mitre: '' }, { id: 'a3', label: 'Standard', condition: 'Standard system', points: 1, mitre: '' }], thresholds: [{ label: 'Normal', minScore: 1, maxScore: 1, action: 'skip', description: 'Standard' }, { label: 'Medium', minScore: 2, maxScore: 2, action: 'analyst_approval', description: 'Business' }, { label: 'Urgent', minScore: 3, maxScore: 99, action: 'auto_contain', description: 'Infrastructure' }], approvalRecommendation: 'Critical systems = priority routing.', actionRecommendation: 'Infrastructure: urgent. Business: normal.', decisionLogic: 'criticality >= 3 -> urgent', mitreMapping: [] },
    user_risk: { type: 'user_risk', severity: 'medium', rules: [], thresholds: [{ label: 'Standard', minScore: 0, maxScore: 99, action: 'skip', description: 'No user risk' }], approvalRecommendation: 'Ticket automation (no user context).', actionRecommendation: 'Route by system/priority.', decisionLogic: 'no user risk', mitreMapping: [] },
    hybrid: { type: 'hybrid', severity: 'medium', rules: [{ id: 'h1', label: 'Priority + SLA', condition: 'P1 + SLA at risk', points: 3, mitre: '' }, { id: 'h2', label: 'Impact + Urgency', condition: 'Multi-user + time-critical', points: 2, mitre: '' }, { id: 'h3', label: 'All factors', condition: 'Multiple high', points: 2, mitre: '' }], thresholds: [{ label: 'Low', minScore: 0, maxScore: 1, action: 'skip', description: 'Single' }, { label: 'Medium', minScore: 2, maxScore: 3, action: 'analyst_approval', description: 'Double' }, { label: 'High', minScore: 4, maxScore: 99, action: 'auto_contain', description: 'Multiple' }], approvalRecommendation: 'Hybrid routing combines factors.', actionRecommendation: 'Multiple: urgent. Double: normal.', decisionLogic: 'max(factors) >= threshold', mitreMapping: [] },
    confidence: { type: 'confidence', severity: 'medium', rules: [{ id: 'cf1', label: 'High confidence', condition: 'Multiple confirms', points: 5, mitre: '' }, { id: 'cf2', label: 'Medium confidence', condition: 'Some indicators', points: 3, mitre: '' }, { id: 'cf3', label: 'Low confidence', condition: 'Single indicator', points: 1, mitre: '' }], thresholds: [{ label: 'Normal', minScore: 1, maxScore: 2, action: 'skip', description: 'Low' }, { label: 'Medium', minScore: 3, maxScore: 3, action: 'analyst_approval', description: 'Medium' }, { label: 'Urgent', minScore: 4, maxScore: 99, action: 'auto_contain', description: 'High' }], approvalRecommendation: 'Confidence-based ticket prioritization.', actionRecommendation: 'High confidence: urgent.', decisionLogic: 'confidence >= 4 -> urgent', mitreMapping: [] },
    none: { type: 'none', severity: 'medium', rules: [], thresholds: [{ label: 'Default', minScore: 0, maxScore: 99, action: 'skip', description: 'Manual' }], approvalRecommendation: 'Default ticket routing (no scoring).', actionRecommendation: 'Use ITSM default queue.', decisionLogic: 'no routing logic', mitreMapping: [] },
  },
  threat_intel: {
    additive: { type: 'additive', severity: 'medium', rules: [{ id: 'r1', label: 'Intel source 1', condition: 'Source reports IOC', points: 2, mitre: '' }, { id: 'r2', label: 'Intel source 2', condition: 'Second source confirms', points: 2, mitre: '' }, { id: 'r3', label: 'Intel source 3', condition: 'Third source confirms', points: 1, mitre: '' }, { id: 'r4', label: 'SIEM sightings', condition: 'Detected in SIEM', points: 2, mitre: '' }, { id: 'r5', label: 'Watchlist match', condition: 'On watchlist', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 0, maxScore: 2, action: 'skip', description: 'Low' }, { label: 'Track', minScore: 3, maxScore: 5, action: 'analyst_approval', description: 'Medium' }, { label: 'Block', minScore: 6, maxScore: 99, action: 'auto_contain', description: 'High' }], approvalRecommendation: 'Multiple intel sources = high confidence.', actionRecommendation: '6+: block/watchlist. 3-5: track. <3: monitor.', decisionLogic: 'points >= 6 -> block', mitreMapping: [] },
    weighted: { type: 'weighted', severity: 'medium', rules: [{ id: 'w1', label: 'Source confidence', condition: 'Source reliability score', points: 30, mitre: '' }, { id: 'w2', label: 'Sighting freq', condition: 'Sighting frequency', points: 30, mitre: '' }, { id: 'w3', label: 'Recency', condition: 'IOC recency', points: 20, mitre: '' }, { id: 'w4', label: 'Relevance', condition: 'Industry relevance', points: 20, mitre: '' }], thresholds: [{ label: 'Low', minScore: 0, maxScore: 39, action: 'skip', description: '<40%' }, { label: 'Medium', minScore: 40, maxScore: 69, action: 'analyst_approval', description: '40-69%' }, { label: 'High', minScore: 70, maxScore: 100, action: 'auto_contain', description: '70%+' }], approvalRecommendation: 'Weight by confidence sources.', actionRecommendation: '70+: block. 40-69: track.', decisionLogic: 'weighted >= 70 -> block', mitreMapping: [] },
    consensus: { type: 'consensus', severity: 'medium', rules: [{ id: 'c1', label: 'Multi-source', condition: 'Multiple sources report', points: 1, mitre: '' }, { id: 'c2', label: 'Cross-validated', condition: 'Sources align', points: 1, mitre: '' }, { id: 'c3', label: 'Sightings', condition: 'Confirmed sightings', points: 1, mitre: '' }, { id: 'c4', label: 'Watchlist', condition: 'High-confidence watchlist', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 0, maxScore: 1, action: 'skip', description: '<2' }, { label: 'Track', minScore: 2, maxScore: 2, action: 'analyst_approval', description: '2' }, { label: 'Block', minScore: 3, maxScore: 99, action: 'auto_contain', description: '3+' }], approvalRecommendation: '3+ validations = add to watchlist.', actionRecommendation: '3+: watchlist. 2: track.', decisionLogic: 'consensus >= 3 -> watchlist', mitreMapping: [] },
    severity: { type: 'severity', severity: 'medium', rules: [{ id: 's1', label: 'Critical', condition: 'Severity=critical', points: 3, mitre: '' }, { id: 's2', label: 'High', condition: 'Severity=high', points: 2, mitre: '' }, { id: 's3', label: 'Medium', condition: 'Severity=medium', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 1, maxScore: 1, action: 'skip', description: 'Med' }, { label: 'Track', minScore: 2, maxScore: 2, action: 'analyst_approval', description: 'High' }, { label: 'Block', minScore: 3, maxScore: 3, action: 'auto_contain', description: 'Critical' }], approvalRecommendation: 'Severity-based threat intel routing.', actionRecommendation: 'Critical: block. High: track.', decisionLogic: 'severity >= high -> block', mitreMapping: [] },
    mitre: { type: 'mitre', severity: 'medium', rules: [{ id: 'm1', label: 'MITRE mapping', condition: 'ATT&CK technique detected', points: 3, mitre: '' }, { id: 'm2', label: 'Technique coverage', condition: 'Multiple techniques', points: 2, mitre: '' }, { id: 'm3', label: 'Tactic alignment', condition: 'Tactic identified', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 1, maxScore: 2, action: 'skip', description: '1' }, { label: 'Track', minScore: 3, maxScore: 4, action: 'analyst_approval', description: '2' }, { label: 'Block', minScore: 5, maxScore: 99, action: 'auto_contain', description: '3+' }], approvalRecommendation: 'MITRE techniques identify threat group.', actionRecommendation: 'Multi-technique: block.', decisionLogic: 'mitre_score >= 3 -> block', mitreMapping: ['T1592', 'T1589', 'T1590'] },
    asset_criticality: { type: 'asset_criticality', severity: 'medium', rules: [{ id: 'a1', label: 'Exposed', condition: 'Asset exposed', points: 3, mitre: '' }, { id: 'a2', label: 'Critical', condition: 'Critical service', points: 2, mitre: '' }, { id: 'a3', label: 'Standard', condition: 'Standard asset', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 1, maxScore: 1, action: 'skip', description: 'Standard' }, { label: 'Track', minScore: 2, maxScore: 2, action: 'analyst_approval', description: 'Critical' }, { label: 'Block', minScore: 3, maxScore: 99, action: 'auto_contain', description: 'Exposed' }], approvalRecommendation: 'Exposed assets = priority monitoring.', actionRecommendation: 'Exposed: block. Critical: track.', decisionLogic: 'exposed -> block', mitreMapping: [] },
    user_risk: { type: 'user_risk', severity: 'medium', rules: [{ id: 'u1', label: 'Targeted users', condition: 'Users targeted', points: 3, mitre: '' }, { id: 'u2', label: 'High-risk group', condition: 'High-risk group targeted', points: 2, mitre: '' }, { id: 'u3', label: 'General', condition: 'General threat', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 1, maxScore: 1, action: 'skip', description: 'General' }, { label: 'Track', minScore: 2, maxScore: 2, action: 'analyst_approval', description: 'Group' }, { label: 'Alert', minScore: 3, maxScore: 99, action: 'auto_contain', description: 'Targeted' }], approvalRecommendation: 'Targeted users = priority alert.', actionRecommendation: 'Targeted: alert. Group: track.', decisionLogic: 'targeted -> alert', mitreMapping: [] },
    hybrid: { type: 'hybrid', severity: 'medium', rules: [{ id: 'h1', label: 'Source + confidence', condition: 'Multiple sources + high conf', points: 3, mitre: '' }, { id: 'h2', label: 'Confidence + sightings', condition: 'High conf + confirmed', points: 2, mitre: '' }, { id: 'h3', label: 'All factors', condition: 'Multiple indicators', points: 2, mitre: '' }], thresholds: [{ label: 'Low', minScore: 0, maxScore: 1, action: 'skip', description: 'Single' }, { label: 'Medium', minScore: 2, maxScore: 3, action: 'analyst_approval', description: 'Double' }, { label: 'High', minScore: 4, maxScore: 99, action: 'auto_contain', description: 'Multiple' }], approvalRecommendation: 'Hybrid scoring combines threat factors.', actionRecommendation: 'Multiple: block. Double: track.', decisionLogic: 'max(factors) >= threshold', mitreMapping: [] },
    confidence: { type: 'confidence', severity: 'medium', rules: [{ id: 'cf1', label: 'Confirmed', condition: 'Multiple confirmations', points: 5, mitre: '' }, { id: 'cf2', label: 'Very likely', condition: 'Strong indicators', points: 4, mitre: '' }, { id: 'cf3', label: 'Likely', condition: 'Some indicators', points: 2, mitre: '' }, { id: 'cf4', label: 'Possible', condition: 'Weak indicator', points: 1, mitre: '' }], thresholds: [{ label: 'Monitor', minScore: 1, maxScore: 2, action: 'skip', description: 'Low' }, { label: 'Track', minScore: 3, maxScore: 3, action: 'analyst_approval', description: 'Medium' }, { label: 'Block', minScore: 4, maxScore: 99, action: 'auto_contain', description: 'High' }], approvalRecommendation: 'Confidence-based threat intel decision.', actionRecommendation: 'High confidence: block/watchlist.', decisionLogic: 'confidence >= 4 -> block', mitreMapping: [] },
    none: { type: 'none', severity: 'medium', rules: [], thresholds: [{ label: 'Manual', minScore: 0, maxScore: 99, action: 'skip', description: 'Manual' }], approvalRecommendation: 'Manual threat intel assessment.', actionRecommendation: 'Analyst adds to watchlist.', decisionLogic: 'manual review', mitreMapping: [] },
  },
};

export function getScoringPreset(templateId: string | undefined, scoringType: ScoringType): ScoringModel {
  const tId = (templateId || 'ransomware') as TemplateId;
  const preset = SCORING_PRESETS[tId]?.[scoringType];
  if (!preset) return SCORING_PRESETS.ransomware.additive;

  return {
    type: preset.type,
    severity: preset.severity,
    rules: preset.rules.map((r) => ({
      id: r.id,
      label: r.label,
      condition: r.condition,
      points: r.points,
      mitre: r.mitre,
    })),
    thresholds: preset.thresholds.map((t) => ({
      label: t.label,
      minScore: t.minScore,
      maxScore: t.maxScore,
      action: t.action,
      description: t.description,
    })),
    approvalRecommendation: preset.approvalRecommendation,
    actionRecommendation: preset.actionRecommendation,
    decisionLogic: preset.decisionLogic,
    mitreMapping: preset.mitreMapping,
  };
}

export function getPresetLabel(name: string, scoringType: ScoringType): string {
  const typeLabel: Record<ScoringType, string> = {
    additive: 'Additive',
    weighted: 'Weighted',
    consensus: 'Consensus',
    severity: 'Severity-Based',
    mitre: 'MITRE-Based',
    asset_criticality: 'Asset Criticality',
    user_risk: 'User Risk',
    hybrid: 'Hybrid',
    confidence: 'Confidence',
    none: 'No Scoring',
  };

  const typeName = typeLabel[scoringType] || 'Unknown';
  return `${name} / ${typeName}`;
}

export function getDefaultScoringType(): ScoringType {
  return 'additive';
}

export interface ScoringPresetValidationResult {
  template: TemplateId;
  scoringType: ScoringType;
  isValid: boolean;
  errors: string[];
}

export function validateScoringPresets(): ScoringPresetValidationResult[] {
  const results: ScoringPresetValidationResult[] = [];
  const templates: TemplateId[] = ['ransomware', 'waf_attack', 'phishing', 'suspicious_login', 'malware_hash', 'malicious_ip', 'vulnerability', 'ticket_automation', 'threat_intel'];
  const scoringTypes: ScoringType[] = ['additive', 'weighted', 'consensus', 'severity', 'mitre', 'asset_criticality', 'user_risk', 'hybrid', 'confidence', 'none'];

  for (const template of templates) {
    for (const scoringType of scoringTypes) {
      const preset = SCORING_PRESETS[template]?.[scoringType];
      const errors: string[] = [];

      if (!preset) {
        errors.push('Preset not found');
      } else {
        if (scoringType !== 'none') {
          if (!preset.rules || preset.rules.length === 0) {
            errors.push('Empty rules array for non-none preset');
          }
          if (!preset.thresholds || preset.thresholds.length === 0) {
            errors.push('Empty thresholds array for non-none preset');
          }
          if (!preset.approvalRecommendation || preset.approvalRecommendation.trim() === '') {
            errors.push('Missing approvalRecommendation');
          }
          if (!preset.actionRecommendation || preset.actionRecommendation.trim() === '') {
            errors.push('Missing actionRecommendation');
          }
          if (!preset.decisionLogic || preset.decisionLogic.trim() === '') {
            errors.push('Missing decisionLogic');
          }
        } else {
          if (!preset.approvalRecommendation || preset.approvalRecommendation.trim() === '') {
            errors.push('Missing approvalRecommendation for none type');
          }
          if (!preset.actionRecommendation || preset.actionRecommendation.trim() === '') {
            errors.push('Missing actionRecommendation for none type');
          }
          if (!preset.decisionLogic || preset.decisionLogic.trim() === '') {
            errors.push('Missing decisionLogic for none type');
          }
        }
      }

      results.push({
        template,
        scoringType,
        isValid: errors.length === 0,
        errors,
      });
    }
  }

  return results;
}
