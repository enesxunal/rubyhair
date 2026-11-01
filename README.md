# Ruby Hair - independent Next.js storefront

Ruby Hair has been migrated away from the WordPress/WooCommerce-based prototype into a Next.js 16 App Router + TypeScript + React 19 project.

## Implementation status (November 2, 2026)

Implemented:
- Quiet-luxury homepage preserved with an isolated transitional HTML-to-Next visual bridge (src/data/home.html). Category, product, cart, search, guide, checkout preview, contact and legal placeholder pages are React/Next components.
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
