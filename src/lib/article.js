// Full-article client: fetches extracted body text via same-origin
// /api/article?url= (Vercel serverless in prod, vite middleware in dev).
// Session-memory cache per URL — bodies are big, don't use localStorage.

const memCache = new Map()

export function isPaywallError(e) {
  return /paywall|402|js:|original/i.test(e?.message || '')
}

export async function fetchArticleText(url) {
  if (!url) throw new Error('No source URL for this story')
  if (memCache.has(url)) return { ...memCache.get(url), cached: true }

  let res
  try {
    res = await fetch(`/api/article?url=${encodeURIComponent(url)}`)
  } catch (e) {
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
  const data = await res.json()
  if (!data.paragraphs?.length) throw new Error('No readable text — open the original instead')
  memCache.set(url, data)
  return { ...data, cached: false }
}
