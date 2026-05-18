# Vercel Hardening Checklist

## Before Customer Demo
- `DATABASE_URL`, `SOARFORGE_SESSION_SECRET`, and `SOARFORGE_ADMIN_PASSWORD` configured as Sensitive variables.
- No secret starts with `NEXT_PUBLIC_`.
- Production deployment uses `pnpm build`.
- Custom domain and HTTPS enabled if presenting externally.

## Before Pilot
- Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for centralized rate limiting.
- Enable Deployment Protection for preview deployments.
- Review Vercel Firewall / WAF rules for Tor/proxy/country risk if applicable.
- Confirm logs do not contain secrets, passwords, or connector credentials.

## Before Paid Production
- Configure managed SSO/MFA.
- Enable audit export/WORM storage.
- Enable RLS after staging tenant-context tests.
- Run OWASP ZAP baseline and dependency scans.
- Document backup/restore and incident response process.
