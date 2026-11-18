# Ruby Hair customer automation | 18 November 2026

## Implemented

- Server-authoritative DE checkout with strict Zod validation, 19% inclusive tax, DHL DE 4.99 EUR default shipping (can override `RUBY_SHIPPING_DE_CENTS`), consent timestamp, separate billing address, and order reservation.
- Idempotent order key, bounded cart, transactional stock hold, NULL stock treated as available, rollback only for stock that was actually reserved, and provider-verified expiry.
- PayPal Orders v2 full-cart purchase + guest/card preference, signed return, canonical GET capture verification and PayPal-signed webhook; never trust redirect alone.
- Klarna hosted payment page with physical merchandise, authorized on success, capture only during DHL fulfillment after live provider verification.
- Automatic individual VAT invoice PDF stored immutably against the verified order. Admin invoice download.
- Unique durable mail outbox with customer payment/processing/shipped notices and merchant copy; PDF invoice attached to paid notices, SMTP retries/needs_review, admin order reporting.
- DHL Parcel Germany label creation with OAuth, dry run and live label only when explicitly enabled and merchant configuration is complete; label PDF and tracking stored, admin PDF download, ambiguous external label responses never retried blindly.
- Authorized periodic worker at `/api/internal/customer-jobs` plus callback-time job dispatch. Production `CRON_SECRET` provisioned via Vercel secret. Job schedule currently once daily, with immediate callback dispatch for normal success paths.
- Additive Prisma migration `20261118_customer_checkout_automation` applied to production PostgreSQL; existing QA records untouched.
- Fulfillment and invoice links on admin orders dashboard.

## Safety gates and missing merchant inputs

- **Public customer checkout remains disabled by default.** `RUBY_PUBLIC_CHECKOUT_MODE` missing/disabled => POST `/api/checkout` 503. `admin_test` permits only authenticated administrator transactions; `public` permits general sales only after SMTP, DHL credentials, weight and label flag pass readiness checks. NEVER set public until final successful merchant-reviewed transaction.
- Missing **IONOS SMTP account password**. Store securely at `/admin/benachrichtigungen`; send actual test and check inbox/Spam before claiming reliable delivery.
- Missing **DHL Parcel DE six production credentials**: clientId, clientSecret, username, password, accountNumber, billingNumber. Store securely at `/admin/zahlungen`; old WooCommerce/Shiptastic information is not necessarily an API credential.
- Missing physical **parcel weight in grams** (`RUBY_DHL_WEIGHT_G`), a merchant-provided value. No guessed weight.
- `RUBY_DHL_LIVE_LABELS_ENABLED=true` is a deliberate activation gate; label requests can incur merchant fees.
- Confirm whether the recorded live PayPal webhookId points to `https://rubyhair.de/api/payments/paypal/webhook`. Its subscription may have come from the legacy store; verify merchant portal, do not change old integrations blindly.
- Final E2E real customer checkout with PayPal, Klarna, invoice email, DHL label and shipping handover not yet performed; this report is code-level readiness, NOT merchant go-live signoff.
- Physical DHL handover cannot be automated without a verified pickup/tracking-provider arrangement; the software can generate a label and tracking number automatically but cannot physically ship a parcel.

## Test steps after missing credentials

1. Store SMTP and DHL secrets through admin settings; set correct parcel weight and enable DHL labels, verify read-only DHL authentication and dry-run.
2. Enable `RUBY_PUBLIC_CHECKOUT_MODE=admin_test` only; use one existing variation and one explicitly approved low-value order with a real German shipping address.
3. Verify provider payment, exactly one order and one capture, PDF VAT invoice, customer/admin e-mail and carrier label/tracking (avoid duplicate live transactions).
4. Test Klarna HPP and deferred capture on DHL fulfillment with a separate approved transaction.
5. Verify failure, retries, stock restore and no public charge; then explicitly enable general public customer checkout.
