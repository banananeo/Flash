// Cricket public JSON -> normalized Match & Scoreboard shapes.
// Same-origin proxy: /api/cricket/live[?date=YYYYMMDD] + /api/cricket/detail?id=<matchId>&series=<seriesId>
import { fetchWithTimeout, pruneLocalCache } from './safeUrl'

const CACHE_MS = 60 * 1000
const inflightLive = new Map()

async function readJSON(res, what = 'Cricket') {
  try {
    return await res.json()
  } catch {
    throw new Error(`${what} sent a bad response — showing preview`)
  }
}

function friendlyCricketError(e) {
  if (e?.name === 'AbortError') {
    return new Error('Cricket request timed out — please retry')
  }
  if (e instanceof TypeError || /failed to fetch|networkerror|load failed|network request failed/i.test(e?.message || '')) {
    return new Error('Network blocked — check connection / ad-blocker / VPN')
  }
  return e
}

export async function fetchCricketLive(dateStr = '', { force = false } = {}) {
  const cleanDate = String(dateStr || '').replace(/-/g, '')
  const cacheKey = `live-cache-cricket-v4-${cleanDate || 'today'}`
  if (!force) {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null')
      if (cached && Date.now() - cached.ts < CACHE_MS && cached.matches?.length) {
        return { matches: cached.matches, cached: true }
      }
    } catch { /* ignore */ }
    if (inflightLive.has(cacheKey)) return inflightLive.get(cacheKey)
  }

  const job = (async () => {
    const params = new URLSearchParams()
    if (cleanDate) params.set('date', cleanDate)
    if (force) params.set('t', String(Date.now()))
    const qs = params.toString() ? `?${params}` : ''
    let res
    try {
      res = await fetchWithTimeout(
        `/api/cricket/live${qs}`,
        force ? { cache: 'no-store' } : {},
        12000,
      )
      if (res.status === 404) throw new Error('Cricket API route not found')
    } catch (e) {
      throw friendlyCricketError(e)
    }
    if (res.status === 429) throw new Error('Cricket rate limit hit')
    if (!res.ok) {
      let msg = `Cricket error ${res.status}`
      try {
        const err = await res.clone().json()
        if (err?.error) msg = String(err.error).slice(0, 160)
      } catch { /* keep default */ }
      throw new Error(msg)
    }

    const data = await readJSON(res)
    const rawList = Array.isArray(data) ? data : Array.isArray(data?.matches) ? data.matches : []
    const matches = rawList.filter((m) => m && m.id && m.teamA && m.teamB)

    if (matches.length) {
      try {
        pruneLocalCache('live-cache-cricket-', CACHE_MS * 5, 10)
        localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), matches }))
      } catch { /* ignore */ }
    }
    return { matches, cached: false }
  })().finally(() => {
    if (!force) inflightLive.delete(cacheKey)
  })

  if (!force) inflightLive.set(cacheKey, job)
  return job
}

export function normalizeDetail(data) {
  const d = data || {}
  return {
    matchHeader: {
      status: d.matchHeader?.status || '',
      name: d.matchHeader?.name || '',
      description: d.matchHeader?.description || '',
      matchType: d.matchHeader?.matchType || '',
      venue: d.matchHeader?.venue || '',
      date: d.matchHeader?.date || '',
    },
    meta: {
      crr: d.meta?.crr || '',
      lastWicket: d.meta?.lastWicket || '',
      need: d.meta?.need || d.matchHeader?.status || '',
    },
    recentBalls: Array.isArray(d.recentBalls) ? d.recentBalls : [],
    batters: Array.isArray(d.batters) ? d.batters : [],
    innings: Array.isArray(d.innings) ? d.innings : [],
    lineups: d.lineups || { home: null, away: null },
    commentary: Array.isArray(d.commentary) ? d.commentary : [],
    score: Array.isArray(d.score) ? d.score : [],
  }
}

// Full scoreboard: normalized { matchHeader, meta, recentBalls[], batters[], innings[], lineups, commentary[] }
export async function fetchCricketDetail(matchId, seriesId, { force = false } = {}) {
  const rawId = String(matchId || '').replace(/^cr-/, '')
  const params = new URLSearchParams({ id: rawId })
  if (seriesId) params.set('series', String(seriesId))
  if (force) params.set('t', String(Date.now()))

  let res
  try {
    res = await fetchWithTimeout(
      `/api/cricket/detail?${params}`,
      force ? { cache: 'no-store' } : {},
      12000,
    )
    if (res.status === 404) throw new Error('Scoreboard not found')
  } catch (e) {
    throw friendlyCricketError(e)
  }
  if (!res.ok) throw new Error(`Scoreboard error ${res.status}`)
  const data = await readJSON(res, 'Scoreboard')
  return normalizeDetail(data)
}
