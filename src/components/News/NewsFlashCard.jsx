import { useRef, useState } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { BookOpen, Clock, FlipHorizontal2, Sparkles } from 'lucide-react'
import { categoryLabel } from '../../data/mockNews'
import { timeAgo } from '../../hooks/useNews'
import { useNewsStore } from '../../store/useNewsStore'

export default function NewsFlashCard({ article, onSwipe, onReadFull }) {
  const flipped = useNewsStore((s) => s.isFlipped)
  const toggleFlip = useNewsStore((s) => s.toggleFlip)
  const lastDir = useNewsStore((s) => s.lastDir)

  const [imgOk, setImgOk] = useState(true)
  const lastDragAt = useRef(0)
  const x = useMotionValue(0)

  const dragRightOpacity = useTransform(x, [35, 120], [0, 1])
  const dragLeftOpacity = useTransform(x, [-35, -120], [0, 1])
  const cardRotate = useTransform(x, [-180, 0, 180], [-5, 0, 5])

  if (!article) return null

  const handleDragEnd = (_, info) => {
    const { offset, velocity } = info
    if (Math.abs(offset.x) > 10 || Math.abs(velocity.x) > 50) {
      lastDragAt.current = Date.now()
    }
    if (offset.x > 105 || velocity.x > 520) {
      onSwipe?.('right')
    } else if (offset.x < -105 || velocity.x < -520) {
      onSwipe?.('left')
    } else {
      x.set(0)
    }
  }

  const exitX = lastDir === 'left' ? -420 : 420

  return (
    <motion.div
      key={article.id || article.url}
      initial={{ opacity: 0, y: 22, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{
        x: exitX,
        rotate: lastDir === 'left' ? -12 : 12,
        opacity: 0,
        transition: { duration: 0.24, ease: 'easeIn' },
      }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      style={{ x, rotate: cardRotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.68}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.015, cursor: 'grabbing' }}
      onClick={() => {
        if (Date.now() - lastDragAt.current < 240) return
        toggleFlip()
      }}
      className="perspective-1000 absolute inset-0 cursor-pointer select-none"
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="preserve-3d relative h-full w-full"
      >
        {/* ================= FRONT: IMAGE + TITLE ================= */}
        <div className="backface-hidden absolute inset-0 flex flex-col overflow-hidden rounded-[22px] border border-hairline bg-white shadow-sm">
          <div className="relative h-[225px] w-full shrink-0 overflow-hidden bg-sage sm:h-[265px]">
            {imgOk && article.image ? (
              <img
                src={article.image}
                alt={article.title}
                onError={() => setImgOk(false)}
                draggable={false}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center bg-sage text-[13px] font-bold uppercase tracking-[0.08em] text-muted">
                FLASH BRIEFING
              </div>
            )}

            <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/35 to-transparent" />

            {/* Top badges */}
            <div className="absolute inset-x-3.5 top-3.5 flex items-center justify-between gap-2">
              <span className="rounded-full bg-pulse px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-ink shadow-sm">
                {categoryLabel(article.category)}
              </span>

              <div className="flex items-center gap-1.5">
                {article.readTime && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-ink/75 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                    <Clock size={11} />
                    {article.readTime}
                  </span>
                )}
              </div>
            </div>

            {/* Drag feedback pills */}
            <motion.span
              style={{ opacity: dragRightOpacity }}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-pulse px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink shadow"
            >
              Next story →
            </motion.span>
            <motion.span
              style={{ opacity: dragLeftOpacity }}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-ink px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-white shadow"
            >
              ← Next story
            </motion.span>
          </div>

          {/* Front body: Source + Title + Flip prompt */}
          <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                {article.source}
                {article.publishedAt ? `  ·  ${timeAgo(article.publishedAt)}` : ''}
              </p>

              <h2 className="mt-2.5 line-clamp-4 text-[21px] font-semibold leading-[1.24] tracking-[-0.015em] text-ink sm:text-[25px]">
                {article.title}
              </h2>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-hairline pt-3.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sage px-3 py-1.5 text-[11px] font-bold text-ink">
                <FlipHorizontal2 size={14} className="text-brand-strong" />
                Tap card to flip for summary
              </span>
              <span className="text-[11px] font-semibold text-muted">
                Swipe ◀ ▶
              </span>
            </div>
          </div>
        </div>

        {/* ================= BACK: SUMMARY + READ FULL STORY ================= */}
        <div
          className="backface-hidden absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[22px] border border-hairline bg-white p-5 shadow-sm sm:p-6"
          style={{ transform: 'rotateY(180deg)' }}
        >
          {/* Back header */}
          <div className="flex shrink-0 items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-leader px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-brand-strong">
                <Sparkles size={12} />
                Quick Summary
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                {categoryLabel(article.category)}
              </span>
            </div>
          </div>

          {/* Headline reference + Quick-consume Summary */}
          <div className="my-3 flex min-h-0 flex-1 flex-col overflow-y-auto">
            <h3 className="line-clamp-2 text-[16px] font-semibold leading-snug text-ink sm:text-[18px]">
              {article.title}
            </h3>
            <p className="mt-1 text-[11px] font-medium text-muted">
              {article.source}
              {article.publishedAt ? `  ·  ${timeAgo(article.publishedAt)}` : ''}
              {article.readTime ? `  ·  ${article.readTime}` : ''}
            </p>

            <div className="mt-3.5 flex-1 rounded-[16px] bg-sage/80 p-4 sm:p-5">
              <p className="text-[15px] font-normal leading-[1.62] text-ink sm:text-[16px]">
                {article.summary || article.title}
              </p>
            </div>
          </div>

          {/* Action below summary: Read full story */}
          <div className="shrink-0 space-y-2.5 pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onReadFull?.(article)
              }}
              className="flex h-[46px] w-full items-center justify-center gap-2 rounded-full bg-pulse px-5 text-[13px] font-bold text-ink shadow-sm transition-opacity hover:opacity-90"
            >
              <BookOpen size={16} />
              Read full story
            </button>

            <p className="text-center text-[11px] font-medium text-muted">
              Tap anywhere on card to flip back · Swipe for next
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
