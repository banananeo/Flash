// Keyless news client via same-origin /api/news.
import { fetchWithTimeout, pruneLocalCache, safeHttpUrl, safeImageUrl } from './safeUrl'

const fallbackImg = (seed) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/500`

const CACHE_MS = 10 * 60 * 1000
const inflight = new Map()

function estimateReadTime(text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length
  const mins = Math.max(2, Math.min(6, Math.round(words / 45) + 2))
  return `${mins} min read`
}

function mapArticle(a, pillId, i) {
  const raw = String(a.description || '').trim()
  const summary = raw ? raw.slice(0, 260) : a.title
  return {
    id: a.id || a.url || `${pillId}-${i}`,
    category: pillId,
    title: (a.title || 'Untitled').trim().slice(0, 140),
    summary,
    source: a.source?.name || a.source?.url || 'Flash Edit',
    sourceUrl: safeHttpUrl(a.source?.url),
    url: safeHttpUrl(a.url),
    publishedAt: a.publishedAt || new Date().toISOString(),
    readTime: estimateReadTime(a.description),
    image: safeImageUrl(a.image) || fallbackImg(a.id || a.title || `news-${i}`),
    external: Boolean(a.external),
  }
}

function friendlyNetworkError(e) {
  if (e?.name === 'AbortError') {
    return new Error('News request timed out — showing last briefing')
  }
  if (e instanceof TypeError || /failed to fetch|networkerror|load failed|network request failed/i.test(e?.message || '')) {
    return new Error('Network blocked — check connection / ad-blocker / VPN — showing mock')
  }
  return e
}

export async function fetchNews(pillId = 'all', max = 10, query = '', region = 'in') {
  const q = String(query || '').trim().slice(0, 120)
  const reg = String(region || 'in').toLowerCase() === 'global' ? 'global' : 'in'
  const count = Math.min(20, Math.max(1, parseInt(max, 10) || 10))

  const cacheKey = q ? `news-q-v2-${reg}-${q.toLowerCase()}` : `news-cache-v2-${reg}-${pillId}`
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null')
    if (cached && Date.now() - cached.ts < CACHE_MS && cached.articles?.length) {
      return { articles: cached.articles, cached: true }
    }
  } catch { /* ignore */ }

  if (inflight.has(cacheKey)) return inflight.get(cacheKey)

  const job = (async () => {
    const params = new URLSearchParams({ max: String(count), region: reg })
    if (q) params.set('q', q)
    else params.set('category', pillId)

    let res
    try {
      res = await fetchWithTimeout(`/api/news?${params}`, {}, 12000)
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
      pruneLocalCache('news-', CACHE_MS, 18)
      localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), articles }))
    } catch { /* ignore */ }

    return { articles, cached: false }
  })().finally(() => {
    inflight.delete(cacheKey)
  })

  inflight.set(cacheKey, job)
  return job
}
