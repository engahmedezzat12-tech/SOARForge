# SOARForge Phase 1-6 Production Foundation Patch

This patch adds the production foundation needed to move SOARForge from an impressive demo/pilot into a customer-sellable platform foundation.

## Phase 1 — Production Core
Added:
- Product core data contracts
- Tenant, user, playbook, export, validation, knowledge update, audit, and tenant-learning models
- Prisma PostgreSQL schema
- Admin Console `/admin`
- Demo-safe store adapter that can be replaced with Prisma/PostgreSQL

Files:
- `lib/product-core/types.ts`
- `lib/product-core/store.ts`
- `prisma/schema.prisma`
- `app/admin/page.tsx`

## Phase 2 — Validation Persistence
Added:
- Persistent validation result model
- Tenant runtime confidence calculation
- Validation API routes
- Admin validation center

Files:
- `app/api/validation-results/route.ts`
- `app/api/validation-results/update/route.ts`
- `app/admin/validation/page.tsx`

## Phase 3 — Secure API Foundation
Added:
- RBAC permission model
- Demo session/auth boundary
- Secure API helper
- Zod input validation schemas
- In-memory rate limiter adapter
- Audit helper

Files:
- `lib/product-core/rbac.ts`
- `lib/product-core/security.ts`
- `lib/product-core/input-validation.ts`
- `lib/product-core/rate-limit.ts`
- `lib/product-core/audit.ts`

## Phase 4 — Deployment Package
Added:
- Dockerfile
- docker-compose with PostgreSQL and Redis
- `.env.example`
- On-prem deployment guide
- Environment variables guide
- Backup/restore guide

Files:
- `Dockerfile`
- `docker-compose.yml`
- `.env.example`
- `docs/deployment/on-prem.md`
- `docs/deployment/environment-variables.md`
- `docs/operations/backup-restore.md`

## Phase 5 — Knowledge Update Production Foundation
Added:
- Knowledge update history model in product core
- Knowledge history API
- Audit-ready approval/update records
- Tenant/global separation model foundation

Files:
- `app/api/admin/knowledge-history/route.ts`
- `lib/product-core/types.ts`
- `lib/product-core/store.ts`

## Phase 6 — Product Packaging
Added:
- Admin setup guide
- User guide
- Demo script
- Pitch deck outline
- Pricing model draft
- License terms draft
- Support model draft
- Sample pack folders

Files:
- `docs/admin/admin-setup-guide.md`
- `docs/user/user-guide.md`
- `docs/sales/demo-script.md`
- `docs/sales/pitch-deck-outline.md`
- `docs/sales/pricing-model.md`
- `docs/sales/license-terms-draft.md`
- `docs/sales/support-model.md`
- `samples/*/README.md`

## Important production note
This patch intentionally avoids adding hard external runtime dependencies so the project continues to build on Vercel immediately. For customer production, enable PostgreSQL/Prisma by installing Prisma packages, applying `prisma/schema.prisma`, and replacing `lib/product-core/store.ts` with a Prisma-backed repository adapter.
