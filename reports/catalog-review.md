# Ruby Hair - Imported Catalog Review (2026-11-02)

The source is src/data/products.json. This is a technical audit, not merchant acceptance.

- 2 product families: Keratin Bondings 11 variants / 11 colors; Tape-in Extensions 27 variants / 17 colors.
- 38 total unique variation IDs and 28 product-specific color groups.
- 38/38 local product image paths exist, using 21 distinct picture files.
- No physically verified stock counts. Imported availability flags cannot substitute for actual stock inventory.
- Full row inventory: reports/catalog-38-variants.csv.

## Merchant verification needed

- Tape-in EVE and Keratin 1006 share the image 1006-1-600x600-8f26ccdcc.jpg. Potential labeling issue; no correction is authorized until the merchant confirms.
- Other shared pictures across lengths or product methods may be intentional. Do not infer that reuse is a defect.
- Confirm color-to-image mapping, prices, packs, each stock count and the approved images before enabling orders.
- Confirm delivery, taxes, returns, payment and German legal terms (see MERCHANT-APPROVAL.md).
- WebAltyapi migration and domain cutover remain deferred; Vercel is a no-order preview.
