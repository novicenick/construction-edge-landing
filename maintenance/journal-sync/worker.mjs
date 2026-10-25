import { XMLParser, XMLValidator } from 'fast-xml-parser';

const FEED = 'https://theconstructionedge.substack.com/feed';
const HOUR = 3600000;
const LIMIT = 3 * 1024 * 1024;
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

export function validateFeed(xml) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) throw new Error('invalid_feed');
  const parsed = new XMLParser({processEntities: false, parseTagValue: false}).parse(xml);
  const channel = parsed.rss?.channel;
  if (!channel || channel.link !== 'https://theconstructionedge.substack.com') throw new Error('wrong_publication');
  const items = channel.item ? (Array.isArray(channel.item) ? channel.item : [channel.item]) : [];
  // Never replace known articles with an empty or incomplete upstream response.
  if (!items.length || items.some(item => !item.title || typeof item.link !== 'string' ||
    !/^https:\/\/theconstructionedge\.substack\.com\/p\/[^/?#]+\/?$/.test(item.link))) throw new Error('invalid_articles');
  return items.length;
}

export async function refresh(env, fetcher = fetch, now = Date.now()) {
  const state = await env.JOURNAL.get('refresh-state', 'json') || {};
  if (state.nextAttemptAt > now) return {skipped: true};
  let retryAt = 0;
  try {
    const response = await fetcher(FEED, {headers: {Accept: 'application/rss+xml, application/xml, text/xml'}, signal: AbortSignal.timeout(15000), redirect: 'manual'});
    const retry = response.headers.get('retry-after');
    if (retry) retryAt = /^\d+$/.test(retry) ? now + Number(retry) * 1000 : Date.parse(retry);
    if (!response.ok) throw new Error('upstream_status_' + response.status);
    const xml = await readBounded(response);
    const count = validateFeed(xml);
    // No expiration: failed refreshes never delete or overwrite the last good feed.
    await env.JOURNAL.put('latest', JSON.stringify({xml, fetchedAt: now}));
    await env.JOURNAL.put('refresh-state', JSON.stringify({lastAttemptAt: now, lastSuccessAt: now, nextAttemptAt: now + HOUR, failures: 0}));
    console.log(JSON.stringify({event: 'journal_refresh_success', count}));
    return {ok: true, count};
  } catch (error) {
    const failures = Math.min((state.failures || 0) + 1, 10);
    const reason = /^(upstream_status_\d{3}|invalid_feed|wrong_publication|invalid_articles|feed_size)$/.test(error.message) ? error.message : error.name === 'TimeoutError' ? 'timeout' : 'refresh_failed';
    const nextAttemptAt = Math.max(now + Math.min(24, 2 ** (failures - 1)) * HOUR, Number.isFinite(retryAt) ? retryAt : 0);
    await env.JOURNAL.put('refresh-state', JSON.stringify({...state, lastAttemptAt: now, nextAttemptAt, failures, reason}));
    console.warn(JSON.stringify({event: 'journal_refresh_failed', reason, nextAttemptAt}));
    return {ok: false, reason};
  }
}

export default {
  async scheduled(controller, env) { await refresh(env); },
  // No public endpoint can trigger a refresh or write to storage.
  fetch() { return new Response('Not found', {status: 404}); },
};
