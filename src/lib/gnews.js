// GNews → app shape. Summary-only: we use description/content snippet,
// never fetch full article bodies.
const API_KEY = import.meta.env.VITE_GNEWS_API_KEY

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

export async function fetchGNews(pillId = 'all', max = 10) {
  if (!API_KEY) throw new Error('Missing VITE_GNEWS_API_KEY')
  const gcat = GNEWS_CATEGORY[pillId] ?? null

  // 10-min cache to protect the 100 req/day free quota
  const cacheKey = `gnews-cache-${pillId}`
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null')
    if (cached && Date.now() - cached.ts < 10 * 60 * 1000 && cached.articles?.length) {
      return { articles: cached.articles, cached: true }
    }
  } catch { /* ignore */ }

  const params = new URLSearchParams({
    lang: 'en',
    country: 'us',
    max: String(max),
    apikey: API_KEY,
  })
  if (gcat) params.set('category', gcat)

  const res = await fetch(`https://gnews.io/api/v4/top-headlines?${params}`)
  if (res.status === 429) throw new Error('GNews quota hit (100/day) — showing mock')
  if (!res.ok) throw new Error(`GNews error ${res.status}`)
  const data = await res.json()
  const articles = (data.articles || []).map((a, i) => mapArticle(a, pillId, i))

  try {
    localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), articles }))
  } catch { /* ignore */ }

  return { articles, cached: false }
}
