const PUBLICATION = 'https://theconstructionedge.substack.com';
const el = (tag, className, text) => { const n = document.createElement(tag); if (className) n.className = className; if (text) n.textContent = text; return n; };
const safeURL = (value, image = false) => {
  try {
    if (!value) return null;
    const u = new URL(value, PUBLICATION);
    if (u.protocol !== 'https:' || u.username || u.password) return null;
    if (image && !['substackcdn.com', 'substack-post-media.s3.amazonaws.com', 'substack-post-media.s3.us-east-1.amazonaws.com'].includes(u.hostname)) return null;
    return u.href;
  } catch { return null; }
};
function inertHTML(html) { const template = document.createElement('template'); template.innerHTML = html; return template.content; }
const plain = html => (inertHTML(html).textContent || '').replace(/\s+/g, ' ').trim();
function externalLink(label, href, className = 'text-link') {
  const a = el('a', className, label); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a;
}
function parseFeed(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror') || !doc.querySelector('rss > channel')) throw new Error('Invalid feed');
  const get = (item, tag) => Array.from(item.children).find(n => n.localName === tag)?.textContent || '';
  const posts = Array.from(doc.querySelectorAll('item')).map(item => {
    const url = safeURL(get(item, 'link'));
    if (!url) return null;
    const link = new URL(url);
    if (link.origin !== PUBLICATION || !/^\/p\/[^/]+\/?$/.test(link.pathname)) return null;
    const description = get(item, 'description');
    const date = new Date(get(item, 'pubDate'));
    return {slug: decodeURIComponent(link.pathname.split('/')[2]), url, title: plain(get(item, 'title')),
      description: plain(description),
      author: plain(get(item, 'creator')) || 'David Chandler',
      timestamp: Number.isNaN(date.getTime()) ? 0 : date.getTime()};
  }).filter(p => p && p.title);
  return [...new Map(posts.map(p => [p.slug, p])).values()].sort((a,b) => b.timestamp - a.timestamp);
}
function dateLabel(post) {
  return post.timestamp ? new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'long',year:'numeric',timeZone:'Australia/Sydney'}).format(post.timestamp) : 'The Construction Edge';
}
function renderCards(container, posts) {
  const limit = Math.min(4, Number(container.dataset.limit) || 4);
  container.replaceChildren();
  posts.slice(0,limit).forEach((post,i) => {
    const card = el('a','live-essay-card'); card.href = post.url;
    const mark = el('div','live-essay-mark'); mark.setAttribute('aria-hidden','true'); mark.append(el('span','',String(i+1).padStart(2,'0')));
    card.append(mark,el('p','eyebrow',dateLabel(post)),el('h3','',post.title),el('p','live-essay-deck',post.description),el('span','read-link','Read on Substack ↗'));
    container.append(card);
  });
  if (!posts.length) container.append(el('p','feed-message','New essays will appear here as David publishes them.'));
}
async function loadJournal() {
  const containers = document.querySelectorAll('[data-journal-feed]');
  if (!containers.length) return;
  const statuses = document.querySelectorAll('[data-feed-status]');
  try {
    const response = await fetch('/api/journal', {signal: AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error('Feed unavailable');
    const data = await response.json();
    containers.forEach(c => renderCards(c, parseFeed(data.xml)));
    statuses.forEach(s => { s.textContent = data.stale ? 'Showing saved essays. Check Substack for the latest posts.' : ''; });
  } catch {
    statuses.forEach(s => { s.textContent = 'The latest essays are available on Substack.'; });
    containers.forEach(c => c.replaceChildren(externalLink('View all essays on Substack ↗', PUBLICATION + '/archive')));
  }
}
loadJournal();
