# SOARForge Backup and Restore

## PostgreSQL backup
```bash
pg_dump "$DATABASE_URL" > soarforge-$(date +%F).sql
```

## PostgreSQL restore
```bash
psql "$DATABASE_URL" < soarforge-YYYY-MM-DD.sql
```

## Recommended policy
- Daily encrypted backup
- 30-day retention minimum
- Store backups outside the application host
- Test restore quarterly
- Record restore tests in audit evidence

## What to back up
- Tenants
- Users and roles
- Playbooks and exports
- Validation results
- Knowledge update history
- Audit logs
- Tenant learning profile

## What not to back up in plain text
- Connector secrets
- API tokens
- Offline bundle private signing keys
