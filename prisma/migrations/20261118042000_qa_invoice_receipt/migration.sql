CREATE TABLE "invoices" (
 "id" UUID NOT NULL,
 "orderId" UUID NOT NULL,
 "invoiceNumber" TEXT NOT NULL,
 "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "seller" JSONB NOT NULL,
 "buyer" JSONB NOT NULL,
 "lines" JSONB NOT NULL,
 "taxRate" INTEGER NOT NULL,
 "taxCents" INTEGER NOT NULL,
 "totalCents" INTEGER NOT NULL,
 "pdf" BYTEA NOT NULL,
 CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "invoices_orderId_key" ON "invoices"("orderId");
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
