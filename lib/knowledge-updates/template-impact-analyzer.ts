import type { KnowledgeDiffItem, TemplateImpactResult } from './knowledge-update-types';

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function impactRank(value: TemplateImpactResult['impact']): number {
  return { none: 0, low: 1, medium: 2, high: 3, critical: 4 }[value];
}

export function analyzeTemplateImpact(templateName: string, diffs: KnowledgeDiffItem[]): TemplateImpactResult {
  const relevant = diffs.filter((d) => d.affectedTemplates.includes(templateName) || d.affectedTemplates.length === 0);
  if (relevant.length === 0) {
    return {
      templateId: slug(templateName),
      templateName,
      impact: 'none',
      reason: 'No relevant knowledge update impact detected.',
      affectedTechniques: [],
      affectedDetectionReferences: [],
      affectedResponseRecommendations: [],
      recommendedAction: 'No action required.',
      reviewRecommended: false,
    };
  }
  const impact = relevant.reduce<TemplateImpactResult['impact']>((current, diff) => {
    const next = diff.impactLevel;
    return impactRank(next) > impactRank(current) ? next : current;
  }, 'low');

  return {
    templateId: slug(templateName),
    templateName,
    impact,
    reason: `${relevant.length} knowledge update item(s) intersect with this template or require broad review.`,
    affectedTechniques: relevant.map((d) => d.objectId).filter((id) => /^T\d/.test(id)),
    affectedDetectionReferences: relevant.filter((d) => d.objectType === 'detection_rule').map((d) => d.title),
    affectedResponseRecommendations: relevant.map((d) => d.recommendedAction),
    recommendedAction: 'Mark this template as Review Recommended until mappings, detections, documentation, and customer delivery outputs are reviewed.',
    reviewRecommended: true,
    customerExportNote: 'Knowledge update impact detected. Customer exports should show Review Recommended until an admin approves the update.',
  };
}

export function analyzeTemplateImpacts(templateNames: string[], diffs: KnowledgeDiffItem[]): TemplateImpactResult[] {
  const results = templateNames.map((name) => analyzeTemplateImpact(name, diffs));
  return results.filter((result) => result.impact !== 'none');
}
