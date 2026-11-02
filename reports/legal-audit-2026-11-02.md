# Ruby Hair - German shop legal readiness review (2 Nov 2026)

Internal technical/compliance review, not legal advice or merchant approval. The Vercel preview takes no orders or payments.

## Critical before selling

1. **Electronic withdrawal function - BGB 356a:** Since 19 June 2026, covered online consumer contracts require a permanently accessible, clearly labeled "Vertrag widerrufen" function, basic buyer and contract identification, a second "Widerruf bestätigen" step, and immediate electronic receipt on durable medium with time and contents. The current preview does not implement this flow. A working backend and receipt email are mandatory before real checkout.
2. **Paid-order button and total price - BGB 312j, EGBGB Art 246a:** A real checkout must clearly show accepted payment methods, restrictions, all applicable taxes and delivery charges, total price and unequivocal "zahlungspflichtig bestellen" button. Current checkout remains disabled HTTP 503.
3. **Refund of original standard delivery charges - BGB 357(2):** Normally required after statutory withdrawal. Only an upgrade beyond cheapest standard delivery is excluded. The old AGB and Widerrufsbelehrung conflict about this: do not copy the inconsistent clause.
4. **Consumer return address:** Old withdrawal page has unfinished phone/return-recipient placeholders; verify and complete legally required information and the model withdrawal form.
5. **Privacy:** Old Datenschutz responsible party address (Zweigertstrasse 8) conflicts with the Impressum (Klara Strasse 19). New hosting, network requests, server logs, future payment/SMTP processors and cancellation-function processing require a new accurate privacy statement.
6. **Business and tax:** Confirm Ruby Hair / Nazmi Bulganlar / Klara Strasse 19, Essen / info@rubyhair.de / VAT ID DE356097157 from old imprint, including official registration, tax status, and DDG 5 obligations. VAT ID does not prove which VAT treatment to use.
7. **Delivery/payment:** Source-labeled existing store facts: DHL Germany, EUR 4.99 shipping, up to five working days. Old homepage and AGB conflict on supported payments. Obtain the final new shop policy.
8. **Inventory:** 38 imported variations have no verified physical stock count. A real order must fail closed when stock is unknown; prevent overselling and fraudulent price input.

## Other review items

- EU ODR platform closed July 20, 2025; remove old dead link, review current dispute-resolution notices.
- BFSG accessibility e-commerce obligations: determine whether the microenterprise service exemption under BFSG 3(3) applies. Test keyboard navigation, screen-reader support and cancellation process.
- PAngV: correct final consumer prices, VAT treatment and delivery cost notice, and evaluate basic price requirements where applicable.
- Do not assume hair products are categorically excluded from statutory withdrawal on hygiene grounds without case-specific legal review.
- Existing layout loads external Google Fonts: verify actual data flows and decide whether to self-host.
- Final German Impressum, AGB, Datenschutz, Widerrufsbelehrung, shipping/tax/payment policies and model withdrawal form require legal review and merchant sign-off.

## Technical state

Local-only PostgreSQL test reservation service can create temporary test orders with a 15-minute hold, server-priced line snapshots, conditional atomic stock deduction, idempotency, cancellation and manual expiry restoration. It is not exposed as a public HTTP API and requires a loopback PostgreSQL and explicit test flag. The local test harness deletes its synthetic products, variations, orders and lines afterward. Real payment/SMTP/order confirmation are not implemented, nor automatic reservation-expiry scheduling.

The Vercel frontend still uses an imported read-only catalog without PostgreSQL and the public checkout POST returns HTTP 503. Old WordPress rubyhair.de, DNS and WebAltyapi remain unchanged.

## Official sources

- https://www.gesetze-im-internet.de/bgb/__356a.html
- https://www.gesetze-im-internet.de/bgb/__312j.html
- https://www.gesetze-im-internet.de/bgb/__355.html
- https://www.gesetze-im-internet.de/bgb/__357.html
- https://www.gesetze-im-internet.de/bgbeg/art_246a__1.html
- https://www.gesetze-im-internet.de/ddg/__5.html
- https://www.gesetze-im-internet.de/bfsg/__3.html
- https://www.gesetze-im-internet.de/pangv_2022/
- https://consumer-redress.ec.europa.eu/site-relocation_en

Earlier merchant-source discrepancy inventory: MERCHANT-APPROVAL.md.
