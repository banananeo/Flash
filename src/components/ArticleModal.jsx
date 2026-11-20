import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { fetchArticleText } from '../lib/article'
import { categoryLabel } from '../data/mockNews'
import { useNewsStore } from '../store/useNewsStore'
import backIcon from '../assets/icons/back.svg'
import shareIcon from '../assets/icons/share.svg'
import bookmarkIcon from '../assets/icons/bookmark.svg'

function formatShortDate(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const day = String(d.getDate()).padStart(2, '0')
    const month = d.toLocaleDateString('en-GB', { month: 'long' })
    return `${day} ${month}`
  } catch {
    return ''
  }
}

// 03 · Story reader — editorial full-screen reading view backed by /api/article.
export default function ArticleModal({ article, onClose }) {
  const [reqState, setReqState] = useState({ url: null, data: null, error: null, done: false })
  const [copied, setCopied] = useState(false)

  const saved = useNewsStore((s) => (article ? s.saved.some((a) => a.id === article.id) : false))
  const toggleSave = useNewsStore((s) => s.toggleSave)

  useEffect(() => {
    if (!article) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [article, onClose])

  // external = redirect links (Google News search) the reader can't extract
  const canExtract = Boolean(article?.url) && !article?.external

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
  const error = matched ? reqState.error : null
  const loading = canExtract && (!matched || !reqState.done)

  const handleShare = async () => {
    if (!article) return
    const shareUrl = article.url || window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: article.title, url: shareUrl })
        return
      }
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* ignore */ }
  }

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
                className="grid h-9 w-9 -ml-2 place-items-center rounded-full transition-colors hover:bg-sage"
              >
                <img src={backIcon} alt="" width={22} height={22} className="h-[22px] w-[22px] object-contain" />
              </button>

              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                THE DAILY READ
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleSave(article)}
                  aria-label={saved ? 'Remove from saved' : 'Save story'}
                  className={`grid h-9 w-9 place-items-center rounded-full transition-colors ${
                    saved ? 'bg-pulse' : 'hover:bg-sage'
                  }`}
                >
                  <img src={bookmarkIcon} alt="" width={20} height={20} className="h-[20px] w-[20px] object-contain" />
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  aria-label="Share story"
                  className="grid h-9 w-9 -mr-2 place-items-center rounded-full transition-colors hover:bg-sage"
                >
                  <img src={shareIcon} alt="" width={22} height={22} className="h-[22px] w-[22px] object-contain" />
                </button>
              </div>
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

            {(data?.image || article.image) && (
              <figure className="mt-6">
                <img
                  src={data?.image || article.image}
                  alt={article.title}
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

            {!loading && restParas.length > 0 && (
              <div className="mt-5 space-y-4">
                {restParas.map((p, idx) => (
                  <p key={idx} className="text-[15px] font-normal leading-[1.65] text-muted">
                    {p}
                  </p>
                ))}
              </div>
            )}

            {!loading && error && !paragraphs.length && (
              <div className="mt-5 rounded-[16px] bg-sage p-4 text-[13px] leading-relaxed text-muted">
                <p className="font-semibold text-ink">Publisher preview only</p>
                <p className="mt-1">{error}</p>
              </div>
            )}

            {!loading && article.external && (
              <div className="mt-5 rounded-[16px] bg-sage p-4 text-[13px] leading-relaxed text-muted">
                <p className="font-semibold text-ink">Search result preview</p>
                <p className="mt-1">Read the full story on {article.source || 'the publisher’s site'}.</p>
              </div>
            )}

            {article.url && (
              <div className="mt-8">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-[44px] w-full items-center justify-center rounded-full bg-pulse text-[13px] font-bold text-ink transition-opacity hover:opacity-90"
                >
                  Read full story
                </a>
              </div>
            )}
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
