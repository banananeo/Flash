import { create } from 'zustand'
import { MOCK_FOOTBALL, MOCK_CRICKET } from '../data/mockScores'
import { fetchFootballLive } from '../lib/football'
import { fetchCricketLive } from '../lib/cricket'

// Scores are separate from news likes — no like/dislike here by design.
// view: 'news' | 'scores' — scores is a fully separate section.
const initialView = (() => {
  try {
    const p = new URLSearchParams(window.location.search)
    if (p.get('view') === 'scores' || p.get('scores') === '1') return 'scores'
  } catch { /* ignore */ }
  return 'news'
})()

export const useScoreStore = create((set, get) => ({
  view: initialView,
  setView: (view) => {
    set({ view })
    try {
      const params = new URLSearchParams(window.location.search)
      if (view === 'scores') params.set('view', 'scores')
      else params.delete('view')
      const qs = params.toString()
      window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : window.location.search))
    } catch { /* ignore */ }
    if (view === 'scores') {
      requestAnimationFrame(() => {
        document.getElementById('live-scores')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

  setSport: (sport) => {
    set({ sport })
    get().fetchScores(sport)
  },

  fetchScores: async (sport) => {
    const s = sport ?? get().sport
    set({ status: 'loading', error: null })
    try {
      if (s === 'football') {
        if (!import.meta.env.VITE_FOOTBALL) {
          set({ status: 'mock', source: { ...get().source, football: 'mock' }, error: 'Add VITE_FOOTBALL for live — showing mock' })
          return
        }
        const { matches } = await fetchFootballLive()
        if (matches.length) {
          set((st) => ({ football: matches, status: 'live', source: { ...st.source, football: 'live' } }))
        } else {
          set({ status: 'mock', error: 'No live football right now — showing mock' })
        }
      } else {
        const { matches } = await fetchCricketLive()
        if (matches.length) {
          set((st) => ({ cricket: matches, status: 'live', source: { ...st.source, cricket: 'live' } }))
        } else {
          set({ status: 'mock', error: 'No live cricket right now — showing mock' })
        }
      }
    } catch (e) {
      set({ status: 'error', error: e.message })
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
    return [...football, ...cricket].filter((m) => m.status === 'live').length
  },
}))
