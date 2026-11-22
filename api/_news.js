// Shared keyless news fetchers (used by api/news.js on Vercel and the Vite
// dev middleware in vite.config.js).
//
// Supports two editions:
//   region = 'in' (DEFAULT — India Regional Edition):
//     Blends The Hindu (1200x675 HD images + summaries), NDTV (1280x960 HD images),
//     BBC India, and ESPN Cricket/Football, plus Google News India (gl=IN) for search.
//   region = 'global':
//     BBC News RSS sections + ESPN sports + Google News US/Global search.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const TIMEOUT_MS = 7000;

export const BBC_SECTION = {
  all: '',
  india: 'world/asia/india',
  world: 'world',
  business: 'business',
  technology: 'technology',
  science: 'science_and_environment',
  health: 'health',
  entertainment: 'entertainment_and_arts',
};

// India regional RSS feeds (The Hindu + NDTV + BBC India) — all keyless, all include HD media:content images & summaries
export const INDIA_FEEDS = {
  all: [
    { url: 'https://www.thehindu.com/news/national/feeder/default.rss', name: 'The Hindu', home: 'https://www.thehindu.com' },
    { url: 'https://feeds.feedburner.com/ndtvnews-india-news', name: 'NDTV', home: 'https://www.ndtv.com' },
    { url: 'https://feeds.bbci.co.uk/news/world/asia/india/rss.xml', name: 'BBC India', home: 'https://www.bbc.co.uk/news' },
  ],
  india: [
    { url: 'https://www.thehindu.com/news/national/feeder/default.rss', name: 'The Hindu', home: 'https://www.thehindu.com' },
    { url: 'https://feeds.feedburner.com/ndtvnews-india-news', name: 'NDTV', home: 'https://www.ndtv.com' },
    { url: 'https://feeds.bbci.co.uk/news/world/asia/india/rss.xml', name: 'BBC India', home: 'https://www.bbc.co.uk/news' },
  ],
  world: [
    { url: 'https://www.thehindu.com/news/international/feeder/default.rss', name: 'The Hindu', home: 'https://www.thehindu.com' },
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', name: 'BBC News', home: 'https://www.bbc.co.uk/news' },
  ],
  business: [
    { url: 'https://www.thehindu.com/business/feeder/default.rss', name: 'The Hindu Business', home: 'https://www.thehindu.com/business' },
    { url: 'https://feeds.feedburner.com/ndtvprofit-latest', name: 'NDTV Profit', home: 'https://www.ndtvprofit.com' },
  ],
  technology: [
    { url: 'https://www.thehindu.com/sci-tech/technology/feeder/default.rss', name: 'The Hindu Tech', home: 'https://www.thehindu.com/sci-tech/technology' },
    { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', name: 'BBC Tech', home: 'https://www.bbc.co.uk/news' },
  ],
  science: [
    { url: 'https://www.thehindu.com/sci-tech/science/feeder/default.rss', name: 'The Hindu Science', home: 'https://www.thehindu.com/sci-tech/science' },
    { url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', name: 'BBC Science', home: 'https://www.bbc.co.uk/news' },
  ],
  health: [
    { url: 'https://www.thehindu.com/sci-tech/health/feeder/default.rss', name: 'The Hindu Health', home: 'https://www.thehindu.com/sci-tech/health' },
    { url: 'https://feeds.bbci.co.uk/news/health/rss.xml', name: 'BBC Health', home: 'https://www.bbc.co.uk/news' },
  ],
  entertainment: [
    { url: 'https://www.thehindu.com/entertainment/feeder/default.rss', name: 'The Hindu Entertainment', home: 'https://www.thehindu.com/entertainment' },
    { url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', name: 'BBC Culture', home: 'https://www.bbc.co.uk/news' },
  ],
  sports: [
    { url: 'https://www.thehindu.com/sport/feeder/default.rss', name: 'The Hindu Sport', home: 'https://www.thehindu.com/sport' },
  ],
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
      return Number.isInteger(n) && n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
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
  return decodeEntities(
    String(s || '')
      .replace(/<(?:br|\/?(?:p|div|li|ol|ul|h\d))\b[^>]*>/gi, ' ')
      .replace(/<[^>]*>/g, ''),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseRssItems(xml) {
  return (String(xml).match(/<item[\s>][\s\S]*?<\/item>/gi) || []).map((item) => {
    const rawDesc = tag(item, 'description');
    const imgInDesc = rawDesc.match(/<img\s[^>]*\bsrc=["']([^"']+)["']/i)?.[1] || '';
    const newsImg = tag(item, 'News:Image');
    const newsSrc = tag(item, 'News:Source');
    return {
      title: stripHtml(tag(item, 'title')),
      link: tag(item, 'link'),
      guid: tag(item, 'guid'),
      description: stripHtml(rawDesc),
      pubDate: tag(item, 'pubDate'),
      thumbnail:
        attr(item, 'media:content', 'url') ||
        attr(item, 'media:thumbnail', 'url') ||
        attr(item, 'enclosure', 'url') ||
        newsImg ||
        imgInDesc,
      sourceName: newsSrc || tag(item, 'source'),
      sourceUrl: attr(item, 'source', 'url'),
    };
  });
}

function toIso(d) {
  const t = Date.parse(d);
  return Number.isFinite(t) ? new Date(t).toISOString() : new Date().toISOString();
}

function cleanArticleUrl(link) {
  try {
    const u = new URL(link);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    u.searchParams.delete('at_medium');
    u.searchParams.delete('at_campaign');
    u.hash = '';
    return u.toString();
  } catch {
    return '';
  }
}

function cleanImageUrl(raw) {
  if (!raw) return null;
  try {
    const u = new URL(String(raw).trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (u.protocol === 'http:') u.protocol = 'https:';
    return u.toString();
  } catch {
    return null;
  }
}

function normalizeRssFeedItems(xml, sourceName, sourceHome) {
  return parseRssItems(xml)
    .filter((it) => it.title && it.link)
    .map((it) => {
      const url = cleanArticleUrl(it.link);
      if (!url) return null;
      let image = cleanImageUrl(it.thumbnail);
      if (image && image.includes('ichef.bbci.co.uk')) {
        image = image.replace('/standard/240/', '/standard/800/');
      }
      return {
        id: (it.guid || url).replace(/#\d+$/, ''),
        title: it.title,
        description: it.description,
        url,
        image,
        publishedAt: toIso(it.pubDate),
        source: { name: sourceName, url: sourceHome },
      };
    })
    .filter((a) => a && !/\/(live|videos|audio)\//i.test(a.url));
}

// ---------- India Regional Multi-Source Fetcher ----------

export async function fetchIndiaNews(pillId = 'all', max = 10) {
  const feeds = INDIA_FEEDS[pillId] || INDIA_FEEDS.all;
  const tasks = feeds.map((f) =>
    fetchText(f.url, 'application/rss+xml, application/xml, text/xml').then((xml) =>
      normalizeRssFeedItems(xml, f.name, f.home),
    ),
  );

  if (pillId === 'sports') {
    tasks.push(fetchEspnSportsNews(max));
  }

  const settled = await Promise.allSettled(tasks);
  const ok = settled.filter((r) => r.status === 'fulfilled');
  if (!ok.length) throw settled[0]?.reason || httpError(502, 'India news feeds unreachable');

  // Round-robin interleave across sources (The Hindu, NDTV, BBC India) so the deck has rich variety,
  // prioritizing items with HD images
  const lists = ok.map((r) => r.value.slice(0, max));
  const merged = [];
  const seenUrl = new Set();
  const seenTitle = new Set();

  const maxLen = Math.max(...lists.map((l) => l.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const list of lists) {
      const item = list[i];
      if (!item) continue;
      const tKey = item.title.toLowerCase().slice(0, 60);
      if (seenUrl.has(item.url) || seenTitle.has(tKey)) continue;
      seenUrl.add(item.url);
      seenTitle.add(tKey);
      merged.push(item);
    }
  }

  // Prefer articles with images first while preserving recency
  const withImg = merged.filter((a) => Boolean(a.image));
  const pool = withImg.length >= max ? withImg : merged;
  return pool.slice(0, max);
}

// ---------- BBC (Global Edition) ----------

export async function fetchBbc(pillId = 'all', max = 10) {
  const section = BBC_SECTION[pillId] ?? '';
  const feed = section
    ? `https://feeds.bbci.co.uk/news/${section}/rss.xml`
    : 'https://feeds.bbci.co.uk/news/rss.xml';
  const xml = await fetchText(feed, 'application/rss+xml, application/xml, text/xml');
  const articles = normalizeRssFeedItems(xml, pillId === 'india' ? 'BBC India' : 'BBC News', 'https://www.bbc.co.uk/news');
  return articles.slice(0, max);
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

// ---------- Direct-URL Search (Bing News RSS with unwrapped publisher URLs + images + summaries) ----------

function unwrapBingSearchUrl(rawLink) {
  try {
    const u = new URL(rawLink);
    const embedded = u.searchParams.get('url');
    if (embedded && /^https?:\/\//i.test(embedded)) {
      const eu = new URL(embedded);
      if (eu.protocol === 'http:' || eu.protocol === 'https:') return eu.toString();
    }
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString();
  } catch { /* ignore */ }
  return '';
}

function upgradeBingThumb(rawThumb) {
  const safe = cleanImageUrl(rawThumb);
  if (!safe) return null;
  if (safe.includes('bing.com/th?')) {
    return `${safe}&w=800&h=500&c=7`;
  }
  return safe;
}

export async function searchNewsArticles(q, max = 10, region = 'in') {
  const isIndia = region !== 'global';
  const mkt = isIndia ? 'en-IN' : 'en-US';
  const cc = isIndia ? 'IN' : 'US';
  const params = new URLSearchParams({ q, setmkt: mkt, cc, format: 'rss' });

  try {
    const xml = await fetchText(
      `https://www.bing.com/news/search?${params}`,
      'application/rss+xml, application/xml, text/xml',
    );
    const items = parseRssItems(xml)
      .filter((it) => it.title && it.link)
      .slice(0, max)
      .map((it) => {
        const directUrl = unwrapBingSearchUrl(it.link);
        let hostName = '';
        try {
          hostName = new URL(directUrl).hostname.replace(/^www\./, '');
        } catch { /* ignore */ }
        const name = it.sourceName || hostName || 'Flash Search';
        return {
          id: `srch-${directUrl}`,
          title: it.title,
          description: it.description || it.title,
          url: directUrl,
          image: upgradeBingThumb(it.thumbnail),
          publishedAt: toIso(it.pubDate),
          source: { name, url: hostName ? `https://${hostName}` : null },
          external: false,
        };
      });
    if (items.length) return items;
  } catch {
    // Fall back to Google News RSS if Bing News RSS is unreachable
  }

  const gParams = new URLSearchParams(
    isIndia
      ? { q, hl: 'en-IN', gl: 'IN', ceid: 'IN:en' }
      : { q, hl: 'en-US', gl: 'US', ceid: 'US:en' },
  );
  const xml = await fetchText(`https://news.google.com/rss/search?${gParams}`, 'application/rss+xml, application/xml');
  return parseRssItems(xml)
    .filter((it) => it.title && it.link)
    .slice(0, max)
    .map((it) => {
      const name = it.sourceName || 'Google News';
      const suffix = ` - ${name}`;
      const title = it.title.endsWith(suffix) ? it.title.slice(0, -suffix.length) : it.title;
      const desc = stripHtml(it.description);
      return {
        id: `gn-${it.guid || it.link}`,
        title,
        description: desc && !desc.startsWith(title) ? desc : title,
        url: it.link,
        image: null,
        publishedAt: toIso(it.pubDate),
        source: { name, url: it.sourceUrl || null },
        external: false,
      };
    });
}

// ---------- ESPN story body (reader fast path) ----------
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

export async function getNews({ category = 'all', q = '', max = 10, region = 'in' } = {}) {
  const count = Math.min(20, Math.max(1, parseInt(max, 10) || 10));
  const query = String(q || '').trim().slice(0, 120);
  const reg = String(region || 'in').toLowerCase() === 'global' ? 'global' : 'in';

  if (query) return searchNewsArticles(query, count, reg);
  const cat = NEWS_CATEGORIES.has(category) ? category : 'all';

  if (cat === 'india' || reg === 'in') {
    return fetchIndiaNews(cat, count);
  }
  if (cat === 'sports') return fetchEspnSportsNews(count);
  return fetchBbc(cat, count);
}
