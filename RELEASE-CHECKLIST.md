# Ruby Hair - WooCommerce release checklist (2026-11-02)

This file is a controlled implementation and verification plan. It is NOT evidence that checkout is live or complete.

## System boundary
- Demo: rubyhair.vercel.app. Product/color/length browse and pricing from the read-only /api/catalog endpoint; saved shop-data.json fallback is labeled as a cached preview.
- Source of truth: existing rubyhair.de WooCommerce store (products, real-time cart, shipping, taxes, coupons, payments, orders, emails and accounts).
- Demo purchase button opens the live product with selected attribute_pa_produktfarbe and attribute_pa_produktlaenge. It does NOT add to cart or initiate payment.
- Final store should preserve WooCommerce transaction processing and stable product/legacy SEO URLs; a visually unified WordPress storefront or tested same-origin WooCommerce deployment is safer than cross-origin cart proxying.

## Staging integration order
1. Obtain an isolated, non-public WordPress/WooCommerce staging site with checkout in test/sandbox mode. Never put live payment keys in the static demo.
2. Snapshot product/variation records, public image paths and legal/checkout settings in a backed-up copy. Verify theme/plugins and gateways.
3. Apply the quiet-luxury design to staging WooCommerce templates preserving native product selection and checkout (sessions, nonces and gateways).
4. Make price/stock come from WooCommerce at actual add-to-cart and checkout, not from preview cache. Reconfirm variation ID with selected color and length.
5. Test both products, quantity 1+, mix of products, unavailable variants, cart remove/update, coupons if offered, cart restoration.
6. Test billing/shipping addresses, taxes, delivery, payment cancelled/failed/successful states and refund where supported. Verify WooCommerce order and emails.
7. Verify transactional email and account/login/password-reset only if features are provided on the existing site.
8. Have merchant verify German Impressum, Datenschutz, AGB, Widerruf, shipping costs, payment options, taxable prices and cookie consent. Preserve stable legal routes.
9. Test real mobile orders on physical iOS/Android; keyboard, accessible labeling, contrast and Core Web Vitals. Staging must remain noindex.
10. Check Search Console, category/product canonical URLs, current-price Product/Offer schema, sitemap, 301s only for changed URLs, and SEO plugin duplicates.
11. Prepare verified complete DB/files backup, SSL/DNS plan and rollback. Obtain merchant final approval. Switch rubyhair.de LAST with live transaction integrity.
12. Monitor real orders, payment confirmation, notification delivery, analytics and crawl errors after release.

## Unresolved external dependencies
- Staging WordPress administrator and sandbox payment gateway access are not present in the current project.
- Merchant-confirmed shipping methods/costs, tax, customer accounts, original detailed product photos and application guidance are not verified.
- No complete new-design E2E transaction or rollback test has been performed.
- Production WordPress remains untouched pending staging acceptance.

## Excluded
- AI hairstyle try-on remains a separately scoped later phase, with no placeholder or photo upload in the current design.
