ALTER TABLE "order_lines" ADD COLUMN "stockReserved" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "order_notifications" (
 "id" UUID NOT NULL,
 "orderId" UUID NOT NULL,
 "stage" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'queued',
 "attempts" INTEGER NOT NULL DEFAULT 0,
 "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "sentAt" TIMESTAMP(3),
 "lastError" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "order_notifications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "order_notifications_orderId_stage_key" ON "order_notifications"("orderId","stage");
CREATE INDEX "order_notifications_status_nextAttemptAt_idx" ON "order_notifications"("status","nextAttemptAt");
ALTER TABLE "order_notifications" ADD CONSTRAINT "order_notifications_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "shipping_jobs" (
 "id" UUID NOT NULL,
 "orderId" UUID NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'waiting_credentials',
 "attemptCount" INTEGER NOT NULL DEFAULT 0,
 "lastError" TEXT,
 "trackingNumber" TEXT,
 "labelPdf" BYTEA,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "shipping_jobs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "shipping_jobs_orderId_key" ON "shipping_jobs"("orderId");
CREATE INDEX "shipping_jobs_status_updatedAt_idx" ON "shipping_jobs"("status","updatedAt");
ALTER TABLE "shipping_jobs" ADD CONSTRAINT "shipping_jobs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
