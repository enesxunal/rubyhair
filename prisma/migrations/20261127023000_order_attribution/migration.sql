CREATE TABLE "attribution_consents" (
 "id" CHAR(64) PRIMARY KEY, "first" JSONB NOT NULL, "last" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "attribution_consents_expiresAt_idx" ON "attribution_consents"("expiresAt");
CREATE TABLE "purchase_attributions" (
 "kind" TEXT NOT NULL, "purchaseId" UUID NOT NULL, "consentId" CHAR(64) NOT NULL,
 "first" JSONB NOT NULL, "last" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY ("kind","purchaseId"),
 CONSTRAINT "purchase_attributions_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "attribution_consents"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "purchase_attributions_kind_check" CHECK ("kind" IN ('order','gift'))
);
CREATE INDEX "purchase_attributions_consentId_idx" ON "purchase_attributions"("consentId");
