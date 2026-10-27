# Construction Edge Advisory

Production website for Construction Edge Advisory. It is a static Cloudflare Pages site.

The homepage shows up to four essay cards from the latest saved snapshot of David Chandler’s Substack, [The Construction Edge](https://theconstructionedge.substack.com). Each card links to that essay on Substack. There is no on-site article reader. `/journal` and `/journal.html` redirect to the Substack archive. `/article.html` redirects to `/article`, which sends a valid post slug to the matching Substack essay or otherwise to the archive.

`/api/journal` only reads the `latest` record from the `JOURNAL` KV binding. A page visit does not fetch Substack. The scheduled Worker in `maintenance/journal-sync/` refreshes the public RSS feed and replaces that snapshot only when the feed validates. The homepage renders cards from the snapshot. Essays outside the saved feed stay on the Substack archive.

The contact form is a native POST to `https://formspree.io/f/mqppakkv`. Formspree handles spam checks and email notification; the recipient address is not in this repository. The named email field supplies Reply-To. The form works without JavaScript. Newsletter signup is the Substack embed and is managed by Substack.

The Formspree thank-you redirect for form `mqppakkv` must point at the production `/thank-you` page (`https://constructionedge.com.au/thank-you`). Set that under the form’s Settings → Redirect. This repository does not change the Formspree account. After saving the redirect, submit a test enquiry and confirm both the redirect and the email receipt. If Formspree restricts domains, allow `constructionedge.com.au`.

Static source and Pages Functions are at the repository root. No application build is required. Keep the `JOURNAL` KV binding on the production Pages project. The Worker is deployed separately from Pages; edits under `maintenance/journal-sync/` need an explicit Worker upload.
