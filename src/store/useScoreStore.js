import { create } from 'zustand'
import { MOCK_FOOTBALL, MOCK_CRICKET } from '../data/mockScores'
import { fetchFootballLive } from '../lib/football'
import { fetchCricketLive } from '../lib/cricket'

// Latest-wins token for overlapping sport fetches (tab switches, polls).
let scoreSeq = 0

// Scores are separate from news likes — no like/dislike here by design.
// view: 'news' | 'scores' | 'f1' — scores + f1 are fully separate sections.
const initialView = (() => {
  try {
    const p = new URLSearchParams(window.location.search)
    if (p.get('view') === 'scores' || p.get('scores') === '1') return 'scores'
    if (p.get('view') === 'f1') return 'f1'
  } catch { /* ignore */ }
  return 'news'
})()

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const v = JSON.parse(raw)
    if (Array.isArray(fallback) && !Array.isArray(v)) return fallback
    return v ?? fallback
  } catch {
    return fallback
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch { /* ignore */ }
}

export const normalizeTeam = (name) => String(name || '').trim().toLowerCase()

export function isFavMatch(match, favTeams) {
  if (!favTeams?.length) return false
  const set = new Set(favTeams.map(normalizeTeam))
  return set.has(normalizeTeam(match?.teamA?.name)) || set.has(normalizeTeam(match?.teamB?.name))
}

function matchLeague(m) {
  return m.leagueName || String(m.league || '').split('•')[0].trim() || 'Other'
}

export function applyFilters(matches, filter, sport) {
  const league = filter?.league || 'All'
  const country = filter?.country || 'All'
  return (matches || []).filter((m) => {
    if (league !== 'All' && matchLeague(m) !== league) return false
    if (country !== 'All') {
      if (sport === 'football') {
        if ((m.country || '') !== country) return false
      } else {
        // cricket series carry no league-country → match team names
        const c = country.toLowerCase()
        if (normalizeTeam(m.teamA?.name) !== c && normalizeTeam(m.teamB?.name) !== c) return false
      }
    }
    return true
  })
}

export function sortByFavs(matches, favTeams) {
  if (!favTeams?.length) {
    return {
      sorted: [...(matches || [])].sort((a, b) => (a.status === 'live' ? 0 : 1) - (b.status === 'live' ? 0 : 1)),
      favMiss: false,
    }
  }
  const favs = []
  const rest = []
  for (const m of matches || []) (isFavMatch(m, favTeams) ? favs : rest).push(m)
  const byLive = (a, b) => (a.status === 'live' ? 0 : 1) - (b.status === 'live' ? 0 : 1)
  favs.sort(byLive)
  rest.sort(byLive)
  return { sorted: [...favs, ...rest], favMiss: favs.length === 0 }
}

export function getFilterOptions(matches, sport) {
  const leagues = new Set()
  const countries = new Set()
  const teams = new Set()
  for (const m of matches || []) {
    leagues.add(matchLeague(m))
    if (sport === 'football') {
      if (m.country) countries.add(m.country)
    } else {
      if (m.teamA?.name) countries.add(m.teamA.name)
      if (m.teamB?.name) countries.add(m.teamB.name)
    }
    if (m.teamA?.name) teams.add(m.teamA.name)
    if (m.teamB?.name) teams.add(m.teamB.name)
  }
  const sort = (s) => [...s].sort((a, b) => a.localeCompare(b))
  return { leagues: sort(leagues), countries: sort(countries), teams: sort(teams) }
}

const DEFAULT_FILTERS = {
  football: { league: 'All', country: 'All' },
  cricket: { league: 'All', country: 'All' },
}

export const useScoreStore = create((set, get) => ({
  view: initialView,
  setView: (view) => {
    set({ view })
    try {
      const params = new URLSearchParams(window.location.search)
      if (view === 'scores' || view === 'f1') params.set('view', view)
      else params.delete('view')
      const qs = params.toString()
      // empty qs must clear the query string — falling back to the old
      // window.location.search would resurrect a deleted ?view=scores
      window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''))
    } catch { /* ignore */ }
    if (view === 'scores') {
      requestAnimationFrame(() => {
        document.getElementById('live-scores')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    } else if (view === 'f1') {
      requestAnimationFrame(() => {
        document.getElementById('f1-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  },
  sport: 'football', // football | cricket
  football: MOCK_FOOTBALL,
  cricket: MOCK_CRICKET,
  status: 'mock', // mock | loading | live | error
  error: null,
  selected: null, // match object for modal scoreboard
  source: { football: 'mock', cricket: 'mock' },

  // ---- favorites + filters (persisted) ----
  favTeams: loadJSON('flash-favs-v1', []),
  // F1 driver pins live apart from team favs so pinning VER can't make the
  // scores section claim "no favourite-team matches"
  f1Favs: loadJSON('flash-f1favs-v1', []),
  filters: (() => {
    const v = loadJSON('flash-filters-v1', null)
    if (!v || typeof v !== 'object' || Array.isArray(v)) return DEFAULT_FILTERS
    return {
      football: { ...DEFAULT_FILTERS.football, ...(v.football || {}) },
      cricket: { ...DEFAULT_FILTERS.cricket, ...(v.cricket || {}) },
    }
  })(),

  toggleF1Fav: (acro) => {
    const norm = String(acro || '').trim().toUpperCase()
    if (!norm) return
    const current = get().f1Favs || []
    const next = current.includes(norm)
      ? current.filter((t) => t !== norm)
      : [...current, norm]
    set({ f1Favs: next })
    saveJSON('flash-f1favs-v1', next)
  },

  toggleFav: (teamName) => {
    const norm = normalizeTeam(teamName)
    if (!norm) return
    const current = get().favTeams || []
    const exists = current.some((t) => normalizeTeam(t) === norm)
    // store display-case version, dedupe case-insensitively
    const next = exists
      ? current.filter((t) => normalizeTeam(t) !== norm)
      : [...current, String(teamName).trim()]
    set({ favTeams: next })
    saveJSON('flash-favs-v1', next)
  },

  clearFavs: () => {
    set({ favTeams: [] })
    saveJSON('flash-favs-v1', [])
  },

  setFilter: (sport, key, value) => {
    const next = {
      ...get().filters,
      [sport]: { ...(get().filters?.[sport] || { league: 'All', country: 'All' }), [key]: value },
    }
    set({ filters: next })
    saveJSON('flash-filters-v1', next)
  },

  clearFilters: (sport) => {
    const next = { ...get().filters, [sport]: { league: 'All', country: 'All' } }
    set({ filters: next })
    saveJSON('flash-filters-v1', next)
  },

  getFilterOptionsFor: (sport) => getFilterOptions(get()[sport] || [], sport),

  getVisibleMatches: (sport) => {
    const s = sport ?? get().sport
    const all = get()[s] || []
    const filter = get().filters?.[s] || { league: 'All', country: 'All' }
    const filtered = applyFilters(all, filter, s)
    const { sorted, favMiss } = sortByFavs(filtered, get().favTeams)
    return { matches: sorted, total: all.length, filteredCount: filtered.length, favMiss }
  },

  setSport: (sport) => {
    set({ sport })
    get().fetchScores(sport)
  },

  fetchScores: async (sport) => {
    const s = sport ?? get().sport
    const mySeq = ++scoreSeq
    // don't flash SYNC on every 60s poll when we're already showing live
    // data, and let overlapping football/cricket fetches resolve with
    // latest-wins (a slow stale reply must not flip status/error)
    const hadLive = get().status === 'live' && (get()[s] || []).length > 0
    set(hadLive ? { error: null } : { status: 'loading', error: null })
    try {
      if (s === 'football') {
        // NOTE: no client-key gate — /api/football proxy holds the key
        // server-side (Vite dev + Vercel prod). fetchFootballLive falls
        // back to direct only if the proxy lacks the key.
        const { matches } = await fetchFootballLive()
        if (mySeq !== scoreSeq) return
        if (matches.length) {
          set((st) => ({ football: matches, status: 'live', source: { ...st.source, football: 'live' } }))
        } else if (!hadLive) {
          set({ status: 'mock', error: 'No live football right now — showing mock' })
        } else {
          // keep last-good live rows, just note the empty poll
          set({ error: 'No live football right now — showing last data' })
        }
      } else {
        const { matches } = await fetchCricketLive()
        if (mySeq !== scoreSeq) return
        if (matches.length) {
          set((st) => ({ cricket: matches, status: 'live', source: { ...st.source, cricket: 'live' } }))
        } else if (!hadLive) {
          set({ status: 'mock', error: 'No live cricket right now — showing mock' })
        } else {
          set({ error: 'No live cricket right now — showing last data' })
        }
      }
    } catch (e) {
      if (mySeq !== scoreSeq) return
      // keep last-good rows on failure instead of blanking to an error state
      set(hadLive ? { error: e.message } : { status: 'error', error: e.message })
    }
  },

  openMatch: (match) => {
    set({ selected: match })
    try {
      const params = new URLSearchParams(window.location.search)
      params.set('match', match.id)
      params.set('sport', match.sport)
      window.history.replaceState(null, '', `${window.location.pathname}?${params}`)
    } catch { /* ignore */ }
  },

  closeMatch: () => {
    set({ selected: null })
    try {
      const params = new URLSearchParams(window.location.search)
      params.delete('match')
      params.delete('sport')
      const qs = params.toString()
      window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''))
    } catch { /* ignore */ }
  },

  liveCount: () => {
    const { football, cricket } = get()
    return [...(football || []), ...(cricket || [])].filter((m) => m.status === 'live').length
  },
}))
