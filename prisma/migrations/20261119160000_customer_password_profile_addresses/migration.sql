-- Add-only evolution. Guest orders, payment events, invoices and existing sessions are retained.
ALTER TABLE "customer_accounts" ADD COLUMN "firstName" VARCHAR(80), ADD COLUMN "lastName" VARCHAR(80), ADD COLUMN "passwordHash" VARCHAR(255);
CREATE TABLE "customer_addresses" (
 "id" UUID NOT NULL,
 "accountId" UUID NOT NULL,
 "label" VARCHAR(40) NOT NULL,
 "firstName" VARCHAR(80) NOT NULL,
 "lastName" VARCHAR(80) NOT NULL,
 "street" VARCHAR(160) NOT NULL,
 "postalCode" VARCHAR(5) NOT NULL,
 "city" VARCHAR(100) NOT NULL,
 "country" VARCHAR(2) NOT NULL DEFAULT 'DE',
 "isDefault" BOOLEAN NOT NULL DEFAULT false,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "customer_addresses_accountId_createdAt_idx" ON "customer_addresses"("accountId", "createdAt");
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "customer_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
