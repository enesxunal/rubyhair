# Ruby Hair – Coming Soon domain and safe go-live staging

Customer request on 17 Nov 2026: show a professional logo-bearing Coming Soon page to public visitors at `rubyhair.de` and `www.rubyhair.de`, while continuing private/preview tests of the unfinished shop; later test a 1 EUR test order and automatically generate a proper invoice for each real paid order.

## Implemented now
- Branded, German, responsive holding page in `src/lib/coming-soon-page.ts`: official Ruby Hair white logo, approved brunette hero photo, Instagram and `info@rubyhair.de` contact link; no forms or tracking.
- The public holding domains are gated in `proxy.ts`: every GET/HEAD visitor URL returns HTTP 503 + Retry-After with no-store page; checkout and other POST requests are rejected HTTP 503. Only static holding logo and approved photo are served. No URL or cookie bypass exists. Use a temporary 503 (instead of permanent redirect or indexing the holding page) to minimize SEO harm during short maintenance.
- Separate `rubyhair.vercel.app` testing domain retains the entire shop/admin preview for API and UI checks. Checkout is still intentionally 503, and customers cannot pay.
- This only affects the domain *after* its DNS and Vercel domain binding point to the new deployment. Do not claim the live public domain was cut over without externally verifying actual DNS/TLS/HTTP.

## Current Vercel binding and DNS (17 Nov 2026, 22:45–22:50 Berlin)
- `rubyhair.de` and `www.rubyhair.de` were successfully added to Vercel project `enesxunals-projects/rubyhair`; Production deployment `a366264` READY and branded holding page `https://rubyhair.vercel.app/coming-soon` HTTP 503.
- **Cutover not performed**: IONOS domains management redirects to a login screen, so the existing DNS remains active. The old shop is still serving on `rubyhair.de` and `www.rubyhair.de`.
- Before editing, authoritative DNS snapshot: root `A=217.160.0.102`; root `AAAA=2001:8d8:100f:f000::200` (important: this must also be removed); `www` resolves to old `217.160.0.102`; MX `mx00.ionos.de`, `mx01.ionos.de` (priority 10). Nameservers remain IONOS.
- Vercel domain verification gave the following *project-specific* record changes for IONOS DNS: remove root old A/AAAA, set root two `A @ -> 216.150.1.1` and `A @ -> 216.150.16.1`; remove existing `www` A/AAAA, set `CNAME www -> a4b3dcbe107a9cc0.vercel-dns-016.com.`. **Do not change** IONOS NS, MX, SPF, DKIM, DMARC, or unrelated TXT/CNAME records.
- Once IONOS account authentication is available: capture latest WordPress database AND complete webspace backup / restore point; edit DNS; verify Vercel domain status, HTTPS certificate, actual `https://rubyhair.de` and `https://www.rubyhair.de` return the **branded HTTP 503 page**, logo/photo HTTP 200, and customer POST is blocked; ensure `rubyhair.vercel.app` stays full preview, checkout still locked. Keep rollback A/AAAA and WordPress hosting available.

## Requirements before public domain DNS cutover
1. Preserve IONOS DNS/MX/TXT/CNAME mail records; change only required web A/AAAA/CNAME records. Confirm domain registrar login and current records. Keep old WordPress webspace and SQL/database available for rollback. Take portable current backup of WordPress uploads, themes, plugins, configs, DB, or verify accessible restore point.
2. Verify production Vercel deploy Ready and browser 390px/1280px holding visuals; confirm HTTP 503 body on *both* bound web hostnames, and preview app still works. Verify official logo and brunette asset HTTP 200 on bound domain.
3. Check SSL issuance, canonical behavior and old shop fallback. Record pre-switch A = 217.160.0.102, NS ui-dns, and IONOS mail MX as at 17 Nov. Do not change NS.
4. After switching DNS, tell merchant public orders are deliberately paused until checkout is fully tested and activated.

## Invoice-on-order acceptance gate (not implemented yet)
- A legally valid German invoice must be generated **only after confirmed payment** (or legally applicable invoicing milestone), with unique sequential invoice number, actual seller identity/legal address/tax ID/USt-ID where appropriate, recipient invoice details, item description, quantity, unit gross/net, VAT rate and amount, shipping, discounts, payment date, invoice date and reference to the order; never invent legal details.
- Store immutable invoice snapshot and PDF. Expose invoice to admin/customer with authentication and suitable retention. Invoice email is sent idempotently once and has durable failure/retry logging; cancellation/refund uses proper correction/credit-note flow, not deletion or re-numbering.
- Test data and preview-only invoice samples must be clearly labelled and never mixed into accounting records.

## Future 1 EUR controlled transaction test (not yet performed)
- Create a **hidden, non-indexed, staff-only** 1.00 EUR SKU with explicitly test-only identity and merchant-approved VAT/shipping handling, never expose publicly or alter 38 existing catalog variants. Only after provider credentials and payment notifications are ready, purchase once from Vercel preview on the live payment gateway with the merchant's approval; capture, verify PSP dashboard, create order, generate invoice, send recipient and merchant emails, refund if needed, verify stock and webhook idempotency. Ensure there are no accidental multiple charges or duplicate invoices. Then disable the SKU.
- A working `rubyhair.vercel.app` UI and 14/14 API smoke tests are *not* evidence that payment, shipping, invoice or automatic mail flows have passed.

## Old invoice integration clue
- Read-only encrypted old WordPress SQL backup listed active `woocommerce-germanized/woocommerce-germanized.php` and the option key `storeabill_invoice_woo_order_auto_create_emails`. This suggests existing Germanized/StoreaBill invoice workflow settings, **not proof** of an enabled or legally valid production PDF invoice. Inspect old invoice numbers, seller tax details and merchant requirements before implementing new invoice issuance.
