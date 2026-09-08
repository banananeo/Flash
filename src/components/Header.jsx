import { motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { useThemeStore } from '../store/useThemeStore'

export default function Header() {
  const theme = useThemeStore((s) => s.theme)
  const toggle = useThemeStore((s) => s.toggle)
  const dark = theme === 'dark'

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
        {/* balance spacer so the logo stays centered */}
        <div className="w-[46px] shrink-0" aria-hidden />
      </div>
    </header>
  )
}
