// ============================================================
// SOARForge — Optional AI/LLM Assistant Boundary
// Read-only, validated, redacted. Not required for core intelligence.
// ============================================================

import type { LlmAssistantBoundary } from './intelligence-types';

export const DEFAULT_LLM_ASSISTANT_BOUNDARY: LlmAssistantBoundary = {
  enabled: false,
  mode: 'disabled',
  allowedTasks: [
    'Generate customer-facing summaries from deterministic findings',
    'Explain why a deterministic recommendation matters',
    'Translate technical recommendations into executive language',
    'Draft documentation improvements for human review',
  ],
  restrictedTasks: [
    'Modify production playbooks directly',
    'Execute connector actions',
    'Generate destructive automation without approval',
    'Bypass deterministic safety validation',
    'Use unredacted tenant secrets or customer data',
  ],
  redactionRequired: true,
  deterministicValidationRequired: true,
};

export function redactForLlm(input: string): string {
  return input
    .replace(/[A-Fa-f0-9]{32,}/g, '[REDACTED_HASH_OR_TOKEN]')
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[REDACTED_IP]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/\{\{CUSTOMER_[A-Z0-9_]+\}\}/g, '[REDACTED_TENANT_PLACEHOLDER]');
}
