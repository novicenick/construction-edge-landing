const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
};

export async function onRequest(context) {
  const method = context.request.method;
  if (!['GET', 'HEAD'].includes(method)) return new Response(JSON.stringify({error: 'method_not_allowed'}), {status: 405, headers: {...headers, Allow: 'GET, HEAD'}});
  const respond = (body, status = 200) => new Response(method === 'HEAD' ? null : JSON.stringify(body), {status, headers});
  try {
    const data = await context.env.JOURNAL.get('latest', 'json');
    if (!data || typeof data.xml !== 'string' || !Number.isFinite(data.fetchedAt)) return respond({error: 'feed_not_ready'}, 503);
    return respond({xml: data.xml, fetchedAt: data.fetchedAt, stale: Date.now() - data.fetchedAt > 2 * 3600000});
  } catch {
    console.warn(JSON.stringify({event: 'journal_storage_unavailable'}));
    return respond({error: 'feed_unavailable'}, 503);
  }
}
