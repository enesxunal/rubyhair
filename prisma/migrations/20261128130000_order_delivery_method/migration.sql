ALTER TABLE "orders" ADD COLUMN "deliveryMethod" TEXT NOT NULL DEFAULT 'dhl';
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_method_check" CHECK ("deliveryMethod" IN ('dhl','pickup') AND ("deliveryMethod" <> 'pickup' OR "shippingCents" = 0));
