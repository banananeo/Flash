// ESPN Soccer (Football) public JSON → normalized Match & Match Centre shapes.
// Same-origin proxy: /api/football/live[?date=YYYYMMDD] + /api/football/detail?id=...&league=...
// Zero API key, zero 100 req/day quota.

async function readJSON(res, what = 'Football') {
  try {
    return await res.json()
  } catch {
    throw new Error(`${what} sent a bad response — showing preview`)
  }
}

function friendlyFootballError(e) {
  if (e instanceof TypeError || /failed to fetch|networkerror|load failed|network request failed/i.test(e?.message || '')) {
    return new Error('Network blocked — check connection / ad-blocker / VPN')
  }
  return e
}

export async function fetchFootballLive(dateStr = '') {
  const cleanDate = String(dateStr || '').replace(/-/g, '')
  const cacheKey = `live-cache-football-${cleanDate || 'today'}`
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null')
    if (
      cached &&
      cached.provider === 'espn' &&
      Date.now() - cached.ts < 60 * 1000 &&
      cached.matches?.length
    ) {
      return { matches: cached.matches, cached: true }
    }
  } catch { /* ignore */ }

  const qs = cleanDate ? `?date=${encodeURIComponent(cleanDate)}` : ''
  let res
  try {
    res = await fetch(`/api/football/live${qs}`)
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
      localStorage.setItem(cacheKey, JSON.stringify({ provider: 'espn', ts: Date.now(), matches }))
    } catch { /* ignore */ }
  }
  return { matches, cached: false }
}

// Match Centre detail: { header, stats[], latestMoment, lineups: { home, away }, events[] }
export async function fetchFootballDetail(eventId, leagueSlug = '') {
  const rawId = String(eventId || '').replace(/^fb-/, '')
  const params = new URLSearchParams({ id: rawId })
  if (leagueSlug) params.set('league', String(leagueSlug))

  let res
  try {
    res = await fetch(`/api/football/detail?${params}`)
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
