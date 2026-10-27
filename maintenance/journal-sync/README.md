# Construction Edge Journal sync

The Pages `/api/journal` endpoint only reads the `latest` record in the `JOURNAL` KV binding. Page visits never fetch Substack. Preview and production Pages environments both need the JOURNAL binding.

Cloudflare Worker `construction-edge-journal-sync` refreshes the fixed public RSS feed hourly at minute 17 UTC. After failures it backs off from one hour to a maximum 24-hour interval and honours a longer Retry-After. It has no public refresh route. Logs and the KV `refresh-state` record hold operational status.

Only a validated, non-empty feed from this publication replaces `latest`. Records have no expiration. Empty/malformed/error responses retain the previous successful snapshot indefinitely. Successful refreshes reflect edits and removals in the current RSS feed; this is not a permanent archive of every post.

The initial `latest` record was restored from the successful public feed retrieval on 24 October 2026, retaining its original fetchedAt timestamp. It was then updated from a fresh validated public feed on 26 October 2026 (Sydney time), including David’s latest edits to the welcome article. It contains only published content, not unpublished editorial drafts. The UI labels snapshots older than two hours as saved articles.

Storage namespace: `ede7c679582549c0ac14f80c869795c6` (construction-edge-journal).

## Build and deploy

Install pinned dependencies with `npm ci`; bundle with `npx esbuild worker.mjs --bundle --format=esm --platform=browser --minify --outfile=worker-bundle.mjs`.

Upload the bundle as an ES module Worker with KV binding JOURNAL, compatibility date 2026-10-25, nodejs_compat, observability enabled, and schedule `17 * * * *`. The date is the latest accepted by the deployment API when configured on 26 October Sydney time.

Pages source is `functions/api/journal.js`. Keep its JOURNAL binding on the production Pages project. The scheduled Worker is deployed separately from Pages; future edits to this folder require an explicit Worker upload.

To inspect refresh health, read KV key `refresh-state` or Worker logs. To remove an article urgently during an upstream outage, replace the saved feed with a validated edited snapshot through the authenticated KV API. Do not add a public write endpoint.
