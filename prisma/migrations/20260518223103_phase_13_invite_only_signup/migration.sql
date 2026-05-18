-- CreateTable
CREATE TABLE "UserInvite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserInvite_tokenHash_key" ON "UserInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "UserInvite_tenantId_idx" ON "UserInvite"("tenantId");

-- CreateIndex
CREATE INDEX "UserInvite_email_idx" ON "UserInvite"("email");

-- CreateIndex
CREATE INDEX "UserInvite_expiresAt_idx" ON "UserInvite"("expiresAt");
