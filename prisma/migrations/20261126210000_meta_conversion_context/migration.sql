CREATE TABLE "meta_conversion_contexts" (
 "orderId" UUID NOT NULL PRIMARY KEY,
 "consentHash" TEXT NOT NULL,
 "fbp" TEXT,
 "fbc" TEXT,
 "userAgent" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "status" TEXT NOT NULL DEFAULT 'pending',
 "attempts" INTEGER NOT NULL DEFAULT 0,
 "nextAttempt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "sentAt" TIMESTAMP(3)
);
CREATE INDEX "meta_conversion_contexts_consentHash_idx" ON "meta_conversion_contexts"("consentHash");
CREATE INDEX "meta_conversion_contexts_status_nextAttempt_idx" ON "meta_conversion_contexts"("status","nextAttempt");
