CREATE TABLE "checkout_diagnostics" (
 "id" UUID NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "method" TEXT NOT NULL,
 "stage" TEXT NOT NULL,
 "code" TEXT NOT NULL,
 "origin" TEXT NOT NULL,
 "orderId" UUID,
 CONSTRAINT "checkout_diagnostics_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "checkout_diagnostics_createdAt_idx" ON "checkout_diagnostics"("createdAt");
CREATE INDEX "checkout_diagnostics_orderId_createdAt_idx" ON "checkout_diagnostics"("orderId","createdAt");
