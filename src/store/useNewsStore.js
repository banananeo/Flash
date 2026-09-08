import { create } from 'zustand'
import { MOCK_NEWS } from '../data/mockNews'
import { fetchGNews } from '../lib/gnews'

const load = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}

export const useNewsStore = create((set, get) => ({
  category: 'all',
  cards: MOCK_NEWS,
  topIndex: 0,
  likes: load('flash-likes'),
  dislikes: load('flash-dislikes'),
  isFlipped: false,
  // live-data state
  status: 'mock', // mock | loading | live | error
  source: 'mock',
  error: null,

  setCategory: (category) => {
    set({ category, topIndex: 0, isFlipped: false })
    get().fetchNews(category)
  },

  fetchNews: async (category) => {
    const cat = category ?? get().category
    // NOTE: no client-key gate here — the same-origin /api/gnews proxy
    // (Vite dev + Vercel prod) holds the key server-side. fetchGNews tries
    // the proxy first and only needs VITE_GNEWS for direct fallback.
    set({ status: 'loading', error: null })
    try {
      const { articles } = await fetchGNews(cat, 10)
      if (!articles.length) throw new Error('No articles returned')
      set({ cards: articles, topIndex: 0, isFlipped: false, status: 'live', source: 'live' })
    } catch (e) {
      // quota / network → graceful mock fallback so design never breaks
      const isQuota = /quota/i.test(e.message)
      const current = get().cards
      set({
        status: 'error',
        source: current === MOCK_NEWS || !current.length ? 'mock' : 'live',
        error: e.message,
        ...(current.length ? {} : { cards: MOCK_NEWS, topIndex: 0 }),
      })
      if (isQuota) console.warn('[GNews]', e.message)
    }
  },

  swipe: (dir) =>
    set((s) => {
      const current = s.cards[s.topIndex]
      if (!current) return {}
      let likes = s.likes
      let dislikes = s.dislikes
      if (dir === 'right') {
        likes = [...s.likes, current].filter(
          (v, i, a) => a.findIndex((x) => x.id === v.id) === i,
        )
        try {
          localStorage.setItem('flash-likes', JSON.stringify(likes))
        } catch { /* ignore */ }
      } else {
        dislikes = [...s.dislikes, current].filter(
          (v, i, a) => a.findIndex((x) => x.id === v.id) === i,
        )
        try {
          localStorage.setItem('flash-dislikes', JSON.stringify(dislikes))
        } catch { /* ignore */ }
      }
      return { likes, dislikes, topIndex: s.topIndex + 1, isFlipped: false }
    }),

  reshuffle: () =>
    set((s) => {
      const shuffled = [...s.cards].sort(() => Math.random() - 0.5)
      return { cards: shuffled, topIndex: 0, isFlipped: false }
    }),

  reset: () => set({ topIndex: 0, isFlipped: false }),

  clearReactions: () =>
    set(() => {
      try {
        localStorage.removeItem('flash-likes')
        localStorage.removeItem('flash-dislikes')
      } catch { /* ignore */ }
      return { likes: [], dislikes: [] }
    }),

  toggleFlip: () => set((s) => ({ isFlipped: !s.isFlipped })),

  remaining: () => {
    const { cards, topIndex } = get()
    return Math.max(0, cards.length - topIndex)
  },
}))
