// Shared keyless news fetchers (used by api/news.js on Vercel and the Vite
// dev middleware in vite.config.js). Same idea as _cricket.js / _football.js:
// public feeds, no API key, no daily quota.
//
//   category tabs → BBC News RSS (images + direct links, reader works)
//   sports        → ESPN news JSON (cricket + soccer, merged by date)
//   ?q= search    → Google News RSS (no images, redirect links → external)
//
// Output shape (GNews-compatible so the client mapper barely changes):
//   { id, title, description, url, image, publishedAt, source: { name, url }, external? }

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const TIMEOUT_MS = 10000;

// app pill id → BBC feed path segment ('' = top stories)
export const BBC_SECTION = {
  all: '',
  world: 'world',
  business: 'business',
  technology: 'technology',
  science: 'science_and_environment',
  health: 'health',
  entertainment: 'entertainment_and_arts',
};

export const NEWS_CATEGORIES = new Set([...Object.keys(BBC_SECTION), 'sports']);

export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

async function fetchText(url, accept) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: { 'User-Agent': UA, Accept: accept },
    });
    if (!res.ok) throw httpError(502, `Upstream ${new URL(url).hostname} returned ${res.status}`);
    return await res.text();
  } catch (e) {
    if (e?.name === 'AbortError') throw httpError(504, `Upstream ${new URL(url).hostname} timed out`);
    throw e.status ? e : httpError(502, e?.message || 'Upstream unreachable');
  } finally {
    clearTimeout(t);
  }
}

// ---------- tiny dependency-free RSS parsing ----------

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeEntities(s) {
  return String(s || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

function unwrap(raw) {
  if (raw == null) return '';
  const cdata = raw.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return (cdata ? cdata[1] : decodeEntities(raw)).trim();
}

function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? unwrap(m[1]) : '';
}

function attr(xml, name, attribute) {
  const m = xml.match(new RegExp(`<${name}\\s[^>]*\\b${attribute}="([^"]*)"`, 'i'));
  return m ? decodeEntities(m[1]) : '';
}

function stripHtml(s) {
  // block-ish tags → space; inline tags (<a>, <b>…) → nothing, so "SC</a>'s" stays "SC's"
  return decodeEntities(
    String(s || '')
      .replace(/<(?:br|\/?(?:p|div|li|ol|ul|h\d))\b[^>]*>/gi, ' ')
      .replace(/<[^>]*>/g, ''),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseRssItems(xml) {
  return (String(xml).match(/<item[\s>][\s\S]*?<\/item>/gi) || []).map((item) => ({
    title: tag(item, 'title'),
    link: tag(item, 'link'),
    guid: tag(item, 'guid'),
    description: tag(item, 'description'),
    pubDate: tag(item, 'pubDate'),
    thumbnail: attr(item, 'media:thumbnail', 'url') || attr(item, 'media:content', 'url'),
    sourceName: tag(item, 'source'),
    sourceUrl: attr(item, 'source', 'url'),
  }));
}

function toIso(d) {
  const t = Date.parse(d);
  return Number.isFinite(t) ? new Date(t).toISOString() : new Date().toISOString();
}

// ---------- BBC ----------

function cleanBbcLink(link) {
  try {
    const u = new URL(link);
    u.searchParams.delete('at_medium');
    u.searchParams.delete('at_campaign');
    u.hash = '';
    return u.toString();
  } catch {
    return link;
  }
}

export async function fetchBbc(pillId = 'all', max = 10) {
  const section = BBC_SECTION[pillId] ?? '';
  const feed = section
    ? `https://feeds.bbci.co.uk/news/${section}/rss.xml`
    : 'https://feeds.bbci.co.uk/news/rss.xml';
  const xml = await fetchText(feed, 'application/rss+xml, application/xml, text/xml');
  const all = parseRssItems(xml)
    .filter((it) => it.title && it.link)
    .map((it) => {
      const url = cleanBbcLink(it.link);
      return {
        id: (it.guid || url).replace(/#\d+$/, ''),
        title: it.title,
        description: it.description,
        url,
        // 240px RSS thumb → same image at 800px (verified to resolve)
        image: it.thumbnail ? it.thumbnail.replace('/standard/240/', '/standard/800/') : null,
        publishedAt: toIso(it.pubDate),
        source: { name: 'BBC News', url: 'https://www.bbc.co.uk/news' },
      };
    });
  // live blogs / video pages extract poorly in the reader — drop them when we can spare them
  const articles = all.filter((a) => !/\/(live|videos)\//.test(a.url));
  return (articles.length >= max ? articles : all).slice(0, max);
}

// ---------- ESPN (sports tab) ----------

function mapEspnHeadline(h) {
  const url = h?.links?.web?.href;
  if (!h?.headline || !url) return null;
  return {
    id: `espn-${h.id || url}`,
    title: h.headline,
    description: h.description || '',
    url,
    image: h.images?.find((img) => img?.url)?.url || null,
    publishedAt: toIso(h.published || h.lastModified),
    source: { name: 'ESPN', url: 'https://www.espn.com' },
  };
}

export async function fetchEspnSportsNews(max = 10) {
  const sports = ['cricket', 'soccer'];
  const results = await Promise.allSettled(
    sports.map((s) =>
      fetchText(`https://now.core.api.espn.com/v1/sports/news?sport=${s}&limit=${max}`, 'application/json').then(
        (txt) => JSON.parse(txt)?.headlines || [],
      ),
    ),
  );
  const ok = results.filter((r) => r.status === 'fulfilled');
  if (!ok.length) throw results[0].reason;
  const seen = new Set();
  return ok
    .flatMap((r) => r.value)
    .map(mapEspnHeadline)
    .filter((a) => a && !seen.has(a.id) && seen.add(a.id))
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, max);
}

// ---------- Google News (search) ----------

export async function searchGoogleNews(q, max = 10) {
  const params = new URLSearchParams({ q, hl: 'en-US', gl: 'US', ceid: 'US:en' });
  const xml = await fetchText(`https://news.google.com/rss/search?${params}`, 'application/rss+xml, application/xml');
  return parseRssItems(xml)
    .filter((it) => it.title && it.link)
    .slice(0, max)
    .map((it) => {
      const name = it.sourceName || 'Google News';
      // Google appends " - Publisher" to every title
      const suffix = ` - ${name}`;
      const title = it.title.endsWith(suffix) ? it.title.slice(0, -suffix.length) : it.title;
      const desc = stripHtml(it.description);
      return {
        id: `gn-${it.guid || it.link}`,
        title,
        // description is just an HTML link list echoing the title — only keep it if it adds something
        description: desc && !desc.startsWith(title) ? desc : '',
        url: it.link,
        image: null,
        publishedAt: toIso(it.pubDate),
        source: { name, url: it.sourceUrl || null },
        // news.google.com links are JS redirects → reader can't extract; open original instead
        external: true,
      };
    });
}

// ---------- ESPN story body (reader fast path) ----------
// espn.com story pages are JS-rendered, so generic extraction finds nothing.
// The same public content API that lists headlines returns the story HTML.
// Returns the /api/article shape, or null if the URL isn't an ESPN story.
const ESPN_STORY_RE = /^https?:\/\/(?:www\.)?espn(?:cricinfo)?\.(?:com|co\.uk|in)\/.*\/story\/_\/id\/(\d+)/i;

export async function fetchEspnStory(url) {
  const m = String(url || '').match(ESPN_STORY_RE);
  if (!m) return null;
  const txt = await fetchText(`https://content.core.api.espn.com/v1/sports/news/${m[1]}`, 'application/json');
  const h = JSON.parse(txt)?.headlines?.[0];
  if (!h?.story) return null;
  const paragraphs = [];
  let chars = 0;
  for (const [, inner] of h.story.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const p = stripHtml(inner);
    if (p.length < 25) continue;
    paragraphs.push(p);
    chars += p.length;
    if (paragraphs.length >= 40 || chars >= 9000) break;
  }
  if (!paragraphs.length) return null;
  return {
    title: String(h.headline || '').slice(0, 200),
    byline: h.byline || 'ESPN',
    image: h.images?.find((img) => img?.url)?.url || null,
    paragraphs,
    url,
  };
}

// ---------- entry point ----------

export async function getNews({ category = 'all', q = '', max = 10 } = {}) {
  const count = Math.min(20, Math.max(1, parseInt(max, 10) || 10));
  const query = String(q || '').trim().slice(0, 120);
  if (query) return searchGoogleNews(query, count);
  const cat = NEWS_CATEGORIES.has(category) ? category : 'all';
  if (cat === 'sports') return fetchEspnSportsNews(count);
  return fetchBbc(cat, count);
}
