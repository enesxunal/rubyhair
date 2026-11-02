-- Add append-only history for test reservation lifecycle and future audited order state changes.
CREATE TABLE "order_status_events" (
  "id" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_status_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "order_status_events_orderId_createdAt_idx"
  ON "order_status_events"("orderId","createdAt");
ALTER TABLE "order_status_events"
  ADD CONSTRAINT "order_status_events_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Additional database-level guard against negative stock/price/quantity.
ALTER TABLE "variants" ADD CONSTRAINT "variants_stock_nonnegative"
  CHECK ("stockQuantity" IS NULL OR "stockQuantity" >= 0);
ALTER TABLE "variants" ADD CONSTRAINT "variants_price_positive"
  CHECK ("priceCents" > 0);
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_positive_quantity"
  CHECK ("quantity" > 0);
