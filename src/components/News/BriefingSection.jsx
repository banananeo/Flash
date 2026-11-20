import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { CATEGORIES, categoryLabel } from '../../data/mockNews'
import { useNewsStore } from '../../store/useNewsStore'
import { useScoreStore } from '../../store/useScoreStore'
import { useF1Store } from '../../store/useF1Store'
import { useReminderStore } from '../../store/useReminderStore'
import { timeAgo } from '../../hooks/useNews'
import bookmarkIcon from '../../assets/icons/bookmark.svg'

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

function BookmarkButton({ article, className = '' }) {
  const saved = useNewsStore((s) => s.saved.some((a) => a.id === article?.id))
  const toggleSave = useNewsStore((s) => s.toggleSave)

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        toggleSave(article)
      }}
      aria-label={saved ? 'Remove from saved' : 'Save story'}
      aria-pressed={saved}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors ${
        saved ? 'bg-pulse' : 'hover:bg-sage'
      } ${className}`}
    >
      <img
        src={bookmarkIcon}
        alt=""
        width={20}
        height={20}
        className={`h-[20px] w-[20px] object-contain ${saved ? 'opacity-100' : 'opacity-70'}`}
      />
    </button>
  )
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
  const status = useNewsStore((s) => s.status)
  const error = useNewsStore((s) => s.error)
  const fetchNews = useNewsStore((s) => s.fetchNews)
  const openReader = useNewsStore((s) => s.openReader)
  const openReminder = useReminderStore((s) => s.openNow)

  useEffect(() => {
    fetchNews(category, searchQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hero = cards?.[0] || null
  const rest = (cards || []).slice(1)

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
                  className={`w-full rounded-[12px] px-4 py-2.5 text-left text-[14px] transition-colors ${
                    active
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

        {/* Center / Mobile Main Briefing Column */}
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
            {formatEditorialDate()}
          </p>
          <h1 className="mt-1.5 text-[34px] font-medium leading-[1.12] tracking-[-0.02em] text-ink lg:text-[40px]">
            Your daily edge.
          </h1>
          <p className="mt-1.5 hidden text-[14px] font-normal text-muted lg:block">
            The stories that matter. Without the noise.
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
                  className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] transition-colors ${
                    active
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

          {status === 'loading' && !cards?.length ? (
            <div className="mt-6 space-y-5">
              <div className="h-[220px] animate-pulse rounded-[18px] bg-sage lg:h-[300px]" />
              <div className="h-8 w-3/4 animate-pulse rounded bg-sage" />
              <div className="h-4 w-full animate-pulse rounded bg-sage" />
            </div>
          ) : (
            <>
              {/* Hero Big Read Card */}
              {hero && (
                <motion.article
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => openReader(hero)}
                  className="group mt-6 cursor-pointer"
                >
                  <div className="relative overflow-hidden rounded-[18px] bg-sage">
                    <img
                      src={hero.image}
                      alt={hero.title}
                      className="h-[220px] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] lg:h-[320px]"
                    />
                    <span className="absolute left-3.5 top-3.5 rounded-full bg-pulse px-3 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-ink">
                      THE BIG READ
                    </span>
                  </div>

                  <h2 className="mt-4 text-[25px] font-semibold leading-[1.22] tracking-[-0.015em] text-ink lg:text-[32px]">
                    {hero.title}
                  </h2>

                  {hero.summary && (
                    <p className="mt-2.5 line-clamp-3 text-[14px] leading-[1.55] text-muted lg:text-[15px]">
                      {hero.summary}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="truncate text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                      {hero.source} · {hero.readTime || '4 MIN READ'}
                    </p>
                    <BookmarkButton article={hero} />
                  </div>
                </motion.article>
              )}

              <div className="my-5 h-px w-full bg-hairline" />

              {/* Compact Editorial Story List (1 col on mobile, 2 cols on desktop) */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
                {rest.map((article) => (
                  <article
                    key={article.id}
                    onClick={() => openReader(article)}
                    className="group flex cursor-pointer items-start gap-3.5"
                  >
                    <img
                      src={article.image}
                      alt=""
                      loading="lazy"
                      className="h-[82px] w-[82px] shrink-0 rounded-[14px] bg-sage object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                          {categoryLabel(article.category)}
                        </p>
                        <BookmarkButton article={article} className="-mt-1 h-7 w-7" />
                      </div>
                      <h3 className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-[1.3] text-ink group-hover:underline">
                        {article.title}
                      </h3>
                      <p className="mt-2 text-[11px] font-medium text-muted">
                        {timeAgo(article.publishedAt)} · {article.readTime || '3 min read'}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Desktop Right Rail */}
        <DesktopRightRail />
      </div>
    </section>
  )
}
