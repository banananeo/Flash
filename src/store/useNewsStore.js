import { create } from 'zustand'
import { MOCK_NEWS } from '../data/mockNews'
import { fetchGNews } from '../lib/gnews'

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

let newsSeq = 0

export const useNewsStore = create((set, get) => ({
  category: 'all',
  searchQuery: '',
  cards: MOCK_NEWS,
  saved: loadSaved(),
  readingArticle: null,
  status: 'mock', // mock | loading | live | error
  source: 'mock',
  error: null,

  setCategory: (category) => {
    set({ category, searchQuery: '' })
    get().fetchNews(category, '')
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  searchNews: (query) => {
    const q = String(query || '').trim()
    set({ searchQuery: q })
    get().fetchNews(get().category, q)
  },

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

  fetchNews: async (category, query) => {
    const cat = category ?? get().category
    const q = query ?? get().searchQuery
    const mySeq = ++newsSeq
    set({ status: 'loading', error: null })
    try {
      const { articles } = await fetchGNews(cat, 10, q)
      if (mySeq !== newsSeq) return
      if (!articles.length) throw new Error('No articles found')
      set({ cards: articles, status: 'live', source: 'live', error: null })
    } catch (e) {
      if (mySeq !== newsSeq) return
      const current = get().cards
      const needsFallback = !current?.length
      set({
        status: 'error',
        source: needsFallback ? 'mock' : get().source,
        error: e.message,
        ...(needsFallback ? { cards: MOCK_NEWS } : {}),
      })
    }
  },
}))
