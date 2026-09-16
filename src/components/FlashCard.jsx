import { useRef, useState } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { BookOpen, Clock, FlipHorizontal2, Quote } from 'lucide-react'
import { categoryStyle } from '../data/mockNews'
import { timeAgo } from '../hooks/useNews'
import { useNewsStore } from '../store/useNewsStore'
import ArticleModal from './ArticleModal'

const ENTER = (depth) => ({
  y: 60 * (depth + 1),
  scale: 1 - depth * 0.06,
  opacity: 0,
  rotate: depth * 2,
})

export default function FlashCard({ article, index = 0, onSwipe, active = true }) {
  // flip lives in the store (not local state) so the CardStack FLIP button
  // drives the same state — no DOM querySelector click hack needed
  const flipped = useNewsStore((s) => s.isFlipped)
  const toggleFlip = useNewsStore((s) => s.toggleFlip)
  const [shakeKey, setShakeKey] = useState(0)
  const [readerOpen, setReaderOpen] = useState(false)
  const [imgOk, setImgOk] = useState(true)
  // exit direction comes from the store (button swipes bypass this
  // component's drag handler, so local state can't know it)
  const lastDir = useNewsStore((s) => s.lastDir)
  const x = useMotionValue(0)
  // timestamp of the last real drag — a mouse-up click right after a drag
  // must not flip the card
  const lastDragAt = useRef(0)

  const saveOpacity = useTransform(x, [40, 140], [0, 1])
  const skipOpacity = useTransform(x, [-40, -140], [0, 1])

  if (!article) return null
  const cat = categoryStyle(article.category)

  const handleDragEnd = (_, info) => {
    if (!active) return
    const { offset, velocity } = info
    if (Math.abs(offset.x) > 10 || Math.abs(velocity.x) > 50) {
      lastDragAt.current = Date.now()
    }
    // swipe threshold — fun + forgiving
    if (offset.x > 120 || velocity.x > 600) {
      onSwipe?.('right')
    } else if (offset.x < -120 || velocity.x < -600) {
      onSwipe?.('left')
    } else {
      // SNAP-BACK SHAKE: wobble instead of boring spring
      setShakeKey((k) => k + 1)
      x.set(0)
    }
  }

  const shaking = shakeKey > 0 && active
  const depth = Math.min(index, 2)
  const isBack = index > 0
  const exitX = lastDir === 'left' ? -600 : 600

  return (
    <>
    <motion.div
      // shakeKey in key: each snap-back remounts so the wobble keyframes
      // replay; initial={false} on remounts keeps the entrance from
      // flashing again (the old bug: full re-entry fade on every wobble)
      key={`${article.id ?? article.url ?? index}-${shakeKey}`}
      // remount replays the shake keyframes; initial={false} on remounts
      // keeps the entrance animation from flashing again
      initial={shakeKey === 0 ? ENTER(depth) : false}
      animate={
        shaking
          ? { x: [0, -14, 14, -10, 10, -4, 0], rotate: [0, -2, 2, -1.5, 1.5, 0, 0], y: 0, scale: 1, opacity: 1 }
          : { x: 0, y: depth * 16, scale: 1 - depth * 0.06, opacity: 1 - depth * 0.25, rotate: depth === 0 ? 0 : depth % 2 ? 2 : -2 }
      }
      // keyframe shake needs a tween; the resting pose keeps its spring
      transition={shaking ? { duration: 0.4, ease: 'easeOut' } : { type: 'spring', stiffness: 380, damping: 28 }}
      exit={{ x: exitX, rotate: lastDir === 'left' ? -22 : 22, opacity: 0, transition: { duration: 0.28, ease: 'easeIn' } }}
      // NOTE: rotate stays out of style on purpose — the drag-tilt comes
      // from `rotate` MV while `animate` also writes rotate, and the two
      // fight (tilt-while-drag gets swallowed). `x` alone is unambiguous.
      style={active ? { x, zIndex: 10 - depth } : { zIndex: 10 - depth }}
      className="absolute inset-0"
    >
      <motion.div
        drag={active && !isBack ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.75}
        onDragEnd={handleDragEnd}
        whileDrag={{ scale: 1.04, rotate: 1, cursor: 'grabbing' }}
        onClick={() => {
          if (!active || isBack) return
          // a mouse-up click lands right after a drag ends — ignore flips
          // within 250ms of real drag movement
          if (Date.now() - lastDragAt.current < 250) return
          toggleFlip()
        }}
        className={`perspective-1000 h-full w-full ${active && !isBack ? 'cursor-grab' : ''}`}
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="preserve-3d relative h-full w-full"
        >
          {/* ===== FRONT: summary teaser ===== */}
          <div className="backface-hidden card-brutal absolute inset-0 flex flex-col overflow-hidden bg-white dark:border-bone dark:bg-surface dark:text-bone">
            <div className="relative border-b-[4px] border-black dark:border-bone">
              {imgOk && article.image ? (
                <img
                  src={article.image}
                  alt={article.title}
                  onError={() => setImgOk(false)}
                  className="h-36 w-full shrink-0 object-cover sm:h-52"
                  draggable={false}
                />
              ) : (
                <div className="grid h-36 w-full shrink-0 place-items-center bg-brutal-yellow font-black text-4xl sm:h-52" aria-hidden>
                  ⚡
                </div>
              )}
              <div className="absolute left-3 top-3 flex gap-2">
                <span className="badge-brutal" style={{ backgroundColor: cat.bg }}>
                  {cat.label}
                </span>
                <span className="badge-brutal bg-black text-white">SUMMARY CARD</span>
              </div>
              <span className="badge-brutal absolute bottom-3 right-3 flex items-center gap-1 bg-white dark:border-bone dark:bg-raised dark:text-bone">
                <Clock size={12} strokeWidth={3} /> {article.readTime}
              </span>
              {/* drag stamps */}
              <motion.span style={{ opacity: saveOpacity }} className="absolute left-4 top-1/2 -translate-y-1/2 rotate-[-12deg] border-[4px] border-brutal-mint bg-white px-3 py-1 font-black text-2xl text-emerald-600">
                LIKE!
              </motion.span>
              <motion.span style={{ opacity: skipOpacity }} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-[12deg] border-[4px] border-brutal-red bg-white px-3 py-1 font-black text-2xl text-red-600">
                DISLIKE!
              </motion.span>
            </div>

            <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
              <h2 className="font-black text-xl leading-[1.05] tracking-tight sm:text-2xl">{article.title}</h2>
              <p className="font-mono text-xs font-bold uppercase text-black/60 dark:text-bone/60">
                {article.source} • {timeAgo(article.publishedAt)}
              </p>
              <p className="line-clamp-2 text-[15px] font-medium leading-snug">{article.summary}</p>
              <div className="mt-auto flex items-center justify-between pt-2">
                <span className="badge-brutal bg-brutal-yellow text-black dark:border-bone">◀ DRAG ▶</span>
                <span className="flex items-center gap-1 font-mono text-[11px] font-bold uppercase dark:text-bone/70">
                  <FlipHorizontal2 size={14} strokeWidth={3} /> tap to flip
                </span>
              </div>
            </div>
          </div>

          {/* ===== BACK: summary + full-story entry.
              Button is ALWAYS rendered (even for preview cards without a
              source URL) so the layout is identical on every phone screen;
              the modal degrades gracefully when there is no URL. ===== */}
          <div
            className="backface-hidden card-brutal absolute inset-0 flex flex-col p-3 text-black dark:border-bone sm:p-5"
            style={{ transform: 'rotateY(180deg)', backgroundColor: cat.bg }}
          >
            <div className="flex shrink-0 items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center border-[3px] border-black bg-black text-white sm:h-9 sm:w-9">
                <Quote size={16} strokeWidth={3} />
              </span>
              <p className="truncate font-black text-base uppercase tracking-tight sm:text-lg">The gist in 30 sec</p>
            </div>
            <div className="mt-2 min-h-0 flex-1 overflow-y-auto border-[3px] border-black bg-white p-3 text-black shadow-brutal-sm dark:border-bone dark:bg-surface dark:text-bone sm:mt-3 sm:p-4">
              <p className="text-sm font-medium leading-relaxed sm:text-[15px]">{article.summary}</p>
              <div className="mt-2 flex flex-wrap gap-2 sm:mt-3">
                <span className="badge-brutal bg-white">{article.source}</span>
                <span className="badge-brutal bg-white">{timeAgo(article.publishedAt)}</span>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation() // don't flip the card when opening the reader
                setReaderOpen(true)
              }}
              className="btn-brutal mt-2 flex shrink-0 items-center justify-center gap-2 bg-black px-4 py-3 text-sm text-white dark:border-bone sm:mt-3 sm:py-2.5"
            >
              <BookOpen size={16} strokeWidth={3} /> READ FULL STORY
            </motion.button>
            <p className="mt-1 shrink-0 text-center font-mono text-[10px] font-bold uppercase sm:mt-2 sm:text-[11px]">tap to flip back • swipe to decide</p>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
    <ArticleModal article={readerOpen ? article : null} onClose={() => setReaderOpen(false)} />
    </>
  )
}
