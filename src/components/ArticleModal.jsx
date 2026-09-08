import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, ExternalLink, X } from 'lucide-react'
import { fetchArticleText } from '../lib/article'
import { timeAgo } from '../hooks/useNews'

// In-app full-story reader. Opens from the card back's READ FULL STORY button.
// Always mounted (like ScoreboardModal); pass article={null} to hide so the
// exit animation can play. Paywalled/blocked pages degrade to summary +
// "open original" link — never a blank modal.
export default function ArticleModal({ article, onClose }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!article?.url) {
      setData(null)
      setError(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setData(null)
    setError(null)
    setLoading(true)
    fetchArticleText(article.url)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [article?.url]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {article && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60"
          />
          <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-3 sm:p-4" onClick={onClose}>
            <motion.div
              initial={{ scale: 0.85, rotate: -2, y: 30, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, rotate: 2, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="card-brutal flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden bg-brutal-cream dark:border-bone dark:bg-surface dark:text-bone sm:max-h-[85vh]"
              role="dialog"
              aria-modal="true"
              aria-label={article.title}
            >
              {/* header */}
              <div className="flex items-center gap-2 border-b-[4px] border-black bg-brutal-yellow p-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center border-[3px] border-black bg-black text-brutal-yellow">
                  <BookOpen size={18} strokeWidth={3} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="badge-brutal bg-black text-white">FULL STORY</p>
                  <p className="mt-1 truncate font-mono text-[11px] font-bold uppercase">
                    {article.source} • {timeAgo(article.publishedAt)}
                  </p>
                </div>
                <motion.button whileTap={{ scale: 0.85, rotate: 90 }} onClick={onClose} className="btn-brutal shrink-0 bg-white p-2" aria-label="Close reader">
                  <X size={20} strokeWidth={3} />
                </motion.button>
              </div>

              {/* body */}
              <div className="overflow-y-auto p-4 sm:p-5">
                {article.image && (
                  <img src={article.image} alt="" className="mb-3 h-44 w-full border-[3px] border-black object-cover dark:border-bone sm:h-56" draggable={false} />
                )}
                <h2 className="font-black text-xl leading-tight tracking-tight">{article.title}</h2>
                {data?.byline && (
                  <p className="mt-1 font-mono text-xs font-bold uppercase text-black/60 dark:text-bone/60">By {data.byline}</p>
                )}

                {loading && (
                  <div className="mt-4 flex flex-col gap-2" aria-live="polite">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-4 animate-pulse border-2 border-black/10 bg-black/10" />
                    ))}
                    <p className="text-center font-mono text-[11px] font-bold uppercase">Fetching full story…</p>
                  </div>
                )}

                {error && !loading && (
                  <div className="mt-4 border-[3px] border-black bg-brutal-yellow p-4 text-black shadow-brutal-sm dark:border-bone">
                    <p className="text-sm font-black uppercase">Couldn't pull the full text in-app</p>
                    <p className="mt-1 text-sm font-medium">{error}</p>
                    <p className="mt-2 border-2 border-black bg-white p-2 text-[13px] font-medium leading-snug">{article.summary}</p>
                  </div>
                )}

                {!article.url && !loading && (
                  <div className="mt-4 border-[3px] border-black bg-brutal-yellow p-4 text-black shadow-brutal-sm dark:border-bone">
                    <p className="text-sm font-black uppercase">Preview card</p>
                    <p className="mt-1 text-sm font-medium">
                      This is a built-in preview story, so there is no publisher page to pull.
                      Live stories load their full text here.
                    </p>
                    <p className="mt-2 border-2 border-black bg-white p-2 text-[13px] font-medium leading-snug">{article.summary}</p>
                  </div>
                )}

                {data && (
                  <div className="mt-3 flex flex-col gap-3">
                    {data.paragraphs.map((p, i) => (
                      <p key={i} className="text-[15px] font-medium leading-relaxed">{p}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* footer — original link always available */}
              {article.url && (
                <div className="border-t-[4px] border-black bg-white p-3 dark:border-bone dark:bg-raised">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-brutal flex items-center justify-center gap-2 bg-black px-4 py-2.5 text-sm text-white dark:border-bone"
                  >
                    <ExternalLink size={16} strokeWidth={3} /> OPEN ORIGINAL • {article.source}
                  </a>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
