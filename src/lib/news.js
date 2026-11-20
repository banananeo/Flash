// Keyless news → app shape. Calls our same-origin /api/news (Vercel function
// in prod, Vite middleware in dev): BBC RSS for categories, ESPN for sports,
// Google News RSS for search. Summary-only cards; the reader extracts full text.

const fallbackImg = (seed) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/500`

const CACHE_MS = 10 * 60 * 1000

function estimateReadTime(text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length
  const mins = Math.max(2, Math.min(6, Math.round(words / 45) + 2))
  return `${mins} min read`
}

function mapArticle(a, pillId, i) {
  const raw = String(a.description || '').trim()
  const summary = raw ? raw.slice(0, 260) : a.title
  return {
    // stable id (no Date.now): unstable keys remount cards + bust the cache
    id: a.id || a.url || `${pillId}-${i}`,
    category: pillId,
    title: (a.title || 'Untitled').trim().slice(0, 140),
    summary,
    source: a.source?.name || a.source?.url || 'Flash Edit',
    sourceUrl: a.source?.url || null,
    url: a.url || null,
    publishedAt: a.publishedAt || new Date().toISOString(),
    readTime: estimateReadTime(a.description),
    image: a.image || fallbackImg(a.id || a.title || `news-${i}`),
    external: Boolean(a.external),
  }
}

function friendlyNetworkError(e) {
  if (e instanceof TypeError || /failed to fetch|networkerror|load failed|network request failed/i.test(e?.message || '')) {
    return new Error('Network blocked — check connection / ad-blocker / VPN — showing mock')
  }
  return e
}

export async function fetchNews(pillId = 'all', max = 10, query = '', region = 'in') {
  const q = String(query || '').trim()
  const reg = String(region || 'in').toLowerCase() === 'global' ? 'global' : 'in'
  const count = Math.min(20, Math.max(1, parseInt(max, 10) || 10))

  const cacheKey = q ? `news-q-v2-${reg}-${q.toLowerCase()}` : `news-cache-v2-${reg}-${pillId}`
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null')
    if (cached && Date.now() - cached.ts < CACHE_MS && cached.articles?.length) {
      return { articles: cached.articles, cached: true }
    }
  } catch { /* ignore */ }

  const params = new URLSearchParams({ max: String(count), region: reg })
  if (q) params.set('q', q)
  else params.set('category', pillId)

  let res
  try {
    res = await fetch(`/api/news?${params}`)
  } catch (e) {
    throw friendlyNetworkError(e)
  }

  if (!res.ok) {
    let msg = `News feed error ${res.status}`
    try {
      const err = await res.json()
      if (err?.error) msg = String(err.error).slice(0, 160)
    } catch { /* keep default */ }
    throw new Error(msg)
  }

  let data
  try {
    data = await res.json()
  } catch {
    throw new Error('Bad response from news server — showing preview')
  }

  const articles = (data.articles || []).map((a, i) => mapArticle(a, pillId, i))
  if (!articles.length) throw new Error(q ? `No stories found for “${q}”` : 'No articles returned')

  try {
    localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), articles }))
  } catch { /* ignore */ }

  return { articles, cached: false }
}
