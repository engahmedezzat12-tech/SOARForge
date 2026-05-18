-- SOARForge Phase 11 Enterprise Trust Layer
-- Adds tamper-evident audit hash fields and relationship constraints for bundle imports.

ALTER TABLE "AuditLog"
  ADD COLUMN IF NOT EXISTS "previousHash" TEXT,
  ADD COLUMN IF NOT EXISTS "integrityHash" TEXT,
  ADD COLUMN IF NOT EXISTS "integrityVersion" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_integrityHash_idx" ON "AuditLog"("tenantId", "integrityHash");

-- Add relations for offline bundle ownership if the previous hardening migration created a loose table.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OfflineBundleImport_tenantId_fkey'
  ) THEN
    ALTER TABLE "OfflineBundleImport"
      ADD CONSTRAINT "OfflineBundleImport_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OfflineBundleImport_uploadedById_fkey'
  ) THEN
    ALTER TABLE "OfflineBundleImport"
      ADD CONSTRAINT "OfflineBundleImport_uploadedById_fkey"
      FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
