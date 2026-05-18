# SOARForge Security Test Plan

Run these checks before customer pilot and after every security hardening release.

## Authentication
- Open `/admin` without a session. Expected: redirect to `/sign-in`.
- Try wrong password 5 times. Expected: account lockout and `LOGIN_FAILURE`/`RATE_LIMIT_HIT` events.
- Sign out. Expected: session cookie revoked and `/admin` requires login again.

## RBAC
- Use a low-privilege user. Expected: `/admin/audit`, `/admin/security`, and update APIs deny access when permissions are missing.

## Protected APIs
- Call `/api/validation-results/update` without a session. Expected: `401 Unauthorized`.
- Call with a malformed payload. Expected: `422 Invalid payload`.
- Attempt to update a validation item from another tenant. Expected: `404` or `403` with no DB mutation.

## Rate Limits
- Repeat login and validation update requests above configured limits. Expected: `429 Too many requests` and security event.
- If Upstash env vars are configured, confirm limits remain consistent across redeploys/serverless invocations.

## Audit Integrity
- Open `/admin/audit`. Expected: Integrity Chain card shows `Valid` after new hash-chained logs.
- Call `/api/audit-logs/integrity`. Expected: `valid: true` unless legacy pre-hash logs exist.

## Offline Bundles
- Upload `.exe` or double-extension file. Expected: rejected.
- Upload `.json` that is not JSON. Expected: rejected by magic-byte/basic content check.
- Set `SOARFORGE_REQUIRE_BUNDLE_SIGNATURE=true` and upload without signature. Expected: rejected.

## Browser Security
- Confirm response headers include CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy.
- Run OWASP ZAP baseline against staging before paid production.
