CREATE TABLE "meta_measurement_consents" (
 "consentHash" TEXT NOT NULL PRIMARY KEY,
 "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "revokedAt" TIMESTAMP(3)
);
CREATE INDEX "meta_measurement_consents_expiresAt_idx" ON "meta_measurement_consents"("expiresAt");
