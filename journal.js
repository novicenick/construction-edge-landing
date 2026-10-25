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
    const content = get(item, 'encoded');
    const description = get(item, 'description');
    const date = new Date(get(item, 'pubDate'));
    return {slug: decodeURIComponent(link.pathname.split('/')[2]), url, title: plain(get(item, 'title')),
      description: plain(description), content: content || description, hasBody: Boolean(content),
      author: plain(get(item, 'creator')) || 'David Chandler',
      timestamp: Number.isNaN(date.getTime()) ? 0 : date.getTime()};
  }).filter(p => p && p.title);
  return [...new Map(posts.map(p => [p.slug, p])).values()].sort((a,b) => b.timestamp - a.timestamp);
}
function dateLabel(post) {
  return post.timestamp ? new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'long',year:'numeric',timeZone:'Australia/Sydney'}).format(post.timestamp) : 'The Construction Edge';
}
function sanitise(html) {
  const source = inertHTML(html), result = document.createDocumentFragment();
  const allowed = new Set(['p','h2','h3','h4','ul','ol','li','blockquote','strong','b','em','i','a','br','hr','figure','figcaption','img','pre','code','table','thead','tbody','tr','th','td','sup','sub']);
  const drop = new Set(['script','style','iframe','object','embed','svg','math','form','input','button','textarea','select','link','meta','noscript','video','audio']);
  function copy(node,parent) {
    if (node.nodeType === 3) { parent.append(document.createTextNode(node.textContent)); return; }
    if (node.nodeType !== 1 || drop.has(node.localName)) return;
    if (/subscription-widget|subscribe-widget|button-wrapper/.test(node.className || '')) return;
    if (!allowed.has(node.localName)) { node.childNodes.forEach(n => copy(n,parent)); return; }
    if (node.localName === 'img') {
      const src = safeURL(node.getAttribute('src'), true); if (!src) return;
      const image = el('img'); image.src = src; image.alt = node.getAttribute('alt') || ''; image.loading = 'lazy'; image.decoding = 'async'; parent.append(image); return;
    }
    const target = el(node.localName);
    if (node.localName === 'a') {
      const href = safeURL(node.getAttribute('href')); if (href) { target.href = href; target.target='_blank'; target.rel='noopener noreferrer'; }
    }
    node.childNodes.forEach(n => copy(n,target)); parent.append(target);
  }
  source.childNodes.forEach(n => copy(n,result)); return result;
}
function renderCards(container, posts) {
  const limit = Number(container.dataset.limit) || posts.length;
  container.replaceChildren();
  posts.slice(0,limit).forEach((post,i) => {
    const card = el('a','live-essay-card'); card.href = 'article.html?post=' + encodeURIComponent(post.slug);
    const mark = el('div','live-essay-mark'); mark.setAttribute('aria-hidden','true'); mark.append(el('span','',String(i+1).padStart(2,'0')));
    card.append(mark,el('p','eyebrow',dateLabel(post)),el('h3','',post.title),el('p','live-essay-deck',post.description),el('span','read-link','Read the essay ↗'));
    container.append(card);
  });
  if (!posts.length) container.append(el('p','feed-message','New essays will appear here as David publishes them.'));
}
function renderArticle(post) {
  document.title = post.title + ' | The Construction Edge';
  document.querySelector('#article-title').textContent = post.title;
  document.querySelector('#article-deck').textContent = post.description;
  document.querySelector('#article-author').textContent = post.author;
  document.querySelector('#article-date').textContent = dateLabel(post);
  const body = document.querySelector('#article-body'); body.replaceChildren(sanitise(post.content));
  const nav = document.querySelector('#article-contents'); nav.replaceChildren();
  body.querySelectorAll('h2,h3').forEach((heading,i) => { heading.id = 'section-' + i; const a = el('a','',heading.textContent); a.href = '#' + heading.id; nav.append(a); });
  document.querySelector('.article-aside').hidden = !nav.childElementCount;
  document.querySelector('#article-source').replaceChildren(externalLink('Read or discuss on Substack ↗',post.url));
  document.querySelector('#article-end').replaceChildren(el('p','', 'This is the text supplied by David’s public Substack feed. Continue on Substack for any additional content and discussion.'), externalLink('Continue on Substack ↗', post.url));
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) { canonical = document.createElement('link'); canonical.rel='canonical'; document.head.append(canonical); }
  canonical.href = post.url;
}
async function loadJournal() {
  const containers = document.querySelectorAll('[data-journal-feed]');
  const article = document.querySelector('#article-body');
  if (!containers.length && !article) return;
  const statuses = document.querySelectorAll('[data-feed-status]');
  try {
    const response = await fetch('/api/journal', {signal: AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error('Feed unavailable');
    const data = await response.json(); const posts = parseFeed(data.xml);
    containers.forEach(c => renderCards(c,posts));
    if (article) {
      const slug = new URLSearchParams(location.search).get('post');
      const post = slug ? posts.find(p => p.slug === slug) : posts[0];
      if (!post) {
        document.querySelector('#article-title').textContent = 'Find this essay on Substack.';
        document.querySelector('#article-deck').textContent = 'This article is not in the current feed. Browse David’s complete publication archive.';
        article.replaceChildren(externalLink('Browse the Substack archive ↗',PUBLICATION+'/archive'));
        document.querySelector('.article-aside').hidden=true;
      } else renderArticle(post);
    }
    statuses.forEach(s => { s.textContent = data.stale ? 'Showing saved articles while we check for updates. Visit Substack for the latest posts.' : ''; });
  } catch {
    statuses.forEach(s => { s.textContent='The articles could not be loaded right now. You can still read them on Substack.'; });
    containers.forEach(c => c.replaceChildren(externalLink('Read The Construction Edge ↗',PUBLICATION)));
    if (article) {
      document.querySelector('#article-title').textContent = 'Read The Construction Edge.';
      document.querySelector('#article-deck').textContent='David’s essays are available on Substack.';
      article.replaceChildren(externalLink('Browse the Substack archive ↗',PUBLICATION+'/archive'));
      document.querySelector('.article-aside').hidden=true;
    }
  }
}
loadJournal();
