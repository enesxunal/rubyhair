# Ruby Hair — Search Console, GA4, Meta Pixel & SEO

Status date: 2026-11-18 (Europe/Berlin)

## Connected sources and verified identity

- **Search Console URL property:** `https://rubyhair.de/` — domain ownership verified using Google's exact HTML file `google7902b44cd7583ac9.html`, deployed at the domain root.
- **New sitemap:** `https://rubyhair.de/sitemap.xml` — submitted; Google UI confirmed `Site haritasi basariyla gonderildi` (successfully submitted). Google's processing/indexing and actual query reports are still pending.
- **Two historical WordPress sitemaps:** `product-sitemap.xml` and `page-sitemap.xml`, submitted 2022, shown as fetch failures November 2026. They belong to the previous WordPress site and are not the current primary sitemap.
- **Google Analytics account:** Ruby Hair. **GA4 property:** Ruby Hair Shop DE. **Stream:** Ruby Hair Shop at `https://rubyhair.de`, stream ID `16370583142`, measurement ID `G-RVNYKB4WP6`, Germany reporting time zone, EUR currency. A stream exists but does not record traffic until deployment and user opt-in.
- **Meta business account / advertiser:** Ruby Hair. **Meta Dataset:** Ruby Hair Website. **Pixel:** `1157620659939392`. No server-side Conversions API enabled.

## Event collection and data separation

- Existing first-party statistics remain distinct from GA4 and Meta; aggregate page / cart / checkout counters are not unique visitors, conversions, or revenue.
- Google Analytics 4 is a NEW optional statistics category (`ruby_ga4_choice`). Previous internal-statistics permission is not accepted as GA4 consent. GA4 script is not loaded until the new explicit opt-in.
- Meta Pixel is a NEW optional marketing category (`ruby_marketing_choice`). Script is not loaded before marketing opt-in.
- Meta mapped browser events: `PageView`, `ViewContent` (product), `AddToCart`, and `InitiateCheckout`.
- GA4 mapped browser events: `page_view`, `view_item` (product), `add_to_cart`, `begin_checkout`.
- No `Purchase` event sent: real payment-provider-verified purchase tracking needs a dedicated server-backed nonduplicating flow; avoid faking conversions.
- Granular opt-ins can be revoked using the footer cookie preferences button. No photos, names, payment details, or raw order records are deliberately added to marketing/analytics events.
- Prior baseline: first-party admin showed 348 pageviews over 7 days in a November 18 UI snapshot, but this is not an independently verified unique user count and changes continuously. GA4, Meta and GSC cannot backfill historical visits.

## SEO changes

- Keratin Bondings' legacy `noindex` directive removed for active public product page.
- Existing real product variants now mapped to `ProductGroup`/`Product`/`Offer` schema using live price, color, length, and availability. There are no invented reviews or aggregate ratings.
- Product variants keep a canonical parent URL. Tape-in filter query parameters also canonicalize to the collection parent, reducing duplicate filter URLs.
- Sitemap refreshed to include canonical product/category pages and three new original German guide articles. No raw filtered query URLs.
- Shop front-page meta title/description expanded to Echthaar Extensions, Tape-in and Keratin.

### Intent clusters (competitor/topic research, NOT measured Ruby Hair query volume)

| Likely DE search intent | Primary landing page |
|---|---|
| `tape in extensions echthaar`, `tape in extensions kaufen` | `/produkt/tape-in-extensions/` |
| `extensions 50 cm`, `tape in extensions 60 cm` | `/kollektionen/tape-in-extensions/` |
| `keratin bondings echthaar` | `/produkt/keratin-bondings/` |
| `tape in extensions pflege` | `/ratgeber/tape-in-extensions-pflegen/` |
| `wie lange halten tape extensions` | `/ratgeber/wie-lange-halten-tape-extensions/` |
| `tape ins oder keratin bondings` | `/ratgeber/tape-ins-oder-keratin-bondings/` |

These topics are grounded in live German competitors and manufacturer guides; SEO priority is directional until Search Console gathers property-specific queries.

Sources reviewed:
- https://developers.google.com/search/docs/appearance/structured-data/product-variants
- https://developers.google.com/search/docs/specialty/ecommerce/designing-a-url-structure-for-ecommerce-sites
- https://www.greatlengths.de/de/abc/abc_haarpflege/
- https://www.greatlengths.de/de/abc/haltbarkeit/
- https://www.glamxtensions.de/tape-in-extensions/tape-on-echthaar-extensions

## Follow-up verification

1. Verify new production deployment, sitemap includes guides and both public product pages, and all canonical URLs are correct.
2. Verify **zero** Google/Meta network requests before consent, then each provider requests only after its own opt-in. Confirm provider UI tests have event receipts after opt-in.
3. After first Search Console processing period, report real search queries, clicks, impressions and CTR. Do not claim volume or rankings before actual data.
4. After 1–4 weeks, compare organic page entry / GA4 acquisition / Meta opted-in events; do not conflate the separate tools' counts.
5. Create real purchase conversion only after a verified receipt/order settlement workflow can guarantee a one-time event; until then no sale conversions are counted in GA4/Meta.
