import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useScoreStore } from '../../store/useScoreStore'
import { FootballBoard, CricketBoard } from './Boards'
import { fetchCricketDetail } from '../../lib/cricket'

// Modal scoreboard — full detail on tap, Esc/backdrop to close.
export default function ScoreboardModal() {
  const selected = useScoreStore((s) => s.selected)
  const closeMatch = useScoreStore((s) => s.closeMatch)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
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

  // focus into the modal on open, lock background scroll, restore on close
  useEffect(() => {
    if (!selected) return
    lastFocus.current = document.activeElement
    panelRef.current?.focus({ preventScroll: true })
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
      if (lastFocus.current?.focus) {
        try {
          lastFocus.current.focus({ preventScroll: true })
        } catch { /* ignore */ }
      }
    }
  }, [selected])

  // fetch richer cricket detail when a cricket card opens.
  // request id: opening B while A is in flight must not let A's late
  // reply overwrite B's scoreboard (or setState after close).
  useEffect(() => {
    if (selected?.sport !== 'cricket' || !selected?.rawId) {
      setDetail(null)
      setLoading(false)
      return
    }
    const wantId = selected.rawId
    let alive = true
    setDetail(null)
    setLoading(true)
    fetchCricketDetail(wantId)
      .then((d) => {
        if (alive && useScoreStore.getState().selected?.rawId === wantId) setDetail(d)
      })
      .catch(() => {
        if (alive) setDetail(null)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [selected?.sport, selected?.rawId])

  // restore from ?match= deep-link on load. Live lists arrive async, so if
  // the id isn't found yet, retry on the next football/cricket update.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AnimatePresence>
      {selected && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMatch}
            className="fixed inset-0 z-50 bg-black/60"
          />
          <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4" onClick={closeMatch}>
            <motion.div
              ref={panelRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label={`${selected.teamA?.short ?? 'Match'} vs ${selected.teamB?.short ?? ''} scoreboard`}
              initial={{ scale: 0.85, rotate: -2, y: 30, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, rotate: 2, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="card-brutal w-full max-w-lg bg-brutal-cream p-4 outline-none dark:border-bone dark:bg-surface dark:text-bone sm:p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="badge-brutal bg-black text-white">
                  {selected.sport === 'football' ? '⚽ FOOTBALL BOARD' : '🏏 CRICKET BOARD'}
                </span>
                <motion.button whileTap={{ scale: 0.85, rotate: 90 }} onClick={closeMatch} className="btn-brutal bg-white p-2 text-black dark:border-bone dark:bg-raised dark:text-bone" aria-label="Close">
                  <X size={20} strokeWidth={3} />
                </motion.button>
              </div>
              {selected.sport === 'football' ? (
                <FootballBoard match={selected} />
              ) : (
                <CricketBoard match={selected} detail={detail} />
              )}
              {loading && (
                <p className="mt-2 text-center font-mono text-[11px] font-bold uppercase">Loading full scoreboard…</p>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
