import type { KnowledgeVersionSourceState, KnowledgeVersionTimelineEvent } from './knowledge-update-types';
import { KNOWLEDGE_SOURCE_REGISTRY } from './knowledge-source-registry';

export interface KnowledgeVersionState {
  threatKnowledge: string;
  platformCompatibility: string;
  recommendationRules: string;
  lastApprovedUpdate?: string;
  sources?: KnowledgeVersionSourceState[];
  timeline?: KnowledgeVersionTimelineEvent[];
}

export const DEFAULT_KNOWLEDGE_VERSION_STATE: KnowledgeVersionState = {
  threatKnowledge: '2026.05-local',
  platformCompatibility: '1.0',
  recommendationRules: '1.0',
  sources: KNOWLEDGE_SOURCE_REGISTRY.map((source) => ({
    sourceId: source.id,
    activeVersion: source.localVersion,
    rollbackPoint: `${source.localVersion}-rollback`,
  })),
  timeline: [],
};

export function markKnowledgeApproved(state: KnowledgeVersionState, approvedAt: string): KnowledgeVersionState {
  return {
    ...state,
    lastApprovedUpdate: approvedAt,
    timeline: [
      ...(state.timeline ?? []),
      { id: `approved-${approvedAt}`, timestamp: approvedAt, sourceId: 'global', state: 'approved', title: 'Knowledge update approved', description: 'Admin approved selected staged knowledge updates.', actor: 'admin' },
    ],
  };
}

export function createRollbackPoint(state: KnowledgeVersionState, sourceId: string, timestamp: string): KnowledgeVersionState {
  return {
    ...state,
    sources: (state.sources ?? []).map((source) => source.sourceId === sourceId ? { ...source, rollbackPoint: `${source.activeVersion}-${timestamp}` } : source),
  };
}
