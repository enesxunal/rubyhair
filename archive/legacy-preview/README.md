# Ruby Hair — Homepage Design Preview

A responsive, German-language homepage design concept for Ruby Hair Extensions.

## Preview locally

Open `index.html` in a browser, or run a local static server (for example `python3 -m http.server 8765`) and visit `http://localhost:8765`.

## Product collection and detail pages (2026-11-02)

- /kollektionen/: the two genuine WooCommerce product families.
- /kollektionen/keratin-bondings/ and /kollektionen/tape-in-extensions/: filterable color gallery with real prices and product images.
- /produkt/keratin-bondings/ and /produkt/tape-in-extensions/: color and length selectors, image/price changes, direct links to WooCommerce variation selection for secure checkout.
- shop-data.json is a public catalog snapshot populated from the WooCommerce Store API and public variation forms. Pricing and stock can change: the live store is the source of truth. Refresh the catalog before delivery.
- Every demo page is excluded from search indexing; live WordPress remains unchanged. No fake cart or payment backend.

## Preview scope

- Desktop and mobile layout, branded header, product collections, color-selector concept, editorial sections, and footer.
- Navigation and product/category cards now lead to internal design preview pages. The order button carries color/length to the original WooCommerce product page (new tab); actual cart/checkout remain on the existing store.
- No native checkout, authentication, orders or newsletter backend are implemented in the preview. No WordPress production data has been modified.
- New campaign visuals are included as optimized WebP assets; some existing Ruby Hair product images, brand logo and video load from rubyhair.de.

This is a visual demonstration only, not a production e-commerce store.

## Scope and next steps (2026-11-01)

- Quiet-luxury direction: low-noise hero, immediate Keratin/Tape-in access, clear category links, reduced editorial sections, responsive mobile-first shopping.
- The existing WooCommerce site is still the only site that accepts orders. Integrate real product data, variant selection, inventory, checkout, legal pages and payment confirmations before moving the new design to rubyhair.de.
- AI hairstyle/hair try-on is a separately scoped future phase, not part of the current delivery.
- Preview is excluded from search indexing.

## November 2 follow-up: read-only live catalog

- /api/catalog is a read-only Vercel Node endpoint pulling published product details using WooCommerce public Store API and public product variation form. No private admin credentials and no remote writes. Edge cache age: 5 minutes.
- If the source fails, the browser falls back to shop-data.json and explicitly marks the stored preview timestamp. Users must check price/stock in the actual store before buying.
- /suche/ searches both families and color variants; homepage and inner pages link to this shop search.
- Product details show existing verified pack quantities and indicative pack recommendations, without inventing technical specifications.
- Run read-only validation: node --test tests/catalog.test.js
- Full checkout/SEO/staging release plan: RELEASE-CHECKLIST.md
