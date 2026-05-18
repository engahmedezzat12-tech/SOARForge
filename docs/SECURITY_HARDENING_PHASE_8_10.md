# SOARForge Phase 8-10 Security Hardening

## Implemented scope

This package adds the Phase 8-10 security baseline for SOARForge:

- Phase 8: local secure authentication, HttpOnly sessions, RBAC, protected admin pages, protected API wrappers.
- Phase 9: security headers, rate limiting, tenant-scoped update guards, audit/security event expansion.
- Phase 10: secure offline bundle staging foundation, commercial security checklist, deployment hardening notes.

## Required environment variables

Create `.env.local` locally and add the same values in Vercel Project Settings → Environment Variables:

```env
DATABASE_URL="postgresql://..."
SOARFORGE_SESSION_SECRET="long-random-secret-at-least-32-characters"
SOARFORGE_ADMIN_PASSWORD="strong-demo-admin-password"
```

Optional future production adapter variables:

```env
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

Never commit `.env` or `.env.local`.

## Local setup

```powershell
pnpm.cmd install
pnpm.cmd prisma migrate dev --name phase_8_security_hardening
pnpm.cmd prisma generate
pnpm.cmd db:seed
pnpm.cmd build
pnpm.cmd dev
```

## Default admin

The seed creates or updates:

```text
admin@soarforge.local
```

The password comes from `SOARFORGE_ADMIN_PASSWORD`. No password is hardcoded in the repository.

## Test plan

1. Open `/admin` without login. Expected: redirect to `/sign-in`.
2. Sign in as `admin@soarforge.local` using `SOARFORGE_ADMIN_PASSWORD`.
3. Open `/admin`, `/admin/validation`, `/admin/audit`, `/admin/security`, `/admin/offline-bundles`.
4. Update a validation item and confirm runtime confidence changes.
5. Open `/admin/audit` and verify `VALIDATION_RESULT_UPDATED` exists.
6. Call `/api/validation-results` from an unauthenticated browser/session. Expected: `401 Unauthorized`.
7. Submit invalid validation payload. Expected: `422 Invalid payload`.
8. Try repeated failed login attempts. Expected: account lockout after 5 failures.
9. Upload a `.json` or `.zip` file in `/admin/offline-bundles`. Expected: staged only; no production apply.
10. Check response headers for CSP, HSTS, X-Frame-Options, and X-Content-Type-Options.

## Security notes

- The local rate limiter is a secure baseline for demos. Use Upstash Redis for paid production scale.
- PostgreSQL RLS is documented as an enterprise enhancement. Current code enforces tenant scoping at the API and query level.
- Offline bundle imports are staging-only. They do not modify production playbooks or knowledge stores.
- A stricter nonce-based CSP is planned for the enterprise SSO phase.

## Vercel checklist

- Add `DATABASE_URL`, `SOARFORGE_SESSION_SECRET`, and `SOARFORGE_ADMIN_PASSWORD` as Sensitive environment variables.
- Use Production and Preview environment separation.
- Enable Deployment Protection for non-production previews when sharing customer demos.
- Enable Vercel Firewall/WAF rules for obvious abusive traffic where available.
- Keep secrets out of `NEXT_PUBLIC_` variables.
- Deploy with `pnpm build` / project default build settings.
