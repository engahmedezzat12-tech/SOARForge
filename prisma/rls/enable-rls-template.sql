-- DBA-reviewed RLS template for future enterprise hardening.
-- Requires the app to set: SELECT set_config('app.tenant_id', '<tenant-id>', true)
-- inside every tenant-scoped transaction.

ALTER TABLE "Playbook" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ValidationResult" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Export" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OfflineBundleImport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantLearningProfile" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_playbook ON "Playbook";
CREATE POLICY tenant_isolation_playbook ON "Playbook"
  FOR ALL
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_validation ON "ValidationResult";
CREATE POLICY tenant_isolation_validation ON "ValidationResult"
  FOR ALL
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_export ON "Export";
CREATE POLICY tenant_isolation_export ON "Export"
  FOR ALL
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_audit ON "AuditLog";
CREATE POLICY tenant_isolation_audit ON "AuditLog"
  FOR ALL
  USING ("tenantId" IS NULL OR "tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" IS NULL OR "tenantId" = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_bundle ON "OfflineBundleImport";
CREATE POLICY tenant_isolation_bundle ON "OfflineBundleImport"
  FOR ALL
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_learning ON "TenantLearningProfile";
CREATE POLICY tenant_isolation_learning ON "TenantLearningProfile"
  FOR ALL
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
