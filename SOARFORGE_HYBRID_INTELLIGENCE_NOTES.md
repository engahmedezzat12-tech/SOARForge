# SOARForge Hybrid Intelligence Engine — Patch Notes

This patch adds a deterministic-first Hybrid Intelligence Engine to SOARForge.

## Added

### Intelligence Core
- `lib/intelligence/intelligence-types.ts`
- `lib/intelligence/playbook-context-builder.ts`
- `lib/intelligence/playbook-graph-analyzer.ts`
- `lib/intelligence/deterministic-reasoner.ts`
- `lib/intelligence/safety-validator.ts`
- `lib/intelligence/incident-brains.ts`
- `lib/intelligence/recommendation-engine.ts`
- `lib/intelligence/auto-hardening-planner.ts`
- `lib/intelligence/intelligence-score-engine.ts`
- `lib/intelligence/feedback-learning-engine.ts`
- `lib/intelligence/tenant-learning-profile.ts`
- `lib/intelligence/llm-assistant-boundary.ts`
- `lib/intelligence/intelligence-report-export.ts`
- `lib/intelligence/index.ts`

### UI
- `components/intelligence/intelligence-review-panel.tsx`
- `components/intelligence/recommendation-card.tsx`
- `components/intelligence/why-this-matters-drawer.tsx`
- `components/intelligence/apply-enhancement-preview.tsx`
- `components/intelligence/learning-feedback-panel.tsx`

### Export Center Integration
- Adds `SOARForge Intelligence Review` panel
- Adds `SOARForge Intelligence Review` downloadable Markdown report
- Adds intelligence review object into the full deployment package

## Intelligence Layers

1. Knowledge Layer — uses existing MITRE, D3FEND, detection logic, response recommendations, platform readiness, and threat coverage datasets.
2. Deterministic Reasoning Layer — analyzes playbook context, graph/dependency signals, safety risk, approval/rollback coverage, and tenant readiness.
3. Feedback & Learning Layer — provides safe tenant-specific feedback models without cross-tenant leakage.
4. Optional AI/LLM Boundary — disabled by default; documented as read-only/summary-only and never allowed to modify production playbooks directly.

## Safety Guarantees

- The intelligence engine does not modify production playbooks automatically.
- Safe auto-hardening is preview-only/documentation/metadata oriented.
- Destructive workflow changes remain restricted and require approval.
- Tenant validation warnings remain visible.
- LLM layer is only a future optional boundary and is disabled by default.
