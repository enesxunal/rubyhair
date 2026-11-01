# Ruby Hair — demo audit and go-live readiness
Date: 2026-11-02
Preview: https://rubyhair.vercel.app
Production: https://rubyhair.de (existing WooCommerce, NOT modified)

## Verified
- Public link/image audit: 57 distinct URLs, 56 successful initially; the shipping-cost URL returned HTTP 404 and has been removed. Valid payment methods page linked in inner footers.
- Browser audit: six routes on 320/390/768/1440 px; no JavaScript page errors and no broken images. One 2 px horizontal overflow on the 320px Tape-in color grid found and fixed.
- Follow-up regression: four routes times four viewports = 16 checks passed, no remaining overflow or shipping 404.
- Current public catalog contains two products, 38 variant combinations (Keratin 11, Tape-in 27). Demo prices and stock are a dated snapshot, NOT real-time truth.
- Verified color and length selection including Tape-in variant change from EUR 160 to EUR 135, with selected values passed to existing WooCommerce product query.
- Live WordPress, checkout, orders and payments remain unchanged. Demo is deliberately noindex,nofollow.

## Critical production blockers
| Priority | Finding | Required next step |
|---|---|---|
| P0 | No native demo cart, shipping/tax calculations, checkout, order creation or payment results. | Integrate or retain real WooCommerce checkout within the final new experience and test valid/failed/abandoned transactions in staging. |
| P0 | Public product prices, variant stock, images are copied to shop-data.json as a static snapshot. | Integrate fresh WooCommerce catalog/stock before release; preserve true prices and variation availability. |
| P0 | No end-to-end new-design purchase test; no main-domain backup, rollback or merchant sign-off. | Staging E2E, verified database/files backup, rollback drill and merchant acceptance before main-domain cutover. |
| P0 | Final shipping/returns/tax disclosures and legal pages not signed off for redesigned store; most links still point at existing WP. | Verify merchant-provided German legal information and maintain accessible valid pages. |

## User experience, content, technical readiness
| Priority | Finding | Action |
|---|---|---|
| P1 | Only one primary photo per variant; insufficient application and detail views. | Collect approved product/color images and application close-ups. |
| P1 | Hair specifications/guides incomplete (grammage, application, care, removability, pack advice). | Request verified facts and present concise product accordions. |
| P1 | Homepage search uses the legacy WooCommerce search and inner pages have no global search. | Unify catalog search, navigation and color discovery. |
| P1 | Cart icon opens legacy shop in new tab, interrupting buying flow. | Unify the final cart/checkout UI and order feedback. |
| P1 | Homepage and inner pages use different headers/footers; inner pages omit the search affordance. | Consolidate responsive shell and shared visual design system. |
| P1 | Currently no verified reviews/testimonials or short delivery/how-to FAQ on product detail pages. | Add approved genuine trust/content material, no fabricated ratings. |
| P1 | Contact, Hair Guide, returns, payment, legal routes still send user to old WordPress design. | Integrate or explicitly retain URLs and preserve redirects when transitioning. |
| P1 | Production SEO items missing: canonical, structured product data, sitemap/redirect mapping and GSC migration. | Prepare only for the final production architecture; preview noindex remains correct. |
| P1 | Production consent/analytics and checkout conversion event tracking absent from static demo. | Integrate only with appropriate cookie/consent controls after checkout design. |
| P2 | External studio video has request abortions on browser transitions; real-device playback and Core Web Vitals not independently confirmed. | Measure/optimize media and validate on physical mobile. |
| P2 | Account, coupons, transactional notifications, order-status UX not supplied by static demo. | Validate existing WooCommerce features remain reachable after integration. |

## Safe corrections in this commit
- Removed broken shipping-cost link; added real verified payment-method page to inner footers.
- Fixed 320px Tape-in card text/price overflow.
- Main hero and selected discover links now go directly to the product collections; popular-search shortcut links go to corresponding categories.
- Changed variation availability text to make clear the price/availability needs confirmation in the live store.

## Sequence
1. Approve six-page visuals, specific product photos and verified details.
2. Connect live WooCommerce catalog, price and inventory data with safe staging.
3. Integrate cart/checkout/shipping and run controlled E2E test orders.
4. Legal, SEO/redirects, analytics consent, mobile speed and functional QA.
5. Merchant final acceptance, verified backup/rollback and MAIN DOMAIN switch LAST.

AI hair try-on is a separate future phase, outside current delivery.
