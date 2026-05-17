# SOARForge Intelligence Plus Patch

This patch upgrades the Hybrid Intelligence Engine with customer-facing depth and delivery features.

## Added

- Playbook Logic Analysis
- Action Risk Matrix
- Why This Is Not 100% Yet explanation
- Tenant Validation Checklist
- Suggested Validation Tests
- Detection Query Pack
- Connector Permission Advisor
- Platform Capability Notes
- Environment Profile Insight
- Compliance / Framework Alignment
- Ask SOARForge deterministic Q&A
- Customer Delivery Pack export
- Customer Delivery Pack manifest in the Full Deployment Package
- Knowledge Base versioning
- Improved score realism with Threat Coverage capped at 95 until runtime tenant validation is complete

## Safety Rules Preserved

- No production playbook is modified by the intelligence review
- Safe auto-hardening remains documentation/metadata/checklist oriented
- Destructive runtime logic still requires explicit human approval
- Tenant-specific learning remains isolated
- Optional AI/LLM layer stays disabled by default

## Build

Run:

```powershell
pnpm.cmd install
pnpm.cmd build
pnpm.cmd dev
```
