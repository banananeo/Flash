import { useState } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { Clock, FlipHorizontal2, Quote } from 'lucide-react'
import { categoryStyle } from '../data/mockNews'
import { timeAgo } from '../hooks/useNews'

export default function FlashCard({ article, index = 0, onSwipe, active = true }) {
  const [flipped, setFlipped] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)
  const x = useMotionValue(0)

  const rotate = useTransform(x, [-300, 300], [-14, 14])
  const saveOpacity = useTransform(x, [40, 140], [0, 1])
  const skipOpacity = useTransform(x, [-40, -140], [0, 1])

  const cat = categoryStyle(article.category)

  const handleDragEnd = (_, info) => {
    if (!active) return
    const { offset, velocity } = info
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

  const depth = Math.min(index, 2)
  const isBack = index > 0

  return (
    <motion.div
      key={`${article.id}-${shakeKey}`}
      initial={{ y: 60 * (depth + 1), scale: 1 - depth * 0.06, opacity: 0, rotate: depth * 2 }}
      animate={
        shakeKey > 0 && active
          ? { x: [0, -14, 14, -10, 10, -4, 0], rotate: [0, -2, 2, -1.5, 1.5, 0, 0], y: 0, scale: 1, opacity: 1 }
          : { x: 0, y: depth * 16, scale: 1 - depth * 0.06, opacity: 1 - depth * 0.25, rotate: depth === 0 ? 0 : depth % 2 ? 2 : -2 }
      }
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      exit={{ x: 600, rotate: 22, opacity: 0, transition: { duration: 0.28, ease: 'easeIn' } }}
      style={active ? { x, rotate, zIndex: 10 - depth } : { zIndex: 10 - depth }}
      className="absolute inset-0"
    >
      <motion.div
        drag={active && !isBack ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.75}
        onDragEnd={handleDragEnd}
        whileDrag={{ scale: 1.04, rotate: 1, cursor: 'grabbing' }}
        onClick={() => active && !isBack && setFlipped((f) => !f)}
        className={`perspective-1000 h-full w-full ${active && !isBack ? 'cursor-grab' : ''}`}
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="preserve-3d relative h-full w-full"
        >
          {/* ===== FRONT: summary teaser ===== */}
          <div className="backface-hidden card-brutal absolute inset-0 flex flex-col overflow-hidden bg-white">
            <div className="relative border-b-[4px] border-black">
              <img src={article.image} alt="" className="h-44 w-full object-cover sm:h-52" draggable={false} />
              <div className="absolute left-3 top-3 flex gap-2">
                <span className="badge-brutal" style={{ backgroundColor: cat.bg }}>
                  {cat.label}
                </span>
                <span className="badge-brutal bg-black text-white">SUMMARY CARD</span>
              </div>
              <span className="badge-brutal absolute bottom-3 right-3 flex items-center gap-1 bg-white">
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
              <p className="font-mono text-xs font-bold uppercase text-black/60">
                {article.source} • {timeAgo(article.publishedAt)}
              </p>
              <p className="line-clamp-2 text-[15px] font-medium leading-snug">{article.summary}</p>
              <div className="mt-auto flex items-center justify-between pt-2">
                <span className="badge-brutal bg-brutal-yellow">◀ DRAG ▶</span>
                <span className="flex items-center gap-1 font-mono text-[11px] font-bold uppercase">
                  <FlipHorizontal2 size={14} strokeWidth={3} /> tap to flip
                </span>
              </div>
            </div>
          </div>

          {/* ===== BACK: full summary, never external link ===== */}
          <div
            className="backface-hidden card-brutal absolute inset-0 flex flex-col p-5"
            style={{ transform: 'rotateY(180deg)', backgroundColor: cat.bg }}
          >
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center border-[3px] border-black bg-black text-white">
                <Quote size={18} strokeWidth={3} />
              </span>
              <p className="font-black text-lg uppercase tracking-tight">The gist in 30 sec</p>
            </div>
            <div className="mt-3 flex-1 border-[3px] border-black bg-white p-4 shadow-brutal-sm">
              <p className="text-[15px] font-medium leading-relaxed">{article.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="badge-brutal bg-white">{article.source}</span>
                <span className="badge-brutal bg-white">{timeAgo(article.publishedAt)}</span>
              </div>
            </div>
            <p className="mt-3 text-center font-mono text-[11px] font-bold uppercase">tap to flip back • swipe to decide</p>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
