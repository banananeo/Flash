import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useScoreStore } from '../store/useScoreStore'
import { useNewsStore } from '../store/useNewsStore'
import { useReminderStore } from '../store/useReminderStore'
import flashSymbol from '../assets/icons/flash-symbol.svg'
import searchIcon from '../assets/icons/search.svg'
import bellIcon from '../assets/icons/bell.svg'
import newsIcon from '../assets/icons/news.svg'
import scoresIcon from '../assets/icons/scores.svg'
import f1Icon from '../assets/icons/f1.svg'

const NAV_ITEMS = [
  { id: 'news', mobileLabel: 'News', desktopLabel: 'News', icon: newsIcon },
  { id: 'scores', mobileLabel: 'Scores', desktopLabel: 'Live scores', icon: scoresIcon },
  { id: 'f1', mobileLabel: 'Formula 1', desktopLabel: 'Formula 1', icon: f1Icon },
]

export function TopBar() {
  const view = useScoreStore((s) => s.view)
  const setView = useScoreStore((s) => s.setView)
  const liveCount = useScoreStore(
    (s) => [...(s.football || []), ...(s.cricket || [])].filter((m) => m.status === 'live').length,
  )
  const searchQuery = useNewsStore((s) => s.searchQuery)
  const searchNews = useNewsStore((s) => s.searchNews)
  const openReminder = useReminderStore((s) => s.openNow)

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [draft, setDraft] = useState(searchQuery)

  const submitSearch = (e) => {
    e.preventDefault()
    if (view !== 'news') setView('news')
    searchNews(draft)
    setMobileSearchOpen(false)
  }

  const clearSearch = () => {
    setDraft('')
    searchNews('')
  }

  return (
    <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur-sm">
      {/* Desktop Top Bar (11 · Desktop briefing) */}
      <div className="mx-auto hidden h-[72px] max-w-[1360px] items-center justify-between border-b border-hairline px-10 lg:flex">
        <button
          onClick={() => setView('news')}
          className="flex items-center gap-2.5 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse focus-visible:ring-offset-2"
          aria-label="flash home"
        >
          <img src={flashSymbol} alt="" width={24} height={24} className="h-[24px] w-[24px] object-contain" />
          <span className="font-display text-[20px] font-bold tracking-tight text-ink">flash</span>
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
          <form onSubmit={submitSearch} className="relative flex items-center">
            <input
              type="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Search Flash"
              aria-label="Search Flash"
              className="h-[38px] w-[220px] rounded-full border border-hairline bg-white px-4 pr-8 text-[13px] font-medium text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-pulse/30"
            />
            {draft && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="absolute right-2.5 text-muted hover:text-ink"
              >
                <X size={14} />
              </button>
            )}
          </form>

          <button
            onClick={() => setView('scores')}
            className="flex h-[38px] items-center gap-1.5 rounded-full bg-live px-4 text-[11px] font-bold uppercase tracking-wider text-white transition-transform active:scale-95"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            LIVE{liveCount > 0 ? ` · ${liveCount}` : ''}
          </button>

          <button
            onClick={openReminder}
            aria-label="Morning briefing reminder"
            title="Morning briefing reminder"
            className="grid h-[38px] w-[38px] place-items-center rounded-full text-ink transition-colors hover:bg-sage"
          >
            <img src={bellIcon} alt="" width={20} height={20} className="h-[20px] w-[20px] object-contain" />
          </button>
        </div>
      </div>

      {/* Mobile Top Bar (02 / 04 / 05 / 07 / 12) */}
      <div className="mx-auto flex h-[60px] max-w-[460px] items-center justify-between px-6 lg:hidden">
        <button
          onClick={() => setView('news')}
          className="flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse focus-visible:ring-offset-2"
          aria-label="flash home"
        >
          <img src={flashSymbol} alt="flash" width={26} height={26} className="h-[26px] w-[26px] object-contain" />
        </button>

        <div className="flex items-center gap-5">
          <button
            onClick={() => setMobileSearchOpen((v) => !v)}
            aria-label="Search stories"
            className="grid h-8 w-8 place-items-center rounded-full transition-colors active:bg-sage"
          >
            <img src={searchIcon} alt="" width={22} height={22} className="h-[22px] w-[22px] object-contain" />
          </button>
          <button
            onClick={openReminder}
            aria-label="Morning reminder"
            className="grid h-8 w-8 place-items-center rounded-full transition-colors active:bg-sage"
          >
            <img src={bellIcon} alt="" width={22} height={22} className="h-[22px] w-[22px] object-contain" />
          </button>
        </div>
      </div>

      {/* Mobile collapsible search drawer */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-hairline bg-paper lg:hidden"
          >
            <form onSubmit={submitSearch} className="mx-auto flex max-w-[460px] items-center gap-2 px-6 pb-3 pt-1">
              <input
                type="search"
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Search headlines…"
                className="h-10 flex-1 rounded-full border border-hairline bg-white px-4 text-[14px] font-medium text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-pulse/30"
              />
              {draft && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="rounded-full bg-sage px-3 py-2 text-xs font-semibold text-muted"
                >
                  Clear
                </button>
              )}
              <button
                type="submit"
                    className="rounded-full bg-pulse px-4 py-2 text-xs font-bold text-ink"
              >
                Go
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
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
        <div className="grid grid-cols-3 items-center py-2.5 pb-safe">
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
                  className={`flex h-[48px] w-full max-w-[72px] flex-col items-center justify-center gap-1 rounded-[16px] transition-colors ${
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
