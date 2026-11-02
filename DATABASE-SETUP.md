# Ruby Hair - PostgreSQL/Prisma deployment

## Verified on 2 November 2026

- Next.js 16 + Prisma 6.19.1 with PostgreSQL 17 database. An isolated local Docker database was provisioned, and the first migration and seed were applied successfully: 2 products, 38 variants.
- Original physical stock counts were unavailable. They were imported as NULL (unknown), not guessed.
- An admin catalog editor was tested locally: unauthorized access redirects to login, incorrect credentials are rejected, a valid login succeeds, price/stock changes update the PostgreSQL-backed public catalog, restoring the original values succeeds, and logging out closes the session.
- The deployed Vercel preview does NOT have persistent database credentials or admin secrets yet. Until a dedicated database is provisioned, its catalog remains a read-only imported preview.
- The checkout endpoint returns HTTP 503 intentionally. No real orders or payment processing.

## Required production secrets

DATABASE_URL: Dedicated Ruby Hair PostgreSQL connection URL, TLS/SSL required when remote.
ADMIN_EMAIL: Dedicated merchant-approved admin address.
ADMIN_PASSWORD_HASH: Bcrypt password hash, generated locally with npm run admin:hash reading from stdin.
SESSION_SECRET: Unique cryptographically secure secret of at least 32 characters.
PAYMENT_PROVIDER_SECRET: Only after an approved payment provider is implemented.

Never commit secrets to Git, put them in browser code or reuse production secrets in staging.
The bcrypt hash contains dollar signs; in a local dotenv file escape each dollar as backslash-dollar to prevent Next environment variable interpolation. In Vercel dashboard, use the unescaped hash value.
There are no default admin credentials or public sign-up endpoints.

## Provisioning a dedicated production-ready PostgreSQL server

1. Choose managed EU-hosted PostgreSQL with encrypted connections, monitoring and verified automated backups, or an explicitly secured dedicated VPS. Never point production to the Mac local Docker test instance.
2. Create a separate database with least-privilege app credentials. Restrict network access where possible and enable TLS.
3. Set application secrets in the specific Vercel environment only. Do not share preview and production secrets.
4. Review and deploy the Prisma migration against isolated staging first with npm run db:migrate.
5. Only seed after verification, using SEED_CONFIRM=RUBY_HAIR_IMPORTED_SNAPSHOT npm run db:seed. Re-seeding skips previously edited variants and products.
6. Reconcile all 38 variation prices, official images and actual stock figures. The imported stock is unknown, not a verified count.
7. Check admin login and edit/restore under staging. Verify live API catalog source is postgresql, test backup restoration and confirm payment/order endpoints remain disabled.
8. Prepare reviewed German legal pages, shipping, tax, payment integration and real end-to-end order tests before switching rubyhair.de.
9. Do not lift noindex or change the existing WordPress production site until final acceptance and rollback rehearsal.

## Local development

A dedicated Docker container named rubyhair-dev-postgres is running PostgreSQL 17 for this project, bound to 127.0.0.1:55439 only, with a persistent volume rubyhair-dev-postgres-data. The database password is in the ignored local .env file, not in Git or Vercel.

Commands:
- npm install
- npm run db:generate
- npx prisma migrate dev (new development schema changes only)
- npm run db:migrate (deploy reviewed migrations)
- SEED_CONFIRM=RUBY_HAIR_IMPORTED_SNAPSHOT npm run db:seed
- npm run dev
- npm run typecheck
- npm test
- npm run build

Local backup check: run pg_dump -Fc against the container, save into a protected local directory (never public/ or Git), and test restore into a different disposable database.

## Security and scope notes

- Admin requires bcrypt credentials, HS256-signed HttpOnly/SameSite Strict cookies (8 hours), per-IP failed-login throttling in PostgreSQL and server-action authorization checks. A third-party security review and reverse-proxy IP trust verification remain before taking live customer data.
- Database-backed product/variation/stock editing is implemented. Admin order management is NOT enabled, and orders/payments tables exist only as future schema.
- Browser cart remains a preview, and future checkout must recompute price, availability and stock server-side in an atomic transaction before charging.
- WordPress/WooCommerce is not used by the new Next.js runtime. The existing rubyhair.de production shop remains unchanged until final migration.

## Cart quotation and content editing

- Read-only POST /api/cart/quote validates unique IDs, quantity and product availability; it performs no write and never accepts customer-provided prices.
- Unknown stock is reported explicitly and does not enable actual checkout. Card payments, shipping, taxes and invoices are not implemented.
- Admin product editor restricts image paths to existing local /media files. Full new-product/new-variation support needs a UUID-safe cart model before release.
- Final production hosting will use WebAltyapı, not Vercel; WebAltyapı database and rubyhair.de domain cutover are deferred until approved domain transition. Vercel remains a non-transactional preview.

## Internal local test order service - 2 November 2026

The reviewed schema migration `20261102094500_local_test_order_reservations` adds an idempotency key, request digest, test-only flag, reservation expiration timestamp and expiry index. It was applied only to the isolated local `127.0.0.1:55439` development database, never the public WordPress or Vercel database.

- `src/lib/order-reservations.ts`: `reserveLocalTestOrder(db, request)`, `endLocalTestReservation(db, id)` and `expireLocalTestReservations(db)`; no public route imports them. The existing public `POST /api/checkout` still returns HTTP 503.
- Explicit protection requires `RUBY_LOCAL_ORDER_TESTS=LOCAL_TEST_ONLY`, a loopback PostgreSQL URL and not running on Vercel. No prices, personal information, shipping or tax values can be supplied by callers; unit and line prices are read from PostgreSQL.
- Physical stock NULL, inactive/unavailable products and insufficient inventory fail closed. Conditional per-variant `updateMany` with `stockQuantity >= quantity` inside a single PostgreSQL transaction prevents negative inventory and rolls back partial orders. Variant locks are acquired in stable ID order.
- Reservations use test-only `test_reserved`, `test_cancelled`, `test_expired` statuses and 15-minute hold timestamps. Duplicate idempotency keys return the original test order only when request contents match. Cancellation and manual expiration restore stock once.
- `npm run test:orders` runs synthetic order/stock tests in local PostgreSQL: snapshots, idempotency, insufficient/missing stock, concurrent oversell prevention, cancellation, manual expiry, test gate and automatic cleanup. It cleans all synthetic test products, variants, order lines and orders. Do not run this against live merchant data.
- **Limitations:** This is *not* real checkout. Holds are not automatically expired by a scheduled worker, shipping/tax/payment are not calculated, customer verification and payment events are not implemented. Before production, implement automatic expiry, inventory reconciliation after payment, refunds/chargebacks, fraud protections, final legal obligations, identity/address validation and approved payment integrations. No real orders until then.
