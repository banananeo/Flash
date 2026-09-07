import { useMemo } from 'react'
import { useNewsStore } from '../store/useNewsStore'

// Frontend-first: visible slice of mock data.
// Later plug NewsAPI here — same return shape.
export function useNews() {
  const cards = useNewsStore((s) => s.cards)
  const topIndex = useNewsStore((s) => s.topIndex)
  const category = useNewsStore((s) => s.category)

  const articles = useMemo(() => cards.slice(topIndex), [cards, topIndex])

  return { articles, total: cards.length, remaining: cards.length - topIndex, loading: false, category }
}

export function timeAgo(iso) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins}m ago`
  const h = Math.round(mins / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}
