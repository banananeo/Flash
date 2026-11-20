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

export function isFavMatch(match, favTeams) {
  if (!favTeams?.length) return false
  const set = new Set(favTeams.map(normalizeTeam))
  return set.has(normalizeTeam(match?.teamA?.name)) || set.has(normalizeTeam(match?.teamB?.name))
}

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
  football: MOCK_FOOTBALL,
  cricket: MOCK_CRICKET,
  status: 'mock', // mock | loading | live | error
  error: null,
  selected: null,
  source: { football: 'mock', cricket: 'mock' },

  favTeams: loadJSON('flash-favs-v1', []),
  f1Favs: loadJSON('flash-f1favs-v1', []),

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

  setSport: (sport) => {
    set({ sport })
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
