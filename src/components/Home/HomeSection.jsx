import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronRight, RefreshCw } from 'lucide-react'
import {
  useScoreStore,
  isFavMatch,
  pickLiveOrNextForSelections,
} from '../../store/useScoreStore'
import { useF1Store } from '../../store/useF1Store'
import { countdownParts, deriveNextSession } from '../../lib/f1'
import { fetchFootballStandings } from '../../lib/football'
import { safeColor, safeImageUrl } from '../../lib/safeUrl'

const pad2 = (n) => String(n).padStart(2, '0')
const teamColour = (c) => `#${String(c || '64748B').replace(/^#/, '')}`

const COUNTRY_FLAG = {
  Australia: '🇦🇺',
  China: '🇨🇳',
  Japan: '🇯🇵',
  Bahrain: '🇧🇭',
  'Saudi Arabia': '🇸🇦',
  USA: '🇺🇸',
  'United States': '🇺🇸',
  Italy: '🇮🇹',
  Monaco: '🇲🇨',
  Spain: '🇪🇸',
  Canada: '🇨🇦',
  Austria: '🇦🇹',
  UK: '🇬🇧',
  'United Kingdom': '🇬🇧',
  Belgium: '🇧🇪',
  Hungary: '🇭🇺',
  Netherlands: '🇳🇱',
  Azerbaijan: '🇦🇿',
  Singapore: '🇸🇬',
  Mexico: '🇲🇽',
  Brazil: '🇧🇷',
  Qatar: '🇶🇦',
  UAE: '🇦🇪',
}

const STANDINGS_LEAGUES = [
  { id: 'eng.1', label: 'Premier League' },
  { id: 'uefa.champions', label: 'Champions League' },
]

function zoneAccentColor(note) {
  if (!note?.label) return 'transparent'
  const lower = note.label.toLowerCase()
  if (/relegat|eliminat/.test(lower)) return '#E11D48'
  if (/champions league|round of 16/.test(lower)) return '#0D9488'
  if (/europa|seeded/.test(lower) && !/unseeded/.test(lower)) return '#0EA5E9'
  if (/unseeded|conference/.test(lower)) return '#94A3B8'
  return safeColor(note.color, '#94A3B8')
}

function formatTodayHeader() {
  try {
    return new Date()
      .toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
      .toUpperCase()
  } catch {
    return 'TODAY'
  }
}

function Crest({ src, size = 'sm' }) {
  const [failed, setFailed] = useState(false)
  const safeSrc = safeImageUrl(src)
  if (!safeSrc || failed) return null
  const cls = size === 'md' ? 'h-6 w-6' : 'h-4 w-4 sm:h-[18px] sm:w-[18px]'
  return (
    <img
      src={safeSrc}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${cls} shrink-0 object-contain`}
    />
  )
}

function SectionHeading({ title, actionLabel, onAction, secondaryLabel, onSecondary }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-[18px] font-semibold tracking-[-0.015em] text-ink">{title}</h2>
      <div className="flex items-center gap-3.5">
        {secondaryLabel && onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            className="text-[12px] font-semibold text-muted transition-colors hover:text-ink"
          >
            {secondaryLabel}
          </button>
        )}
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-strong transition-colors hover:text-ink"
          >
            <span>{actionLabel}</span>
            <ArrowRight size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

function FeaturedMatchCard({ match, onOpen }) {
  if (!match) return null
  const isLive = match.status === 'live'
  const isScheduled = match.status === 'scheduled'
  const isCricket = match.sport === 'cricket'
  const compLabel = match.leagueName || match.league || (isCricket ? 'Cricket' : 'Football')

  const statusBadge = isLive
    ? isCricket
      ? 'LIVE'
      : `LIVE · ${match.minute || ''}`
    : isScheduled
      ? match.kickoffLabel || match.minute || 'Upcoming'
      : 'Full Time'

  return (
    <div
      onClick={() => onOpen(match)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(match)
        }
      }}
      className="group cursor-pointer rounded-[24px] border border-hairline bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] transition-all hover:border-hairline-soft active:scale-[0.995] sm:p-6"
    >
      {/* Top Meta Row */}
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
          {compLabel}
        </span>

        {isLive ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-live px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            {statusBadge}
          </span>
        ) : isScheduled ? (
          <span className="shrink-0 rounded-full bg-sage-tint px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-brand-strong">
            {statusBadge}
          </span>
        ) : (
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
            {statusBadge}
          </span>
        )}
      </div>

      {/* Scoreboard Body */}
      {isCricket ? (
        <div className="mt-5 space-y-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 flex-1 truncate text-[16px] font-semibold text-ink sm:text-[18px]">
              {match.teamA?.name}
            </span>
            <div className="shrink-0 text-right font-display tabular-nums">
              <span className="text-[24px] font-bold leading-none text-ink sm:text-[28px]">
                {match.teamA?.score || '—'}
              </span>
              {match.teamA?.overs && (
                <span className="ml-1.5 text-[11.5px] font-medium text-muted">
                  ({match.teamA.overs})
                </span>
              )}
            </div>
          </div>

          <div className="h-px bg-hairline/80" />

          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 flex-1 truncate text-[16px] font-semibold text-ink sm:text-[18px]">
              {match.teamB?.name}
            </span>
            <div className="shrink-0 text-right font-display tabular-nums">
              <span className="text-[24px] font-bold leading-none text-ink sm:text-[28px]">
                {match.teamB?.score || '—'}
              </span>
              {match.teamB?.overs && (
                <span className="ml-1.5 text-[11.5px] font-medium text-muted">
                  ({match.teamB.overs})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 text-[12px]">
            <span className="truncate font-medium text-brand-strong">
              {match.meta?.need || match.venue || 'Tap to view scorecard'}
            </span>
            <span className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-muted transition-colors group-hover:text-ink">
              <span>Scorecard</span>
              <ChevronRight size={13} />
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Crest src={match.teamA?.logo} size="md" />
              <span className="min-w-0 break-words text-[15px] font-semibold leading-tight text-ink sm:text-[17px]">
                {match.teamA?.name}
              </span>
            </div>

            <div className="px-2 text-center font-display tabular-nums">
              {isScheduled && match.teamA?.score == null ? (
                <span className="rounded-full bg-sage px-3 py-1 text-[13px] font-bold text-muted">
                  VS
                </span>
              ) : (
                <span className="text-[28px] font-bold leading-none tracking-tight text-ink sm:text-[34px]">
                  {match.teamA?.score ?? 0} : {match.teamB?.score ?? 0}
                </span>
              )}
            </div>

            <div className="flex min-w-0 items-center justify-end gap-2.5 text-right">
              <span className="min-w-0 break-words text-[15px] font-semibold leading-tight text-ink sm:text-[17px]">
                {match.teamB?.name}
              </span>
              <Crest src={match.teamB?.logo} size="md" />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-hairline pt-3.5 text-[12px]">
            <span className="truncate font-medium text-muted">
              {match.venue || (isScheduled ? 'Scheduled fixture' : match.halfLabel || 'Match details')}
            </span>
            <span className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-muted transition-colors group-hover:text-ink">
              <span>Match Centre</span>
              <ChevronRight size={13} />
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function CompactFootballRow({ match, onOpen }) {
  const isLive = match.status === 'live'
  const isScheduled = match.status === 'scheduled'
  const rightLabel = isLive
    ? match.minute || 'LIVE'
    : isScheduled
      ? match.kickoffLabel || match.minute || 'TBD'
      : 'FT'

  return (
    <button
      type="button"
      onClick={() => onOpen(match)}
      className="group flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-sage/40 sm:px-5"
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="truncate text-[10px] font-bold uppercase tracking-[0.07em] text-muted">
          {match.leagueName || match.league}
        </p>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Crest src={match.teamA?.logo} />
            <span className="truncate text-[14px] font-semibold text-ink">
              {match.teamA?.name}
            </span>
          </div>
          {!isScheduled && (
            <span className="shrink-0 font-display text-[14.5px] font-bold tabular-nums text-ink">
              {match.teamA?.score ?? 0}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Crest src={match.teamB?.logo} />
            <span className="truncate text-[14px] font-semibold text-ink">
              {match.teamB?.name}
            </span>
          </div>
          {!isScheduled && (
            <span className="shrink-0 font-display text-[14.5px] font-bold tabular-nums text-ink">
              {match.teamB?.score ?? 0}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 pl-2">
        {isLive ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-live px-2 py-0.5 font-display text-[10.5px] font-bold tabular-nums text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            {rightLabel}
          </span>
        ) : (
          <span className="max-w-[116px] truncate text-right font-display text-[11.5px] font-medium tabular-nums text-muted">
            {rightLabel}
          </span>
        )}
        <ChevronRight
          size={14}
          className="text-muted/60 transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
        />
      </div>
    </button>
  )
}

function CompactCricketRow({ match, onOpen }) {
  const isLive = match.status === 'live'
  const isScheduled = match.status === 'scheduled'
  const note = isLive
    ? match.meta?.need || 'Live'
    : isScheduled
      ? match.kickoffLabel || 'Upcoming'
      : match.meta?.need || 'Completed'

  return (
    <button
      type="button"
      onClick={() => onOpen(match)}
      className="group flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-sage/40 sm:px-5"
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="truncate text-[10px] font-bold uppercase tracking-[0.07em] text-muted">
            {match.league || match.leagueName}
          </span>
          {isLive && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-live px-2 py-0.2 text-[9.5px] font-bold uppercase text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              Live
            </span>
          )}
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-[14px] font-semibold text-ink">{match.teamA?.name}</span>
          <span className="shrink-0 font-display text-[13.5px] font-bold tabular-nums text-ink">
            {match.teamA?.score || '—'}
            {match.teamA?.overs && (
              <span className="ml-1 font-sans text-[11px] font-medium text-muted">
                ({match.teamA.overs})
              </span>
            )}
          </span>
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-[14px] font-semibold text-ink">{match.teamB?.name}</span>
          <span className="shrink-0 font-display text-[13.5px] font-bold tabular-nums text-ink">
            {match.teamB?.score || '—'}
            {match.teamB?.overs && (
              <span className="ml-1 font-sans text-[11px] font-medium text-muted">
                ({match.teamB.overs})
              </span>
            )}
          </span>
        </div>

        {note && (
          <p className="truncate text-[11.5px] font-medium text-brand-strong">{note}</p>
        )}
      </div>

      <ChevronRight
        size={14}
        className="shrink-0 text-muted/60 transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
      />
    </button>
  )
}

export default function HomeSection() {
  const football = useScoreStore((s) => s.football)
  const cricket = useScoreStore((s) => s.cricket)
  const favTeams = useScoreStore((s) => s.favTeams)
  const favLeagues = useScoreStore((s) => s.favLeagues)
  const openMatch = useScoreStore((s) => s.openMatch)
  const openScoresTab = useScoreStore((s) => s.openScoresTab)
  const setView = useScoreStore((s) => s.setView)
  const fetchBoth = useScoreStore((s) => s.fetchBoth)

  const driverStandings = useF1Store((s) => s.driverStandings)
  const schedule = useF1Store((s) => s.schedule)
  const nextRace = useF1Store((s) => s.nextRace)
  const fetchF1 = useF1Store((s) => s.fetchF1)
  const fetchSchedule = useF1Store((s) => s.fetchSchedule)

  const [nowMs, setNowMs] = useState(() => Date.now())
  const [tableLeague, setTableLeague] = useState('eng.1')
  const [tables, setTables] = useState({})
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return
      setNowMs(Date.now())
    }
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    let alive = true
    fetchFootballStandings(tableLeague)
      .then((d) => {
        if (alive) setTables((prev) => ({ ...prev, [tableLeague]: d }))
      })
      .catch(() => {
        /* non-blocking on overview */
      })
    return () => {
      alive = false
    }
  }, [tableLeague])

  const allPool = useMemo(
    () => [...(football || []), ...(cricket || [])],
    [football, cricket],
  )

  const liveCount = useMemo(
    () => allPool.filter((m) => m.status === 'live').length,
    [allPool],
  )

  const featuredMatch = useMemo(() => {
    return (
      allPool.find((m) => m.status === 'live' && isFavMatch(m, favTeams)) ||
      (football || []).find((m) => m.status === 'live') ||
      (cricket || []).find((m) => m.status === 'live') ||
      allPool.find((m) => m.status === 'scheduled' && isFavMatch(m, favTeams)) ||
      (football || []).find((m) => m.status === 'scheduled') ||
      (cricket || []).find((m) => m.status === 'scheduled') ||
      allPool[0] ||
      null
    )
  }, [allPool, football, cricket, favTeams])

  const topFootball = useMemo(() => {
    return (football || [])
      .filter((m) => m.id !== featuredMatch?.id)
      .slice(0, 4)
  }, [football, featuredMatch?.id])

  const topCricket = useMemo(() => {
    return (cricket || [])
      .filter((m) => m.id !== featuredMatch?.id)
      .slice(0, 3)
  }, [cricket, featuredMatch?.id])

  const followedItems = useMemo(() => {
    if (!(favTeams?.length || 0) && !(favLeagues?.length || 0)) return []
    return pickLiveOrNextForSelections(allPool, favTeams, favLeagues)
      .filter((m) => m.id !== featuredMatch?.id)
      .slice(0, 3)
  }, [allPool, favTeams, favLeagues, featuredMatch?.id])

  const nextSession = deriveNextSession(schedule, nowMs)
  const countdown = nextSession ? countdownParts(nextSession.dateUTC.getTime(), nowMs) : null
  const f1DriversTop5 = useMemo(
    () => [...(driverStandings || [])].sort((a, b) => a.pos - b.pos).slice(0, 5),
    [driverStandings],
  )
  const f1Flag = COUNTRY_FLAG[nextRace?.country] || ''

  const currentTable = tables[tableLeague] || null
  const tableRowsTop5 = (currentTable?.rows || []).slice(0, 5)

  const handleRefreshAll = async () => {
    setSyncing(true)
    try {
      const freshTable = await Promise.allSettled([
        fetchBoth(),
        fetchF1(),
        fetchSchedule(),
        fetchFootballStandings(tableLeague, { force: true }),
      ])
      const stRes = freshTable[3]
      if (stRes?.status === 'fulfilled' && stRes.value) {
        setTables((prev) => ({ ...prev, [tableLeague]: stRes.value }))
      }
    } finally {
      setSyncing(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-[480px] px-6 pb-28 pt-2 sm:max-w-[640px] lg:max-w-[1120px] lg:px-10 lg:pb-16 lg:pt-8">
      {/* Page Header */}
      <div className="mt-1.5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">
            {formatTodayHeader()}
          </p>
          <h1 className="mt-1 text-[32px] font-medium leading-[1.08] tracking-[-0.025em] text-ink sm:text-[36px]">
            Overview
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {liveCount > 0 && (
            <button
              type="button"
              onClick={() => openScoresTab({ sport: 'football' })}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-live/10 px-3 text-[11px] font-bold uppercase tracking-[0.06em] text-live transition-colors hover:bg-live/15"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-live" />
              <span>{liveCount} Live</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={syncing}
            title="Refresh overview"
            aria-label="Refresh overview"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-hairline bg-white text-muted transition-colors hover:bg-sage hover:text-ink disabled:opacity-50"
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin text-brand-strong' : ''} />
          </button>
        </div>
      </div>

      {/* Balanced 12-Column Responsive Layout */}
      <div className="mt-6 grid grid-cols-1 gap-7 lg:grid-cols-12 lg:items-start lg:gap-8">
        {/* ==================== PRIMARY COLUMN (LIVE & FIXTURES) ==================== */}
        <div className="space-y-7 lg:col-span-7">
          {featuredMatch && (
            <div>
              <SectionHeading
                title={featuredMatch.status === 'live' ? 'Live Match' : 'Featured Match'}
                actionLabel="Live Scores"
                onAction={() => openScoresTab({ sport: featuredMatch.sport || 'football' })}
              />
              <FeaturedMatchCard match={featuredMatch} onOpen={openMatch} />
            </div>
          )}

          {/* Football Fixtures */}
          {topFootball.length > 0 && (
            <div>
              <SectionHeading
                title="Football"
                secondaryLabel="Standings"
                onSecondary={() =>
                  openScoresTab({ sport: 'football', footballMode: 'standings' })
                }
                actionLabel="All matches"
                onAction={() => openScoresTab({ sport: 'football', footballMode: 'live' })}
              />
              <div className="divide-y divide-hairline/70 overflow-hidden rounded-[22px] border border-hairline bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
                {topFootball.map((m) => (
                  <CompactFootballRow key={m.id} match={m} onOpen={openMatch} />
                ))}
              </div>
            </div>
          )}

          {/* Cricket Fixtures */}
          {topCricket.length > 0 && (
            <div>
              <SectionHeading
                title="Cricket"
                secondaryLabel="IPL Hub"
                onSecondary={() => openScoresTab({ sport: 'cricket', cricketMode: 'ipl' })}
                actionLabel="All matches"
                onAction={() => openScoresTab({ sport: 'cricket', cricketMode: 'live' })}
              />
              <div className="divide-y divide-hairline/70 overflow-hidden rounded-[22px] border border-hairline bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
                {topCricket.map((m) => (
                  <CompactCricketRow key={m.id} match={m} onOpen={openMatch} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ==================== SECONDARY COLUMN (F1 & STANDINGS) ==================== */}
        <div className="space-y-7 lg:col-span-5">
          {/* Followed Teams & Leagues (only shown when user has active picks) */}
          {followedItems.length > 0 && (
            <div>
              <SectionHeading
                title="Following"
                actionLabel="Manage"
                onAction={() => openScoresTab({ sport: 'following' })}
              />
              <div className="divide-y divide-hairline/70 overflow-hidden rounded-[22px] border border-hairline bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
                {followedItems.map((m) =>
                  m.sport === 'cricket' ? (
                    <CompactCricketRow key={m.id} match={m} onOpen={openMatch} />
                  ) : (
                    <CompactFootballRow key={m.id} match={m} onOpen={openMatch} />
                  ),
                )}
              </div>
            </div>
          )}

          {/* Formula 1 Card: Next Grand Prix + Top 5 Drivers */}
          <div>
            <SectionHeading
              title="Formula 1"
              actionLabel="Open F1"
              onAction={() => setView('f1')}
            />
            <div className="overflow-hidden rounded-[22px] border border-hairline bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
              {/* Next GP Block */}
              {nextRace || nextSession ? (
                <button
                  type="button"
                  onClick={() => setView('f1')}
                  className="group block w-full text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-brand-strong">
                      <span className="h-1.5 w-1.5 rounded-full bg-pulse" />
                      {nextRace ? `Next Grand Prix · R${nextRace.round}` : 'Next Session'}
                    </span>
                    {countdown && (
                      <span className="font-display text-[12px] font-bold tabular-nums text-ink">
                        {countdown.d > 0 ? `${pad2(countdown.d)}d ` : ''}
                        {pad2(countdown.h)}h {pad2(countdown.m)}m {pad2(countdown.s)}s
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-[18px] font-semibold leading-snug tracking-[-0.015em] text-ink transition-colors group-hover:text-brand-strong">
                    {f1Flag && <span className="mr-1.5">{f1Flag}</span>}
                    {nextRace?.name || nextSession?.raceName}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] font-medium text-muted">
                    {[
                      nextSession?.label,
                      nextRace?.circuit || nextRace?.locality,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </button>
              ) : (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
                    Formula 1 Championship
                  </p>
                  <p className="mt-1 text-[16px] font-semibold text-ink">Season Standings</p>
                </div>
              )}

              {/* Drivers Championship Top 5 */}
              {f1DriversTop5.length > 0 && (
                <div className="mt-4 border-t border-hairline pt-4">
                  <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                    <span>Drivers Standings</span>
                    <span>Pts</span>
                  </div>
                  <div className="divide-y divide-hairline/60">
                    {f1DriversTop5.map((d, i) => (
                      <button
                        key={d.num || d.acro || i}
                        type="button"
                        onClick={() => setView('f1')}
                        className="flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-sage/35"
                      >
                        <span
                          className={`w-5 shrink-0 font-display text-[12px] tabular-nums ${
                            i === 0 ? 'font-bold text-brand-strong' : 'font-medium text-muted'
                          }`}
                        >
                          {pad2(d.pos)}
                        </span>
                        <span
                          className="h-5 w-[3px] shrink-0 rounded-full"
                          style={{ backgroundColor: teamColour(d.colour) }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-semibold leading-tight text-ink">
                            {d.name}
                          </p>
                          <p className="truncate text-[11px] font-medium text-muted">{d.team}</p>
                        </div>
                        <span className="shrink-0 font-display text-[14px] font-bold tabular-nums text-ink">
                          {d.points}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Football Standings Snapshot: Premier League | Champions League */}
          <div>
            <SectionHeading
              title="Football Standings"
              actionLabel="Full table"
              onAction={() =>
                openScoresTab({
                  sport: 'football',
                  footballMode: 'standings',
                  standingsLeague: tableLeague,
                })
              }
            />
            <div className="overflow-hidden rounded-[22px] border border-hairline bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
              <div className="flex items-center gap-5 border-b border-hairline">
                {STANDINGS_LEAGUES.map((lg) => {
                  const active = tableLeague === lg.id
                  return (
                    <button
                      key={lg.id}
                      type="button"
                      onClick={() => setTableLeague(lg.id)}
                      className={`relative pb-2.5 text-[13px] transition-colors ${
                        active ? 'font-bold text-ink' : 'font-medium text-muted hover:text-ink'
                      }`}
                    >
                      {lg.label}
                      {active && (
                        <motion.span
                          layoutId="home-standings-underline"
                          transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                          className="absolute bottom-0 left-0 right-0 h-[2px] bg-pulse"
                        />
                      )}
                    </button>
                  )
                })}
              </div>

              {tableRowsTop5.length > 0 ? (
                <div className="mt-2.5">
                  <div className="grid grid-cols-[24px_minmax(0,1fr)_26px_32px_32px] items-center gap-1 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.07em] text-muted">
                    <span className="pl-1.5">#</span>
                    <span>Club</span>
                    <span className="text-right">P</span>
                    <span className="text-right">GD</span>
                    <span className="text-right">Pts</span>
                  </div>
                  <div className="divide-y divide-hairline/60">
                    {tableRowsTop5.map((row) => (
                      <button
                        key={row.teamId || row.rank}
                        type="button"
                        onClick={() =>
                          openScoresTab({
                            sport: 'football',
                            footballMode: 'standings',
                            standingsLeague: tableLeague,
                          })
                        }
                        className="grid w-full grid-cols-[24px_minmax(0,1fr)_26px_32px_32px] items-center gap-1 py-2.5 text-left text-[13px] transition-colors hover:bg-sage/35"
                      >
                        <div className="flex items-center gap-1">
                          <span
                            className="h-4 w-[2.5px] shrink-0 rounded-full"
                            style={{ backgroundColor: zoneAccentColor(row.note) }}
                          />
                          <span className="font-display text-[11.5px] font-bold tabular-nums text-muted">
                            {row.rank}
                          </span>
                        </div>

                        <div className="flex min-w-0 items-center gap-2 pr-1">
                          <Crest src={row.logo} />
                          <span className="truncate font-semibold text-ink">{row.name}</span>
                        </div>

                        <span className="text-right font-display text-[12px] tabular-nums text-muted">
                          {row.played}
                        </span>
                        <span className="text-right font-display text-[12px] font-medium tabular-nums text-muted">
                          {row.gd}
                        </span>
                        <span className="text-right font-display text-[13.5px] font-bold tabular-nums text-ink">
                          {row.points}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <div key={idx} className="h-8 animate-pulse rounded-[8px] bg-sage/75" />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
