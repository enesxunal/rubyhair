# Ruby Hair: read-only WooCommerce inventory & VAT reconciliation

Date: 17 November 2026. No WordPress or PostgreSQL records were changed.

## Sources

- Authenticated IONOS phpMyAdmin `dbs12920586`, WordPress tables `YJkcQXPbposts`, `YJkcQXPbpostmeta`, `YJkcQXPboptions`, `YJkcQXPbwoocommerce_tax_rates` (SELECT only).
- New Ruby Hair PostgreSQL products/variants database (SELECT only).
- Private local snapshot under `~/.config/desnod/rubyhair/inventory/` (permissions 0700 directory / 0600 files; not in Git).

## Results

- Legacy WordPress: 53 `product_variation` records with numeric `_stock` and `_manage_stock=yes`; this total may include variations not sold in the new collection.
- New Ruby Hair: two active products, 38 active variations, all 38 have matching original WooCommerce variation IDs.
- Price audit: 38 of 38 matching WooCommerce `_price` equals the new PostgreSQL `priceCents`, zero differences.
- One matched variation has previous `_stock=0`; **do not sell** until physically restocked/confirmed. New database has `stockQuantity=null` for every one of the 38 variations.
- Fifteen other historical WooCommerce variations are intentionally absent from the new imported catalog. Their inclusion should be reviewed; do not automatically import them.
- Private merchant worksheet: `~/.config/desnod/rubyhair/inventory/merchant-stock-review-20261117.csv`. Every matched variation is marked `merchantConfirmed=NO`, regardless of old quantities. This is a review worksheet, not a new stock feed.

## Verified WooCommerce tax settings

- `woocommerce_currency=EUR`; default country `DE:DE-NW`.
- `woocommerce_prices_include_tax=yes`; storefront/cart tax presentation `incl`.
- `woocommerce_calc_taxes=yes`; tax location based on shipping address.
- VAT rates table: one current standard rule of `19.0000`, `Umsatzsteuer`, applies to shipping (`tax_rate_shipping=1`). This is observed WordPress configuration, not independent legal advice.
- Historical flat DHL shipping price was 4.99 EUR in the legacy shop documentation; separately re-check applicable shipping zones and order totals before enabling checkout.

## Go-live decision

Prices can be reconciled at 38/38. **Do not set any numeric stock from this snapshot without merchant confirmation.** Complete a recent physical stock check and verify any sales after snapshot date before entering final values. Payment integrations, order/webhook tests and migration/rollback are separate hard gates.
