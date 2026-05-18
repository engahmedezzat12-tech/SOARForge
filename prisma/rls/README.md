# SOARForge PostgreSQL RLS Readiness

The application now enforces tenant isolation in server-side code and uses tenant-scoped updates. For enterprise paid production, enable PostgreSQL Row-Level Security (RLS) after validating the `app.tenant_id` connection/session strategy in staging.

Do **not** enable RLS directly in production until the application path has been tested with the tenant context set for every DB transaction.

Use `enable-rls-template.sql` as a DBA-reviewed starting point.
