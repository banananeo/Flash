import { create } from 'zustand'
import { MOCK_NEWS } from '../data/mockNews'
import { fetchGNews } from '../lib/gnews'

const load = (key) => {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

// Monotonic fetch token — rapid setCategory taps race; only the latest
// response may touch state so a slow stale reply can't clobber fresh cards.
let newsSeq = 0

function shuffled(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const useNewsStore = create((set, get) => ({
  category: 'all',
  cards: MOCK_NEWS,
  topIndex: 0,
  lastDir: 'right', // direction of the most recent swipe (exit animation)
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
    const mySeq = ++newsSeq
    // NOTE: no client-key gate here — the same-origin /api/gnews proxy
    // (Vite dev + Vercel prod) holds the key server-side. fetchGNews tries
    // the proxy first and only needs VITE_GNEWS for direct fallback.
    set({ status: 'loading', error: null })
    try {
      const { articles } = await fetchGNews(cat, 10)
      if (mySeq !== newsSeq) return // stale reply — a newer fetch is in flight
      if (!articles.length) throw new Error('No articles returned')
      set({ cards: articles, topIndex: 0, isFlipped: false, status: 'live', source: 'live', lastDir: 'right' })
    } catch (e) {
      if (mySeq !== newsSeq) return
      // quota / network → graceful mock fallback so design never breaks
      const isQuota = /quota/i.test(e.message)
      const current = get().cards
      const needsFallback = !current?.length
      set({
        status: 'error',
        // keep the previous source when we keep showing previous cards;
        // only claim 'mock' when we actually fall back to MOCK_NEWS
        // (reference equality breaks after reshuffle copies the array).
        source: needsFallback ? 'mock' : get().source,
        error: e.message,
        ...(needsFallback ? { cards: MOCK_NEWS, topIndex: 0 } : {}),
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
      // remembered so the exiting card flies the way it was swiped
      return { likes, dislikes, topIndex: s.topIndex + 1, isFlipped: false, lastDir: dir === 'left' ? 'left' : 'right' }
    }),

  reshuffle: () =>
    set((s) => ({ cards: shuffled(s.cards), topIndex: 0, isFlipped: false })),

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
