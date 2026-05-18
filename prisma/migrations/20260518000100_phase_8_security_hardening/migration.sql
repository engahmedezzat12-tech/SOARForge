-- Phase 8-10 security hardening migration

-- User security fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failedLoginCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastPasswordChangeAt" TIMESTAMP(3);

-- Session persistence
CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userAgent" TEXT,
  "ipAddress" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX IF NOT EXISTS "Session_tenantId_idx" ON "Session"("tenantId");
CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");

DO $$ BEGIN
  ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Session" ADD CONSTRAINT "Session_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Security event trail
CREATE TABLE IF NOT EXISTS "SecurityEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "userId" TEXT,
  "eventType" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'INFO',
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SecurityEvent_tenantId_idx" ON "SecurityEvent"("tenantId");
CREATE INDEX IF NOT EXISTS "SecurityEvent_userId_idx" ON "SecurityEvent"("userId");
CREATE INDEX IF NOT EXISTS "SecurityEvent_eventType_idx" ON "SecurityEvent"("eventType");
CREATE INDEX IF NOT EXISTS "SecurityEvent_createdAt_idx" ON "SecurityEvent"("createdAt");

-- Secure offline bundle staging
CREATE TABLE IF NOT EXISTS "OfflineBundleImport" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "uploadedById" TEXT,
  "fileName" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "fileHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'STAGED',
  "validationJson" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OfflineBundleImport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OfflineBundleImport_tenantId_idx" ON "OfflineBundleImport"("tenantId");
CREATE INDEX IF NOT EXISTS "OfflineBundleImport_status_idx" ON "OfflineBundleImport"("status");
CREATE INDEX IF NOT EXISTS "OfflineBundleImport_fileHash_idx" ON "OfflineBundleImport"("fileHash");

-- Query performance indexes
CREATE INDEX IF NOT EXISTS "ValidationResult_tenantId_status_idx" ON "ValidationResult"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "ValidationResult_tenantId_itemType_idx" ON "ValidationResult"("tenantId", "itemType");
CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_action_createdAt_idx" ON "AuditLog"("tenantId", "action", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "KnowledgeUpdate_tenantId_status_idx" ON "KnowledgeUpdate"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "KnowledgeUpdate_source_idx" ON "KnowledgeUpdate"("source");
