# Ruby Hair — official Instagram feed and authorization
Updated 14 November 2026. New Vercel demo only; existing rubyhair.de WordPress unchanged.

## Current live state
- @rubyhair.de account link and Instagram section exist on the homepage.
- User explicitly rejected four local editorial/AI images masquerading as recent Instagram content. Those four image tiles were removed from the Instagram section. Without a valid authorized account connection, visitors see a compact Ruby Hair profile CTA.
- Real Instagram media are NEVER fabricated, scraped from public profile HTML, or represented by unrelated editorial images.

## Automatic recent-media implementation
- Backend src/lib/instagram-feed.ts reads the account's latest media using Meta's official Graph API with an owner-authorized token, requesting id, media_type, media_url, thumbnail_url, permalink, timestamp and caching for approximately one hour.
- Show the first four validated live media items when available. Image and Reel thumbnail links are accepted only from Instagram/Facebook's approved CDN hostnames.
- New route app/api/instagram-thumbnail/[id]/route.ts proxies real media image bytes from the authorized account's verified four items, with TLS-only image host allowlist, no redirects, image MIME/size caps and caching. User browsers do not automatically connect to Meta's image CDN; no private token is exposed.
- After media authorization, the page draws four real recent Instagram posts with links to their original Instagram post/Reel. No extra load-images click is necessary.
- If token missing/expired or API/media request fails, show only the official Instagram profile link and no fake feed.

## Missing owner authorization (NOT connected)
- Production currently has no RUBY_INSTAGRAM_ACCESS_TOKEN environment variable; Metricool currently reports no connected social network. Automated real media display cannot work without owner permission.
- Ruby Hair Instagram needs to be a Professional/Creator account with owner access. Via Meta Developer app with Instagram Login, grant instagram_business_basic. Official graph.instagram.com backend requires the app-authorized Instagram User token.
- Store owner-approved RUBY_INSTAGRAM_ACCESS_TOKEN as Vercel Production Secret, not in source, browser JS, screenshots or chat.
- For Facebook Login instead: RUBY_INSTAGRAM_GRAPH_MODE=facebook and RUBY_INSTAGRAM_USER_ID numeric ID (only if authorized).
- Redeploy, verify real post data and image proxy. Maintain token expiry/refresh workflow; access may expire if not refreshed or revoked.
- Never substitute scraped images as latest posts. The screenshot showed the former local four-image editorial placeholder, which was removed.

## QA
- Tests: post URL/CDN host validation, numeric ids, server-only token, no editorial fakes, image proxy checks, route rejection without token, homepage rendering and production build.
- Network access does not rely on instagram.com scraping; only official Meta API after account authorization.

Meta documentation: https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/v21.0/
