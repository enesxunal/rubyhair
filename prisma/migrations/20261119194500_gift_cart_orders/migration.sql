-- Additive association: existing independent gift purchases and orders remain unchanged.
ALTER TABLE "gift_purchases" ADD COLUMN "cartOrderId" UUID;
CREATE INDEX "gift_purchases_cartOrderId_idx" ON "gift_purchases"("cartOrderId");
ALTER TABLE "gift_purchases" ADD CONSTRAINT "gift_purchases_cartOrderId_fkey" FOREIGN KEY ("cartOrderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
