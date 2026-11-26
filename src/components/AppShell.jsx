import { motion } from 'framer-motion'
import { useScoreStore } from '../store/useScoreStore'
import flashSymbol from '../assets/icons/flash-symbol.svg'
import scoresIcon from '../assets/icons/scores.svg'
import f1Icon from '../assets/icons/f1.svg'

function HomeNavIcon({ active }) {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? '2.1' : '1.8'}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`h-[21px] w-[21px] ${active ? 'text-ink opacity-100' : 'text-ink opacity-55'}`}
    >
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </svg>
  )
}

const NAV_ITEMS = [
  { id: 'home', mobileLabel: 'Home', desktopLabel: 'Home', icon: null },
  { id: 'scores', mobileLabel: 'Scores', desktopLabel: 'Live Scores', icon: scoresIcon },
  { id: 'f1', mobileLabel: 'Formula 1', desktopLabel: 'Formula 1', icon: f1Icon },
]

export function TopBar() {
  const view = useScoreStore((s) => s.view)
  const setView = useScoreStore((s) => s.setView)

  return (
    <header className="sticky top-0 z-30 border-b border-hairline/80 bg-paper/95 backdrop-blur-md">
      {/* Desktop Top Bar */}
      <div className="mx-auto hidden h-[68px] max-w-[1120px] items-center justify-between px-10 lg:flex">
        <button
          type="button"
          onClick={() => setView('home')}
          className="flex items-center gap-2.5 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse focus-visible:ring-offset-2"
          aria-label="flash home"
        >
          <img
            src={flashSymbol}
            alt=""
            width={22}
            height={22}
            className="h-[22px] w-[22px] object-contain"
          />

        </button>

        <nav className="flex h-full items-center gap-12" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const active = view === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={`relative flex h-full items-center text-[14px] transition-colors ${active ? 'font-bold text-ink' : 'font-medium text-muted hover:text-ink'
                  }`}
              >
                {item.desktopLabel}
                {active && (
                  <motion.span
                    layoutId="desktop-nav-underline"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-pulse"
                    transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                  />
                )}
              </button>
            )
          })}
        </nav>

        <div className="flex items-center gap-3">

        </div>
      </div>

      {/* Mobile Top Bar */}
      <div className="mx-auto flex h-[58px] max-w-[480px] items-center justify-between px-6 sm:max-w-[640px] lg:hidden">
        <button
          type="button"
          onClick={() => setView('home')}
          className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse focus-visible:ring-offset-2"
          aria-label="flash home"
        >
          <img
            src={flashSymbol}
            alt=""
            width={23}
            height={23}
            className="h-[23px] w-[23px] object-contain"
          />
          <span className="font-display text-[16px] font-bold tracking-[-0.03em] text-ink">
            flash
          </span>
        </button>


      </div>
    </header>
  )
}

export function BottomNav() {
  const view = useScoreStore((s) => s.view)
  const setView = useScoreStore((s) => s.setView)
  const football = useScoreStore((s) => s.football)
  const cricket = useScoreStore((s) => s.cricket)

  const hasLive =
    (football || []).some((m) => m.status === 'live') ||
    (cricket || []).some((m) => m.status === 'live')

  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-hairline/80 bg-paper/95 backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto max-w-[480px] px-4 sm:max-w-[640px]">
        <div className="grid grid-cols-3 items-center py-2 pb-safe">
          {NAV_ITEMS.map((item) => {
            const active = view === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className="flex flex-col items-center justify-center rounded-[16px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse focus-visible:ring-offset-2"
                aria-current={active ? 'page' : undefined}
              >
                <div
                  className={`relative flex h-[46px] w-full max-w-[92px] flex-col items-center justify-center gap-1 rounded-[15px] transition-colors ${active ? 'bg-sage-tint' : 'bg-transparent'
                    }`}
                >
                  {item.id === 'home' ? (
                    <HomeNavIcon active={active} />
                  ) : (
                    <div className="relative">
                      <img
                        src={item.icon}
                        alt=""
                        width={21}
                        height={21}
                        className={`h-[21px] w-[21px] object-contain ${active ? 'opacity-100' : 'opacity-55'
                          }`}
                      />
                      {item.id === 'scores' && hasLive && (
                        <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-live ring-2 ring-paper" />
                      )}
                    </div>
                  )}
                  <span
                    className={`text-[10px] leading-none ${active ? 'font-bold text-ink' : 'font-medium text-muted'
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
