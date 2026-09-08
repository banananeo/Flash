import { Zap } from 'lucide-react'
import { BREAKING_TICKER } from '../data/mockNews'
import { useNewsStore } from '../store/useNewsStore'

export default function Marquee() {
  const cards = useNewsStore((s) => s.cards)
  const source = useNewsStore((s) => s.source)
  // Live headlines when the feed is live; mock ticker only as fallback.
  const headlines =
    source === 'live' && cards.length
      ? cards.slice(0, 8).map((a) => (a.title || 'UNTITLED').slice(0, 60))
      : BREAKING_TICKER
  const items = [...headlines, ...headlines]
  return (
    <div className="overflow-hidden border-b-[4px] border-black bg-black py-2 text-white dark:border-bone">
      <div className="marquee-track items-center gap-8 pr-8">
        {[0, 1].map((half) => (
          <div key={half} className="flex shrink-0 items-center gap-8">
            <span className="flex items-center gap-1 border-2 border-brutal-yellow bg-brutal-yellow px-2 py-0.5 font-black text-xs text-black">
              <Zap size={14} strokeWidth={3} /> BREAKING
            </span>
            {items.map((t, i) => (
              <span key={`${half}-${i}`} className="flex items-center gap-8 whitespace-nowrap font-mono text-sm font-bold tracking-wide">
                {t} <span className="text-brutal-yellow">///</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
