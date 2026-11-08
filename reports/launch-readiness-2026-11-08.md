# Ruby Hair — staging and final launch readiness (8 Nov 2026)

## Product copy and photography
- Existing Ruby Hair public storefront (https://rubyhair.de/produkt/tape-in-extensions/) confirms 100% human hair and ten individual tape-in pieces per package. Current tape lengths from imported variants: 45–50 cm and 55–60 cm.
- Updated staging Tape-in description contains only source-grounded facts; merchant approval is still required. Do not imply length is incremental beyond natural tips.
- All imported color images come from old product catalog and are not yet approved by customer. Do not synthesize exact color swatches or stock availability.
- Audit images for mislabeled/shared Keratin/Tape-in photo and replace with customer-approved originals after Germany meeting.

## SEO and performance
- Vercel demo and old WordPress must remain isolated. Demo has noindex + robots Disallow /; sitemap intentionally empty until explicit public activation.
- Site launch flag is RUBY_SHOP_PUBLIC=APPROVED_PRODUCTION and RUBY_CANONICAL_SITE_URL=https://rubyhair.de; before approval keep unset.
- Product JSON-LD without fake Offer, stock, reviews or ratings. Add verified price/stock offers only after catalog approval and actual purchase readiness.
- Canonical links and sitemap are prepared for approved domain. Do not activate before migration/real payments.
- Confirm legacy WordPress redirect map, Search Console domain access and robots/indexing only after production migration.

## Fulfillment and checkout
- Private Next.js /admin includes product and order management. Authenticated fulfillment transitions require a real order, a verified provider payment event and permitted state transition. No manually marked paid order, refund or payment capture.
- Additive nullable shipment/tracking fields migrated in LOCAL PostgreSQL only. Do not run migration against production until backend deployment stage.
- Checkout form validates shipping and optional separate billing addresses in browser only. Nothing submitted or stored by demo. Real checkout remains disabled.
- Payment, webhooks, transactional SMTP, legal withdrawal confirmation, tax/shipping decision, stock counts and production DB remain blocked on customer/provider approval.

## German legal content
- Existing Impressum, Datenschutz, AGB and Widerruf are source-labelled previews. Not legal approval.
- Old store has conflicting Imprint/privacy addresses, withdrawal refund shipping-cost clauses and incomplete returns contact. Customer should confirm identity/address, approved prices, delivery zones/method and return terms.
- § 356a BGB electronic withdrawal with two-step confirmation and immediate durable acknowledgment remains mandatory for covered online consumer contracts; cannot activate with no delivery/SMTP integration.

## Pending
- Customer acceptance of photos, stock, current prices, texts and shipping/payment terms in Germany.
- One authorized AI before/after image QA (photo privacy and express consent), no test yet with real image after prompt revision.
- Final mobile physical device, performance and merchant SEO review at domain launch.

## Consent-based first-party analytics — prepared, disabled
- Database aggregate table with day / permitted page / event / coarse source / device / count, no visitor IDs, email, IP or session identifiers.
- Event types: page_view, add_to_cart, begin_checkout. Admin /admin/analytics shows anonymous 28-day event counts, not unique visitors or purchase conversions.
- Both `RUBY_ANALYTICS_ENABLED=APPROVED` and `NEXT_PUBLIC_RUBY_ANALYTICS_ENABLED=APPROVED` are required to activate collection. Vercel demo has neither: no analytics collection.
- Visitor can accept or decline; their choice stored in browser and consent cookie, with access to reopen settings. Do not enable until controller/privacy/legal confirmation.
- SMTP/email and payment integration intentionally not wired. No GA4 or external tracker loaded.

## Local QA verification (8 Nov)
- Prisma 5 migrations applied to local loopback PostgreSQL; order reservation concurrency/stock/cancel/expiry checks passed, all five synthetic orders cleaned.
- Analytics strict consent test: missing consent 403, foreign Origin 403, consent + same-origin 204, repeated request increments one aggregate to count 2, synthetic aggregate cleared. Vercel preview remains disabled.
- Local preview: desktop/mobile 36/36 catalog cases + 24/24 wider routes including checkout/legal, no horizontal overflows or visible missing images. Local FCP times not representative of production CWV; see reports/performance-qa-2026-11-08.md.
- Local copy reconciler changed only unchanged imported Tape-in draft text and cover, preserved any independently edited products. No production DB touched.
