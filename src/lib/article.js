// Full-article client: fetches extracted body text via same-origin /api/article?url=
// Bounded session-memory cache (max 40 articles) + timeout + in-flight deduplication.
import { fetchWithTimeout, safeHttpUrl, safeImageUrl } from './safeUrl'

const MAX_CACHE_ENTRIES = 40
const memCache = new Map()
const inflight = new Map()

export function isPaywallError(e) {
  return /paywall|402|js:|original/i.test(e?.message || '')
}

function setBoundedCache(url, data) {
  if (memCache.size >= MAX_CACHE_ENTRIES && !memCache.has(url)) {
    const oldest = memCache.keys().next().value
    if (oldest !== undefined) memCache.delete(oldest)
  }
  memCache.set(url, data)
}

export async function fetchArticleText(rawUrl) {
  const url = safeHttpUrl(rawUrl)
  if (!url) throw new Error('No source URL for this story')
  if (memCache.has(url)) return { ...memCache.get(url), cached: true }
  if (inflight.has(url)) return inflight.get(url)

  const job = (async () => {
    let res
    try {
      res = await fetchWithTimeout(`/api/article?url=${encodeURIComponent(url)}`, {}, 12000)
    } catch (e) {
      if (e?.name === 'AbortError') {
        throw new Error('Publisher timed out — open the original instead')
      }
      if (e instanceof TypeError || /failed to fetch/i.test(e?.message || '')) {
        throw new Error('Network blocked — open the original instead')
      }
      throw e
    }
    if (res.status === 402) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Paywalled — open the original instead')
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `Reader error ${res.status} — open the original instead`)
    }
    const data = await res.json().catch(() => ({}))
    if (!Array.isArray(data.paragraphs) || !data.paragraphs.length) {
      throw new Error('No readable text — open the original instead')
    }
    const sanitized = {
      ...data,
      image: safeImageUrl(data.image),
      url: safeHttpUrl(data.url) || url,
    }
    setBoundedCache(url, sanitized)
    return { ...sanitized, cached: false }
  })().finally(() => {
    inflight.delete(url)
  })

  inflight.set(url, job)
  return job
}
