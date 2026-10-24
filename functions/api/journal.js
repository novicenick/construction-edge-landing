const FEED = 'https://theconstructionedge.substack.com/feed';
const LIMIT = 3 * 1024 * 1024;
const FRESH_MS = 5 * 60 * 1000;
const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
};

export async function readBounded(response) {
  if (!response.body || Number(response.headers.get('content-length')) > LIMIT) throw new Error('feed_size');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0, text = '';
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > LIMIT) { await reader.cancel(); throw new Error('feed_size'); }
      text += decoder.decode(value, {stream: true});
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}

export async function onRequest(context) {
  if (context.request.method !== 'GET' && context.request.method !== 'HEAD') {
    return new Response(JSON.stringify({error: 'method_not_allowed'}), {status: 405, headers: {...headers, Allow: 'GET, HEAD'}});
  }
  const key = new Request(new URL('/api/journal-cache-v1', context.request.url));
  let cached;
  try { cached = await caches.default.match(key); } catch { /* Feed still works without cache. */ }
  const cachedAt = Number(cached?.headers.get('X-Feed-Fetched-At') || 0);
  const respond = (body, status = 200) => new Response(context.request.method === 'HEAD' ? null : body, {status, headers});
  if (cached && Date.now() - cachedAt < FRESH_MS) return respond(await cached.text());
  try {
    const response = await fetch(FEED, {
      headers: {Accept: 'application/rss+xml, application/xml, text/xml'},
      signal: AbortSignal.timeout(10000), redirect: 'error',
    });
    if (!response.ok) throw new Error('upstream_status_' + response.status);
    const xml = await readBounded(response);
    if (!/<rss[\s>]/i.test(xml) || !/<channel[\s>]/i.test(xml) || !/<\/rss>\s*$/i.test(xml) || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('invalid_feed');
    const fetchedAt = Date.now();
    const body = JSON.stringify({xml, fetchedAt, stale: false});
    context.waitUntil(caches.default.put(key, new Response(body, {headers: {
      'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600', 'X-Feed-Fetched-At': String(fetchedAt),
    }})).catch(() => console.warn('journal_cache_write_failed')));
    return respond(body);
  } catch (error) {
    console.warn(JSON.stringify({event: 'journal_feed_unavailable',reason: error.name === 'TimeoutError' ? 'timeout' : 'fetch_or_validation'}));
    if (cached && Date.now() - cachedAt < 3600000) {
      const data = await cached.json();
      return respond(JSON.stringify({...data, stale: true}));
    }
    const reason = /^(upstream_status_\d{3}|invalid_feed|feed_size)$/.test(error.message) ? error.message : error.name;
    return respond(JSON.stringify({error: 'feed_unavailable', reason}), 503);
  }
}
