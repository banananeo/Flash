import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FlipHorizontal2, RefreshCw, Shuffle, ThumbsDown, ThumbsUp } from 'lucide-react'
import FlashCard from './FlashCard'
import { useNewsStore } from '../store/useNewsStore'

function LoadingCard() {
  return (
    <div className="card-brutal absolute inset-0 flex flex-col overflow-hidden bg-white">
      <div className="h-44 animate-pulse border-b-[4px] border-black bg-brutal-yellow sm:h-52" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="h-7 animate-pulse border-[3px] border-black bg-black/80" />
        <div className="h-7 w-2/3 animate-pulse border-[3px] border-black bg-black/20" />
        <div className="h-4 animate-pulse bg-black/10" />
        <div className="h-4 w-5/6 animate-pulse bg-black/10" />
        <p className="mt-auto text-center font-mono text-xs font-bold uppercase">Fetching live news…</p>
      </div>
    </div>
  )
}

export default function CardStack() {
  const cards = useNewsStore((s) => s.cards)
  const topIndex = useNewsStore((s) => s.topIndex)
  const swipe = useNewsStore((s) => s.swipe)
  const reshuffle = useNewsStore((s) => s.reshuffle)
  const reset = useNewsStore((s) => s.reset)
  const toggleFlip = useNewsStore((s) => s.toggleFlip)
  const status = useNewsStore((s) => s.status)
  const source = useNewsStore((s) => s.source)
  const error = useNewsStore((s) => s.error)
  const fetchNews = useNewsStore((s) => s.fetchNews)
  const category = useNewsStore((s) => s.category)

  // fetch live on mount (cached 10 min inside lib)
  useEffect(() => {
    fetchNews(category)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // keyboard: ← dislike, → like
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') swipe('left')
      if (e.key === 'ArrowRight') swipe('right')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [swipe, toggleFlip])

  const doSwipe = (dir) => swipe(dir)
  const current = cards[topIndex]
  const remaining = cards.length - topIndex
  const progress = cards.length ? (topIndex / cards.length) * 100 : 0

  if (status === 'loading' && !current) {
    return (
      <div className="mx-auto w-full max-w-md">
        <div className="relative h-[540px] sm:h-[560px]">
          <LoadingCard />
        </div>
      </div>
    )
  }

  if (!current || remaining <= 0) {
    return (
      <motion.div
        initial={{ scale: 0.8, rotate: -3, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="card-brutal mx-auto flex max-w-md flex-col items-center gap-4 bg-brutal-yellow p-8 text-center"
      >
        <p className="rotate-[-2deg] border-[4px] border-black bg-black px-4 py-1 font-black text-2xl text-white">
          YOU ATE ALL THE NEWS!
        </p>
        <p className="font-bold">Zero cards left. Shuffle for a remix.</p>
        <div className="flex gap-3">
          <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.9, rotate: 2 }} onClick={reset} className="btn-brutal bg-white px-5 py-2.5">
            Replay
          </motion.button>
          <motion.button whileHover={{ y: -2, rotate: 1 }} whileTap={{ scale: 0.9 }} onClick={() => fetchNews(category)} className="btn-brutal flex items-center gap-2 bg-black px-5 py-2.5 text-white">
            <RefreshCw size={18} strokeWidth={3} /> Refresh live
          </motion.button>
          <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.9 }} onClick={reshuffle} className="btn-brutal bg-white px-5 py-2.5">
            <Shuffle size={18} strokeWidth={3} />
          </motion.button>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-md">
      {/* progress + source */}
      <div className="mb-3 flex items-center gap-2">
        <div className="h-5 flex-1 border-[3px] border-black bg-white shadow-brutal-xs">
          <motion.div className="h-full bg-brutal-mint" animate={{ width: `${progress}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
        </div>
        <span className={`badge-brutal ${source === 'live' ? 'bg-brutal-mint' : 'bg-brutal-yellow'}`}>
          {status === 'loading' ? 'SYNC…' : source === 'live' ? '● LIVE' : 'MOCK'}
        </span>
        <span className="badge-brutal bg-black text-white">
          {remaining} LEFT
        </span>
      </div>
      {error && (
        <div className="mb-3 flex items-center justify-between gap-2 border-[3px] border-black bg-brutal-pink px-3 py-1.5 text-xs font-black shadow-brutal-xs">
          <span className="truncate">{error}</span>
          <button onClick={() => fetchNews(category)} className="shrink-0 border-2 border-black bg-white px-2 py-0.5">
            RETRY
          </button>
        </div>
      )}

      {/* single card — no stack */}
      <div className="relative h-[540px] sm:h-[560px]">
        <AnimatePresence mode="popLayout">
          {status === 'loading' ? (
            <LoadingCard key="loading" />
          ) : (
            <FlashCard
              key={current.id}
              article={current}
              index={0}
              active
              onSwipe={doSwipe}
            />
          )}
        </AnimatePresence>
      </div>

      {/* like / dislike controls */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <motion.button
          whileHover={{ rotate: -3, y: -3 }}
          whileTap={{ scale: 0.85, rotate: 3 }}
          onClick={() => doSwipe('left')}
          className="btn-brutal flex items-center gap-2 bg-brutal-red px-5 py-3 text-sm text-white"
          aria-label="Dislike"
        >
          <ThumbsDown size={20} strokeWidth={3} /> DISLIKE
        </motion.button>

        <motion.button
          data-flip-hint
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.85, rotate: -2 }}
          onClick={() => document.querySelector('.perspective-1000')?.click()}
          className="btn-brutal flex items-center gap-2 bg-brutal-yellow px-5 py-3 text-sm"
        >
          <FlipHorizontal2 size={18} strokeWidth={3} /> FLIP
        </motion.button>

        <motion.button
          whileHover={{ rotate: 3, y: -3 }}
          whileTap={{ scale: 0.85, rotate: -3 }}
          onClick={() => doSwipe('right')}
          className="btn-brutal flex items-center gap-2 bg-brutal-mint px-5 py-3 text-sm"
          aria-label="Like"
        >
          <ThumbsUp size={20} strokeWidth={3} /> LIKE
        </motion.button>
      </div>
      <p className="mt-2 text-center font-mono text-[11px] font-bold uppercase text-black/60">
        drag / ← → keys / tap card to flip
      </p>
    </div>
  )
}
