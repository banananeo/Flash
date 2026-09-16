import { motion } from 'framer-motion'
import { Bell, BellOff, Moon, Sun } from 'lucide-react'
import { useThemeStore } from '../store/useThemeStore'
import { useReminderStore } from '../store/useReminderStore'

export default function Header() {
  const theme = useThemeStore((s) => s.theme)
  const toggle = useThemeStore((s) => s.toggle)
  const dark = theme === 'dark'
  const reminderOn = useReminderStore((s) => s.enabled)
  const setReminderOn = useReminderStore((s) => s.setEnabled)
  const openReminder = useReminderStore((s) => s.openSettings)

  return (
    <header className="sticky top-0 z-40 border-b-[4px] border-black bg-brutal-cream/95 backdrop-blur dark:border-bone dark:bg-ink/95">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <motion.button
          whileHover={{ rotate: -4 }}
          whileTap={{ scale: 0.88, rotate: 12 }}
          onClick={toggle}
          aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
          className="btn-brutal shrink-0 bg-black p-2 text-brutal-yellow dark:border-bone dark:bg-brutal-yellow dark:text-black"
        >
          {dark ? <Sun size={20} strokeWidth={3} /> : <Moon size={20} strokeWidth={3} />}
        </motion.button>
        <motion.div
          whileHover={{ rotate: -2, scale: 1.03 }}
          whileTap={{ scale: 0.96, rotate: 1 }}
          className="flex items-center gap-2 border-[4px] border-black bg-brutal-yellow px-4 py-1.5 shadow-brutal-sm dark:border-bone"
        >
          <img
            src="/logo.svg"
            alt="FLASH! logo"
            className="h-9 w-9 border-[3px] border-black object-cover"
          />
          <p className="font-black text-3xl tracking-tighter text-black">FLASH!</p>
        </motion.div>
        {/* reminder bell — same footprint as the theme button so the logo stays centered */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => {
            if (reminderOn) openReminder()
            else {
              // enabling alone shows nothing (setEnabled hides) — open
              // settings so the user gets feedback + picks an hour
              setReminderOn(true)
              openReminder()
            }
          }}
          title={reminderOn ? 'Morning reminder settings' : 'Turn on morning reminder'}
          aria-label={reminderOn ? 'Morning reminder settings' : 'Turn on morning reminder'}
          aria-pressed={!!reminderOn}
          className={`btn-brutal grid w-[46px] shrink-0 place-items-center p-2 ${reminderOn ? 'bg-brutal-yellow text-black' : 'bg-white text-black/40 dark:border-bone dark:bg-raised dark:text-bone/40'}`}
        >
          {reminderOn ? <Bell size={20} strokeWidth={3} /> : <BellOff size={20} strokeWidth={3} />}
        </motion.button>
      </div>
    </header>
  )
}
