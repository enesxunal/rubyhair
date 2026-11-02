# Ruby Hair - independent Next.js storefront

Ruby Hair has been migrated away from the WordPress/WooCommerce-based prototype into a Next.js 16 App Router + TypeScript + React 19 project.

## Implementation status (November 2, 2026)

Implemented:
- Quiet-luxury homepage rebuilt as native Next.js/React components (src/components/home-frontend.tsx), with dynamic featured products from the server catalog. Category, product, cart, search, guide, checkout preview, contact and legal placeholder pages are also React/Next components.
- Independent catalog imported as src/data/products.json: 2 products, 38 variants. 32 approved-source media files imported to public/media/ and brand assets stored locally. No runtime WordPress API or WooCommerce dependencies.
- Color and length variation selection, local images/prices and client-side cart with quantity updates and browser-local persistence.
- Read-only /api/catalog under Next.js. Unlike the previous prototype, it reads the imported local data, not WooCommerce.
- Custom PostgreSQL commerce schema in db/schema.sql.
- /api/checkout returns HTTP 503; no real orders/payments/customer data collection.
- robots.txt denies indexing of the design preview. No approved live legal texts exist yet; placeholders are labeled.

Not yet implemented:
- Provisioned and connected PostgreSQL/Supabase project with secure catalog management and reservations.
- Authorized admin login, catalog/stock CRUD, order management and account services.
- Payment gateway, shipping/tax configuration, invoice/email notifications, signed webhook validation and complete transaction/refund E2E tests.
- Merchant-approved Impressum/Datenschutz/AGB/Widerruf, final specs, SEO transition and backup/rollback.
- Formal conversion of homepage bridge to native React sections; current layout preserved.

Previous HTML and WooCommerce code archived under archive/legacy-preview and not used by Next.js runtime.

## Commands
npm install
npm run dev
npm run typecheck
npm run build
npm test

This preview remains non-transactional. Public prices are imported references; never enable payments until secure database-backed, server-authoritative transaction handling is implemented and tested.

rubyhair.de production WordPress remains unchanged until Next.js go-live acceptance. AI try-on remains separate future scope.

## PostgreSQL and administrator panel (2026-11-02)

- Prisma 6.19.1 PostgreSQL models, generated client, migration and confirmation-gated import in the prisma folder.
- When DATABASE_URL is configured, storefront category/product/search and read-only API use PostgreSQL. With no DB, the design preview uses a labeled imported snapshot. A configured but unavailable database returns a 503 response rather than concealing stale pricing.
- The private /admin/login and /admin routes support bcrypt password authentication, signed HTTP-only sessions, login throttling, and editing variant price/stock/availability. Public Vercel credentials have not been provisioned yet.
- Stock counts were unknown in the source catalog, so they were imported as NULL. Payment/order creation remains disabled.
- Full deployment and operator setup notes: DATABASE-SETUP.md.

## Server-verified cart quote and product administration (2026-11-02)

- POST /api/cart/quote validates up to 30 unique variation IDs and up to 99 total units, recalculating prices in cents from the server-side PostgreSQL catalog (or explicitly labeled preview snapshot); arbitrary client prices are rejected.
- Quotes distinguish unverified stock, insufficient inventory and unknown variants and never activate checkout.
- Cart summary and per-item prices now use the server quote, not the browser's editable price data.
- Authenticated product form updates name, headline, intro, pack, material, active status and local media image. Full product and variant creation is a future UUID/cart phase.
- Local PostgreSQL product editing/restore and quote negative paths have been tested. No real orders were created.

## Customer-facing site first (November 2, 2026)

The owner prioritized finishing the storefront before additional admin-panel features. The homepage is now entirely React rather than an injected HTML page with legacy JavaScript. Its hero, collection photography, shade selector, studio video and footer retain the approved design. The four product cards are resolved against the current server catalog, not manually duplicated product prices. The header cart badge reads React cart state. Mobile menu, shade buttons, image links and product routes are tested at seven breakpoints.

Database status: The local development PostgreSQL contains two product families and 38 variants. The Vercel preview does not have DATABASE_URL configured and intentionally reads imported-preview product data. Real inventory quantities are unknown until client verification (38 NULL); the preview cannot accept orders or payments. No changes to rubyhair.de or WebAltyapi hosting.

## Customer-facing Hair Guide, support and product guidance (2026-11-02)

- Rebuilt /ratgeber/ as a branded, responsive Hair Guide: source-based Keratin/Tape-in pack contents, selection advice, care steps (wash gently, brush damp rather than wet, dry/loose braid before bed, keep stylist appointments) and seven practical FAQs.
- Rebuilt /kontakt/ with confirmed Ruby Hair email info@rubyhair.de, studio address Klara Strasse 19, 45130 Essen, Instagram and a map link.
- Contact composer uses browser mailto: it opens the customer's email program with their prepared message. It does not silently send messages, store contact data or create an API request. Real SMTP/contact form will require explicit customer-approved server credentials and anti-abuse controls.
- Updated product detail guidance and linked Hair Guide/Contact; no claimed shipping price, returns policy or delivery time is invented for the future shop.
- Public copy/facts were verified against Ruby Hair's currently published product pages, public Impressum and Hairguide on rubyhair.de on November 2, 2026. Business/legal details must be reconfirmed with the merchant before go-live.
- The legal pages remain clearly marked as unapproved preview placeholders. The new shop is intentionally noindex and checkout disabled. Vercel remains temporary preview; WebAltyapi cutover is deferred.

## Shop front-end decisions and merchant policy verification (2026-11-02)

- Product pages now have keyboard-accessible image enlargement, actual selected-color thumbnails and a separately labeled generic collection image. These are not implied to be alternate photographs of the selected hair shade.
- Unknown physical stock is explicitly shown as unconfirmed; all previews still reject real orders and payments.
- The new /versand-zahlung information page and links from cart, checkout, both footer layouts and product descriptions clearly explain that new-site shipping, payment and return policies are not approved.
- MERCHANT-APPROVAL.md documents source-supported existing business/product claims and important inconsistencies between the old site's AGB, return policy, Impressum and privacy notice. This is an internal approval checklist, not published legal advice.
- Do not publish copied old legal texts without merchant and qualified German legal review. Existing WordPress production, DNS and WebAltyapi provisioning remain unchanged.

## November 2 - product catalogue QA and buyer-facing checkout preview

- All 38 variation IDs are unique, and all 38 local product image references exist. 21 distinct pictures are reused between colors, methods or lengths. A suspected cross-shade mapping (Tape-in EVE / Keratin 1006) requires merchant verification, not an unapproved image replacement.
- A detailed 38-line import inventory is maintained at reports/catalog-38-variants.csv with review notes at reports/catalog-review.md. No physical stock count is verified.
- Cart shows server-checked price status and uncertainty on each item. The browser hydration loading state avoids briefly reporting an empty saved cart. The return link preserves both color and length.
- The checkout page is a non-transactional buyer experience preview: a clear three-step process and a read-only server-quoted item summary, with no personal address/payment fields. It never creates orders and payment remains HTTP 503.
- Final hosting remains WebAltyapi only after authorized domain transfer; the Vercel demo is a noindex staging preview.
