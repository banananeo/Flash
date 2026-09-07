import { useEffect, useState } from 'react'
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

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') closeMatch()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeMatch])

  // fetch richer cricket detail when a cricket card opens
  useEffect(() => {
    if (selected?.sport === 'cricket' && selected?.rawId) {
      setLoading(true)
      fetchCricketDetail(selected.rawId)
        .then(setDetail)
        .catch(() => setDetail(null))
        .finally(() => setLoading(false))
    } else {
      setDetail(null)
    }
  }, [selected])

  // restore from ?match= deep-link on load
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const mid = params.get('match')
      if (mid && !selected) {
        const { football, cricket } = useScoreStore.getState()
        const found = [...football, ...cricket].find((m) => m.id === mid)
        if (found) useScoreStore.getState().openMatch(found)
      }
    } catch { /* ignore */ }
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
              initial={{ scale: 0.85, rotate: -2, y: 30, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, rotate: 2, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="card-brutal w-full max-w-lg bg-brutal-cream p-4 sm:p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="badge-brutal bg-black text-white">
                  {selected.sport === 'football' ? '⚽ FOOTBALL BOARD' : '🏏 CRICKET BOARD'}
                </span>
                <motion.button whileTap={{ scale: 0.85, rotate: 90 }} onClick={closeMatch} className="btn-brutal bg-white p-2" aria-label="Close">
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
