# Construction Edge review website

Production remains on main. This branch is website-review.

Published articles are fetched from https://theconstructionedge.substack.com/feed through the same-origin Pages Function /api/journal. The homepage shows the latest three, the Journal shows the current feed, and article.html?post=SLUG renders the feed body in CE styling. A missing slug falls back to the newest post; an unknown or removed slug links to the archive. Paywalled or truncated content is never bypassed: the reader can continue on Substack.

Refresh: each page visit checks the endpoint. Successful feeds are cached for five minutes at the Cloudflare location handling that request. On upstream failure a cached response up to one hour old is shown with a notice; otherwise a direct Substack link is displayed. An empty feed clears the cards. There is no permanent archive database: older posts outside the RSS window remain available via the complete Substack archive link.

The proxy only fetches the fixed publication URL, rejects redirects, caps reads at 3 MiB, applies a 10-second timeout, and does not forward browser cookies or credentials. Only /api/journal invokes a Pages Function. No new secrets or storage bindings are required. The client builds article HTML from an allowlist, drops forms/scripts/iframes and event attributes, restricts image hosts, and renders titles with textContent. Function responses have their own noindex and nosniff headers because Pages _headers does not apply to Functions. Existing contact remains a demonstration. Substack signup remains live.

Static source and functions are at the repository root; no application build command is required. Pages compiles the functions on Git deployment. Review HTML and response headers remain noindex. The public holding page is unchanged.
