// CricAPI → normalized Match shape.
// Docs: GET https://api.cricapi.com/v1/cricScore?apikey=KEY
// Key injected via proxy/query server-side; client uses /api/cricket/cricScore.

function mapMatch(m) {
  const live = /live/i.test(m.status || '')
  const done = /won|draw|tie|complete|result/i.test(m.status || '')
  const t1 = m.t1 || 'Team A'
  const t2 = m.t2 || 'Team B'
  return {
    id: `cr-${m.id}`,
    sport: 'cricket',
    league: m.series || m.matchType?.toUpperCase() || 'Cricket',
    status: live ? 'live' : done ? 'ft' : 'scheduled',
    teamA: { name: t1, short: m.t1short || t1.slice(0, 3).toUpperCase(), score: m.t1s || 'Yet to bat', overs: '' },
    teamB: { name: t2, short: m.t2short || t2.slice(0, 3).toUpperCase(), score: m.t2s || 'Yet to bat', overs: '' },
    meta: { need: m.status || '', crr: '', lastWicket: '' },
    recentBalls: [],
    batters: [],
    bowlers: [],
    rawId: m.id,
    time: m.dateTimeGMT,
  }
}

function friendlyCricketError(e) {
  if (e instanceof TypeError || /failed to fetch|networkerror|load failed|network request failed/i.test(e?.message || '')) {
    return new Error('Network blocked — check connection / ad-blocker / VPN — showing mock')
  }
  return e
}

async function fetchCricketDirect(endpoint, key) {
  return fetch(`https://api.cricapi.com/v1/${endpoint}?apikey=${key}`)
}

export async function fetchCricketLive() {
  const cacheKey = 'live-cache-cricket'
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null')
    if (cached && Date.now() - cached.ts < 90 * 1000 && cached.matches?.length) {
      return { matches: cached.matches, cached: true }
    }
  } catch { /* ignore */ }

  const key = import.meta.env.VITE_CRICAPI
  // proxy first (no key in URL — injected server-side in dev AND prod),
  // fall back to direct with client key
  let res
  try {
    res = await fetch('/api/cricket/cricScore')
    if (res.status === 404) throw new Error('proxy-miss')
    // proxy without key → 401/500: retry direct with bundled key
    if ((res.status === 401 || res.status === 500) && key) {
      res = await fetchCricketDirect('cricScore', key)
    }
  } catch (e) {
    if (!key) throw friendlyCricketError(e)
    try {
      res = await fetchCricketDirect('cricScore', key)
    } catch (e2) {
      throw friendlyCricketError(e2)
    }
  }
  if (!res) throw new Error('Add VITE_CRICAPI in Vercel env vars for live — showing mock')
  if (res.status === 429) throw new Error('Cricket quota hit — showing mock')
  if (res.status === 500) throw new Error('Add VITE_CRICAPI in Vercel env vars for live — showing mock')
  if (!res.ok) {
    let msg = `Cricket error ${res.status}`
    try {
      const err = await res.clone().json()
      if (err?.error) msg = String(err.error).slice(0, 160)
    } catch { /* keep default */ }
    throw new Error(msg)
  }
  const data = await res.json()
  const list = data.data || []
  const live = list.filter((m) => /live/i.test(m.status || ''))
  const matches = (live.length ? live : list).slice(0, 12).map(mapMatch)

  try {
    localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), matches }))
  } catch { /* ignore */ }
  return { matches, cached: false }
}

// Full scoreboard for one match (proxy first, direct fallback)
export async function fetchCricketDetail(matchId) {
  const key = import.meta.env.VITE_CRICAPI
  const rawId = String(matchId).replace(/^cr-/, '')
  let res
  try {
    res = await fetch(`/api/cricket/match_info?id=${rawId}`)
    if ((res.status === 404 || res.status === 401 || res.status === 500) && key) {
      throw new Error('proxy-miss')
    }
  } catch {
    if (!key) throw new Error('Add VITE_CRICAPI in Vercel env vars for live — showing mock')
    try {
      res = await fetch(`https://api.cricapi.com/v1/match_info?apikey=${key}&id=${rawId}`)
    } catch (e) {
      throw friendlyCricketError(e)
    }
  }
  if (!res.ok) throw new Error(`Scoreboard error ${res.status}`)
  const data = await res.json()
  return data.data
}
