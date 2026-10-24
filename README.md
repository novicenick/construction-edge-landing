# Construction Edge: review draft

Preview-only branch for reviewing the proposed Construction Edge website. The production branch is main.

- Static HTML, CSS and JavaScript with local fonts and image assets.
- The Journal and essay illustrate the intended reading experience; sample copy is clearly labelled.
- The live publication is https://theconstructionedge.substack.com/. The homepage, Journal and sample article use its official /embed signup, with a direct /subscribe fallback. Subscriptions go directly to Substack.
- Published writing is linked through the publication and its /archive page. Automatic article syncing is not implemented. On 24 October 2026 the publication showed Coming Soon; the clearly labelled sample cards remain for layout review.
- The review banner distinguishes live Substack signup from the demonstration enquiry form. Only the exact publication origin is permitted in frame-src; no external scripts run in the parent page.
- The enquiry form demonstrates validation and feedback, without a backend. It sends and stores nothing.
- No personal enquiry email address or telephone number is included in this branch.
- Pages _headers applies noindex/nofollow/noarchive to every response. Each HTML page also contains a noindex meta tag. The preview is unlinked, not access controlled.

The supplied David Chandler photograph is used for review. Confirm publication permission and the photographer credit before production release.

The complete static source is in this directory. No build command is required.
