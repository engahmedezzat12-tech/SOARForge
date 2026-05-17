# SOARForge Admin Setup Guide

## Initial setup
1. Deploy SOARForge.
2. Configure database and secrets.
3. Create first Super Admin.
4. Create the first Tenant.
5. Invite Tenant Admin and SOC users.
6. Assign roles.
7. Configure proxy/offline update policy.
8. Configure FortiSOAR target tenant information.
9. Validate connector/action checklist.
10. Review audit logs.

## Roles
- Super Admin: platform-wide administration
- Tenant Admin: manage one tenant
- SOC Manager: approve validation and knowledge review
- SOC Engineer: build/export playbooks and record validation
- Viewer: read-only
- Auditor: audit/report access

## Security rules
- Do not share tenant data across workspaces.
- Do not promote tenant learning globally without review.
- Do not apply production playbook changes automatically from knowledge updates.
- Keep connector credentials in approved secret storage.
