import { create } from 'zustand'
import { CURATED_RADAR_MOVES } from '../data/mockPaddock'
import { fetchNews as fetchFeed } from '../lib/news'

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch { /* ignore */ }
}

let newsSeq = 0

export const useNewsStore = create((set, get) => ({
  // Sport & Paddock Mode filters
  category: 'all', // 'all' | 'football' | 'f1' | 'cricket'
  sportFilter: 'all',
  modeFilter: 'all', // 'all' | 'radar' | 'soundboard' | 'debates'
  region: 'in',
  searchQuery: '',

  // Radar & Live sports feed items
  cards: CURATED_RADAR_MOVES,
  liveArticles: [],
  topIndex: 0,
  readingArticle: null,
  status: 'mock', // mock | loading | live | error
  source: 'mock',
  error: null,

  // Interactive Fan Engagement State (persisted in localStorage)
  radarVotes: loadJSON('flash-radar-votes-v1', {}), // { [id]: 'w' | 'cooked' }
  debateVotes: loadJSON('flash-debate-votes-v1', {}), // { [debateId]: 'A' | 'B' }
  radioHypes: loadJSON('flash-radio-hypes-v1', {}), // { [clipId]: true }
  saved: loadJSON('flash-saved-v1', []),

  setSportFilter: (sport) => {
    const next = ['all', 'football', 'f1', 'cricket'].includes(sport) ? sport : 'all'
    set({ category: next, sportFilter: next, searchQuery: '' })
    get().fetchNews(next, '')
  },

  setCategory: (category) => {
    get().setSportFilter(category)
  },

  setModeFilter: (mode) => {
    const next = ['all', 'radar', 'soundboard', 'debates'].includes(mode) ? mode : 'all'
    set({ modeFilter: next })
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  searchNews: (query) => {
    const q = String(query || '').trim()
    set({ searchQuery: q })
    if (q) {
      get().fetchNews(get().sportFilter, q)
    } else {
      get().fetchNews(get().sportFilter, '')
    }
  },

  voteRadar: (itemId, verdict) =>
    set((s) => {
      if (!itemId || (verdict !== 'w' && verdict !== 'cooked')) return {}
      const current = s.radarVotes[itemId]
      const nextVotes = { ...s.radarVotes }
      if (current === verdict) {
        delete nextVotes[itemId]
      } else {
        nextVotes[itemId] = verdict
      }
      saveJSON('flash-radar-votes-v1', nextVotes)
      return { radarVotes: nextVotes }
    }),

  voteDebate: (debateId, side) =>
    set((s) => {
      if (!debateId || (side !== 'A' && side !== 'B')) return {}
      const nextVotes = { ...s.debateVotes, [debateId]: side }
      saveJSON('flash-debate-votes-v1', nextVotes)
      return { debateVotes: nextVotes }
    }),

  toggleRadioHype: (clipId) =>
    set((s) => {
      if (!clipId) return {}
      const nextHypes = { ...s.radioHypes }
      if (nextHypes[clipId]) {
        delete nextHypes[clipId]
      } else {
        nextHypes[clipId] = true
      }
      saveJSON('flash-radio-hypes-v1', nextHypes)
      return { radioHypes: nextHypes }
    }),

  openReader: (article) => set({ readingArticle: article }),
  closeReader: () => set({ readingArticle: null }),

  toggleSave: (article) =>
    set((s) => {
      if (!article?.id) return {}
      const exists = s.saved.some((a) => a.id === article.id)
      const saved = exists
        ? s.saved.filter((a) => a.id !== article.id)
        : [{ ...article, savedAt: new Date().toISOString() }, ...s.saved]
      saveJSON('flash-saved-v1', saved)
      return { saved }
    }),

  isSaved: (articleId) => get().saved.some((a) => a.id === articleId),

  fetchNews: async (sportOverride, queryOverride) => {
    const sport = sportOverride ?? get().sportFilter ?? 'all'
    const q = queryOverride ?? get().searchQuery ?? ''
    const mySeq = ++newsSeq
    set({ status: 'loading', error: null })
    try {
      const apiCat = sport === 'all' ? 'paddock' : sport
      const { articles } = await fetchFeed(apiCat, 12, q, 'in')
      if (mySeq !== newsSeq) return
      set({
        liveArticles: articles,
        cards: articles.length ? articles : CURATED_RADAR_MOVES,
        status: 'live',
        source: 'live',
        error: null,
      })
    } catch (e) {
      if (mySeq !== newsSeq) return
      set({
        status: 'error',
        error: e?.message || 'Live paddock wire offline — showing curated insider radar',
      })
    }
  },
}))
