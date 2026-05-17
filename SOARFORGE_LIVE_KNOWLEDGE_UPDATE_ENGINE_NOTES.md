# SOARForge Live Knowledge Update Engine — Patch Notes

## What was added

This patch adds the first implementation-ready Live Knowledge Update Engine layer on top of the Ultimate Intelligence Platform.

### New engine files

```text
lib/knowledge-updates/
  knowledge-update-types.ts
  knowledge-source-registry.ts
  knowledge-diff-engine.ts
  template-impact-analyzer.ts
  knowledge-version-manager.ts
  approval-state-machine.ts
  mock-update-data.ts
  data-separator.ts
  offline-bundle-manager.ts
  index.ts
```

### New UI files

```text
components/knowledge-updates/knowledge-update-center.tsx
```

### New API route foundations

```text
app/api/knowledge-updates/status/route.ts
app/api/knowledge-updates/check/route.ts
app/api/knowledge-updates/diff/route.ts
app/api/knowledge-updates/approve/route.ts
app/api/knowledge-updates/apply/route.ts
app/api/knowledge-updates/rollback/route.ts
app/api/knowledge-updates/history/route.ts
app/api/knowledge-updates/template-impact/route.ts
```

## Current mode

The engine currently runs in **demo-safe mode**. It does not fetch the internet during build and does not modify production playbooks. It stages representative MITRE/Sigma/CISA/LOLBAS-style updates, generates diffs, analyzes template impact, shows approval state, and exposes source health/timeline/offline-bundle flows.

## Safety boundaries

- No production playbook is modified automatically.
- Affected templates are marked Review Recommended only.
- Deprecated/revoked upstream objects are retained locally and flagged for review instead of deleted.
- Admin approval is required before staged knowledge changes become active.
- Global knowledge is separated from tenant-specific learning.
- Offline/air-gapped flows are represented through approved bundle staging.

## Integration points

The Live Knowledge Update Center is integrated into the Intelligence Center under the Knowledge Updates tab and into the Intelligence Review Markdown export. Customer Delivery Pack output now includes Live Knowledge Update Readiness and affected template impact.

## Future live fetchers

The architecture is ready for source-specific live fetchers:

- MITRE ATT&CK STIX/TAXII fetcher
- CISA KEV JSON fetcher
- SigmaHQ metadata fetcher
- LOLBAS metadata fetcher
- Atomic Red Team metadata fetcher
- Offline signed bundle importer

These should be implemented behind admin-controlled routes with proxy/offline support and audit logging.
