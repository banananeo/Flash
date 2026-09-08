// GNews → app shape. Summary-only: we use description/content snippet,
// never fetch full article bodies.
const API_KEY = import.meta.env.VITE_GNEWS

// our pill id → GNews category (omit param for 'all' = mixed top headlines)
const GNEWS_CATEGORY = {
  all: null,
  business: 'business',
  technology: 'technology',
  science: 'science',
  health: 'health',
  sports: 'sports',
  entertainment: 'entertainment',
}

const fallbackImg = (seed) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/500`

function mapArticle(a, pillId, i) {
  const raw = (a.description || a.content || '').replace(/\[.*chars\]$/, '').trim()
  const summary = raw ? raw.slice(0, 240) : a.title
  return {
    id: a.id || a.url || `${pillId}-${i}-${Date.now()}`,
    category: pillId,
    title: (a.title || 'Untitled').toUpperCase().slice(0, 140),
    summary,
    source: a.source?.name || 'GNews',
    publishedAt: a.publishedAt || new Date().toISOString(),
    readTime: '1 min',
    image: a.image || fallbackImg(a.id || a.title || `gnews-${i}`),
  }
}

function friendlyNetworkError(e) {
  if (e instanceof TypeError || /failed to fetch|networkerror|load failed|network request failed/i.test(e?.message || '')) {
    return new Error('Network blocked — check connection / ad-blocker / VPN — showing mock')
  }
  return e
}

export async function fetchGNews(pillId = 'all', max = 10) {
  const gcat = GNEWS_CATEGORY[pillId] ?? null

  // 10-min cache to protect the 100 req/day free quota
  const cacheKey = `gnews-cache-${pillId}`
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null')
    if (cached && Date.now() - cached.ts < 10 * 60 * 1000 && cached.articles?.length) {
      return { articles: cached.articles, cached: true }
    }
  } catch { /* ignore */ }

  const saveCache = (articles) => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), articles }))
    } catch { /* ignore */ }
  }

  // 1) Same-origin proxy first — works in dev (Vite) AND prod (Vercel
  // serverless api/gnews.js). Key stays server-side, no CORS issues.
  try {
    const proxyParams = new URLSearchParams({ max: String(max) })
    if (gcat) proxyParams.set('category', gcat)
    const res = await fetch(`/api/gnews?${proxyParams}`)
    if (res.ok) {
      const data = await res.json()
      const articles = (data.articles || []).map((a, i) => mapArticle(a, pillId, i))
      if (!articles.length) throw new Error('No articles returned')
      saveCache(articles)
      return { articles, cached: false }
    }
    if (res.status === 429) throw new Error('GNews quota hit (100/day) — showing mock')
    // 500 from our proxy = server key missing → fall through to direct
    // (client key) before giving up. Other 4xx: surface upstream message.
    if (res.status !== 404 && res.status !== 500) {
      let msg = `GNews error ${res.status}`
      try {
        const err = await res.json()
        if (err?.error) msg = String(err.error).slice(0, 160)
      } catch { /* keep default */ }
      throw new Error(msg)
    }
  } catch (e) {
    // proxy unreachable (dev without proxy route, offline) → try direct below
    // but a quota error should surface immediately, not silently retry
    if (/quota/i.test(e?.message || '')) throw e
    if (!API_KEY) {
      // No client key to fall back with: if the proxy gave a real HTTP
      // error it is already thrown above; otherwise this is a network failure.
      if (e instanceof TypeError || /failed to fetch/i.test(e?.message || '')) {
        throw friendlyNetworkError(e)
      }
      if (/missing|500/i.test(e?.message || '')) {
        throw new Error('Missing VITE_GNEWS — add it in Vercel env vars, then redeploy')
      }
      // fall through only for proxy-miss style errors when a key exists
      if (!/proxy|404/i.test(e?.message || '')) throw e
    }
  }

  // 2) Direct fallback — needs the client key (dev or Vercel env present)
  if (!API_KEY) throw new Error('Missing VITE_GNEWS — add it in Vercel env vars, then redeploy')

  const params = new URLSearchParams({
    lang: 'en',
    country: 'us',
    max: String(max),
    apikey: API_KEY,
  })
  if (gcat) params.set('category', gcat)

  let res
  try {
    res = await fetch(`https://gnews.io/api/v4/top-headlines?${params}`)
  } catch (e) {
    throw friendlyNetworkError(e)
  }
  if (res.status === 429) throw new Error('GNews quota hit (100/day) — showing mock')
  if (!res.ok) throw new Error(`GNews error ${res.status}`)
  const data = await res.json()
  const articles = (data.articles || []).map((a, i) => mapArticle(a, pillId, i))
  if (!articles.length) throw new Error('No articles returned')

  saveCache(articles)

  return { articles, cached: false }
}
