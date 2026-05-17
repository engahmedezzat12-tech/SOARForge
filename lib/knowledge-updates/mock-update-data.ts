import type {
  KnowledgeApprovalQueueItem,
  KnowledgeDiffItem,
  KnowledgeSourceHealth,
  KnowledgeUpdateReview,
  KnowledgeVersionSourceState,
  KnowledgeVersionTimelineEvent,
  TemplateImpactResult,
} from './knowledge-update-types';
import { KNOWLEDGE_SOURCE_REGISTRY } from './knowledge-source-registry';

const now = '2026-05-17T19:35:00Z';

export const DEMO_KNOWLEDGE_DIFFS: KnowledgeDiffItem[] = [
  {
    id: 'diff-mitre-t1490-modified',
    sourceId: 'mitre_attack_enterprise',
    type: 'modified',
    objectId: 'T1490',
    objectType: 'technique',
    title: 'T1490 mapping metadata updated',
    summary: 'MITRE ATT&CK metadata for recovery-control alteration was modified. Existing ransomware templates should review detection references and data-source coverage.',
    oldValue: { version: '2026.05-local', dataSources: ['Process Creation'] },
    newValue: { version: '2026.06-demo', dataSources: ['Process Creation', 'Command Execution', 'Backup Service Activity'] },
    affectedFields: ['modified', 'data_sources', 'relationships'],
    affectedIncidentTypes: ['Ransomware Behavior'],
    affectedTemplates: ['Ransomware Auto Containment'],
    recommendedAction: 'Review ransomware recovery-control detection coverage and update documentation references after approval.',
    impactLevel: 'medium',
    risk: 'medium',
    confidence: 'high',
    requiresApproval: true,
    safeToApply: true,
    customerFacingChange: 'Ransomware recovery-control coverage has updated knowledge references. Review recommended before refreshing local mappings.',
    technicalDetails: 'Demo STIX diff: attack-pattern--T1490 modified timestamp and data-source relationship changed.',
  },
  {
    id: 'diff-sigma-phishing-rule-added',
    sourceId: 'sigma_hq',
    type: 'added',
    objectId: 'sigma-demo-phishing-url-click-context',
    objectType: 'detection_rule',
    title: 'New phishing URL click-context detection metadata',
    summary: 'A new Sigma metadata reference maps suspicious URL click context to phishing response coverage.',
    oldValue: null,
    newValue: { status: 'test', level: 'medium', tags: ['attack.t1566.002'], logsource: { product: 'm365' } },
    affectedFields: ['id', 'title', 'tags', 'logsource', 'level'],
    affectedIncidentTypes: ['Phishing Response'],
    affectedTemplates: ['Phishing Campaign Response'],
    recommendedAction: 'Review whether the phishing playbook should include the new detection reference in customer documentation and validation tests.',
    impactLevel: 'low',
    risk: 'low',
    confidence: 'medium',
    requiresApproval: true,
    safeToApply: true,
    customerFacingChange: 'A new detection reference may improve phishing URL coverage after review.',
  },
  {
    id: 'diff-cisa-kev-new-cve',
    sourceId: 'cisa_kev',
    type: 'added',
    objectId: 'CVE-2026-42897',
    objectType: 'kev_cve',
    title: 'New exploited vulnerability entry available',
    summary: 'CISA KEV demo data includes a newly added exploited vulnerability affecting an internet-facing service family.',
    oldValue: null,
    newValue: { cveID: 'CVE-2026-42897', vendorProject: 'Microsoft', product: 'Exchange Server', knownRansomwareCampaignUse: 'Unknown', dueDate: '2026-06-01' },
    affectedFields: ['cveID', 'vendorProject', 'product', 'dateAdded', 'dueDate'],
    affectedIncidentTypes: ['Vulnerability Exposure', 'Internet-Facing Vulnerable Asset'],
    affectedTemplates: ['Critical Vulnerability Exposure', 'Internet-Facing Vulnerable Asset'],
    recommendedAction: 'Mark vulnerability exposure templates Review Recommended and evaluate whether a KEV exposure workflow should be added to the delivery pack.',
    impactLevel: 'high',
    risk: 'high',
    confidence: 'very_high',
    requiresApproval: true,
    safeToApply: true,
    customerFacingChange: 'A new exploited-vulnerability item may affect vulnerability prioritization playbooks.',
  },
  {
    id: 'diff-lolbas-sc-updated',
    sourceId: 'lolbas',
    type: 'mapping_changed',
    objectId: 'LOLBAS-SC',
    objectType: 'lolbas_entry',
    title: 'LOLBAS service-control metadata mapping changed',
    summary: 'Living-off-the-land metadata for service control activity changed and may improve suspicious process detection guidance.',
    oldValue: { techniques: ['T1564.004'] },
    newValue: { techniques: ['T1564.004', 'T1543.003'] },
    affectedFields: ['mitre_mappings', 'detection_references'],
    affectedIncidentTypes: ['Suspicious Process Execution', 'EDR Tampering'],
    affectedTemplates: ['Suspicious Process Execution', 'Malware Alert'],
    recommendedAction: 'Review endpoint detection guidance. Do not add commands or execution content to generated playbooks.',
    impactLevel: 'medium',
    risk: 'medium',
    confidence: 'high',
    requiresApproval: true,
    safeToApply: true,
    customerFacingChange: 'Living-off-the-land detection context changed. Review recommended for endpoint templates.',
  },
];

export function buildDemoSourceHealth(): KnowledgeSourceHealth[] {
  return KNOWLEDGE_SOURCE_REGISTRY.map((source) => ({
    sourceId: source.id,
    displayName: source.customerLabel,
    status: source.updateMode === 'local_only' ? 'offline_ready' : 'reachable',
    lastChecked: now,
    latestKnownVersion: source.id === 'mitre_attack_enterprise' ? '2026.06-demo' : source.localVersion,
    localVersion: source.localVersion,
    mode: source.updateMode,
    message: source.updateMode === 'local_only'
      ? 'Local curated source. Updated during SOARForge release cycles.'
      : 'Demo check completed. Online and offline approval flows are supported by design.',
  }));
}

export function buildDemoTemplateImpacts(templateName?: string, incidentType?: string): TemplateImpactResult[] {
  const base: TemplateImpactResult[] = [
    {
      templateId: 'ransomware-auto-containment',
      templateName: 'Ransomware Auto Containment',
      incidentType: 'Ransomware Behavior',
      impact: 'medium',
      reason: 'T1490 recovery-control knowledge metadata changed. Existing ransomware detection and documentation references should be reviewed.',
      affectedTechniques: ['T1490'],
      affectedDetectionReferences: ['Recovery Control Alteration'],
      affectedResponseRecommendations: ['Recovery validation before final closure'],
      recommendedAction: 'Mark template Review Recommended and refresh threat-coverage documentation after admin approval.',
      reviewRecommended: true,
      customerExportNote: 'Review recommended because an upstream ATT&CK mapping relevant to ransomware recovery control changed.',
    },
    {
      templateId: 'phishing-campaign-response',
      templateName: 'Phishing Campaign Response',
      incidentType: 'Phishing Response',
      impact: 'low',
      reason: 'A new Sigma metadata reference may improve phishing URL click-context coverage.',
      affectedTechniques: ['T1566.002'],
      affectedDetectionReferences: ['Suspicious URL Reputation and Click Context'],
      affectedResponseRecommendations: ['Mailbox campaign search validation'],
      recommendedAction: 'Review detection-reference documentation. No production playbook change is applied automatically.',
      reviewRecommended: true,
      customerExportNote: 'Review recommended for documentation and detection coverage updates.',
    },
    {
      templateId: 'critical-vulnerability-exposure',
      templateName: 'Critical Vulnerability Exposure',
      incidentType: 'Vulnerability Exposure',
      impact: 'high',
      reason: 'A new KEV entry may require vulnerability prioritization and exposure workflow review.',
      affectedTechniques: [],
      affectedDetectionReferences: ['CISA KEV exposure prioritization'],
      affectedResponseRecommendations: ['Patch prioritization workflow', 'Asset exposure validation'],
      recommendedAction: 'Mark vulnerability exposure templates Review Recommended and evaluate a KEV-driven playbook enhancement.',
      reviewRecommended: true,
      customerExportNote: 'New exploited vulnerability intelligence may affect prioritization guidance.',
    },
  ];

  if (!templateName) return base;
  const lowerName = templateName.toLowerCase();
  const direct = base.filter((impact) => impact.templateName.toLowerCase() === lowerName);
  if (direct.length > 0) return direct;
  if (incidentType?.toLowerCase().includes('ransom')) return base.filter((i) => i.incidentType === 'Ransomware Behavior');
  if (incidentType?.toLowerCase().includes('phish')) return base.filter((i) => i.incidentType === 'Phishing Response');
  return base.slice(0, 2);
}

export function buildDemoTimeline(): KnowledgeVersionTimelineEvent[] {
  return [
    { id: 'tl-1', timestamp: '2026-05-17T19:35:00Z', sourceId: 'mitre_attack_enterprise', state: 'update_available', title: 'Demo update detected', description: 'MITRE ATT&CK demo version differs from the local reviewed knowledge base.', actor: 'system' },
    { id: 'tl-2', timestamp: '2026-05-17T19:36:00Z', sourceId: 'mitre_attack_enterprise', state: 'staged', title: 'Update staged', description: 'Diff items were staged for review without modifying production playbooks.', actor: 'system' },
    { id: 'tl-3', timestamp: '2026-05-17T19:37:00Z', sourceId: 'mitre_attack_enterprise', state: 'review_required', title: 'Impact analysis completed', description: 'Affected templates were marked Review Recommended pending admin approval.', actor: 'system' },
  ];
}

export function buildDemoSourceVersions(): KnowledgeVersionSourceState[] {
  return KNOWLEDGE_SOURCE_REGISTRY.map((source) => ({
    sourceId: source.id,
    activeVersion: source.localVersion,
    stagedVersion: source.id === 'mitre_attack_enterprise' ? '2026.06-demo' : undefined,
    latestAvailableVersion: source.id === 'mitre_attack_enterprise' ? '2026.06-demo' : source.localVersion,
    lastChecked: now,
    lastApplied: source.updateMode === 'local_only' ? 'SOARForge release build' : undefined,
    rollbackPoint: `${source.localVersion}-rollback`,
    checksum: `demo-${source.id.slice(0, 8)}-checksum`,
  }));
}

export function buildDemoApprovalQueue(templateName?: string, incidentType?: string): KnowledgeApprovalQueueItem[] {
  const impacts = buildDemoTemplateImpacts(templateName, incidentType);
  return [
    {
      id: 'queue-demo-knowledge-review',
      reviewId: 'review-demo-2026-05',
      state: 'review_required',
      internalState: 'pending_admin_approval',
      sourceIds: ['mitre_attack_enterprise', 'sigma_hq', 'cisa_kev', 'lolbas'],
      title: 'Demo knowledge update requires review',
      summary: 'Knowledge update diff and template impact analysis are staged. Admin approval is required before local knowledge datasets change.',
      createdAt: now,
      updatedAt: now,
      requiresAdminApproval: true,
      diffCount: DEMO_KNOWLEDGE_DIFFS.length,
      affectedTemplateCount: impacts.length,
      safetySummary: 'No production playbook will be modified. Affected templates are marked Review Recommended only.',
    },
  ];
}

export function buildDemoKnowledgeUpdateReview(args: { templateName?: string; incidentType?: string } = {}): KnowledgeUpdateReview {
  const templateImpacts = buildDemoTemplateImpacts(args.templateName, args.incidentType);
  return {
    reviewId: 'review-demo-2026-05',
    generatedAt: now,
    mode: 'demo',
    sourceIds: ['mitre_attack_enterprise', 'sigma_hq', 'cisa_kev', 'lolbas'],
    status: 'review_required',
    summary: 'Demo knowledge check staged trusted-source updates and found templates that should be reviewed before refreshing local knowledge mappings.',
    diffItems: DEMO_KNOWLEDGE_DIFFS,
    templateImpacts,
    adminApprovalRequired: true,
    sourceHealth: buildDemoSourceHealth(),
    approvalQueue: buildDemoApprovalQueue(args.templateName, args.incidentType),
    versionTimeline: buildDemoTimeline(),
    sourceVersions: buildDemoSourceVersions(),
    globalKnowledgeSeparated: true,
    tenantLearningSeparated: true,
    safetyRules: [
      'No production playbook changes are applied by knowledge updates.',
      'Deprecated or revoked upstream objects are retained locally and marked for review instead of deleted.',
      'Global knowledge updates are separated from tenant-specific learning and runtime validation evidence.',
      'Admin approval is required before staged knowledge updates become active.',
      'Offline bundles must be verified before staging in restricted or air-gapped environments.',
    ],
    nextRecommendedAction: 'Review affected templates, approve selected knowledge updates, and keep tenant runtime validation separate from global knowledge changes.',
  };
}
