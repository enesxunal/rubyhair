# Ruby Hair – production cutover gates (17 November 2026)

**Current decision: NO-GO.** Keep `rubyhair.de` and its existing WordPress/WooCommerce checkout unchanged until all gates have verified evidence. Do not treat green unit tests or saved credentials as proof of a working sale.

## Read-only automated check

From the project root, run:

```sh
npm run preflight:live -- --env-file .vercel/rubyhair-admin-diagnostics.env
```

The script only prints counts and configuration field names, not credentials. No orders, money movement, DNS changes, inventory updates or other writes occur. A non-zero exit means the release is blocked. The local diagnostics file may be stale: verify the actual current Vercel production configuration separately.

## Hard release gates

- [ ] **Production database:** schema/migrations up to date; protected backup, restore test and admin login/roles verified.
- [ ] **Physical inventory:** WooCommerce stock / merchant's actual counts independently reconciled for all 38 active variants. `stockQuantity=null` means UNKNOWN, never assume zero or available. Confirm price and VAT treatment per variant.
- [ ] **Merchant checkout:** server-side totals (products, VAT, shipping, discounts), valid DE shipping address, enforce order idempotency, atomic inventory hold and expiration, final consumer rights/terms consent, payment failure recovery, no duplicate orders.
- [ ] **PayPal:** verified *new-site* REST credentials in encrypted vault, merchant account rights, sandbox create/approve/capture/refund, signed webhook verification and replay-safe processing; live smoke test only under merchant approval.
- [ ] **Klarna:** validate agreement and merchant credentials for direct Payments API (legacy shared secret is not automatically API Basic Auth), sandbox session/authorize/place order/capture/refund and duplicate webhook handling. Do not implement a second payment route for a WooPayments-managed method without verifying merchant rights.
- [ ] **DHL:** separate Developer API App credentials plus approved GKP/system user, EKP and complete `Abrechnungsnummer`; sandbox OAuth, label PDF, tracking and cancellation. If shipping is manual initially, document an explicit merchant-approved manual fulfillment procedure and test it before opening sales.
- [ ] **Email:** SMTP sender identity, order confirmation, payment failure, shipping/tracking notification, password recovery, SPF/DKIM/DMARC and delivery tests.
- [ ] **Legal / SEO:** approved Impressum, Datenschutz, AGB, Widerruf and shipping/return information; accurate final totals before binding order; old SEO URLs mapped to 301s; robots/sitemap/canonical/schema reviewed; no staging `noindex` accidentally retained.
- [ ] **Rollbackable backup:** complete IONOS WordPress files, uploads and database; test restoring a copy. Preserve original copies outside the production host.
- [ ] **Device QA:** 390/768/1440px checkout, guest/new user order, failed payment, refunded order, mobile menu, cart, account/admin, analytics consent and accessibility.
- [ ] **Production smoke:** Vercel production deploy READY, HTTPS and custom domain valid, functional order with signed payment capture and admin/tracking verification; archive test logs without personal secrets.

## Cutover protocol

1. Record IONOS DNS A/AAAA/CNAME/MX/TXT/CAA and domain registrar settings; keep MX/SPF/DKIM/DMARC and any unrelated subdomains unchanged.
2. Minimize TTL in advance if supported; take a fresh WordPress DB/files backup and check its integrity.
3. Freeze order/inventory writes for a short, merchant-approved switch window only **after** payment and DHL paths already pass. Reconcile all pending WooCommerce orders first.
4. Attach `rubyhair.de` and `www.rubyhair.de` to the verified Vercel deployment. Change only necessary A/AAAA/CNAME records, retain the old WordPress instance for rollback; avoid old and new checkouts both accepting payments without synchronization.
5. Verify HTTPS, canonical redirects, checkout, webhooks, order e-mail, merchant admin, GSC and server logs. Monitor payment/stock reconciliation through first real orders.
6. On a failed smoke test, stop new checkout, roll back domain records and verify WordPress order acceptance. Reconcile transactions created on either side before reopening.

**At this checkpoint:** 2 products / 38 active variants are in the new production database; 38 have unknown stock; no live credentials are saved in the new vault; checkout is deliberately HTTP 503; no full WordPress restore test or provider E2E is documented. `rubyhair.de` resolves to IONOS `217.160.0.102`, MX records are on IONOS. No DNS changes were made.
