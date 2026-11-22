// Client-side URL/color sanitization, fetch timeout, and bounded localStorage caching.

export function safeHttpUrl(raw) {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const u = new URL(trimmed)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    if (u.username || u.password) return null
    return u.toString()
  } catch {
    return null
  }
}

export function safeImageUrl(raw) {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed
  try {
    const u = new URL(trimmed)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    if (u.username || u.password) return null
    if (u.protocol === 'http:') u.protocol = 'https:'
    return u.toString()
  } catch {
    return null
  }
}

export function safeColor(raw, fallback = '#64748B') {
  const s = String(raw || '').trim()
  if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return s
  if (/^[0-9a-fA-F]{6}$/.test(s)) return `#${s}`
  return fallback
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: ctl.signal })
  } finally {
    clearTimeout(timer)
  }
}

export function pruneLocalCache(prefix, maxAgeMs, maxKeys = 16) {
  try {
    const now = Date.now()
    const entries = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith(prefix)) continue
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || 'null')
        const ts = Number(parsed?.ts) || 0
        if (!ts || now - ts > maxAgeMs) {
          localStorage.removeItem(key)
        } else {
          entries.push({ key, ts })
        }
      } catch {
        localStorage.removeItem(key)
      }
    }
    if (entries.length > maxKeys) {
      entries.sort((a, b) => a.ts - b.ts)
      for (const item of entries.slice(0, entries.length - maxKeys)) {
        localStorage.removeItem(item.key)
      }
    }
  } catch { /* ignore storage restrictions */ }
}
