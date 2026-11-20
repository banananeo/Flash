import { create } from 'zustand'
import { MOCK_NEWS } from '../data/mockNews'
import { fetchNews as fetchFeed } from '../lib/news'

function loadSaved() {
  try {
    const raw = localStorage.getItem('flash-saved-v1')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
    // Seamless migration from legacy `flash-likes`
    const legacy = JSON.parse(localStorage.getItem('flash-likes') || '[]')
    if (Array.isArray(legacy) && legacy.length) {
      localStorage.setItem('flash-saved-v1', JSON.stringify(legacy))
      return legacy
    }
  } catch { /* ignore */ }
  return []
}

function persistSaved(list) {
  try {
    localStorage.setItem('flash-saved-v1', JSON.stringify(list))
  } catch { /* ignore */ }
}

function shuffled(arr) {
  const a = [...(arr || [])]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

let newsSeq = 0

function loadRegion() {
  try {
    const r = localStorage.getItem('flash-news-region-v1')
    return r === 'global' ? 'global' : 'in'
  } catch {
    return 'in'
  }
}

export const useNewsStore = create((set, get) => ({
  category: 'all',
  region: loadRegion(), // 'in' (India Regional Edition) | 'global' (Global Edition)
  searchQuery: '',
  cards: MOCK_NEWS,
  topIndex: 0,
  isFlipped: false,
  lastDir: 'right',
  saved: loadSaved(),
  readingArticle: null,
  status: 'mock', // mock | loading | live | error
  source: 'mock',
  error: null,

  setRegion: (region) => {
    const reg = region === 'global' ? 'global' : 'in'
    try {
      localStorage.setItem('flash-news-region-v1', reg)
    } catch { /* ignore */ }
    set({ region: reg, topIndex: 0, isFlipped: false, lastDir: 'right' })
    get().fetchNews(get().category, get().searchQuery, reg)
  },

  setCategory: (category) => {
    set({ category, searchQuery: '', topIndex: 0, isFlipped: false, lastDir: 'right' })
    get().fetchNews(category, '', get().region)
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  searchNews: (query) => {
    const q = String(query || '').trim()
    set({ searchQuery: q, topIndex: 0, isFlipped: false, lastDir: 'right' })
    get().fetchNews(get().category, q, get().region)
  },

  toggleFlip: () => set((s) => ({ isFlipped: !s.isFlipped })),
  setFlipped: (isFlipped) => set({ isFlipped: Boolean(isFlipped) }),

  swipe: (dir = 'right') =>
    set((s) => {
      if (!s.cards?.length) return {}
      if (dir === 'left') {
        // Swipe left advances to next story as well (classic flash-card deck swipe),
        // while keeping exit direction 'left'
        return {
          topIndex: s.topIndex + 1,
          isFlipped: false,
          lastDir: 'left',
        }
      }
      return {
        topIndex: s.topIndex + 1,
        isFlipped: false,
        lastDir: 'right',
      }
    }),

  nextCard: () =>
    set((s) => ({
      topIndex: s.topIndex + 1,
      isFlipped: false,
      lastDir: 'right',
    })),

  prevCard: () =>
    set((s) => ({
      topIndex: Math.max(0, s.topIndex - 1),
      isFlipped: false,
      lastDir: 'left',
    })),

  resetDeck: () => set({ topIndex: 0, isFlipped: false, lastDir: 'right' }),

  reshuffleDeck: () =>
    set((s) => ({
      cards: shuffled(s.cards),
      topIndex: 0,
      isFlipped: false,
      lastDir: 'right',
    })),

  openReader: (article) => set({ readingArticle: article }),
  closeReader: () => set({ readingArticle: null }),

  toggleSave: (article) =>
    set((s) => {
      if (!article?.id) return {}
      const exists = s.saved.some((a) => a.id === article.id)
      const saved = exists
        ? s.saved.filter((a) => a.id !== article.id)
        : [{ ...article, savedAt: new Date().toISOString() }, ...s.saved]
      persistSaved(saved)
      return { saved }
    }),

  isSaved: (articleId) => get().saved.some((a) => a.id === articleId),

  fetchNews: async (category, query, regionOverride) => {
    const cat = category ?? get().category
    const q = query ?? get().searchQuery
    const reg = regionOverride ?? get().region ?? 'in'
    const mySeq = ++newsSeq
    set({ status: 'loading', error: null })
    try {
      const { articles } = await fetchFeed(cat, 10, q, reg)
      if (mySeq !== newsSeq) return
      if (!articles.length) throw new Error('No articles found')
      set({
        cards: articles,
        topIndex: 0,
        isFlipped: false,
        lastDir: 'right',
        status: 'live',
        source: 'live',
        error: null,
      })
    } catch (e) {
      if (mySeq !== newsSeq) return
      const current = get().cards
      const needsFallback = !current?.length
      set({
        status: 'error',
        source: needsFallback ? 'mock' : get().source,
        error: e.message,
        ...(needsFallback ? { cards: MOCK_NEWS, topIndex: 0, isFlipped: false } : {}),
      })
    }
  },
}))
