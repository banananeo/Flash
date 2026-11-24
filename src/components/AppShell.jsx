import { motion } from 'framer-motion'
import { useScoreStore } from '../store/useScoreStore'
import flashSymbol from '../assets/icons/flash-symbol.svg'
import scoresIcon from '../assets/icons/scores.svg'
import f1Icon from '../assets/icons/f1.svg'

const NAV_ITEMS = [
  { id: 'scores', mobileLabel: 'Scores', desktopLabel: 'Live scores', icon: scoresIcon },
  { id: 'f1', mobileLabel: 'Formula 1', desktopLabel: 'Formula 1', icon: f1Icon },
]

export function TopBar() {
  const view = useScoreStore((s) => s.view)
  const setView = useScoreStore((s) => s.setView)

  return (
    <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur-sm">
      {/* Desktop Top Bar */}
      <div className="mx-auto hidden h-[72px] max-w-[1360px] items-center justify-between border-b border-hairline px-10 lg:flex">
        <button
          onClick={() => setView('scores')}
          className="flex items-center gap-2.5 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse focus-visible:ring-offset-2"
          aria-label="flash home"
        >
          <img src={flashSymbol} alt="" width={24} height={24} className="h-[24px] w-[24px] object-contain" />
        </button>

        <nav className="flex h-full items-center gap-10" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const active = view === item.id
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`relative flex h-full items-center text-[14px] transition-colors ${
                  active ? 'font-bold text-ink' : 'font-medium text-muted hover:text-ink'
                }`}
              >
                {item.desktopLabel}
                {active && (
                  <motion.span
                    layoutId="desktop-nav-underline"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-pulse"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
              </button>
            )
          })}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('scores')}
            className="flex h-[38px] items-center gap-1.5 rounded-full bg-live px-4 text-[11px] font-bold uppercase tracking-wider text-white transition-transform active:scale-95"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            Live
          </button>
        </div>
      </div>

      {/* Mobile Top Bar */}
      <div className="mx-auto flex h-[60px] max-w-[460px] items-center justify-between px-6 lg:hidden">
        <button
          onClick={() => setView('scores')}
          className="flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse focus-visible:ring-offset-2"
          aria-label="flash home"
        >
          <img src={flashSymbol} alt="flash" width={26} height={26} className="h-[26px] w-[26px] object-contain" />
        </button>

        <button
          onClick={() => setView('scores')}
          className="flex h-8 items-center gap-1.5 rounded-full bg-live px-3.5 text-[10px] font-bold uppercase tracking-wider text-white transition-transform active:scale-95"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
          Live
        </button>
      </div>
    </header>
  )
}

export function BottomNav() {
  const view = useScoreStore((s) => s.view)
  const setView = useScoreStore((s) => s.setView)

  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed bottom-0 left-0 right-0 z-30 bg-paper/95 backdrop-blur-sm lg:hidden"
    >
      <div className="mx-auto max-w-[460px] px-6">
        <div className="h-px w-full bg-hairline" />
        <div className="grid grid-cols-2 items-center py-2.5 pb-safe">
          {NAV_ITEMS.map((item) => {
            const active = view === item.id
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className="flex flex-col items-center justify-center rounded-[16px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse focus-visible:ring-offset-2"
                aria-current={active ? 'page' : undefined}
              >
                <div
                  className={`flex h-[48px] w-full max-w-[96px] flex-col items-center justify-center gap-1 rounded-[16px] transition-colors ${
                    active ? 'bg-sage-tint' : 'bg-transparent'
                  }`}
                >
                  <img
                    src={item.icon}
                    alt=""
                    width={21}
                    height={21}
                    className={`h-[21px] w-[21px] object-contain ${active ? 'opacity-100' : 'opacity-55'}`}
                  />
                  <span
                    className={`text-[10px] leading-none ${
                      active ? 'font-bold text-ink' : 'font-medium text-muted'
                    }`}
                  >
                    {item.mobileLabel}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
