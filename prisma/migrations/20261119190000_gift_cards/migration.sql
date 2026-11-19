-- Gift tender does not change gross order totals.
ALTER TABLE "orders" ADD COLUMN "giftAppliedCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD CONSTRAINT "orders_gift_tender_limit" CHECK ("giftAppliedCents" >= 0 AND "giftAppliedCents" <= "totalCents");
-- New digital voucher tables; existing orders, payment events, invoices and inventory untouched.
CREATE TABLE "gift_purchases" (
 "id" UUID NOT NULL,
 "requestKey" UUID NOT NULL,
 "requestHash" CHAR(64) NOT NULL,
 "amountCents" INTEGER NOT NULL,
 "buyerEmail" VARCHAR(254) NOT NULL,
 "recipientEmail" VARCHAR(254),
 "recipientName" VARCHAR(80) NOT NULL,
 "senderName" VARCHAR(80),
 "message" VARCHAR(180),
 "theme" VARCHAR(20) NOT NULL DEFAULT 'classic',
 "delivery" VARCHAR(20) NOT NULL DEFAULT 'download',
 "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
 "provider" VARCHAR(20) NOT NULL DEFAULT 'paypal',
 "providerOrderId" VARCHAR(90),
 "providerCaptureId" VARCHAR(100),
 "capturedAt" TIMESTAMP(3),
 "buyerMailStatus" VARCHAR(20) NOT NULL DEFAULT 'queued',
 "recipientMailStatus" VARCHAR(20) NOT NULL DEFAULT 'queued',
 "buyerMailSentAt" TIMESTAMP(3),
 "recipientMailSentAt" TIMESTAMP(3),
 "mailAttempts" INTEGER NOT NULL DEFAULT 0,
 "nextMailAttempt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "gift_purchases_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "gift_purchases_amount_range" CHECK ("amountCents" BETWEEN 1000 AND 50000)
);
CREATE UNIQUE INDEX "gift_purchases_requestKey_key" ON "gift_purchases"("requestKey");
CREATE UNIQUE INDEX "gift_purchases_providerOrderId_key" ON "gift_purchases"("providerOrderId");
CREATE UNIQUE INDEX "gift_purchases_providerCaptureId_key" ON "gift_purchases"("providerCaptureId");
CREATE INDEX "gift_purchases_status_createdAt_idx" ON "gift_purchases"("status", "createdAt");
CREATE INDEX "gift_purchases_buyerMailStatus_nextMailAttempt_idx" ON "gift_purchases"("buyerMailStatus", "nextMailAttempt");
CREATE TABLE "gift_cards" (
 "id" UUID NOT NULL,
 "purchaseId" UUID NOT NULL,
 "codeHash" CHAR(64) NOT NULL,
 "codeCiphertext" TEXT NOT NULL,
 "codeIv" TEXT NOT NULL,
 "codeTag" TEXT NOT NULL,
 "faceCents" INTEGER NOT NULL,
 "balanceCents" INTEGER NOT NULL,
 "status" VARCHAR(20) NOT NULL DEFAULT 'active',
 "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "gift_cards_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "gift_cards_balance_range" CHECK ("balanceCents" >= 0 AND "balanceCents" <= "faceCents")
);
CREATE UNIQUE INDEX "gift_cards_purchaseId_key" ON "gift_cards"("purchaseId");
CREATE UNIQUE INDEX "gift_cards_codeHash_key" ON "gift_cards"("codeHash");
CREATE INDEX "gift_cards_status_issuedAt_idx" ON "gift_cards"("status", "issuedAt");
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "gift_purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "gift_redemptions" (
 "id" UUID NOT NULL,
 "cardId" UUID NOT NULL,
 "orderId" UUID NOT NULL,
 "amountCents" INTEGER NOT NULL,
 "state" VARCHAR(20) NOT NULL DEFAULT 'reserved',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "settledAt" TIMESTAMP(3),
 CONSTRAINT "gift_redemptions_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "gift_redemptions_positive" CHECK ("amountCents" > 0)
);
CREATE UNIQUE INDEX "gift_redemptions_orderId_key" ON "gift_redemptions"("orderId");
CREATE INDEX "gift_redemptions_cardId_state_idx" ON "gift_redemptions"("cardId", "state");
ALTER TABLE "gift_redemptions" ADD CONSTRAINT "gift_redemptions_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "gift_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
