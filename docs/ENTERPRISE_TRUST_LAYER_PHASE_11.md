# SOARForge Phase 11 — Enterprise Trust Layer

This release strengthens the Phase 8-10 hardening foundation with enterprise trust controls that are safe for pilot environments and ready for production expansion.

## Implemented

### 1. Hybrid Redis Rate Limiting
- `lib/security/rate-limit.ts` now uses Upstash Redis REST when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are present.
- Falls back to local in-memory limits when Redis is not configured.
- Existing API wrappers and sign-in route now await the limiter result.

### 2. Tamper-Evident Audit Hash Chain
- `AuditLog` has `previousHash`, `integrityHash`, and `integrityVersion` fields.
- New helper: `lib/product-core/audit-integrity.ts`.
- Validation updates and generic audit writes now create hash-chained audit logs.
- `/admin/audit` displays integrity status.
- `/api/audit-logs/integrity` returns a protected integrity check.

### 3. Secure Offline Bundle Verification
- File validation now checks extension, size, file name, and magic bytes.
- Optional detached RSA-SHA256 signature verification.
- Set `SOARFORGE_REQUIRE_BUNDLE_SIGNATURE=true` to require signatures.
- Staged bundle records include signature verification evidence.

### 4. Tenant/User Workspace Visibility
- Added `/admin/users` and `/admin/tenants`.
- Pages are RBAC-protected and tenant-scoped.
- Provides customer workspace isolation evidence for demos and pilots.

### 5. PostgreSQL RLS Readiness
- Added DBA-reviewed RLS template under `prisma/rls/`.
- RLS is intentionally not auto-enabled because it requires end-to-end staged tenant-context testing.

## Required Environment Variables

```env
DATABASE_URL=""
SOARFORGE_SESSION_SECRET=""
SOARFORGE_ADMIN_PASSWORD=""
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
SOARFORGE_REQUIRE_BUNDLE_SIGNATURE="false"
SOARFORGE_BUNDLE_PUBLIC_KEY_PEM=""
```

## Migration

```powershell
pnpm.cmd prisma migrate dev --name phase_11_enterprise_trust_layer
pnpm.cmd prisma generate
pnpm.cmd db:seed
pnpm.cmd build
```

## Production Notes

- Upstash Redis is recommended before paid production to make rate limits consistent across Vercel serverless instances.
- Enable required bundle signatures before accepting offline bundles from external parties.
- Enable PostgreSQL RLS only after staging tests confirm every Prisma path sets tenant context.
- WORM/S3 audit mirroring and enterprise SSO/MFA remain the next paid-production upgrades.
