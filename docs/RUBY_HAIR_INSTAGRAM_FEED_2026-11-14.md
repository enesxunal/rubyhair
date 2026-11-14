# Ruby Hair — Instagram home section (14 November 2026)

## Current behavior
- Instagram section after the studio block, before the footer.
- Official account: https://www.instagram.com/rubyhair.de/
- Until the authorized Meta feed is connected, four cards show existing Ruby Hair *editorial website images*, clearly labelled as editorial, not as recent Instagram posts.
- After connecting, four actual recent posts are retrieved server-side from Meta media endpoint, refreshed hourly.
- Visitor must click "Beiträge anzeigen" before their browser requests external Instagram CDN images. No Meta embed.js or tracking scripts are included.
- If the API fails, expires or is unauthorized, the section falls back to editorial preview. No fabricated post URLs or dates.

## Required authorized integration
1. Ruby Hair Instagram must be a Professional (Business/Creator) account that grants read permission via a Meta app.
2. With Instagram Login: store RUBY_INSTAGRAM_ACCESS_TOKEN as a Vercel Production Secret. API uses graph.instagram.com/v27.0/me/media with server-side Bearer authorization.
3. With Facebook Login: also configure RUBY_INSTAGRAM_GRAPH_MODE=facebook and RUBY_INSTAGRAM_USER_ID as the linked account's numeric Instagram ID. API then uses graph.facebook.com.
4. Redeploy and verify a real, authorized token. Maintain token refresh/expiry rules according to Meta policies.
5. Never place the access token in source, browser JS or public environment variables.

## Limits
- Public Meta oEmbed embeds a specific post URL. It cannot retrieve the newest posts from a profile.
- Do not scrape public Instagram profile HTML, nor pretend the fallback editorial images are live Instagram posts.
- Metricool has no social network connected. Auto-feed is not yet active.
- This work touches only rubyhair.vercel.app demo, not rubyhair.de WordPress.

## Label changes
- Tape-in 45–50 cm
- Tape-in 55–60 cm

Established URL keys 45-50-cm / 55-60-cm and actual variants remain unchanged. The formerly visible Kurz/Lang names were removed from home navigation, collection cards, footers and Hair Guide. No prices, stock, payment or KI generation logic was changed.
