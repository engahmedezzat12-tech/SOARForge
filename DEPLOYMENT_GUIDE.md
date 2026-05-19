# SOARForge Deployment & Operations Guide

## 1. Overview

SOARForge is a protected SOAR playbook building and governance workspace.

It includes:

- Session-based authentication
- Role-based access control
- Tenant-scoped user management
- Invite-only sign-up
- Public account request workflow
- Admin approval and rejection workflow
- Password change and reset flows
- Security event monitoring
- Same-origin protection for sensitive POST APIs
- PostgreSQL-backed validation, audit, user, invite, and account request records

---

## 2. Main Routes

| Route | Purpose |
|---|---|
| `/sign-in` | Login page |
| `/request-access` | Public account request page |
| `/sign-up?token=...` | Invite-only account creation |
| `/app` | Main SOARForge workspace |
| `/admin` | Admin console |
| `/admin/users` | User management, account requests, and invite governance |
| `/admin/security` | Security checklist |
| `/admin/security-events` | Security event viewer |
| `/admin/validation` | Tenant validation center |
| `/account/security` | Change password |

---

## 3. Required Environment Variables

Create `.env.local` for local development.

Required values:

```env
DATABASE_URL="postgresql://..."
SOARFORGE_SESSION_SECRET="replace-with-long-random-secret"
SOARFORGE_ADMIN_PASSWORD="replace-with-temporary-bootstrap-password"

Optional values:

UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
SOARFORGE_REQUIRE_BUNDLE_SIGNATURE="false"
SOARFORGE_BUNDLE_PUBLIC_KEY_PEM=""

Important notes:

Do not commit .env or .env.local.
Use Vercel Environment Variables for Production and Preview.
SOARFORGE_SESSION_SECRET must be long and random.
DATABASE_URL should point to the Neon/PostgreSQL database.
4. Local Setup

Install dependencies:

pnpm.cmd install

Generate Prisma client:

pnpm.cmd prisma generate

Apply database migrations:

pnpm.cmd prisma migrate dev

Run local development server:

pnpm.cmd dev

Open:

http://localhost:3000/sign-in
5. Build Test

Before every deployment, run:

pnpm.cmd build

The build must pass before pushing or deploying.

6. Admin Bootstrap

To create or reset the main admin account locally:

pnpm.cmd tsx scripts/create-user.ts admin@soarforge.local "SOARForge Admin" "Ahmedd123@" TENANT_ADMIN

Then login with:

Email: admin@soarforge.local
Password: Ahmedd123@

After login, change the password from:

/account/security
7. User Management

Admins can open:

/admin/users

Available actions:

Create user directly
Assign RBAC role
Reset password
Enable user
Disable user
Force password change
Create invite link
Review account requests
Approve account requests
Reject account requests
Set invite expiry date
Revoke pending invites
8. Supported Roles
Role	Purpose
SUPER_ADMIN	Highest-level administration
TENANT_ADMIN	Tenant administration and user management
SOC_MANAGER	SOC management and review workflows
SOC_ENGINEER	Operational SOAR workspace usage
AUDITOR	Audit and review access
VIEWER	Limited read-only access
9. Account Request Flow
User opens:
/request-access
User submits:
Email
Name
Reason
Admin opens:
/admin/users
Admin reviews the Account Requests section.
Admin chooses:
Approve
Reject
On approval, admin selects:
Role
Expiry Date
System generates an invite link.
User opens:
/sign-up?token=...
User creates password and signs in.
10. Invite Governance

The /admin/users page includes invite tracking.

Status	Meaning
PENDING	Invite is still valid and not used
EXPIRED	Invite expiry date passed
USED / REVOKED	Invite was accepted or manually revoked

Admins can revoke pending invites.

11. Security Events

Security events are visible at:

/admin/security-events

Tracked examples:

Login success
Login failure
Logout
Permission denied
Rate limit hit
User created
User disabled
User role changed
Password reset
Password changed
Invite created
Invite accepted
Invite revoked
Account request created
Account request approved
Account request rejected
12. Security Controls

Implemented controls:

HttpOnly session cookies
Password hashing
Account lockout
Login throttling
RBAC permissions
Zod input validation
Tenant-scoped database queries
Same-origin POST protection
Security headers
Audit logging
Security event monitoring
Invite-only sign-up
Account request approval
Invite revocation
13. Vercel Deployment

Push to GitHub:

git add .
git commit -m "Update deployment documentation"
git push

Deploy production:

vercel.cmd --prod

After deployment, verify:

https://soar-forge.vercel.app/sign-in
https://soar-forge.vercel.app/app
https://soar-forge.vercel.app/admin
https://soar-forge.vercel.app/admin/users
https://soar-forge.vercel.app/admin/security
https://soar-forge.vercel.app/admin/security-events
14. Final Smoke Test

Before calling a version production-ready, test:

Admin login
Normal user login
Change password
Create user
Reset password
Disable user
Enable user
Change role
Create invite
Accept invite
Request access
Approve account request
Reject account request
Revoke invite
Open security events
Update validation result
Confirm access denied for low-privilege users
Confirm build passes
15. Operational Notes
Do not commit secrets.
Rotate the admin bootstrap password after first deployment.
Use Production and Preview environment variable separation in Vercel.
Review /admin/security-events after every test cycle.
Keep database migrations committed.
Run pnpm.cmd build before each deployment.