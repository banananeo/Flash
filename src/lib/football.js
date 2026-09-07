// API-Football → normalized Match shape.
// Docs: GET https://v3.football.api-sports.io/fixtures?live=all
// Tries Vite proxy first (key server-side), falls back to direct fetch
// with header (api-sports allows browser CORS).

function mapFixture(f) {
  const short = f.fixture?.status?.short
  const isLive = ['1H', '2H', 'ET', 'P', 'LIVE', 'HT', 'BT'].includes(short)
  const isFT = ['FT', 'AET', 'PEN'].includes(short)
  const elapsed = f.fixture?.status?.elapsed
  return {
    id: `fb-${f.fixture?.id}`,
    sport: 'football',
    league: `${f.league?.name || 'Football'} • ${f.league?.round || f.fixture?.status?.long || ''}`.trim(),
    status: isLive ? 'live' : isFT ? 'ft' : 'scheduled',
    minute: isLive ? (elapsed ? `${elapsed}'` : 'LIVE') : short || 'NS',
    teamA: { name: f.teams?.home?.name || 'Home', short: (f.teams?.home?.name || 'HOM').slice(0, 3).toUpperCase(), score: f.goals?.home ?? 0, logo: f.teams?.home?.logo },
    teamB: { name: f.teams?.away?.name || 'Away', short: (f.teams?.away?.name || 'AWY').slice(0, 3).toUpperCase(), score: f.goals?.away ?? 0, logo: f.teams?.away?.logo },
    events: (f.events || []).slice(0, 8).map((e) => ({
      min: `${e.time?.elapsed ?? ''}'`,
      text: `${e.type === 'Goal' ? '⚽' : e.type === 'Card' ? (/red/i.test(e.detail || '') ? '🟥' : '🟨') : e.type === 'subst' ? '🔄' : '•'} ${e.player?.name || ''} (${e.team?.name || ''})${e.detail ? ` — ${e.detail}` : ''}`,
    })),
    stats: (f.statistics || []).slice(0, 3).map((s) => ({ label: s.type, display: `${s.value ?? '–'}` })),
    rawId: f.fixture?.id,
    time: f.fixture?.date,
  }
}

async function fetchViaProxy() {
  const res = await fetch('/api/football/fixtures?live=all')
  if (res.status === 404) throw new Error('proxy-miss')
  return res
}

async function fetchDirect(key) {
  return fetch('https://v3.football.api-sports.io/fixtures?live=all', {
    headers: { 'x-apisports-key': key },
  })
}

export async function fetchFootballLive() {
  const cacheKey = 'live-cache-football'
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null')
    if (cached && Date.now() - cached.ts < 90 * 1000 && cached.matches?.length) {
      return { matches: cached.matches, cached: true }
    }
  } catch { /* ignore */ }

  const key = import.meta.env.VITE_FOOTBALL_API_KEY
  if (!key) throw new Error('Add VITE_FOOTBALL_API_KEY for live — showing mock')

  let res
  try {
    res = await fetchViaProxy()
    // proxy without key → 401: retry direct with key from bundle
    if (res.status === 401 || res.status === 403) res = await fetchDirect(key)
  } catch {
    res = await fetchDirect(key)
  }
  if (res.status === 429) throw new Error('Football quota hit — showing mock')
  if (!res.ok) throw new Error(`Football error ${res.status}`)
  const data = await res.json()
  if (data.errors && Object.keys(data.errors).length) {
    throw new Error(`Football key error: ${Object.values(data.errors).flat().join(' ')}`)
  }
  const matches = (data.response || []).slice(0, 15).map(mapFixture)

  try {
    localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), matches }))
  } catch { /* ignore */ }
  return { matches, cached: false }
}

// Full scoreboard: events for one fixture (direct, needs key)
export async function fetchFixtureDetail(fixtureId) {
  const key = import.meta.env.VITE_FOOTBALL_API_KEY
  const url = `/api/football/fixtures/events?fixture=${fixtureId}`
  let res
  try {
    res = await fetch(url)
    if (res.status === 404 || res.status === 401) throw new Error('proxy-miss')
  } catch {
    if (!key) throw new Error('Football key missing')
    res = await fetch(`https://v3.football.api-sports.io/fixtures/events?fixture=${fixtureId}`, {
      headers: { 'x-apisports-key': key },
    })
  }
  if (!res.ok) throw new Error(`Fixture error ${res.status}`)
  const data = await res.json()
  return data.response || []
}
