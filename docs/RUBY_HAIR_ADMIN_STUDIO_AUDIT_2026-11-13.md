# Ruby Hair Management Studio V2 — Audit and research
Date: 13 November 2026. Scope: new Vercel demo; existing rubyhair.de and checkout unchanged.

## Research references
- Shopify Analytics dashboard and comparisons: https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/overview-dashboard
- Shopify behavior metrics and session definition: https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/behaviour-reports
- Plausible pageview/visitor/session distinctions: https://plausible.io/docs/metrics-definitions
- Baymard filtering and priority of relevant filters: https://baymard.com/blog/ecommerce-filter-ui

## Initial audit and implemented improvements
- Navigation: active-state sidebar, sections, clear Demo/checkout-off signal, mobile horizontal nav, shop preview link.
- Overview: actionable shop-readiness checklist with 5 steps, stock-completeness percentage, short 7-day chart, counts and direct next-action links.
- Analytics: 7/28/90 UTC date periods, same-length previous-period comparison, event-count trend, top pages, cart actions per page, device and referrer distributions, definitions and methodology.
- Analytics export: authenticated, aggregated UTC daily CSV; no identifiers or individual tracking.
- Inventory: null stock means unknown; verified progress, separate zero-stock and unknown counts, quick product navigation.
- Orders: clear nonpaid/test state, actionable empty state without suggesting real sales.
- Payments: separate encrypted credential setup, stored field count, PSP adapter/webhook readiness, sandbox/live and checkout-disabled status.
- Security: no new credentials in code, existing admin session and auth checks retained, no WordPress or order writes.

## Metrics are event counts, NOT people or financial outcomes
- Source: PostgreSQL analytics_aggregates table; consent required. Only day, event, path, source, device and aggregate count stored.
- Recorded: page_view, add_to_cart, begin_checkout. Visitors who deny consent are absent.
- Cannot derive unique visitors, sessions, conversion rates, abandonment, campaign ROI, paid transactions or revenue from aggregates.
- Referrer internal is navigation, not attributable traffic; attribution figures must not be fabricated.
- Periods: inclusive 7, 28, 90 UTC days; comparisons use immediately preceding equal span. A zero baseline shows no percentage.
- Verified paid revenue: unavailable until checkout and signed provider webhooks are enabled. Display an em dash instead of 0 EUR.
- Inventory: SQL null means unknown and numeric 0 means actually out of stock.
- Encrypted PSP keys do not authorize checkout. Production payments remain OFF.

## Audit snapshot (not seeded in app)
Observed on 13 November: 2 products, 38 variants, 38 unknown stocks, 1 consented pageview aggregate, 0 orders and 0 stored payment provider fields. The UI queries data instead of hardcoding those numbers.

## QA and acceptance
- Aggregate period and prior-period boundaries, no fake rates: automated tests.
- CSV requires admin; only daily aggregate counts: source and route checks.
- Desktop admin screenshot and route checks performed on local production server with a local test session.
- Fixed SVG title-node hydration mismatch by using semantic native CSS bar charts; JS-free rendering.
- Responsive navigation/card/table CSS for 850/650px breakpoints. Browser-CDP 390px, 768px and 1440px checks on dashboard, analytics, products and payments all showed zero horizontal document overflow (12/12 checks).
- Regression tests, typecheck and production build mandatory before deploy.
- Real authenticated Vercel session to be verified by owner without sharing password.
- Mobile real-device acceptance pending owner QA.

## Prioritized future work (not activated)
1. Native product media library, inventory CSV, stock reconciliation/audit logs.
2. PSP integration with signed webhooks and verifiable payment-state machine; only then paid-order, AOV and revenue reporting.
3. Legally assessed consent/session or analytics integration, if unique visitor metrics are needed.
4. Compliant UTM campaign analytics; current categorized referrers cannot provide acquisition attribution.
5. Error monitoring and operational audit trail without leaking secrets or customer data.
