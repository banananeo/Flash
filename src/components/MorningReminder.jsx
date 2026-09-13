import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, BellOff, X } from 'lucide-react'
import { useReminderStore } from '../store/useReminderStore'
import { useScoreStore } from '../store/useScoreStore'
import { useNewsStore } from '../store/useNewsStore'

// Morning news reminder: modal + optional system popup (both only fire
// while the app is open — no backend exists to wake a closed app).
// Minute-tick lives here so App stays untouched apart from mounting.
export default function MorningReminder() {
  const visible = useReminderStore((s) => s.visible)
  const enabled = useReminderStore((s) => s.enabled)
  const hour = useReminderStore((s) => s.hour)
  const setHour = useReminderStore((s) => s.setHour)
  const setEnabled = useReminderStore((s) => s.setEnabled)
  const read = useReminderStore((s) => s.read)
  const snooze = useReminderStore((s) => s.snooze)
  const dismiss = useReminderStore((s) => s.dismiss)
  const check = useReminderStore((s) => s.check)
  const setView = useScoreStore((s) => s.setView)
  const cards = useNewsStore((s) => s.cards)
  const [canNotify, setCanNotify] = useState(false)

  useEffect(() => {
    check()
    const t = setInterval(check, 60000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      setCanNotify(typeof Notification !== 'undefined' && Notification.permission === 'default')
    } catch {
      setCanNotify(false)
    }
  }, [visible])

  const enablePopups = async () => {
    try {
      const p = await Notification.requestPermission()
      setCanNotify(p === 'default')
    } catch {
      setCanNotify(false)
    }
  }

  const fmtHour = (h) => {
    const ap = h >= 12 ? 'PM' : 'AM'
    const n = h % 12 === 0 ? 12 : h % 12
    return `${n} ${ap}`
  }

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
            className="fixed inset-0 z-50 bg-black/60"
          />
          <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center p-4">
            <motion.div
              initial={{ scale: 0.85, rotate: -2, y: 30, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, rotate: 2, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="card-brutal pointer-events-auto w-full max-w-sm bg-brutal-cream p-4 dark:border-bone dark:bg-surface dark:text-bone sm:p-5"
            >
              <div className="flex items-center justify-between">
                <span className="badge-brutal bg-brutal-yellow text-black">☀️ Morning brief</span>
                <motion.button whileTap={{ scale: 0.85, rotate: 90 }} onClick={dismiss} className="btn-brutal bg-white p-2 text-black dark:border-bone dark:bg-raised dark:text-bone" aria-label="Dismiss">
                  <X size={18} strokeWidth={3} />
                </motion.button>
              </div>

              <p className="mt-3 font-black text-2xl leading-tight">
                Fresh headlines are live.
              </p>
              <p className="mt-1 font-mono text-[11px] font-bold uppercase opacity-60">
                {(cards || []).length} stories waiting • 2-min catch-up
              </p>

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  read()
                  setView('news')
                }}
                className="btn-brutal mt-3 w-full bg-black px-4 py-2.5 text-sm text-white dark:border-bone"
              >
                Read the news
              </motion.button>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button onClick={snooze} className="btn-brutal bg-white px-2 py-1.5 text-xs text-black dark:border-bone dark:bg-raised dark:text-bone">
                  Snooze 1h
                </button>
                <button onClick={() => setEnabled(false)} className="btn-brutal flex items-center justify-center gap-1 bg-brutal-red px-2 py-1.5 text-xs text-white">
                  <BellOff size={13} strokeWidth={3} /> Turn off
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 border-[3px] border-black bg-white px-2 py-1.5 text-black dark:border-bone dark:bg-raised dark:text-bone">
                <span className="flex items-center gap-1 font-mono text-[11px] font-bold uppercase">
                  <Bell size={13} strokeWidth={3} /> Remind at
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setHour(hour - 1)} className="border-2 border-black px-1.5 font-black dark:border-bone" aria-label="Earlier hour">−</button>
                  <span className="min-w-14 text-center font-black text-sm">{fmtHour(hour)}</span>
                  <button onClick={() => setHour(hour + 1)} className="border-2 border-black px-1.5 font-black dark:border-bone" aria-label="Later hour">+</button>
                </div>
              </div>

              {canNotify && (
                <button onClick={enablePopups} className="btn-brutal mt-2 w-full bg-brutal-mint px-2 py-1.5 text-xs text-black">
                  Enable system popups too
                </button>
              )}
              {!enabled && (
                <p className="mt-2 text-center font-mono text-[10px] font-bold uppercase opacity-60">
                  Reminders are off — bell icon re-enables
                </p>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
