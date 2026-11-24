import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useReminderStore } from '../store/useReminderStore'
import { useScoreStore } from '../store/useScoreStore'
import { useNewsStore } from '../store/useNewsStore'

// Editorial Morning Briefing reminder sheet
export default function MorningReminder() {
  const visible = useReminderStore((s) => s.visible)
  const enabled = useReminderStore((s) => s.enabled)
  const hour = useReminderStore((s) => s.hour)
  const bumpHour = useReminderStore((s) => s.bumpHour)
  const setEnabled = useReminderStore((s) => s.setEnabled)
  const read = useReminderStore((s) => s.read)
  const snooze = useReminderStore((s) => s.snooze)
  const dismiss = useReminderStore((s) => s.dismiss)
  const check = useReminderStore((s) => s.check)
  const setView = useScoreStore((s) => s.setView)
  const cards = useNewsStore((s) => s.cards)

  useEffect(() => {
    check()
    const t = setInterval(check, 60000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!visible) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, dismiss])

  const [canNotify, setCanNotify] = useState(() => {
    try {
      return typeof Notification !== 'undefined' && Notification.permission === 'default'
    } catch {
      return false
    }
  })

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
    return `${n}:00 ${ap}`
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
            className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px]"
          />
          <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center overflow-y-auto p-5">
            <motion.div
              initial={{ scale: 0.94, y: 16, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 10, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="pointer-events-auto w-full max-w-sm rounded-[22px] bg-paper p-6 shadow-xl"
              role="dialog"
              aria-modal="true"
              aria-label="Morning briefing reminder"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-pulse px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-ink">
                  PADDOCK DROP
                </span>
                <button
                  type="button"
                  onClick={dismiss}
                  aria-label="Dismiss"
                  className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-sage hover:text-ink"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="mt-4 text-[24px] font-semibold leading-tight text-ink">
                The Paddock is live.
              </p>
              <p className="mt-1.5 text-[13px] text-muted">
                {(cards || []).length} transfer radar drops, pit-wall radio clips & fan debates ready.
              </p>

              <button
                type="button"
                onClick={() => {
                  read()
                  setView('news')
                }}
                className="mt-5 h-11 w-full rounded-full bg-pulse text-[13px] font-bold text-ink transition-opacity hover:opacity-90"
              >
                Enter The Paddock
              </button>

              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={snooze}
                  className="h-10 rounded-full bg-sage text-[12px] font-semibold text-ink transition-colors hover:bg-hairline"
                >
                  Snooze 1h
                </button>
                <button
                  type="button"
                  onClick={() => setEnabled(!enabled)}
                  className="h-10 rounded-full bg-white text-[12px] font-semibold text-muted transition-colors hover:text-ink"
                >
                  {enabled ? 'Turn off' : 'Turn on'}
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-[14px] bg-white px-4 py-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
                  Remind at
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => bumpHour(-1)}
                    aria-label="Earlier hour"
                    className="grid h-7 w-7 place-items-center rounded-full bg-sage font-bold text-ink"
                  >
                    −
                  </button>
                  <span className="min-w-16 text-center font-display text-[14px] font-bold text-ink">
                    {fmtHour(hour)}
                  </span>
                  <button
                    type="button"
                    onClick={() => bumpHour(1)}
                    aria-label="Later hour"
                    className="grid h-7 w-7 place-items-center rounded-full bg-sage font-bold text-ink"
                  >
                    +
                  </button>
                </div>
              </div>

              {canNotify && (
                <button
                  type="button"
                  onClick={enablePopups}
                  className="mt-3 h-10 w-full rounded-full bg-sage-tint text-[12px] font-bold text-ink"
                >
                  Enable browser notifications
                </button>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
