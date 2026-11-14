# Ruby Hair — real Instagram profile feed (14 November 2026)

## Live plan and verification
- Open profile: https://www.instagram.com/rubyhair.de/
- Tested the official Instagram profile-embed endpoint: https://www.instagram.com/rubyhair.de/embed/
- Verified in a clean normal Chrome session WITHOUT login or owner API token. The embed shows the actual Ruby Hair profile, follower count, and six current profile post thumbnails. Some profile posts are collaborations with other accounts (for example @hairboutiique); Instagram itself chooses which posts to display.
- Verified native iframe works from a separate local site, and in the actual Ruby Hair Next.js page under desktop Chrome and 390 px mobile Chrome. Mobile screenshot confirms six real profile posts and zero page-level horizontal overflow.
- The Instagram native profile embed is not a scraping or unofficial JSON API. It serves and refreshes its own public content, and does not require collecting images on the Ruby Hair server.
- On first visit: explicit 'BEITRÄGE ANZEIGEN' button to load external Meta media (German privacy consent). Local browser consent is remembered. A revoke button hides the iframe and removes remembered permission.
- If a future user opts into Instagram media, the original Instagram profile embed appears. If not, a branded consent card and direct @rubyhair.de link appear. No fake post snapshots or local editorial images.
- Original Ruby Hair page, hero, catalog, admin, and disabled checkout untouched.

## Trade-offs and limitations
- Instagram decides embed design, number and ordering of posts. It currently shows about six posts, NOT a custom exactly-four grid. We cannot change inner iframe content or branding.
- Native profile iframe requires that the public Instagram account allows embedding, and availability can change. If Meta disallows the embed later, fall back to account link.
- Client directly connects to Instagram only after explicit opt-in; third-party tracking disclosure and legal privacy wording should be reviewed by Ruby Hair.
- Official Instagram API custom-four-card integration remains an optional path if owner later grants an access token. Previous work in src/lib/instagram-feed.ts remains available; it is not required for native embed operation.
- Avoid automated scraping: Instagram robots.txt prohibits unauthorized automated collection and browser HTML is not a documented data API.

## QA
- Independent normal Chrome test on public profile and /embed endpoint: PASS
- Embedded from another local domain: PASS
- Ruby Hair desktop site iframe: PASS
- Ruby Hair 390 px mobile iframe: PASS; no horizontal overflow
- Project automatic tests + Next production build: PASS
