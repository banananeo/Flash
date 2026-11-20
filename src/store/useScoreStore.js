import { create } from 'zustand'
import { MOCK_FOOTBALL, MOCK_CRICKET } from '../data/mockScores'
import { fetchFootballLive } from '../lib/football'
import { fetchCricketLive } from '../lib/cricket'

let scoreSeq = 0

export function todayISO() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function shiftISO(isoStr, days) {
  const [y, m, d] = String(isoStr || todayISO()).split('-').map(Number)
  const dt = new Date(y, (m || 1) - 1, (d || 1) + days)
  const yyyy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const initialView = (() => {
  try {
    const p = new URLSearchParams(window.location.search)
    const v = p.get('view')
    if (v === 'scores' || p.get('scores') === '1') return 'scores'
    if (v === 'f1') return 'f1'
    if (v === 'saved') return 'saved'
  } catch { /* ignore */ }
  return 'news'
})()

const initialSport = (() => {
  try {
    const s = new URLSearchParams(window.location.search).get('sport')
    if (s === 'cricket' || s === 'football' || s === 'following') return s
  } catch { /* ignore */ }
  return 'football'
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
export const normalizeLeague = (name) => String(name || '').trim().toLowerCase()

const TEAM_ALIASES = {
  'man city': 'manchester city',
  'manchester city': 'man city',
  'man utd': 'manchester united',
  'man united': 'manchester united',
  'manchester united': 'man utd',
  psg: 'paris saint-germain',
  'paris saint-germain': 'psg',
  inter: 'internazionale',
  internazionale: 'inter',
  'inter milan': 'internazionale',
  bayern: 'bayern munich',
  'bayern munich': 'fc bayern munich',
  barca: 'barcelona',
  spurs: 'tottenham hotspur',
  tottenham: 'tottenham hotspur',
}

export function teamMatchesName(candidate, followed) {
  const a = normalizeTeam(candidate)
  const b = normalizeTeam(followed)
  if (!a || !b) return false
  if (a === b) return true
  if (TEAM_ALIASES[a] === b || TEAM_ALIASES[b] === a) return true
  if (b.length >= 4 && (a.includes(b) || b.includes(a))) return true
  return false
}

export function isFavMatch(match, favTeams) {
  if (!favTeams?.length || !match) return false
  const nameA = match.teamA?.name || ''
  const nameB = match.teamB?.name || ''
  return favTeams.some((fav) => teamMatchesName(nameA, fav) || teamMatchesName(nameB, fav))
}

export function isFavLeagueMatch(match, favLeagues) {
  if (!favLeagues?.length || !match) return false
  const lg = normalizeLeague(match.leagueName || match.league)
  if (!lg) return false
  return favLeagues.some((fav) => {
    const f = normalizeLeague(fav)
    return f && (lg === f || lg.includes(f) || f.includes(lg))
  })
}

// Given a pool of matches (including multi-day upcoming lookahead), returns the
// best "Live or Next Match" cards for the user's chosen teams and leagues.
export function pickLiveOrNextForSelections(matches, favTeams = [], favLeagues = []) {
  const list = Array.isArray(matches) ? matches : []
  if (!favTeams.length && !favLeagues.length) return []

  const pickedIds = new Set()
  const out = []

  // 1) For each followed team, pick its LIVE match if playing now, otherwise its earliest scheduled NEXT match (or latest FT if none scheduled)
  for (const team of favTeams) {
    const teamMatches = list.filter(
      (m) => teamMatchesName(m?.teamA?.name, team) || teamMatchesName(m?.teamB?.name, team),
    )
    if (!teamMatches.length) continue
    const live = teamMatches.find((m) => m.status === 'live')
    const nextSched = teamMatches
      .filter((m) => m.status === 'scheduled')
      .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')))[0]
    const chosen = live || nextSched || teamMatches[0]
    if (chosen && !pickedIds.has(chosen.id)) {
      pickedIds.add(chosen.id)
      out.push(chosen)
    }
  }

  // 2) For each followed league, include all LIVE matches + the next upcoming matches (up to 4 per league so it stays scannable)
  for (const league of favLeagues) {
    const lgMatches = list.filter((m) => isFavLeagueMatch(m, [league]))
    if (!lgMatches.length) continue
    const live = lgMatches.filter((m) => m.status === 'live')
    const upcoming = lgMatches
      .filter((m) => m.status === 'scheduled')
      .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')))
    const toAdd = live.length ? [...live, ...upcoming.slice(0, 2)] : upcoming.slice(0, 4)
    const fallback = toAdd.length ? toAdd : lgMatches.slice(0, 2)
    for (const m of fallback) {
      if (m && !pickedIds.has(m.id)) {
        pickedIds.add(m.id)
        out.push(m)
      }
    }
  }

  const statusRank = (s) => (s === 'live' ? 0 : s === 'scheduled' ? 1 : 2)
  return out.sort((a, b) => {
    const sr = statusRank(a.status) - statusRank(b.status)
    if (sr !== 0) return sr
    return String(a.time || '').localeCompare(String(b.time || ''))
  })
}

export const POPULAR_FOOTBALL_LEAGUES = [
  'English Premier League',
  'UEFA Champions League',
  'Spanish LALIGA',
  'Italian Serie A',
  'German Bundesliga',
  'French Ligue 1',
  'UEFA Europa League',
  'Indian Super League',
  'MLS',
]

export const POPULAR_FOOTBALL_TEAMS = [
  'Arsenal',
  'Liverpool',
  'Manchester City',
  'Chelsea',
  'Manchester United',
  'Real Madrid',
  'Barcelona',
  'Bayern Munich',
  'Inter',
  'PSG',
]

export const POPULAR_CRICKET_TEAMS = [
  'India',
  'Australia',
  'England',
  'South Africa',
  'New Zealand',
  'Pakistan',
  'Sri Lanka',
  'West Indies',
]

export const useScoreStore = create((set, get) => ({
  view: initialView,
  setView: (view) => {
    set({ view })
    try {
      const params = new URLSearchParams(window.location.search)
      if (view === 'scores' || view === 'f1' || view === 'saved') params.set('view', view)
      else params.delete('view')
      const qs = params.toString()
      window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''))
    } catch { /* ignore */ }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  },

  sport: initialSport, // football | cricket | following
  selectedDate: todayISO(),
  activeLeague: 'all', // 'all' | specific leagueName
  football: MOCK_FOOTBALL,
  cricket: MOCK_CRICKET,
  status: 'mock', // mock | loading | live | error
  error: null,
  selected: null,
  source: { football: 'mock', cricket: 'mock' },

  favTeams: loadJSON('flash-favs-v1', []),
  favLeagues: loadJSON('flash-fav-leagues-v1', []),
  f1Favs: loadJSON('flash-f1favs-v1', []),

  setActiveLeague: (activeLeague) => set({ activeLeague: activeLeague || 'all' }),

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
    const next = exists
      ? current.filter((t) => normalizeTeam(t) !== norm)
      : [...current, String(teamName).trim()]
    set({ favTeams: next })
    saveJSON('flash-favs-v1', next)
  },

  toggleFavLeague: (leagueName) => {
    const norm = normalizeLeague(leagueName)
    if (!norm) return
    const current = get().favLeagues || []
    const exists = current.some((l) => normalizeLeague(l) === norm)
    const next = exists
      ? current.filter((l) => normalizeLeague(l) !== norm)
      : [...current, String(leagueName).trim()]
    set({ favLeagues: next })
    saveJSON('flash-fav-leagues-v1', next)
  },

  clearSelections: () => {
    set({ favTeams: [], favLeagues: [], activeLeague: 'all' })
    saveJSON('flash-favs-v1', [])
    saveJSON('flash-fav-leagues-v1', [])
  },

  setSport: (sport) => {
    set({ sport, activeLeague: 'all' })
    if (sport === 'following') {
      get().fetchBoth()
    } else {
      get().fetchScores(sport, get().selectedDate)
    }
  },

  setSelectedDate: (isoDate) => {
    set({ selectedDate: isoDate })
    const s = get().sport
    if (s === 'following') {
      get().fetchBoth(isoDate)
    } else {
      get().fetchScores(s, isoDate)
    }
  },

  fetchBoth: async (dateOverride) => {
    const dt = dateOverride ?? get().selectedDate
    const dateParam = dt === todayISO() ? '' : dt
    set({ status: 'loading', error: null })
    const [fb, cr] = await Promise.allSettled([
      fetchFootballLive(dateParam),
      fetchCricketLive(dateParam),
    ])
    set((st) => ({
      status: 'live',
      football: fb.status === 'fulfilled' && fb.value.matches.length ? fb.value.matches : st.football,
      cricket: cr.status === 'fulfilled' && cr.value.matches.length ? cr.value.matches : st.cricket,
      source: {
        football: fb.status === 'fulfilled' ? 'live' : st.source.football,
        cricket: cr.status === 'fulfilled' ? 'live' : st.source.cricket,
      },
    }))
  },

  fetchScores: async (sport, dateOverride) => {
    const s = sport ?? get().sport
    if (s === 'following') {
      return get().fetchBoth(dateOverride)
    }
    const dt = dateOverride ?? get().selectedDate
    const dateParam = dt === todayISO() ? '' : dt
    const mySeq = ++scoreSeq
    const hadLive = get().source[s] === 'live' && (get()[s] || []).length > 0 && !dateParam
    set(hadLive ? { error: null } : { status: 'loading', error: null })
    try {
      if (s === 'football') {
        const { matches } = await fetchFootballLive(dateParam)
        if (mySeq !== scoreSeq) return
        set((st) => ({
          football: matches,
          status: 'live',
          error: null,
          source: { ...st.source, football: 'live' },
        }))
      } else {
        const { matches } = await fetchCricketLive(dateParam)
        if (mySeq !== scoreSeq) return
        set((st) => ({
          cricket: matches,
          status: 'live',
          error: null,
          source: { ...st.source, cricket: 'live' },
        }))
      }
    } catch (e) {
      if (mySeq !== scoreSeq) return
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
}))
