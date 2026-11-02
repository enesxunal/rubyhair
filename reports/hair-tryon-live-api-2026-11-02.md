# Ruby Hair – Live KI hair-edit prototype activation (2 November 2026)

## Status
A REAL image-edit API request handler and browser integration are implemented. **No paid AI call has run and live generation is NOT enabled**, because no `OPENAI_API_KEY` or closed `RUBY_TRYON_TEST_CODE` is configured in the Ruby Hair deployment.

This feature is **an internal closed test**, not a live retail feature and not included in the previously approved web build fee. It must not be enabled for the general public until the merchant and its privacy/legal reviewer approve the processing.

## How it works after activation
1. Open `/haar-anprobe`. Choose Keratin/Tape-in, real local-catalog product shade, available length, estimated density.
2. Upload an authorized portrait locally. UI auto downsizes to JPEG (maximum 1280 px wide / 1536 px high, under 3.5 MB) for the outgoing request; original remains in browser.
3. Enter the private test access code and explicitly approve one-time processing by OpenAI.
4. Click **Saçımda Dene · Haare virtuell verlängern**.
5. Private `POST /api/tryon/generate` validates same origin, explicit consent, test code, real selected variant, bytes/magic/type and size.
6. Server reads the matching local Ruby Hair shade photo from `public/media`, sends **the person's photo and that shade reference** in a single multipart image edit request to OpenAI with a strict instructions prompt to preserve face/identity, background and clothing while extending/blending only the hair.
7. The resulting WebP is sent back in the response and displayed as the AFTER image in the existing slider. No customer photo or result is stored in the site's PostgreSQL, filesystem or localStorage.

**Chosen model:** `gpt-image-2.5-sunburst` through `POST https://api.openai.com/v1/images/edits`; output 1024 × 1536, medium quality, WebP compression 65. Per-call cost and image quality have not been evaluated; the provider account requires image-model access and billing. References:
- https://developers.openai.com/api/reference/resources/images/methods/edit
- https://developers.openai.com/api/docs/guides/image-generation

## Activation
In the **Vercel environment only**, set:
- `OPENAI_API_KEY`: approved server-only OpenAI API project key with image edit access and an account cost budget.
- `RUBY_TRYON_TEST_CODE`: independently generated random code of at least 12 characters; share only with approved testers by secure channel.

Set these in the required preview/staging Vercel environment rather than putting them in source code, public JS, screenshots, chat transcripts, or .env.example. Redeploy after setting. The route refuses all POST requests with HTTP 503 before both are present. The public browser checks `GET /api/tryon/generate` to disable the button until the test is activated. The client never receives the API key or the expected test code.

## Safety and privacy
- One-time photo transmission happens **only after explicit opt-in** and a button click. Without activation, images remain in browser memory and no upload occurs.
- Source photo maximum 3.5 MB (client compression). Server checks MIME/magic, approved catalog selection and local swatch, consent, origin and test code.
- In-process per-IP/session test rate cap: 3 attempts per 20 minutes; **NOT durable across multiple Vercel instances or deploys**, so test access code and separate provider billing/usage cap remain mandatory. Public access would need distributed limits, audit/budget accounting, abuse controls, authenticated roles, and a proper privacy processing agreement.
- No image bytes, test code or provider key are intentionally logged by the app. Provider-side retention, international transfers, data-subprocessor terms, notices and legally valid consent must be reviewed before consumer activation; a source-labelled preview disclosure is added to the local Datenschutz view. The existing legal pages remain unapproved.
- Browser outputs are temporary object/data URLs and can be cleared. Test image input MUST be owned/authorized by the uploader.

## Verification
- `npx tsx scripts/test-hair-tryon-api.ts` exercises fail-closed mode, origin/consent/code/variant/file validation, 3 successful **mocked** provider calls with both images and correct selected product color/length, and rejection of over-limit attempts.
- `npm test` architecture regression ensures the route and the browser consent flow exist.
- `npm run typecheck`, `npm run build` and browser responsive tests confirm app readiness (record final results at deployment).
- **No real photo-edit output quality can be claimed until a real API call completes with merchant-approved photos.** Product shade photographs EVE / Keratin 1006 may share imported references; actual color fidelity still needs verification.

## Unchanged
Payment, SMTP, public checkout (503), admin auth, original WordPress `rubyhair.de`, DNS, WebAltyapı and customer data remain unchanged.
