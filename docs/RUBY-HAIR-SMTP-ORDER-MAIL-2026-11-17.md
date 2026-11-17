# Ruby Hair: IONOS SMTP & order templates

## Legacy source (read-only)
The decrypted, local 17 November 2026 WooCommerce backup recorded `WP Mail SMTP` as active, mailer `smtp`, host `smtp.ionos.de`, port `587`, STARTTLS, authenticated user/forced sender `info@rubyhair.de`, display name `Ruby Hair Extensions`. New/cancelled order alerts went to `nazmibulganlar@gmail.com`; customer processing emails were enabled. This does NOT prove present-day deliverability.

## New Ruby Hair preview
- Protected path `/admin/benachrichtigungen` contains a *blank* IONOS SMTP password input and editable merchant notification recipient, saved encrypted using existing `RUBY_PAYMENT_SETTINGS_KEY` (AES-256-GCM). Password is never redisplayed. Removing a saved password is supported.
- SMTP server, port, TLS and sender are fixed to the known IONOS settings; administrators cannot use this form to redirect credentials to an arbitrary host.
- "SMTP-Test-E-Mail senden" sends a clearly named test preview only to the saved notification recipient after authentication. The button is inactive until the vault and password are ready. SMTP acceptance is not proof of inbox delivery; check Inbox and Spam.
- Eight separate responsive, German HTML + plain text templates: received, awaiting_payment, paid, processing, shipped, delivered, cancelled and failed. Customer-provided values are HTML-escaped and order numbers are sanitised for headers.
- No template is sent automatically during customer checkout yet. The existing checkout route responds HTTP 503 intentionally; payment capture, idempotent order-event dispatch, mail delivery outbox/retries and DHL labels remain to be completed and tested. Never claim the new store is taking orders or mails are sent on production events yet.

## Enablement steps
1. Confirm `RUBY_PAYMENT_SETTINGS_KEY` and database migrations in the real Vercel environment; never paste encryption keys into this repository, chat or external ticket.
2. Sign in to the admin; open "E-Mails & Vorlagen", enter IONOS mailbox password in the password field and save. Ensure merchant recipient is correct.
3. Send test to the saved merchant address, then confirm delivered inbox and headers/SPF/DKIM/DMARC with the merchant.
4. Implement/test checkout payment authorization and signed webhook, record order events atomically, dispatch customer/merchant mail exactly once via durable outbox and retry, with correct statuses.
5. Verify stock for all 38 new variants and safe fallback. Take full WordPress files + database backup and restore test before changing DNS.

**No DNS cutover was authorised by this template setup.** Preserve existing `rubyhair.de` WooCommerce and IONOS MX records while the storefront is blocked.
