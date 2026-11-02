-- Local-only testing support for atomic, temporary stock reservations.
-- Existing checkout stays HTTP 503; no public order API is added.
ALTER TABLE "orders"
  ADD COLUMN "testOnly" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reservationKey" TEXT,
  ADD COLUMN "requestDigest" TEXT,
  ADD COLUMN "reservationExpiresAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "orders_reservationKey_key" ON "orders"("reservationKey");
CREATE INDEX "orders_testOnly_status_reservationExpiresAt_idx"
  ON "orders"("testOnly", "status", "reservationExpiresAt");
