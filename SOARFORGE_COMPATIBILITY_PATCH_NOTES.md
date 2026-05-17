# SOARForge Compatibility/Readiness Patch

Added:
- lib/evidence/evidence-types.ts
- lib/evidence/platform-evidence-registry.ts
- lib/evidence/unsafe-pattern-rules.ts
- lib/evidence/export-readiness-engine.ts
- components/export-readiness-panel.tsx

Updated:
- components/export-center.tsx

What changed:
- Added customer-facing Export Readiness panel.
- Added platform compatibility/readiness labels:
  - Format Validated
  - Platform Pattern Validated
  - Guided Build
  - Runtime Certified
- Added confidence score calculation.
- Added unsafe-action checks for isolation, disabling users, email deletion, firewall blocks, and destructive cloud actions.
- No GitHub/repository wording is displayed in the UI.

Note:
- Runtime Certified remains false until a real tenant/lab validation is performed.
