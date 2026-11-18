import {test} from "node:test";
import assert from "node:assert/strict";
import {qaInvoiceNumber,buildOneEuroInvoicePdf,QA_INVOICE_TAX_CENTS,RUBY_TEST_SELLER} from "../src/lib/qa-invoice";

test("test invoice number is unique per order, separate from old WooCommerce invoices",()=>{
 assert.equal(qaInvoiceNumber(BigInt(28),new Date("2026-11-18T10:00:00Z")),"RH-QA-2026-0000028");
 assert.notEqual(qaInvoiceNumber(BigInt(28),new Date("2026-11-18T10:00:00Z")),qaInvoiceNumber(BigInt(29),new Date("2026-11-18T10:00:00Z")));
 assert.equal(QA_INVOICE_TAX_CENTS,16);
});
test("a paid 1EUR invoice is a well-formed printable PDF with verified seller data",()=>{
 const pdf=buildOneEuroInvoicePdf({invoiceNumber:"RH-QA-2026-0000052",orderNumber:BigInt(52),issuedAt:new Date("2026-11-18T10:00:00Z"),buyerName:"Test Käufer",buyerEmail:"qa@example.de",captureId:"PAYPAL_CAPTURE_TEST123"});
 assert.equal(pdf.subarray(0,8).toString("latin1"),"%PDF-1.4");
 assert.match(pdf.toString("latin1"),/\/Type \/Page /);
 assert.match(pdf.toString("latin1"),/xref\n0 7\n/);
 assert.match(pdf.toString("latin1"),/%%EOF/);
 assert.equal(RUBY_TEST_SELLER.vatId,"DE356097157");
 assert.ok(pdf.byteLength>1800);
});
test("invoice builder rejects tampered invoice number or missing capture",()=>{
 assert.throws(()=>buildOneEuroInvoicePdf({invoiceNumber:"UNKNOWN",orderNumber:BigInt(1),issuedAt:new Date(),buyerName:"A",buyerEmail:"a@example.de",captureId:"CAPTURE_TEST1234"}));
 assert.throws(()=>buildOneEuroInvoicePdf({invoiceNumber:"RH-QA-2026-0000001",orderNumber:BigInt(1),issuedAt:new Date(),buyerName:"A",buyerEmail:"a@example.de",captureId:"bad"}));
});
