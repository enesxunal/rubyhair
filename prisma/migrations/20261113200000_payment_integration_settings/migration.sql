-- Encrypted at rest; per-provider and per-environment credentials.
-- Never insert plaintext keys, generated values or third-party credentials into this migration.
CREATE TABLE "payment_integration_settings" (
  "id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "ciphertext" TEXT NOT NULL,
  "nonce" TEXT NOT NULL,
  "authTag" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_integration_settings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payment_integration_settings_provider_environment_field_key"
ON "payment_integration_settings"("provider", "environment", "field");
CREATE INDEX "payment_integration_settings_provider_environment_idx"
ON "payment_integration_settings"("provider", "environment");
