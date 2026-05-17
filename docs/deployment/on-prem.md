# SOARForge On-Prem Deployment Guide

## Purpose
Deploy SOARForge as a private customer-hosted application with PostgreSQL, Redis, audit logging, tenant isolation, and controlled knowledge updates.

## Minimum components
- SOARForge web container
- PostgreSQL 16+
- Redis 7+ for rate limiting / queues / future approval workflow persistence
- HTTPS reverse proxy such as NGINX, F5, or customer load balancer
- Backup location for PostgreSQL dumps

## Quick start
```bash
cp .env.example .env
# edit DATABASE_URL, AUTH_SECRET, NEXTAUTH_URL

docker compose up -d --build
```

Open:
```text
http://localhost:3000
```

Admin console:
```text
/admin
```

## Production checklist
1. Replace demo AUTH_SECRET.
2. Use managed or customer PostgreSQL with backups.
3. Configure HTTPS.
4. Configure proxy variables if the environment is restricted.
5. Configure offline knowledge bundle verification public key.
6. Create the first admin user.
7. Confirm tenant isolation tests.
8. Confirm audit log retention.
9. Run non-production FortiSOAR import/UAT.
10. Enable production access only after customer sign-off.

## Proxy support
Use:
```env
HTTP_PROXY=http://proxy.customer.local:8080
HTTPS_PROXY=http://proxy.customer.local:8080
NO_PROXY=localhost,127.0.0.1,.customer.local
```

## Offline update bundles
For air-gapped environments, generate a signed bundle on an internet-connected staging host, transfer it to the customer environment, upload through the Knowledge Update Center, verify signature, stage diff, review impact, and approve selected items.

## Notes
The current implementation includes a no-dependency demo persistence adapter. For production, enable Prisma/PostgreSQL using `prisma/schema.prisma` and migrate the store adapter.
