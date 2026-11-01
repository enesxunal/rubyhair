# Ruby Hair — merchant acceptance checklist

Status: **NOT APPROVED** — internal development checklist, NOT public legal advice or approved legal text.

Public source review (2 November 2026): https://rubyhair.de/ , https://rubyhair.de/agb/ , https://rubyhair.de/widerrufsbelehrung/ , https://rubyhair.de/impressum/ , https://rubyhair.de/datenschutzerklaerung/

## Verified / imported product inventory
- Keratin Bondings: 25 individual bondings per pack, 100% human hair. The public page describes 55-60 cm lengths. Imported custom snapshot currently has 11 variants.
- Tape-in Extensions: 10 individual extensions per pack, 100% human hair. Public page lists 45-50 and 55-60 cm lengths. Imported custom snapshot currently has 27 variants.
- Confirm all real color/length combinations, prices, weights and pack images against Ruby Hair's current sellable catalog. Imported snapshot has 38 combinations but not confirmed physical stock quantity (38 NULL in local PostgreSQL).

## Shipping / returns / payment — explicit merchant decisions required
- The old AGB mentions DHL within Germany, flat EUR 4.99, up to five working days, and advance bank transfer, PayPal and Visa/Mastercard.
- The old homepage lists a 3-5 working day delivery claim and references a different set of payment methods (PayPal, credit card, Klarna and SEPA).
- These must NOT become automatic claims about the **new** standalone shop: get merchant confirmation of shipping zones, shipping rates, delivery calculation, currency/taxes and the approved checkout providers.
- The old AGB text conflicts with the old standalone Widerrufsbelehrung regarding refund of initial delivery costs.
- The old standalone Widerrufsbelehrung contains an unresolved telephone placeholder and an unresolved return-recipient/address placeholder. Do not publish that text unchanged.
- Existing Impressum indicates Ruby Hair / Nazmi Bulganlar / Klara Strasse 19, 45130 Essen and an email. Existing privacy page elsewhere specifies Zweigertstrasse 8, 45130 Essen as the responsible-party address. Confirm the official current business and privacy contact addresses.
- Existing AGB/Impressum references the old EU Online Dispute Resolution platform. Its applicability should be checked by qualified German legal counsel before new legal text is published.
- Verify merchant VAT identification, business registration, official contact details and legally required consumer information, but do not copy sensitive financial account details from the current site.
- Approve final Impressum, Datenschutz, AGB, Widerrufsbelehrung, address and return instructions with a qualified legal reviewer.
- Review privacy disclosures against actual new Next.js runtime, analytics, Google Fonts/CDN requests, email infrastructure, user data storage and selected payment provider.

## Go-live constraints
- The new Next.js Vercel domain is a noindex, non-transactional design preview, not an approved e-commerce site. Its checkout API is intentionally 503. Contact mailto invokes the customer's mail app, not a form backend.
- Local PostgreSQL records exist, but no persistent production PostgreSQL or admin credentials are connected to Vercel.
- Live rubyhair.de WordPress and DNS remain unchanged. WebAltyapi is final hosting after customer-authorized domain transition.
- Admin improvements deferred until customer-facing website quality/content and transaction infrastructure are ready.
