CREATE TABLE "withdrawal_requests" (
  "id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "contract" VARCHAR(160) NOT NULL,
  "email" VARCHAR(254) NOT NULL,
  "emailDigest" VARCHAR(64) NOT NULL,
  "ipDigest" VARCHAR(64),
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "acknowledgedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "withdrawal_requests_emailDigest_receivedAt_idx" ON "withdrawal_requests"("emailDigest","receivedAt");
CREATE INDEX "withdrawal_requests_ipDigest_receivedAt_idx" ON "withdrawal_requests"("ipDigest","receivedAt");
CREATE INDEX "withdrawal_requests_status_nextAttemptAt_idx" ON "withdrawal_requests"("status","nextAttemptAt");
