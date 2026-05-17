// ============================================================
// SOARForge — Intelligence Review Markdown Export
// ============================================================

import type { IntelligenceReviewResult } from './intelligence-types';

function line(label: string, value: string | number): string {
  return `**${label}:** ${value}`;
}

function suggestedImplementationSteps(title: string, category: string): string[] {
  const t = title.toLowerCase();
  if (t.includes('critical asset') || t.includes('domain controller')) {
    return [
      'Add a pre-containment decision step that checks asset criticality, domain controller status, backup-server role, and core application tags.',
      'Route critical assets to analyst approval instead of direct automatic containment.',
      'Record the decision reason in the case timeline and deployment checklist.',
    ];
  }
  if (t.includes('tenant validation') || category === 'tenant_validation' || category === 'connector_readiness') {
    return [
      'Replace connector placeholders with tenant connector UUIDs and validate operation names against installed connector versions.',
      'Run each enrichment and response action in a non-production tenant before enabling the playbook.',
      'Capture evidence of successful connector validation in the deployment checklist.',
    ];
  }
  if (t.includes('recovery validation')) {
    return [
      'Add a recovery validation checkpoint before final closure.',
      'Document backup availability, affected-host review, and recovery-owner sign-off.',
      'Keep the case open until recovery evidence is attached or referenced.',
    ];
  }
  if (t.includes('shared') || t.includes('cdn') || t.includes('network blocking')) {
    return [
      'Add ASN/CDN/cloud-provider lookup before permanent network blocking.',
      'Require approval when the target belongs to shared infrastructure or customer-owned cloud ranges.',
      'Prefer temporary containment or monitoring when business ownership cannot be confirmed.',
    ];
  }
  if (category === 'mitre_coverage' || category === 'detection_coverage') {
    return [
      'Add detection references and log-source prerequisites to the customer implementation guide.',
      'Link each detection reference to its mapped technique and expected evidence fields.',
      'Add false-positive tuning notes and safe validation scenarios.',
    ];
  }
  return [
    'Add the recommendation to the implementation guide and readiness checklist.',
    'Keep production execution unchanged until the customer approves any runtime behavior change.',
    'Capture the acceptance criteria in the deployment package.',
  ];
}

export function exportIntelligenceReviewMarkdown(result: IntelligenceReviewResult): string {
  const L: string[] = [];
  L.push(`# SOARForge Intelligence Review — ${result.context.playbookName}`);
  L.push('');
  L.push(line('Incident Type', result.context.incidentType));
  L.push(line('Target Platform', result.context.targetPlatform));
  L.push(line('Overall Intelligence Score', `${result.score.overall}%`));
  L.push(line('Status', result.status.replace(/_/g, ' ')));
  if (result.knowledgeBaseVersion) {
    L.push(line('Knowledge Base Version', `${result.knowledgeBaseVersion.threatKnowledge} / Platform ${result.knowledgeBaseVersion.platformCompatibility} / Rules ${result.knowledgeBaseVersion.recommendationRules}`));
  }
  L.push('');

  L.push('## Executive Summary');
  L.push(result.executiveSummary || result.summary);
  L.push('');

  L.push('## Intelligence Summary');
  L.push(result.summary);
  L.push('');

  L.push('## What SOARForge Understood');
  result.whatWasUnderstood.forEach((i) => L.push(`- ${i}`));
  L.push('');

  L.push('## Design Strengths');
  result.designStrengths.forEach((i) => L.push(`- ${i}`));
  L.push('');

  if (result.whatSoarForgeAnalyzed && result.whatSoarForgeAnalyzed.length) {
    L.push('## What SOARForge Analyzed');
    L.push('| Area | What Was Analyzed | Customer Value |');
    L.push('|---|---|---|');
    result.whatSoarForgeAnalyzed.forEach((i) => L.push(`| ${i.area} | ${i.analyzed} | ${i.customerValue} |`));
    L.push('');
  }

  if (result.intelligenceDepth && result.intelligenceDepth.length) {
    L.push('## Intelligence Depth');
    L.push('| Area | Level | Summary |');
    L.push('|---|---|---|');
    result.intelligenceDepth.forEach((i) => L.push(`| ${i.area} | ${i.level.replace(/_/g, ' ')} | ${i.summary} |`));
    L.push('');
  }

  if (result.playbookLogicAnalysis) {
    L.push('## Playbook Logic Analysis');
    L.push(result.playbookLogicAnalysis.summary);
    L.push('');
    L.push('### Detected Paths');
    result.playbookLogicAnalysis.detectedPaths.forEach((i) => L.push(`- ${i}`));
    L.push('');
    L.push('### Positive Observations');
    result.playbookLogicAnalysis.positiveObservations.forEach((i) => L.push(`- ${i}`));
    if (result.playbookLogicAnalysis.potentialConcerns.length) {
      L.push('');
      L.push('### Review Points');
      result.playbookLogicAnalysis.potentialConcerns.forEach((i) => L.push(`- ${i}`));
    }
    L.push('');
  }

  if (result.actionRiskMatrix && result.actionRiskMatrix.length) {
    L.push('## Action Risk Matrix');
    L.push('| Action | Risk | Required Guardrail | Rollback Path | Tenant Validation |');
    L.push('|---|---:|---|---|---|');
    result.actionRiskMatrix.forEach((a) => L.push(`| ${a.action} | ${a.riskLevel.replace(/_/g, ' ')} | ${a.requiredGuardrail} | ${a.rollbackPath} | ${a.tenantValidation} |`));
    L.push('');
  }

  if (result.whyNotPerfect && result.whyNotPerfect.length) {
    L.push('## Why This Is Not 100% Yet');
    result.whyNotPerfect.forEach((i) => L.push(`- ${i}`));
    L.push('');
  }

  L.push('## Recommended Enhancements');
  result.recommendations.slice(0, 12).forEach((r, idx) => {
    L.push(`### ${idx + 1}. ${r.title}`);
    L.push(`- Severity: ${r.severity}`);
    L.push(`- Confidence: ${r.confidence.replace(/_/g, ' ')}`);
    L.push(`- Observed: ${r.observed}`);
    L.push(`- Recommendation: ${r.customerFacingText}`);
    L.push(`- Why this matters: ${r.whyItMatters}`);
    L.push(`- Suggested change: ${r.suggestedChange}`);
    L.push(`- Expected benefit: ${r.expectedBenefit}`);
    L.push(`- Safety impact: ${r.safetyImpact}`);
    L.push(`- Tenant validation required: ${r.tenantValidationRequired ? 'Yes' : 'No'}`);
    if (r.evidence.length) {
      L.push('- Evidence basis:');
      r.evidence.forEach((e) => L.push(`  - ${e.label}: ${e.detail}`));
    }
    L.push('- Suggested implementation:');
    suggestedImplementationSteps(r.title, r.category).forEach((step) => L.push(`  - ${step}`));
    L.push('');
  });
  if (result.recommendations.length === 0) L.push('- No immediate enhancements recommended.');
  L.push('');

  if (result.tenantValidationChecklist && result.tenantValidationChecklist.length) {
    L.push('## Tenant Validation Checklist');
    L.push('| Item | Status | Owner | Validation Evidence |');
    L.push('|---|---|---|---|');
    result.tenantValidationChecklist.forEach((i) => L.push(`| ${i.label} | ${i.status} | ${i.owner} | ${i.validationEvidence} |`));
    L.push('');
  }

  if (result.testCaseRecommendations && result.testCaseRecommendations.length) {
    L.push('## Suggested Validation Tests');
    L.push('| Scenario | Expected Path | Evidence | Approval | Rollback |');
    L.push('|---|---|---|---|---|');
    result.testCaseRecommendations.forEach((t) => L.push(`| ${t.scenario} | ${t.expectedPath} | ${t.expectedEvidence.join(', ')} | ${t.approvalExpected ? 'Yes' : 'No'} | ${t.rollbackExpected ? 'Yes' : 'No'} |`));
    L.push('');
  }

  if (result.detectionQueryPack && result.detectionQueryPack.length) {
    L.push('## Detection Query Pack');
    result.detectionQueryPack.forEach((d, idx) => {
      L.push(`### ${idx + 1}. ${d.name}`);
      L.push(`- Log source: ${d.logSource}`);
      L.push(`- Required fields: ${d.requiredFields.join(', ')}`);
      L.push(`- Sigma idea: ${d.sigmaIdea}`);
      L.push(`- KQL hint: ${d.kqlHint}`);
      L.push(`- SPL hint: ${d.splHint}`);
      L.push(`- False-positive filters: ${d.falsePositiveFilters.join(', ')}`);
      L.push('');
    });
  }

  if (result.connectorPermissionAdvisor && result.connectorPermissionAdvisor.length) {
    L.push('## Connector Permission Advisor');
    result.connectorPermissionAdvisor.forEach((c) => {
      L.push(`### ${c.connector}`);
      L.push(`- Category: ${c.category}`);
      L.push(`- Required permissions: ${c.requiredPermissions.join('; ')}`);
      L.push(`- Validation method: ${c.validationMethod}`);
      L.push(`- Common failure modes: ${c.commonFailureModes.join('; ')}`);
      L.push('');
    });
  }

  if (result.platformCapabilityWarnings && result.platformCapabilityWarnings.length) {
    L.push('## Platform Capability Notes');
    result.platformCapabilityWarnings.forEach((p) => L.push(`- **${p.platform} — ${p.capability}:** ${p.warning} ${p.recommendation}`));
    L.push('');
  }

  if (result.environmentProfile && result.environmentProfile.length) {
    L.push('## Environment Profile Insight');
    result.environmentProfile.forEach((e) => L.push(`- ${e.observed ? 'Observed' : 'Recommended'} — ${e.capability}: ${e.recommendation}`));
    L.push('');
  }

  if (result.complianceMapping && result.complianceMapping.length) {
    L.push('## Compliance / Framework Alignment');
    result.complianceMapping.forEach((c) => L.push(`- **${c.framework} — ${c.control}:** ${c.alignment}`));
    L.push('');
  }

  if (result.askSoarForge && result.askSoarForge.length) {
    L.push('## Ask SOARForge');
    result.askSoarForge.forEach((qa) => {
      L.push(`### ${qa.question}`);
      L.push(qa.answer);
      L.push('');
    });
  }

  L.push('## Executive Interpretation');
  L.push(result.executiveSummary || result.summary);
  L.push('');

  L.push('## Safety Guardrails');
  result.safetyGuardrails.forEach((i) => L.push(`- ${i}`));
  L.push('');

  L.push('## Safe Auto-Hardening Patch Plan');
  result.autoHardeningPlan.forEach((p, idx) => {
    L.push(`### ${idx + 1}. ${p.title}`);
    L.push(`- Patch status: ${p.safeToApply ? 'Safe documentation/metadata patch' : 'Review required'}`);
    L.push(`- Affected output: ${p.affectedOutput.replace(/_/g, ' ')}`);
    L.push(`- Dry-run preview: ${p.preview}`);
    L.push('');
  });
  if (result.autoHardeningPlan.length === 0) L.push('- No safe auto-hardening patch available.');
  L.push('');

  L.push('## Trust Score Breakdown');
  L.push(`- Best-Practice Alignment: ${result.score.bestPracticeAlignment}%`);
  L.push(`- Threat Coverage: ${result.score.threatCoverage}%`);
  L.push(`- Detection Coverage: ${result.score.detectionCoverage}%`);
  L.push(`- Response Safety: ${result.score.responseSafety}%`);
  L.push(`- Platform Readiness: ${result.score.platformReadiness}%`);
  L.push(`- Documentation Quality: ${result.score.documentationQuality}%`);
  L.push(`- Test Coverage: ${result.score.testCoverage}%`);
  if (result.score.appliedCaps.length > 0) {
    L.push('');
    L.push('## Score Transparency');
    result.score.appliedCaps.forEach((cap) => L.push(`- ${cap}`));
  }
  L.push('');

  if (result.customerDeliveryPackManifest && result.customerDeliveryPackManifest.length) {
    L.push('## Customer Delivery Pack Manifest');
    result.customerDeliveryPackManifest.forEach((i) => L.push(`- ${i.included ? 'Included' : 'Pending'} — ${i.file}: ${i.purpose}`));
    L.push('');
  }

  if (result.knowledgeSources && result.knowledgeSources.length) {
    L.push('## Security Knowledge Base');
    L.push('| Source | Purpose | Status | Version | Update Mode |');
    L.push('|---|---|---|---|---|');
    result.knowledgeSources.forEach((k) => L.push(`| ${k.source} | ${k.purpose} | ${k.status.replace(/_/g, ' ')} | ${k.version} | ${k.updateMode.replace(/_/g, ' ')} |`));
    L.push('');
  }

  if (result.knowledgeUpdateInsight) {
    L.push('## Knowledge Update Center');
    L.push(`- Status: ${result.knowledgeUpdateInsight.status.replace(/_/g, ' ')}`);
    L.push(`- Summary: ${result.knowledgeUpdateInsight.summary}`);
    L.push(`- Affected templates: ${result.knowledgeUpdateInsight.affectedTemplates.join(', ') || 'None identified'}`);
    L.push(`- Recommended action: ${result.knowledgeUpdateInsight.recommendedAction}`);
    L.push('');
  }

  if (result.liveKnowledgeUpdateReview) {
    const review = result.liveKnowledgeUpdateReview;
    L.push('## Live Knowledge Update Center');
    L.push(`- Status: ${review.status.replace(/_/g, ' ')}`);
    L.push(`- Mode: ${review.mode.replace(/_/g, ' ')}`);
    L.push(`- Diff items staged: ${review.diffItems.length}`);
    L.push(`- Affected templates: ${review.templateImpacts.length}`);
    L.push(`- Admin approval required: ${review.adminApprovalRequired ? 'Yes' : 'No'}`);
    L.push(`- Next recommended action: ${review.nextRecommendedAction}`);
    L.push('');

    L.push('### Knowledge Source Health');
    L.push('| Source | Status | Local Version | Latest / Staged | Mode |');
    L.push('|---|---|---|---|---|');
    review.sourceHealth.forEach((s) => L.push(`| ${s.displayName} | ${s.status.replace(/_/g, ' ')} | ${s.localVersion} | ${s.latestKnownVersion ?? 'Not checked'} | ${s.mode.replace(/_/g, ' ')} |`));
    L.push('');

    L.push('### Review Recommended Template Impact');
    L.push('| Template | Impact | Reason | Recommended Action |');
    L.push('|---|---|---|---|');
    review.templateImpacts.forEach((i) => L.push(`| ${i.templateName} | ${i.impact.replace(/_/g, ' ')} | ${i.reason} | ${i.recommendedAction} |`));
    L.push('');

    L.push('### Staged Knowledge Diff Summary');
    review.diffItems.slice(0, 8).forEach((d, idx) => {
      L.push(`${idx + 1}. **${d.title}** — ${d.type.replace(/_/g, ' ')} / ${d.impactLevel.replace(/_/g, ' ')} impact`);
      L.push(`   - Object: ${d.objectId}`);
      L.push(`   - Customer wording: ${d.customerFacingChange}`);
      L.push(`   - Recommended action: ${d.recommendedAction}`);
    });
    L.push('');

    L.push('### Knowledge Update Safety Rules');
    review.safetyRules.forEach((rule) => L.push(`- ${rule}`));
    L.push('');
  }

  if (result.analysisTrace && result.analysisTrace.length) {
    L.push('## SOARForge Analysis Trace');
    result.analysisTrace.forEach((t) => L.push(`${t.step}. **${t.label}** (${t.layer.replace(/_/g, ' ')}): ${t.detail}`));
    L.push('');
  }

  if (result.intelligenceViews && result.intelligenceViews.length) {
    L.push('## Executive / Analyst / Engineer Views');
    result.intelligenceViews.forEach((v) => {
      L.push(`### ${v.title}`);
      L.push(`- Focus: ${v.focus}`);
      L.push(`- Summary: ${v.summary}`);
      v.keyPoints.forEach((k) => L.push(`  - ${k}`));
      L.push('');
    });
  }

  L.push('## Tenant Learning Notes');
  result.tenantLearningNotes.forEach((i) => L.push(`- ${i}`));
  L.push('');

  L.push('## AI/LLM Boundary');
  L.push('- Optional AI assistance is disabled by default and cannot modify production playbooks.');
  L.push('- All AI-assisted summaries must be validated by deterministic findings and safety guardrails.');
  L.push('- No production action is changed by this review.');
  return L.join('\n');
}
