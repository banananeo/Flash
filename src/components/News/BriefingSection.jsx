import { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, FlipHorizontal2, RefreshCw, RotateCcw, Shuffle } from 'lucide-react'
import { CATEGORIES } from '../../data/mockNews'
import { useNewsStore } from '../../store/useNewsStore'
import { useScoreStore } from '../../store/useScoreStore'
import { useF1Store } from '../../store/useF1Store'
import { useReminderStore } from '../../store/useReminderStore'
import NewsFlashCard from './NewsFlashCard'

function formatEditorialDate() {
  const d = new Date()
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase()
  const day = String(d.getDate()).padStart(2, '0')
  const month = d.toLocaleDateString('en-GB', { month: 'long' }).toUpperCase()
  return `${weekday}, ${day} ${month}`
}

function formatRaceDateShort(dateUTC) {
  if (!dateUTC) return ''
  try {
    const day = String(dateUTC.getUTCDate()).padStart(2, '0')
    const mon = dateUTC.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }).toUpperCase()
    return `${day} ${mon}`
  } catch {
    return ''
  }
}

function DesktopRightRail() {
  const football = useScoreStore((s) => s.football)
  const cricket = useScoreStore((s) => s.cricket)
  const openMatch = useScoreStore((s) => s.openMatch)
  const setView = useScoreStore((s) => s.setView)
  const setSport = useScoreStore((s) => s.setSport)
  const nextRace = useF1Store((s) => s.nextRace)
  const openReminder = useReminderStore((s) => s.openNow)

  const featuredMatch =
    (football || []).find((m) => m.status === 'live') ||
    (cricket || []).find((m) => m.status === 'live') ||
    (football || [])[0] ||
    (cricket || [])[0] ||
    null

  return (
    <aside className="hidden flex-col gap-6 lg:flex">
      {/* HAPPENING NOW */}
      <div>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
          HAPPENING NOW
        </p>
        {featuredMatch && (
          <div className="rounded-[20px] border border-hairline bg-white p-5 text-ink shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                {featuredMatch.leagueName || featuredMatch.league}
              </span>
              {featuredMatch.status === 'live' && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-live px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  LIVE
                </span>
              )}
            </div>

            {featuredMatch.sport === 'football' ? (
              <>
                <div className="mt-5 flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 break-words text-[13px] font-semibold leading-tight text-ink sm:text-[15px]">
                    {featuredMatch.teamA?.name}
                  </span>
                  <span className="shrink-0 whitespace-nowrap font-display text-[26px] font-bold leading-none tracking-tight text-ink sm:text-[30px]">
                    {featuredMatch.teamA?.score ?? '–'} : {featuredMatch.teamB?.score ?? '–'}
                  </span>
                  <span className="min-w-0 flex-1 break-words text-right text-[13px] font-semibold leading-tight text-ink sm:text-[15px]">
                    {featuredMatch.teamB?.name}
                  </span>
                </div>
                <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-brand-strong">
                  {featuredMatch.minute}
                  {featuredMatch.halfLabel ? ` / ${featuredMatch.halfLabel}` : ''}
                </p>
                <div className="mt-4 h-[2px] w-full overflow-hidden rounded-full bg-sage">
                  <div
                    className="h-full rounded-full bg-pulse transition-all"
                    style={{ width: `${featuredMatch.progressPct || 50}%` }}
                  />
                </div>
              </>
            ) : (
              <div className="mt-4 space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 flex-1 break-words text-[15px] font-semibold leading-tight text-ink">{featuredMatch.teamA?.name}</span>
                  <span className="shrink-0 font-display text-[22px] font-bold text-ink">{featuredMatch.teamA?.score}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 flex-1 break-words text-[15px] font-semibold leading-tight text-ink">{featuredMatch.teamB?.name}</span>
                  <span className="shrink-0 font-display text-[22px] font-bold text-ink">{featuredMatch.teamB?.score}</span>
                </div>
                {featuredMatch.meta?.need && (
                  <p className="pt-1 text-[11px] font-medium text-brand-strong">{featuredMatch.meta.need}</p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setSport(featuredMatch.sport)
                openMatch(featuredMatch)
              }}
              className="mt-5 text-[12px] font-semibold text-ink transition-colors hover:text-brand-strong"
            >
              Open match centre →
            </button>
          </div>
        )}
      </div>

      {/* THE PADDOCK */}
      <div>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
          THE PADDOCK
        </p>
        <div className="rounded-[20px] bg-sage-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
            UP NEXT{nextRace?.dateUTC ? ` / ${formatRaceDateShort(nextRace.dateUTC)}` : ''}
          </p>
          <p className="mt-2.5 text-[22px] font-semibold leading-tight text-ink">
            {nextRace?.name || 'Formula 1 Championship'}
          </p>
          <p className="mt-1 text-[13px] font-medium text-muted">
            {nextRace?.circuit || 'Next Grand Prix weekend'}
          </p>
          <button
            type="button"
            onClick={() => setView('f1')}
            className="mt-5 text-[12px] font-bold text-ink transition-opacity hover:opacity-70"
          >
            Explore Formula 1 →
          </button>
        </div>
      </div>

      {/* Morning reminder promo card */}
      <button
        type="button"
        onClick={openReminder}
        className="rounded-[20px] bg-white p-5 text-left transition-colors hover:bg-white/80"
      >
        <p className="text-[19px] font-semibold leading-tight text-ink">Your morning, sorted.</p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          A quick briefing. A wider perspective. Make a little room for what matters.
        </p>
      </button>

      <p className="pt-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
        FLASH / LESS NOISE. MORE SIGNAL.
      </p>
    </aside>
  )
}

export default function BriefingSection() {
  const category = useNewsStore((s) => s.category)
  const searchQuery = useNewsStore((s) => s.searchQuery)
  const setCategory = useNewsStore((s) => s.setCategory)
  const searchNews = useNewsStore((s) => s.searchNews)
  const cards = useNewsStore((s) => s.cards)
  const topIndex = useNewsStore((s) => s.topIndex)
  const isFlipped = useNewsStore((s) => s.isFlipped)
  const toggleFlip = useNewsStore((s) => s.toggleFlip)
  const swipe = useNewsStore((s) => s.swipe)
  const nextCard = useNewsStore((s) => s.nextCard)
  const prevCard = useNewsStore((s) => s.prevCard)
  const resetDeck = useNewsStore((s) => s.resetDeck)
  const reshuffleDeck = useNewsStore((s) => s.reshuffleDeck)
  const status = useNewsStore((s) => s.status)
  const error = useNewsStore((s) => s.error)
  const fetchNews = useNewsStore((s) => s.fetchNews)
  const openReader = useNewsStore((s) => s.openReader)
  const openReminder = useReminderStore((s) => s.openNow)

  useEffect(() => {
    fetchNews(category, searchQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keyboard deck shortcuts (← prev, → next, Space flip) when no input or modal is open
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target
      if (t && t.closest?.('input, textarea, select, button, [contenteditable="true"], [role="dialog"]')) return
      if (document.querySelector('[role="dialog"]')) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        nextCard()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prevCard()
      } else if (e.key === ' ') {
        e.preventDefault()
        toggleFlip()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nextCard, prevCard, toggleFlip])

  const total = cards?.length || 0
  const current = cards?.[topIndex] || null
  const progressPct = total > 0 ? Math.min(100, Math.round(((topIndex + 1) / total) * 100)) : 0

  return (
    <section className="mx-auto w-full max-w-[460px] px-6 pb-28 pt-2 lg:max-w-[1360px] lg:px-10 lg:pb-16 lg:pt-8">
      <div className="lg:grid lg:grid-cols-[190px_1fr_320px] lg:gap-10">
        {/* Desktop Left Rail (YOUR EDITION) */}
        <aside className="hidden flex-col lg:flex">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
            YOUR EDITION
          </p>
          <div className="flex flex-col gap-1">
            {CATEGORIES.map((c) => {
              const active = category === c.id && !searchQuery
              return (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`w-full rounded-[12px] px-4 py-2.5 text-left text-[14px] transition-colors ${active
                      ? 'bg-pulse font-semibold text-ink'
                      : 'font-medium text-muted hover:bg-sage/60 hover:text-ink'
                    }`}
                >
                  {c.label}
                </button>
              )
            })}
          </div>

          <div className="my-6 h-px w-full bg-hairline" />

          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
            MAKE IT YOURS
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-muted">
            Follow your interests for a sharper daily edit.
          </p>
          <button
            type="button"
            onClick={openReminder}
            className="mt-4 w-fit rounded-full bg-sage px-4 py-2 text-[12px] font-semibold text-ink transition-colors hover:bg-pulse"
          >
            Personalise feed
          </button>
        </aside>

        {/* Center / Mobile Main Briefing Column — Flash Card Deck */}
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
            {formatEditorialDate()}
          </p>
          <h1 className="mt-1.5 text-[34px] font-medium leading-[1.12] tracking-[-0.02em] text-ink lg:text-[40px]">
            Your daily edge.
          </h1>
          <p className="mt-1.5 hidden text-[14px] font-normal text-muted lg:block">
            Tap any flash card to flip for the summary, or open the full story.
          </p>

          {searchQuery && (
            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-full bg-sage px-3 py-1 text-[12px] font-semibold text-ink">
                Results for “{searchQuery}”
              </span>
              <button
                type="button"
                onClick={() => searchNews('')}
                className="text-[12px] font-semibold text-muted underline hover:text-ink"
              >
                Reset
              </button>
            </div>
          )}

          {/* Mobile Category Pills */}
          <div className="no-scrollbar -mx-6 mt-5 flex gap-2 overflow-x-auto px-6 lg:hidden">
            {CATEGORIES.map((c) => {
              const active = category === c.id && !searchQuery
              return (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] transition-colors ${active
                      ? 'bg-pulse font-semibold text-ink'
                      : 'bg-sage font-medium text-muted hover:text-ink'
                    }`}
                >
                  {c.label}
                </button>
              )
            })}
          </div>

          {error && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-[14px] bg-sage px-4 py-2.5 text-[12px] font-medium text-ink">
              <span className="truncate">{error}</span>
              <button
                onClick={() => fetchNews(category, searchQuery)}
                className="shrink-0 font-bold text-ink underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Flash Card Deck Area */}
          <div className="mx-auto mt-5 max-w-[540px]">
            {status === 'loading' && !total ? (
              <div className="h-[460px] animate-pulse rounded-[22px] bg-sage sm:h-[500px]" />
            ) : !current ? (
              <div className="flex h-[420px] flex-col items-center justify-center rounded-[22px] border border-hairline bg-white p-8 text-center shadow-sm">
                <span className="rounded-full bg-sage-leader px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-brand-strong">
                  ALL CAUGHT UP
                </span>
                <h2 className="mt-3 text-[24px] font-semibold leading-tight text-ink">
                  You’ve flipped through every card.
                </h2>
                <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-muted">
                  Replay this deck, shuffle the order, or pull fresh headlines.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={resetDeck}
                    className="inline-flex items-center gap-1.5 rounded-full bg-pulse px-5 py-2.5 text-[13px] font-bold text-ink"
                  >
                    <RotateCcw size={15} />
                    Start over
                  </button>
                  <button
                    type="button"
                    onClick={reshuffleDeck}
                    className="inline-flex items-center gap-1.5 rounded-full bg-sage px-4 py-2.5 text-[13px] font-semibold text-ink hover:bg-hairline"
                  >
                    <Shuffle size={15} />
                    Shuffle
                  </button>
                  <button
                    type="button"
                    onClick={() => fetchNews(category, searchQuery)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-sage px-4 py-2.5 text-[13px] font-semibold text-ink hover:bg-hairline"
                  >
                    <RefreshCw size={15} />
                    Refresh
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Progress & Deck Utilities */}
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                    Card {topIndex + 1} of {total}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sage">
                    <div
                      className="h-full rounded-full bg-pulse transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={reshuffleDeck}
                      title="Shuffle deck"
                      aria-label="Shuffle deck"
                      className="grid h-8 w-8 place-items-center rounded-full bg-sage text-muted transition-colors hover:text-ink"
                    >
                      <Shuffle size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => fetchNews(category, searchQuery)}
                      title="Refresh stories"
                      aria-label="Refresh stories"
                      className="grid h-8 w-8 place-items-center rounded-full bg-sage text-muted transition-colors hover:text-ink"
                    >
                      <RefreshCw size={14} className={status === 'loading' ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>

                {/* 3D Flippable Flash Card Container */}
                <div className="relative h-[465px] w-full sm:h-[510px]">
                  {/* Subtle stacked card backdrop */}
                  {topIndex + 1 < total && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-3 -bottom-2.5 top-3 rounded-[22px] border border-hairline bg-white/70 shadow-sm"
                    />
                  )}
                  <AnimatePresence mode="popLayout">
                    <NewsFlashCard
                      key={current.id || current.url || topIndex}
                      article={current}
                      onSwipe={swipe}
                      onReadFull={openReader}
                    />
                  </AnimatePresence>
                </div>

                {/* Deck Navigation Bar */}
                <div className="mt-5 flex items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={prevCard}
                    disabled={topIndex === 0}
                    className="inline-flex h-[42px] items-center gap-1.5 rounded-full bg-sage px-4 text-[13px] font-semibold text-ink transition-opacity disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                    Prev
                  </button>

                  <button
                    type="button"
                    onClick={toggleFlip}
                    className="inline-flex h-[42px] flex-1 items-center justify-center gap-2 rounded-full bg-white px-5 text-[13px] font-bold text-ink shadow-sm ring-1 ring-hairline transition-colors hover:bg-sage"
                  >
                    <FlipHorizontal2 size={16} className="text-brand-strong" />
                    {isFlipped ? 'Show Front' : 'Flip for Summary'}
                  </button>

                  <button
                    type="button"
                    onClick={nextCard}
                    className="inline-flex h-[42px] items-center gap-1.5 rounded-full bg-pulse px-4 text-[13px] font-bold text-ink transition-opacity hover:opacity-90"
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Desktop Right Rail */}
        <DesktopRightRail />
      </div>
    </section>
  )
}
