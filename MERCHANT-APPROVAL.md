# Current merchant and legal review — 18 November 2026

**Status: CUSTOMER REPORTED LEGAL-TEXT APPROVAL; FINAL MERCHANT IDENTIFICATION / PROFESSIONAL LEGAL SIGN-OFF STILL UNVERIFIED.** Do not interpret these records as a qualified legal assessment, and do not silently change the merchant's business address, VAT, return address, or refund entitlement.

This historic checklist below was written for the earlier closed preview and remains as an audit trail. **Production is NOW PUBLIC and accepts PayPal/Klarna.** The original "checkout is 503", "no live database" and "old WordPress live" statements below are superseded.

**Merchant statement (18.11.2026):** The agency owner explicitly confirmed "hukuki sorun yok" and accepted the current legal-content status. Record this as an owner/merchant-side acceptance statement for operational handoff, **not** as proof of an external lawyer review or confirmation of either historical street address. No address, tax ID or legal wording is changed by this note.

## Current verified technical compliance work

- Live storefront and checkouts: on (`payments_public`), owner-directed. Stored stock and price validation continue to run in the production PostgreSQL database.
- PayPal and Klarna customer payment choices exist; Klarna real order RH-5 has a verified €829.99 capture, invoice `RH-2026-0000005` and buyer/store notifications. Separate PayPal merchant 1 € QA capture verified.
- Online withdrawal form `/widerruf/` (two explicit steps) persists the declaration before an acknowledgment mail; no reason is required. Manual buyer E2E withdrawal and refund are still outstanding.
- Google Fonts runtime CDN links were removed; bundled DM Sans and Playfair Display no longer expose initial visitors to remote Google Fonts requests. Technical CSP base/object/frame restrictions are enforced, other rules remain report-only pending compatibility inspection.
- Live shipping can be fulfilled manually, but DHL auto-label API is NOT integrated (excluded from the current follow-up).

## Merchant/legal information requiring confirmation

1. **Official business address and return address**: the historic Impressum says **Klara Strasse 19, 45130 Essen**, while the historic Datenschutz identifies **Zweigertstrasse 8, 45130 Essen**. The current public templates use the first source by default. Confirm the legally registered business location, the address receiving returns, and whether the responsible data controller address differs.
2. **Tax/registration**: validate legal business name, responsible proprietor, publicly used VAT identifier, mandatory disclosures and merchant VAT regime with real documents. Do not invent a number or registration status.
3. **Return, refund and cancellation**: confirm the right to return in this product category, full vs partial refund procedure, standard shipping refunds, used/sealed merchandise conditions (if any apply), refund timing, buyer notifications and invoice/credit-note adjustments. No automatic live refund will be executed without a specific approved case.
4. **Privacy**: identify actual subprocessors and storage regions, request/access logging retention, email delivery, PSP interactions, optional analytics, OpenAI processing and third-country transfers; review DPAs, privacy text and cookie implementation. If not confirmed, do not claim fully GDPR certified.
5. **Consumer and accessibility requirements**: verify § 356a BGB electronic withdrawal, § 312j paid-order controls, delivery times, BFSG applicability, PAngV and any sector-specific packaging/hygiene exceptions with qualified counsel.
6. **Formal approval record**: preserve reviewer name/role, reviewed version, approval date and confirmed addresses outside the public site. Report any conflict before publishing new claims.

**No merchant/professional approval has been invented by the technical audit.**

---

## Archive — historic pre-launch checklist (2 November 2026)

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
- Existing AGB/Impressum still link to the former EU ODR platform. The European Commission confirms that the ODR platform closed on 20 July 2025 under Regulation (EU) 2024/3228: https://consumer-redress.ec.europa.eu/site-relocation_en . The new site deliberately does not repeat this dead platform link; final dispute resolution wording still needs review.
- The publicly listed old-store VAT ID is DE356097157. It has been carried into the **source-labelled preview** Impressum; confirm merchant identity, registration, VAT status and contact details before the new shop launches. No banking details were copied.
- Approve final Impressum, Datenschutz, AGB, Widerrufsbelehrung, address and return instructions with a qualified legal reviewer.
- Review privacy disclosures against actual new Next.js runtime, analytics, Google Fonts/CDN requests, email infrastructure, user data storage and selected payment provider.

## November 2026 legal compliance additions
- **§ 356a BGB — electronic withdrawal function has been required since 19 June 2026** for covered contracts concluded online. Before selling, provide a conspicuous always-accessible **Vertrag widerrufen** route, contract/customer identification, separate **Widerruf bestätigen**, and immediate durable electronic acknowledgment containing the submission date/time and content. Neither a plain link to Widerrufsbelehrung nor a fake UI is enough. The current preview has no such functioning workflow, so real checkout must stay disabled. See `reports/legal-audit-2026-11-02.md`.
- **§ 357(2) BGB:** normally refund original standard delivery charges on statutory withdrawal; the old conflicting AGB/withdrawal texts should be reconciled and legally approved.
- **§ 312j BGB, EGBGB Art. 246a:** before chargeable orders show accepted payments, delivery restrictions, complete item/total price, taxes/shipping and a clearly labeled paid-order button. No paid-order button in current preview.
- **§ 5 DDG** imprint requirements, **BFSG** ecommerce accessibility (microenterprise service exception requires merchant-specific verification), consumer pricing / VAT under PAngV, actual data-processing disclosures and final merchant legal approval must all be assessed.

## Go-live constraints
- The new Next.js Vercel domain is a noindex, non-transactional design preview, not an approved e-commerce site. Its checkout API is intentionally 503. Contact mailto invokes the customer's mail app, not a form backend.
- Local PostgreSQL records exist, but no persistent production PostgreSQL or admin credentials are connected to Vercel.
- Live rubyhair.de WordPress and DNS remain unchanged. WebAltyapi is final hosting after customer-authorized domain transition.
- Admin improvements deferred until customer-facing website quality/content and transaction infrastructure are ready.
