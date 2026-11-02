# Ruby Hair – Virtual Hair Extension Try-On R&D / 2026-11-02

## User request and scope
Create a practical test system for the optional Ruby Hair AI hair-extension visualizer after first checking both historical Ruby Hair products and real-world before/after transformations. This phase is a **client-side comparison and prompt laboratory**, not a fake generative AI engine. No third-party AI integration, no photo upload, no checkout enablement. Public `rubyhair.de` / DNS / WebAltyapi remain unchanged.

## Verified source product facts
- **Keratin Bonding:** 100% human hair, **25 individual bonds per pack**, **55–60 cm**, **25 g** product listing, prior publicly listed EUR 145–170. Reference: https://rubyhair.de/produkt/keratin-bondings/
- **Tape-in Extension:** 100% human hair, **10 individual wefts per pack**, **45–50 cm and 55–60 cm**, **25 g** product listing, prior publicly listed EUR 135–185. Reference: https://rubyhair.de/produkt/tape-in-extensions/
- Both old product listings provide indicative pack ranges by natural-hair density: 2–4 fine, 4–5 normal, 5–6 thick. These figures are **not** a promise of a full-head result or a personalized treatment plan.
- Old HairGuide advises cautious washing, brushing damp rather than dripping wet hair, protecting bonds and loose braiding before sleep. https://rubyhair.de/hairguide/
- The new site currently has 2 products / 38 catalog combinations. Local PostgreSQL physical stock remains unverified; real order intake remains disabled.

## What changes visibly in a before/after?
- **Tape-ins:** thin wefts applied in pairs to sandwich a small natural-hair section, lying relatively flat against the head. The result can increase length, fullness and the amount of hair visible across the shoulders/back. Subsequent blending/trimming and styling affect the outcome. Professional source: https://vanityhairsolutions.com/learn/how-to-apply-tape-in-extensions/ (2026-09-19).
- **Keratin/K-tip:** individual extension strands bonded to small sections using a specialized professional technique. More strand-by-strand distribution and a seamless transition can be achieved, but the number and placement matter. Professional source: https://www.greatlengths.com.au/methods/keratin-bond/
- Tape-in maintenance is typically an appointment approximately every 6–8 weeks, subject to stylist advice; do not promise a product-specific longevity. Reference: https://www.petermark.ie/blog/how-to-care-for-your-taped-extensions-or-fillers-at-home/
- Public **non–Ruby Hair** before/after examples useful for visual benchmarking (DO NOT reuse as Ruby Hair customer content without licensed rights):
  - Tape-in medium-brown shoulder hair -> longer, dimensional wavy hair: https://www.sirenstylist.com/hairtalk-extensions-in-va-beach/
  - Keratin/K-tip short dark-brown hair -> extended long waves: https://luxshinehair.com/k-tip-extensions-on-short-hair/
  - Short, thin hair -> longer, thicker hair: https://iloveslavichair.com/what-are-k-tip-hair-extensions

## AI try-on acceptance criteria
- Preserve the **same** person, face, expression, skin, body shape, jewelry, clothing, pose, image angle and background. Change *only* the visible hair area and where extended lengths naturally reach.
- Control product method: strand-based keratin distribution vs flatter tape placements; avoid visible adhesive or implausibly attached strips.
- Control actual Ruby Hair color **using the matching stored swatch/reference photograph**, not the symbolic color code alone. For EVE and Keratin 1006, one current image was reused in the imported catalog; obtain source photographic confirmation prior to claims of exact shade.
- Control product length (45–50 or 55–60 cm) as *physical hair length*, not a rigid pixel measure: final visible endpoint depends on person and placement. Preserve natural texture and blend at the cut line. Do not completely recolor a person's natural roots when only adding extensions.
- The preview is approximate, cannot predict physical installation, maintenance, exact density, hair condition, lighting or perceived product color.
- Prefer single person, visible hair and shoulders, near-frontal pose, sharp non-filtered image. The specialist **Perfect Corp AI Hair Extension** API documents JPG/JPEG, long side <= 1024 pixels, file size under 10 MB, full face, face width >= 128 pixels and shoulders visible. https://docs.perfectcorp.com/reference/ai_hair_extension/section/overview/file-specs-and-errors
- AI vendor-specific input constraints must be applied only once vendor agreed. No vendor key or processing service is configured.

## Implemented test laboratory
- Route: `/haar-anprobe` (noindex) and visible test navigation link.
- Method, color and length selectable **from the real imported local catalog**, disallowing nonexisting color/length combinations.
- Example shade reference from Ruby Hair's local `/media/` product image. Hair-density ranges are explicitly labeled estimates.
- Original image and separately generated after-image can be loaded **locally in the browser only** (JPG/PNG/WebP, 8 MB max), compared with a movable left/right reveal slider. Images use object URLs, are never posted to a server or stored in localStorage. Replaced image URLs are revoked.
- Copyable, parameterized German text-to-image editing prompt preserves face/identity and restricts edits to extension hair. Actual prompt + uploaded images must be sent by user separately to their chosen image-generation editor for now; not an integrated generation workflow.
- No third-party before/after photos embedded in product UI because third-party image usage/license and Ruby Hair attribution have not been verified.

## Remaining integration work (NOT done)
- Select image-editing provider and implement secure *server-side* auth, rate limit, cost controls, image resizing/validation, abuse protection, timeout handling and deletion.
- Before transmitting user photos off-device, establish explicit opt-in and German GDPR disclosure: processor identity, hosting region, storage/deletion retention, legal basis, subprocessors and consent withdrawal. Do not promise that externally processed photos remain on-device.
- Test at least 3 hair types × 2 methods × 2 lengths × 3 real color shades; reject any changes to face/body/background; compare outputs against actual product and installation photographs owned/licensed by Ruby Hair.
- Merchant approves color photography and accurate model expectations, including amount of packs and possible salon blending. Separate from checkout and payment.

## Sources
- Ruby Hair: https://rubyhair.de/produkt/keratin-bondings/ , https://rubyhair.de/produkt/tape-in-extensions/ , https://rubyhair.de/hairguide/
- Keratin mechanism: https://www.greatlengths.com.au/methods/keratin-bond/
- Tape-in mechanism: https://vanityhairsolutions.com/learn/how-to-apply-tape-in-extensions/
- Tape-in maintenance: https://www.petermark.ie/blog/how-to-care-for-your-taped-extensions-or-fillers-at-home/
- Face/shoulder photo validation: https://docs.perfectcorp.com/reference/ai_hair_extension/section/overview/file-specs-and-errors
- Preview limitations: https://wigtryai.com/blog/virtual-hairstyle-try-on-guide
- AI photo-handling distinction: https://docs.tryonvirtual.com/shopify/privacy-and-data/
