# SOARForge Ultimate Intelligence Platform Upgrade

## Purpose
This upgrade organizes the existing intelligence features into a customer-friendly Intelligence Center while preserving visible technical depth for analysts and engineers.

## Added / Enhanced

### Intelligence Center UX
- Tabbed experience: Overview, Recommendations, Validation Center, Threat & Detection, Knowledge Updates, Delivery Pack, Advanced.
- Executive snapshot with status, primary blocker, top priority fix, risk level, and knowledge base version.
- Visible analysis counts: MITRE techniques, detection references, connectors, actions, high-impact actions, approvals, and rollback references.
- Progressive disclosure so the main view stays clean while advanced analysis remains available.

### Visible Depth
- What SOARForge Analyzed section.
- SOARForge Analysis Trace.
- Intelligence Depth summary.
- Executive / Analyst / Engineer views.

### Knowledge Update Foundation
- Added `lib/knowledge-updates/` with source registry, diff model, template impact analyzer, and version manager.
- Knowledge Update Center foundation in Intelligence Review.
- Sources represented: MITRE ATT&CK, D3FEND, Sigma, CISA KEV, LOLBAS, Atomic Test References, Platform Capability Matrix, Connector Permission Models.

### Delivery and Trust
- Customer Delivery Pack now includes knowledge base and analysis visibility sections.
- Readiness remains separated from runtime certification.
- No production action is changed by the intelligence review.

## Safety Notes
- External knowledge updates are modeled as controlled review workflows.
- No production playbook is auto-modified by knowledge updates.
- Tenant-specific learning stays isolated and is not promoted globally without review.
- Optional AI/LLM remains consultative and disabled by default.
