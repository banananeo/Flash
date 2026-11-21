import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { useScoreStore } from '../../store/useScoreStore'
import { FootballBoard, CricketBoard } from './Boards'
import { fetchCricketDetail } from '../../lib/cricket'
import { fetchFootballDetail } from '../../lib/football'
import { fetchMatchPreview } from '../../lib/preview'
import backIcon from '../../assets/icons/back.svg'
import shareIcon from '../../assets/icons/share.svg'

// 06 · Match centre — full-bleed editorial match sheet for Football & Cricket.
export default function ScoreboardModal() {
  const selected = useScoreStore((s) => s.selected)
  const closeMatch = useScoreStore((s) => s.closeMatch)
  const refreshMatch = useScoreStore((s) => s.refreshMatch)
  const isRefreshing = useScoreStore((s) => Boolean(s.refreshingMatches?.[selected?.id]))
  const refreshTick = useScoreStore((s) => s.refreshTick)
  const [reqState, setReqState] = useState({ key: null, data: null, done: false })
  const [previewState, setPreviewState] = useState({ key: null, data: null, done: false, error: '' })
  const [copied, setCopied] = useState(false)
  const panelRef = useRef(null)
  const lastFocus = useRef(null)

  useEffect(() => {
    if (!selected) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeMatch()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, closeMatch])

  useEffect(() => {
    if (!selected) return undefined
    lastFocus.current = document.activeElement
    panelRef.current?.focus({ preventScroll: true })
    return () => {
      if (lastFocus.current?.focus) {
        try {
          lastFocus.current.focus({ preventScroll: true })
        } catch { /* ignore */ }
      }
    }
  }, [selected])

  const reqKey = selected?.rawId
    ? `${selected.sport}:${selected.rawId}:${selected.seriesId || selected.leagueSlug || ''}`
    : null
  const previewKey = selected?.status === 'scheduled' && reqKey
    ? `${reqKey}:${selected.time || selected.dateISO || ''}`
    : null

  // Fetch rich Match Centre detail for BOTH Football & Cricket from ESPN APIs
  useEffect(() => {
    if (!reqKey || !selected?.rawId) return undefined
    let alive = true
    const req =
      selected.sport === 'cricket'
        ? fetchCricketDetail(selected.rawId, selected.seriesId)
        : fetchFootballDetail(selected.rawId, selected.leagueSlug)

    req
      .then((d) => {
        if (alive) setReqState({ key: reqKey, data: d, done: true })
      })
      .catch(() => {
        if (alive) setReqState({ key: reqKey, data: null, done: true })
      })
    return () => {
      alive = false
    }
  }, [reqKey, selected?.sport, selected?.rawId, selected?.seriesId, selected?.leagueSlug, refreshTick])

  useEffect(() => {
    if (!previewKey || !selected) {
      setPreviewState({ key: null, data: null, done: false, error: '' })
      return undefined
    }
    let alive = true
    setPreviewState({ key: previewKey, data: null, done: false, error: '' })
    fetchMatchPreview(selected)
      .then((data) => {
        if (alive) setPreviewState({ key: previewKey, data, done: true, error: '' })
      })
      .catch((error) => {
        if (alive) setPreviewState({ key: previewKey, data: null, done: true, error: error?.message || 'Match context unavailable right now.' })
      })
    return () => {
      alive = false
    }
  }, [previewKey, selected])

  const matched = Boolean(reqKey) && reqState.key === reqKey
  const detail = matched ? reqState.data : null
  const loading = Boolean(reqKey) && (!matched || !reqState.done)
  const previewMatched = Boolean(previewKey) && previewState.key === previewKey
  const preview = previewMatched ? previewState.data : null
  const previewLoading = Boolean(previewKey) && (!previewMatched || !previewState.done)
  const previewError = previewMatched ? previewState.error : ''

  // Restore from ?match= deep-link
  useEffect(() => {
    const tryRestore = () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const mid = params.get('match')
        if (!mid || useScoreStore.getState().selected) return true
        const { football, cricket } = useScoreStore.getState()
        const found = [...(football || []), ...(cricket || [])].find((m) => m.id === mid)
        if (found) {
          useScoreStore.getState().openMatch(found)
          return true
        }
      } catch { /* ignore */ }
      return false
    }
    if (tryRestore()) return undefined
    const unsub = useScoreStore.subscribe((s, prev) => {
      if (s.football !== prev.football || s.cricket !== prev.cricket) {
        if (tryRestore()) unsub()
      }
    })
    return unsub
  }, [])

  const handleShare = async () => {
    if (!selected) return
    const title = `${selected.teamA?.name || ''} vs ${selected.teamB?.name || ''} — flash`
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* ignore */ }
  }

  return (
    <AnimatePresence>
      {selected && (
        <motion.div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={`${selected.teamA?.name ?? 'Match'} vs ${selected.teamB?.name ?? ''} match centre`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-paper focus-visible:outline-none"
        >
          {/* Sticky Match Centre Header */}
          <div className="sticky top-0 z-10 border-b border-hairline/70 bg-paper/95 backdrop-blur-sm">
            <div className="mx-auto flex h-[60px] max-w-[680px] items-center justify-between px-6">
              <button
                type="button"
                onClick={closeMatch}
                aria-label="Back to scores"
                className="-ml-2 grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-sage"
              >
                <img src={backIcon} alt="" width={22} height={22} className="h-[22px] w-[22px] object-contain" />
              </button>

              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                MATCH CENTRE
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => refreshMatch(selected)}
                  disabled={isRefreshing}
                  title="Refresh live score"
                  aria-label="Refresh live score"
                  className="grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-sage disabled:opacity-60"
                >
                  <RefreshCw size={17} className={isRefreshing ? 'animate-spin text-brand-strong' : 'text-ink'} />
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  aria-label="Share match"
                  className="-mr-2 grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-sage"
                >
                  <img src={shareIcon} alt="" width={22} height={22} className="h-[22px] w-[22px] object-contain" />
                </button>
              </div>
            </div>
          </div>

          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="mx-auto max-w-[680px] px-6 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-6"
          >
            {copied && (
              <p className="mx-auto mb-3 w-fit rounded-full bg-pulse px-3 py-1 text-[11px] font-bold text-ink">
                Link copied
              </p>
            )}

            {selected.sport === 'football' ? (
              <FootballBoard
                match={selected}
                detail={detail}
                loading={loading}
                preview={preview}
                previewLoading={previewLoading}
                previewError={previewError}
              />
            ) : (
              <CricketBoard
                match={selected}
                detail={detail}
                loading={loading}
                preview={preview}
                previewLoading={previewLoading}
                previewError={previewError}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
