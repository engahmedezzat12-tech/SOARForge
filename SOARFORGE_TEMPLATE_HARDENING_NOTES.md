# SOARForge Template Hardening Patch

## What changed

This patch connects predefined templates directly to the Threat Knowledge Engine.

### Added
- `lib/threat-knowledge/template-hardening.ts`

### Modified
- `lib/template-utils.ts`
  - Auto-filled templates are now hardened using incident MITRE mappings, detection references, response recommendations, D3FEND countermeasures, false-positive checks, rollback actions, and safe test scenarios.
- `lib/threat-knowledge/threat-coverage-analyzer.ts`
  - Entity aliasing added for common fields like `source_ip` / `client_ip`, `target_url` / `uri`, `affected_host` / `hostname`.
  - Response coverage now evaluates scoring recommendations and fallback procedures, not only explicit action IDs.
- `lib/evidence/export-readiness-engine.ts`
  - Approval-covered risky actions are now warnings instead of hard blockers.
- `lib/threat-knowledge/index.ts`
  - Exports template hardening helpers.

## Customer-facing impact

Templates now load with stronger threat-informed metadata:
- Broader MITRE technique mapping.
- Detection references.
- Defensive countermeasure references.
- False-positive checks.
- Rollback guidance.
- Safe validation scenarios.
- Higher-quality Threat Coverage reports.

## Safety behavior

The hardening engine does not silently add destructive response actions. It only enriches metadata, documentation, testing guidance, approval guidance, and scoring MITRE coverage.
