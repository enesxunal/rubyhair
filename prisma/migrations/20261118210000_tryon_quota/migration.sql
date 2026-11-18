CREATE TABLE "tryon_quota_attempts" (
 "id" UUID NOT NULL,
 "ipDigest" VARCHAR(64) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "finishedAt" TIMESTAMP(3),
 CONSTRAINT "tryon_quota_attempts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "tryon_quota_attempts_ipDigest_createdAt_idx" ON "tryon_quota_attempts"("ipDigest","createdAt");
CREATE INDEX "tryon_quota_attempts_createdAt_idx" ON "tryon_quota_attempts"("createdAt");
CREATE INDEX "tryon_quota_attempts_finishedAt_expiresAt_idx" ON "tryon_quota_attempts"("finishedAt","expiresAt");
