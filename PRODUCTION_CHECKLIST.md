# SOARForge Production Checklist

## Pre-Deployment

- [ ] `pnpm.cmd build` passes locally
- [ ] GitHub Actions CI passes
- [ ] `.env` and `.env.local` are not committed
- [ ] Vercel Production environment variables are configured
- [ ] Database migrations are applied
- [ ] Prisma client is generated
- [ ] No temporary ZIP files are committed
- [ ] No secrets are exposed in client code

## Production Health

- [ ] `/api/health` returns healthy
- [ ] `/admin/system` opens for admin users
- [ ] Database status is connected
- [ ] Security events count is visible
- [ ] Audit records count is visible

## Authentication

- [ ] Admin can sign in
- [ ] Admin can sign out
- [ ] Invalid password is rejected
- [ ] Account lockout works after repeated failures
- [ ] Change password works
- [ ] Other sessions are revoked after password change

## RBAC

- [ ] `TENANT_ADMIN` can open `/admin`
- [ ] `TENANT_ADMIN` can open `/admin/users`
- [ ] `VIEWER` cannot open `/admin`
- [ ] `VIEWER` cannot open `/admin/users`
- [ ] `VIEWER` can only access allowed read-only pages
- [ ] Unauthorized access redirects to `/access-denied`

## User Management

- [ ] Admin can create user
- [ ] Admin can reset password
- [ ] Admin can change role
- [ ] Admin can disable user
- [ ] Admin can enable user
- [ ] Forced password change works

## Account Requests

- [ ] Public user can request access
- [ ] Admin can approve request
- [ ] Admin can reject request
- [ ] Admin can assign role during approval
- [ ] Admin can set invite expiry date
- [ ] Approved request generates invite link

## Invite Governance

- [ ] Admin can create invite
- [ ] Invite link opens sign-up page
- [ ] User can accept invite
- [ ] Used invite cannot be reused
- [ ] Expired invite is blocked
- [ ] Pending invite can be revoked
- [ ] Revoked invite cannot be used

## Security Monitoring

- [ ] `/admin/security-events` opens for authorized users
- [ ] Login success is recorded
- [ ] Login failure is recorded
- [ ] Account request created is recorded
- [ ] Account request approved is recorded
- [ ] Invite accepted is recorded
- [ ] Invite revoked is recorded
- [ ] Permission denied is recorded

## Admin Pages

- [ ] `/admin`
- [ ] `/admin/users`
- [ ] `/admin/security`
- [ ] `/admin/security-events`
- [ ] `/admin/system`
- [ ] `/admin/validation`
- [ ] `/admin/audit`
- [ ] `/admin/offline-bundles`

## Final Deployment

- [ ] Code pushed to GitHub
- [ ] GitHub Actions CI passed
- [ ] Vercel production deployment succeeded
- [ ] Production URL tested
- [ ] Final smoke test completed