import { create } from 'zustand'

const KEY = 'flash-reminder-v1'
const MIN_HOUR = 5
const MAX_HOUR = 11

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (v && typeof v === 'object') return v
  } catch { /* ignore */ }
  return {}
}

function save(patch) {
  try {
    const cur = load()
    localStorage.setItem(KEY, JSON.stringify({ ...cur, ...patch }))
  } catch { /* ignore */ }
}

const dayOf = (ms) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Pure decision helper (nowMs injectable for tests): show iff enabled,
// past today's configured hour, not yet shown today, snooze expired.
export function shouldShowReminder(state, nowMs = Date.now()) {
  if (!state?.enabled) return false
  const d = new Date(nowMs)
  const cutoff = new Date(d.getFullYear(), d.getMonth(), d.getDate(), state.hour ?? 8, 0, 0, 0).getTime()
  if (nowMs < cutoff) return false
  if (state.lastShownDate === dayOf(nowMs)) return false
  if (state.snoozeUntil && nowMs < state.snoozeUntil) return false
  return true
}

export const clampHour = (h) => Math.min(MAX_HOUR, Math.max(MIN_HOUR, Math.round(Number(h) || 8)))

export const useReminderStore = create((set, get) => {
  const saved = load()
  return {
    enabled: saved.enabled ?? true,
    hour: clampHour(saved.hour ?? 8),
    lastShownDate: saved.lastShownDate || '',
    snoozeUntil: saved.snoozeUntil || 0,
    visible: false,

    setHour: (hour) => {
      const h = clampHour(hour)
      set({ hour: h })
      save({ hour: h })
    },

    setEnabled: (enabled) => {
      set({ enabled: !!enabled, visible: false })
      save({ enabled: !!enabled })
    },

    // Minute-tick entry: show the modal once conditions are met.
    check: (nowMs = Date.now()) => {
      if (get().visible) return
      if (shouldShowReminder(get(), nowMs)) {
        set({ visible: true })
        try {
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            const n = new Notification('FLASH! — morning headlines', {
              body: 'Fresh news is live. Tap to catch up.',
              tag: `flash-morning-${dayOf(nowMs)}`,
            })
            n.onclick = () => {
              try {
                window.focus()
              } catch { /* ignore */ }
              get().read()
            }
          }
        } catch { /* system popup is best-effort only */ }
      }
    },

    read: () => {
      const today = dayOf(Date.now())
      set({ visible: false, lastShownDate: today, snoozeUntil: 0 })
      save({ lastShownDate: today, snoozeUntil: 0 })
    },

    snooze: () => {
      const until = Date.now() + 3600 * 1000
      set({ visible: false, snoozeUntil: until })
      save({ snoozeUntil: until })
    },

    dismiss: () => set({ visible: false }),

    openSettings: () => set({ visible: true }),
  }
})
