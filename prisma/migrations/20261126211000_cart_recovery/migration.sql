CREATE TABLE "cart_recoveries" (
 "id" UUID NOT NULL PRIMARY KEY,
 "emailHash" TEXT NOT NULL UNIQUE,
 "ciphertext" TEXT NOT NULL,
 "nonce" TEXT NOT NULL,
 "authTag" TEXT NOT NULL,
 "lines" JSONB NOT NULL,
 "consentVersion" TEXT NOT NULL,
 "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "confirmedAt" TIMESTAMP(3),
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "nextReminderAt" TIMESTAMP(3),
 "sentCount" INTEGER NOT NULL DEFAULT 0,
 "status" TEXT NOT NULL DEFAULT 'unconfirmed'
);
CREATE INDEX "cart_recoveries_status_nextReminderAt_idx" ON "cart_recoveries"("status","nextReminderAt");
CREATE INDEX "cart_recoveries_expiresAt_idx" ON "cart_recoveries"("expiresAt");
