import type { KnowledgeApprovalQueueState } from './knowledge-update-types';

const ALLOWED_TRANSITIONS: Record<KnowledgeApprovalQueueState, KnowledgeApprovalQueueState[]> = {
  no_update: ['update_available'],
  update_available: ['staged', 'rejected'],
  staged: ['review_required', 'failed'],
  review_required: ['approved', 'partially_approved', 'rejected'],
  approved: ['applied', 'failed'],
  partially_approved: ['applied', 'rejected', 'failed'],
  rejected: ['rolled_back', 'no_update'],
  applied: ['rolled_back', 'no_update'],
  rolled_back: ['no_update'],
  failed: ['rolled_back', 'no_update'],
};

export function canTransitionKnowledgeUpdate(from: KnowledgeApprovalQueueState, to: KnowledgeApprovalQueueState): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionKnowledgeUpdate(from: KnowledgeApprovalQueueState, to: KnowledgeApprovalQueueState): KnowledgeApprovalQueueState {
  if (!canTransitionKnowledgeUpdate(from, to)) {
    throw new Error(`Invalid knowledge update transition: ${from} → ${to}`);
  }
  return to;
}

export function getAllowedKnowledgeTransitions(from: KnowledgeApprovalQueueState): KnowledgeApprovalQueueState[] {
  return ALLOWED_TRANSITIONS[from] ?? [];
}
