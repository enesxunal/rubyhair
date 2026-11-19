-- Add-only: no modifications to existing orders, invoices, payments or inventory.
CREATE TABLE "customer_accounts" (
 "id" UUID NOT NULL,
 "email" VARCHAR(254) NOT NULL,
 "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "customer_accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "customer_accounts_email_key" ON "customer_accounts"("email");
CREATE TABLE "customer_login_tokens" (
 "id" UUID NOT NULL,
 "email" VARCHAR(254) NOT NULL,
 "tokenHash" CHAR(64) NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "usedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "customer_login_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "customer_login_tokens_tokenHash_key" ON "customer_login_tokens"("tokenHash");
CREATE INDEX "customer_login_tokens_email_createdAt_idx" ON "customer_login_tokens"("email", "createdAt");
CREATE INDEX "customer_login_tokens_expiresAt_idx" ON "customer_login_tokens"("expiresAt");
CREATE TABLE "customer_sessions" (
 "id" UUID NOT NULL,
 "accountId" UUID NOT NULL,
 "tokenHash" CHAR(64) NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "revokedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "customer_sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "customer_sessions_tokenHash_key" ON "customer_sessions"("tokenHash");
CREATE INDEX "customer_sessions_accountId_expiresAt_idx" ON "customer_sessions"("accountId", "expiresAt");
CREATE INDEX "customer_sessions_expiresAt_idx" ON "customer_sessions"("expiresAt");
ALTER TABLE "customer_sessions" ADD CONSTRAINT "customer_sessions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "customer_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "customer_auth_rate_limits" (
 "key" CHAR(64) NOT NULL,
 "count" INTEGER NOT NULL DEFAULT 0,
 "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "customer_auth_rate_limits_pkey" PRIMARY KEY ("key")
);
