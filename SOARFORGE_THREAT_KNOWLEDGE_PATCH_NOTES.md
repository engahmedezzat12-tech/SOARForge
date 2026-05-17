# SOARForge Threat Knowledge Engine Patch Notes

## What was added

This patch adds Phase 1 of the Threat Knowledge & MITRE Coverage Engine:

- Static MITRE technique registry
- Incident-to-MITRE mapping library
- Defensive detection logic library
- D3FEND-inspired defensive countermeasure mappings
- Entity/data-source mapping hints using ECS/OCSF-style terminology
- Response recommendation mappings
- Safe synthetic test scenario library
- Threat knowledge update source registry (design-only, no automatic updates)
- Threat Coverage Analyzer
- Threat Coverage Panel in the Export Center
- Threat Coverage Report export option

## Customer-facing wording

The UI avoids alarming wording and uses professional labels:

- Threat Coverage
- Coverage Gap
- Recommended Enhancement
- Detection Coverage
- Defensive Countermeasures
- Review Recommended

## Safety model

The update checker dataset is designed for a future phase only. It follows:

Fetch -> Compare -> Propose -> Admin Approval

It does not auto-modify production playbooks.

## Files added

- lib/threat-knowledge/threat-knowledge-types.ts
- lib/threat-knowledge/mitre-technique-registry.ts
- lib/threat-knowledge/incident-mitre-mappings.ts
- lib/threat-knowledge/detection-logic-library.ts
- lib/threat-knowledge/defensive-countermeasure-mappings.ts
- lib/threat-knowledge/entity-data-source-mappings.ts
- lib/threat-knowledge/response-recommendation-mappings.ts
- lib/threat-knowledge/safe-test-scenario-library.ts
- lib/threat-knowledge/threat-knowledge-update-sources.ts
- lib/threat-knowledge/threat-coverage-analyzer.ts
- lib/threat-knowledge/index.ts
- components/threat-knowledge/threat-coverage-panel.tsx

## Files modified

- components/export-center.tsx

## Validation

A TypeScript transpilation syntax check was performed for the new/modified files.
A full `pnpm build` must be run locally because package dependencies are not installed in the sandbox.
