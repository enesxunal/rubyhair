-- Additive, nullable fulfillment details. Does not enable checkout or payment processing.
ALTER TABLE "orders"
  ADD COLUMN "trackingCarrier" TEXT,
  ADD COLUMN "trackingNumber" TEXT,
  ADD COLUMN "fulfillmentNote" TEXT,
  ADD COLUMN "shippedAt" TIMESTAMP(3),
  ADD COLUMN "deliveredAt" TIMESTAMP(3);
