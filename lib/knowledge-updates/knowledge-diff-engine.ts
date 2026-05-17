import type { KnowledgeDiffItem, KnowledgeObjectIdentity } from './knowledge-update-types';

export function compareKnowledgeVersions(args: { sourceId: string; localVersion: string; remoteVersion?: string }): KnowledgeDiffItem[] {
  if (!args.remoteVersion || args.remoteVersion === args.localVersion) return [];
  return [{
    id: `${args.sourceId}-review-required`,
    sourceId: args.sourceId,
    type: 'modified',
    objectId: args.remoteVersion,
    objectType: 'unknown',
    title: 'Knowledge source version changed',
    summary: `Local version ${args.localVersion} differs from available version ${args.remoteVersion}.`,
    oldValue: args.localVersion,
    newValue: args.remoteVersion,
    affectedFields: ['version'],
    affectedIncidentTypes: [],
    affectedTemplates: [],
    recommendedAction: 'Review diff, assess template impact, and approve selected updates before changing local knowledge datasets.',
    impactLevel: 'medium',
    risk: 'medium',
    confidence: 'high',
    requiresApproval: true,
    safeToApply: true,
    customerFacingChange: 'A newer knowledge version is available for review.',
  }];
}

export function diffKnowledgeObjects(args: { sourceId: string; local: KnowledgeObjectIdentity[]; incoming: KnowledgeObjectIdentity[] }): KnowledgeDiffItem[] {
  const localById = new Map(args.local.map((item) => [item.objectId, item]));
  const incomingById = new Map(args.incoming.map((item) => [item.objectId, item]));
  const diffs: KnowledgeDiffItem[] = [];

  for (const incoming of args.incoming) {
    const local = localById.get(incoming.objectId);
    if (!local) {
      diffs.push({
        id: `${args.sourceId}-${incoming.objectId}-added`,
        sourceId: args.sourceId,
        type: 'added',
        objectId: incoming.objectId,
        objectType: incoming.objectType,
        title: `${incoming.name} added`,
        summary: `${incoming.name} is new in the incoming knowledge set.`,
        oldValue: null,
        newValue: incoming,
        affectedFields: ['object'],
        affectedIncidentTypes: [],
        affectedTemplates: [],
        recommendedAction: 'Review the object and map it to affected templates where relevant.',
        impactLevel: 'low',
        risk: 'low',
        confidence: 'medium',
        requiresApproval: true,
        safeToApply: true,
        customerFacingChange: 'New knowledge object available for review.',
      });
      continue;
    }

    const changedFields: string[] = [];
    if (local.name !== incoming.name) changedFields.push('name');
    if (local.version !== incoming.version) changedFields.push('version');
    if (local.modified !== incoming.modified) changedFields.push('modified');
    if (changedFields.length > 0) {
      diffs.push({
        id: `${args.sourceId}-${incoming.objectId}-modified`,
        sourceId: args.sourceId,
        type: 'modified',
        objectId: incoming.objectId,
        objectType: incoming.objectType,
        title: `${incoming.name} modified`,
        summary: `${incoming.name} changed in fields: ${changedFields.join(', ')}.`,
        oldValue: local,
        newValue: incoming,
        affectedFields: changedFields,
        affectedIncidentTypes: [],
        affectedTemplates: [],
        recommendedAction: 'Review affected template mappings before applying the knowledge update.',
        impactLevel: 'medium',
        risk: 'medium',
        confidence: 'high',
        requiresApproval: true,
        safeToApply: true,
        customerFacingChange: 'Existing knowledge object changed and should be reviewed.',
      });
    }
  }

  for (const local of args.local) {
    if (!incomingById.has(local.objectId)) {
      diffs.push({
        id: `${args.sourceId}-${local.objectId}-removed`,
        sourceId: args.sourceId,
        type: 'removed',
        objectId: local.objectId,
        objectType: local.objectType,
        title: `${local.name} no longer present upstream`,
        summary: `${local.name} is absent from the incoming source. SOARForge will mark it for review instead of deleting local mappings.`,
        oldValue: local,
        newValue: null,
        affectedFields: ['object'],
        affectedIncidentTypes: [],
        affectedTemplates: [],
        recommendedAction: 'Retain local record, mark deprecated/review recommended, and analyze template impact.',
        impactLevel: 'high',
        risk: 'high',
        confidence: 'medium',
        requiresApproval: true,
        safeToApply: false,
        customerFacingChange: 'Upstream removal detected. Local mappings are retained and marked for review.',
      });
    }
  }
  return diffs;
}
