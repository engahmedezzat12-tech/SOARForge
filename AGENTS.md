# SOARForge Codex Instructions

SOARForge is a Next.js / TypeScript application for generating FortiSOAR playbook JSON, documentation, readiness checks, and deployment packages from a multi-step wizard.

## Rules

- Do not rewrite the whole app.
- Preserve the current UI unless a UI change is required.
- Prefer central state/model fixes over UI-only patches.
- Every wizard selection must affect Step 11 exports.
- No fake/static/demo-only export data unless clearly marked as demo.
- Run build/typecheck/lint before finishing.
- Summarize changed files and testing steps.

## Main Goal

Wizard selections from all steps must persist into Step 11 and appear consistently in:

- generated FortiSOAR playbook JSON
- documentation
- readiness checks
- connector checklist
- deployment profile
- implementation guide
- full deployment package
- project state export

## Acceptance Test

When the user selects AbuseIPDB and VirusTotal in Step 4 and selects response actions in Step 6, Step 11 exports must include those selections consistently in JSON, documentation, readiness checks, deployment profile, connector checklist, and full package.