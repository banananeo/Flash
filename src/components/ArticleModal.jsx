import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { fetchArticleText } from '../lib/article'
import { safeHttpUrl, safeImageUrl } from '../lib/safeUrl'
import { categoryLabel } from '../data/mockNews'
import backIcon from '../assets/icons/back.svg'
import shareIcon from '../assets/icons/share.svg'

function formatShortDate(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (!Number.isFinite(d.getTime())) return ''
    const day = String(d.getDate()).padStart(2, '0')
    const month = d.toLocaleDateString('en-GB', { month: 'long' })
    return `${day} ${month}`
  } catch {
    return ''
  }
}

// 03 · Story reader — editorial full-screen in-app reading view backed by /api/article.
export default function ArticleModal({ article, onClose }) {
  const [reqState, setReqState] = useState({ url: null, data: null, error: null, done: false })
  const [copied, setCopied] = useState(false)
  const [failedSrcs, setFailedSrcs] = useState({})
  const copyTimerRef = useRef(null)

  useEffect(() => () => clearTimeout(copyTimerRef.current), [])

  useEffect(() => {
    if (!article) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [article, onClose])

  const canExtract = Boolean(safeHttpUrl(article?.url))

  useEffect(() => {
    const url = canExtract ? article?.url : null
    if (!url) return undefined
    let cancelled = false
    fetchArticleText(url)
      .then((d) => {
        if (!cancelled) setReqState({ url, data: d, error: null, done: true })
      })
      .catch((e) => {
        if (!cancelled) setReqState({ url, data: null, error: e.message, done: true })
      })
    return () => {
      cancelled = true
    }
  }, [article?.url, canExtract])

  const matched = canExtract && reqState.url === article.url
  const data = matched ? reqState.data : null
  const loading = canExtract && (!matched || !reqState.done)

  const handleShare = async () => {
    if (!article) return
    const shareUrl = safeHttpUrl(article.url) || window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: article.title, url: shareUrl })
        return
      }
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopied(false), 1800)
    } catch { /* ignore */ }
  }

  const primaryImg = safeImageUrl(data?.image)
  const fallbackImg = safeImageUrl(article?.image)
  const heroImage =
    primaryImg && !failedSrcs[primaryImg]
      ? primaryImg
      : fallbackImg && !failedSrcs[fallbackImg]
        ? fallbackImg
        : null

  const paragraphs = Array.isArray(data?.paragraphs) ? data.paragraphs : []
  const lead = paragraphs[0] || article?.summary || ''
  const restParas = paragraphs.length > 1 ? paragraphs.slice(1) : []

  return (
    <AnimatePresence>
      {article && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-paper"
          role="dialog"
          aria-modal="true"
          aria-label={article.title}
        >
          {/* Sticky reader header (03 · Story reader) */}
          <div className="sticky top-0 z-10 border-b border-hairline/70 bg-paper/95 backdrop-blur-sm">
            <div className="mx-auto flex h-[60px] max-w-[680px] items-center justify-between px-6">
              <button
                type="button"
                onClick={onClose}
                aria-label="Back to briefing"
                className="-ml-2 grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-sage"
              >
                <img src={backIcon} alt="" width={22} height={22} className="h-[22px] w-[22px] object-contain" />
              </button>

              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                PADDOCK INTEL
              </span>

              <button
                type="button"
                onClick={handleShare}
                aria-label="Share story"
                className="-mr-2 grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-sage"
              >
                <img src={shareIcon} alt="" width={22} height={22} className="h-[22px] w-[22px] object-contain" />
              </button>
            </div>
          </div>

          {/* Editorial article content */}
          <motion.article
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="mx-auto max-w-[680px] px-6 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-7"
          >
            {copied && (
              <p className="mb-3 w-fit rounded-full bg-pulse px-3 py-1 text-[11px] font-bold text-ink">
                Link copied
              </p>
            )}

            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
              THE BIG READ / {categoryLabel(article.category).toUpperCase()}
            </p>

            <h1 className="mt-3 text-[30px] font-semibold leading-[1.2] tracking-[-0.02em] text-ink sm:text-[36px]">
              {article.title}
            </h1>

            <p className="mt-4 text-[12px] font-medium text-muted">
              {data?.byline || article.source}
              {article.publishedAt ? `  ·  ${formatShortDate(article.publishedAt)}` : ''}
              {article.readTime ? `  ·  ${article.readTime}` : ''}
            </p>

            {heroImage && (
              <figure className="mt-6">
                <img
                  src={heroImage}
                  alt={article.title}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setFailedSrcs((prev) => ({ ...prev, [heroImage]: true }))
                  }
                  className="h-[210px] w-full rounded-[16px] bg-sage object-cover sm:h-[320px]"
                />
                <figcaption className="mt-2 text-[10px] font-medium text-muted">
                  {article.source}
                </figcaption>
              </figure>
            )}

            {loading && (
              <div className="mt-7 space-y-3" aria-live="polite">
                <div className="h-5 w-4/5 animate-pulse rounded bg-sage" />
                <div className="h-4 w-full animate-pulse rounded bg-sage" />
                <div className="h-4 w-11/12 animate-pulse rounded bg-sage" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-sage" />
              </div>
            )}

            {!loading && lead && (
              <p className="mt-6 text-[18px] font-semibold leading-[1.45] text-ink">
                {lead}
              </p>
            )}

            {Array.isArray(article.bullets) && article.bullets.length > 0 && (
              <div className="mt-6 space-y-3 rounded-[18px] border border-hairline bg-white p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-strong">
                  INSIDER BREAKDOWN
                </p>
                {article.fromTeam && article.toTeam && (
                  <p className="text-[14px] font-bold text-ink">
                    {article.subject ? `${article.subject}: ` : ''}
                    {article.fromTeam} → {article.toTeam}
                    {article.dealTag ? ` (${article.dealTag})` : ''}
                  </p>
                )}
                <ul className="space-y-2.5 text-[15px] leading-relaxed text-ink">
                  {article.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pulse" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!loading && restParas.length > 0 && (
              <div className="mt-5 space-y-4">
                {restParas.map((p, idx) => (
                  <p key={idx} className="text-[15px] font-normal leading-[1.65] text-muted">
                    {p}
                  </p>
                ))}
              </div>
            )}
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
