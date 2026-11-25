// Football public JSON -> normalized Match & Match Centre shapes.
// Same-origin proxy: /api/football/live[?date=YYYYMMDD] + /api/football/detail?id=...&league=...
import { fetchWithTimeout, pruneLocalCache } from './safeUrl'

const CACHE_MS = 60 * 1000
const STANDINGS_CACHE_MS = 2 * 60 * 1000
const inflightLive = new Map()
const inflightStandings = new Map()

async function readJSON(res, what = 'Football') {
  try {
    return await res.json()
  } catch {
    throw new Error(`${what} sent a bad response — showing preview`)
  }
}

function friendlyFootballError(e) {
  if (e?.name === 'AbortError') {
    return new Error('Football request timed out — please retry')
  }
  if (e instanceof TypeError || /failed to fetch|networkerror|load failed|network request failed/i.test(e?.message || '')) {
    return new Error('Network blocked — check connection / ad-blocker / VPN')
  }
  return e
}

export async function fetchFootballLive(dateStr = '', { force = false, league = '' } = {}) {
  const cleanDate = String(dateStr || '').replace(/-/g, '')
  const cleanLeague = String(league || '').trim()
  const cacheKey = `live-cache-football-v5-${cleanDate || 'today'}${cleanLeague ? `-${cleanLeague}` : ''}`
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
    if (cleanLeague) params.set('league', cleanLeague)
    if (force) params.set('t', String(Date.now()))
    const qs = params.toString() ? `?${params}` : ''
    let res
    try {
      res = await fetchWithTimeout(
        `/api/football/live${qs}`,
        force ? { cache: 'no-store' } : {},
        12000,
      )
      if (res.status === 404) throw new Error('Football API route not found')
    } catch (e) {
      throw friendlyFootballError(e)
    }
    if (res.status === 429) throw new Error('Football rate limit hit')
    if (!res.ok) {
      let msg = `Football error ${res.status}`
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
        pruneLocalCache('live-cache-football-', CACHE_MS * 5, 10)
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

// Match Centre detail: { header, stats[], latestMoment, lineups: { home, away }, events[] }
export async function fetchFootballDetail(eventId, leagueSlug = '', { force = false } = {}) {
  const rawId = String(eventId || '').replace(/^fb-/, '')
  const params = new URLSearchParams({ id: rawId })
  if (leagueSlug) params.set('league', String(leagueSlug))
  if (force) params.set('t', String(Date.now()))

  let res
  try {
    res = await fetchWithTimeout(
      `/api/football/detail?${params}`,
      force ? { cache: 'no-store' } : {},
      12000,
    )
    if (res.status === 404) throw new Error('Match centre not found')
  } catch (e) {
    throw friendlyFootballError(e)
  }
  if (!res.ok) throw new Error(`Match centre error ${res.status}`)
  const data = await readJSON(res, 'Match centre')
  return {
    header: data?.header || null,
    stats: Array.isArray(data?.stats) ? data.stats : [],
    latestMoment: data?.latestMoment || null,
    lineups: data?.lineups || { home: null, away: null },
    events: Array.isArray(data?.events) ? data.events : [],
  }
}

// League standings: { leagueSlug, name, season, stage, rows[], zones[], updatedAt }
export async function fetchFootballStandings(leagueSlug = 'eng.1', { force = false } = {}) {
  const cleanLeague = String(leagueSlug || 'eng.1').trim() || 'eng.1'
  const cacheKey = `standings-cache-football-v1-${cleanLeague}`

  if (!force) {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null')
      if (cached && Date.now() - cached.ts < STANDINGS_CACHE_MS && cached.data?.rows?.length) {
        return { ...cached.data, cached: true }
      }
    } catch { /* ignore */ }
    if (inflightStandings.has(cacheKey)) return inflightStandings.get(cacheKey)
  }

  const job = (async () => {
    const params = new URLSearchParams({ league: cleanLeague })
    if (force) params.set('t', String(Date.now()))

    let res
    try {
      res = await fetchWithTimeout(
        `/api/football/standings?${params}`,
        force ? { cache: 'no-store' } : {},
        12000,
      )
      if (res.status === 404) throw new Error('Standings route not found')
    } catch (e) {
      throw friendlyFootballError(e)
    }
    if (!res.ok) {
      let msg = `Standings error ${res.status}`
      try {
        const err = await res.clone().json()
        if (err?.error) msg = String(err.error).slice(0, 160)
      } catch { /* keep default */ }
      throw new Error(msg)
    }

    const data = await readJSON(res, 'Football standings')
    const normalized = {
      leagueSlug: data?.leagueSlug || cleanLeague,
      name: data?.name || cleanLeague,
      season: data?.season || '',
      stage: data?.stage || '',
      rows: Array.isArray(data?.rows) ? data.rows : [],
      zones: Array.isArray(data?.zones) ? data.zones : [],
      updatedAt: data?.updatedAt || '',
    }

    if (normalized.rows.length) {
      try {
        pruneLocalCache('standings-cache-football-', STANDINGS_CACHE_MS * 5, 6)
        localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: normalized }))
      } catch { /* ignore */ }
    }
    return { ...normalized, cached: false }
  })().finally(() => {
    if (!force) inflightStandings.delete(cacheKey)
  })

  if (!force) inflightStandings.set(cacheKey, job)
  return job
}
