import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import MatchCard from './MatchCard'
import ScorePreferencesBar from './ScorePreferencesBar'
import { fetchCricketDetail } from '../../lib/cricket'
import {
  useScoreStore,
  isFavMatch,
  isFavLeagueMatch,
  pickLiveOrNextForSelections,
  teamMatchesName,
  todayISO,
  shiftISO,
} from '../../store/useScoreStore'

const SPORT_TABS = [
  { id: 'football', label: 'Football' },
  { id: 'cricket', label: 'Cricket' },
  { id: 'following', label: 'Following' },
]

function formatPillDate(isoStr) {
  const [y, m, d] = String(isoStr).split('-').map(Number)
  const dt = new Date(y, (m || 1) - 1, d || 1)
  const dd = String(dt.getDate()).padStart(2, '0')
  const mon = dt.toLocaleDateString('en-GB', { month: 'short' })
  const wk = dt.toLocaleDateString('en-GB', { weekday: 'short' })
  if (isoStr === todayISO()) return `Today, ${dd} ${mon}`
  return `${wk} ${dd}`
}

function FootballHeroCard({ match, onOpen, isFav, onToggleFav, onRefresh, isRefreshing }) {
  if (!match) return null
  const isLive = match.status === 'live'
  const isScheduled = match.status === 'scheduled'
  const homeScorers = (match.teamA?.scorers || []).join(', ')
  const awayScorers = (match.teamB?.scorers || []).join(', ')
  const badgeLabel = isLive
    ? 'LIVE'
    : isScheduled
      ? `NEXT MATCH · ${match.kickoffLabel || match.minute}`
      : match.minute

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onOpen(match)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(match)
        }
      }}
      className="cursor-pointer rounded-[22px] border border-hairline bg-white p-5 text-ink shadow-sm transition-transform active:scale-[0.99]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
          {match.leagueName || match.league}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {isLive ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-live px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              LIVE
            </span>
          ) : isScheduled ? (
            <span className="rounded-full bg-sage-leader px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-brand-strong">
              {badgeLabel}
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
              {badgeLabel}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRefresh?.(match)
            }}
            disabled={isRefreshing}
            title="Refresh match score"
            aria-label="Refresh match score"
            className="grid h-7 w-7 place-items-center rounded-full bg-sage text-muted transition-colors hover:bg-hairline hover:text-ink disabled:opacity-60"
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin text-brand-strong' : ''} />
          </button>
          {onToggleFav && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleFav()
              }}
              aria-label={isFav ? 'Unfollow team' : 'Follow team'}
              className={`text-[15px] leading-none ${isFav ? 'text-ink' : 'text-hairline hover:text-muted'}`}
            >
              ★
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <span className="min-w-0 flex-1 break-words text-[14px] font-medium leading-tight text-ink sm:text-[17px]">
          {match.teamA?.name}
        </span>
        <span className="shrink-0 whitespace-nowrap font-display text-[30px] font-bold leading-none tracking-tight text-ink sm:text-[36px]">
          {match.teamA?.score ?? '–'} : {match.teamB?.score ?? '–'}
        </span>
        <span className="min-w-0 flex-1 break-words text-right text-[14px] font-medium leading-tight text-ink sm:text-[17px]">
          {match.teamB?.name}
        </span>
      </div>

      <p className="mt-2.5 text-center text-[13px] font-bold text-brand-strong">
        {isScheduled ? match.kickoffLabel || match.minute : match.minute}
      </p>

      <div className="mt-4 h-[2px] w-full overflow-hidden rounded-full bg-sage">
        <div
          className="h-full rounded-full bg-pulse transition-all"
          style={{ width: `${match.progressPct || (isLive ? 55 : match.status === 'ft' ? 100 : 0)}%` }}
        />
      </div>

      {(homeScorers || awayScorers) && (
        <div className="mt-4 flex items-start justify-between gap-4 text-[11px] font-medium text-muted">
          <span className="min-w-0 flex-1 truncate">{homeScorers}</span>
          <span className="min-w-0 flex-1 truncate text-right">{awayScorers}</span>
        </div>
      )}
    </motion.div>
  )
}

function CricketHeroCard({ match, onOpen, isFav, onToggleFav, onRefresh, isRefreshing }) {
  if (!match) return null
  const isLive = match.status === 'live'
  const isScheduled = match.status === 'scheduled'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onOpen(match)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(match)
        }
      }}
      className="cursor-pointer rounded-[22px] border border-hairline bg-white p-5 text-ink shadow-sm transition-transform active:scale-[0.99]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
          {match.league || match.leagueName}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {isLive ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-live px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              LIVE
            </span>
          ) : isScheduled ? (
            <span className="rounded-full bg-sage-leader px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-brand-strong">
              NEXT MATCH{match.kickoffLabel ? ` · ${match.kickoffLabel}` : ''}
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
              FT
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRefresh?.(match)
            }}
            disabled={isRefreshing}
            title="Refresh match score"
            aria-label="Refresh match score"
            className="grid h-7 w-7 place-items-center rounded-full bg-sage text-muted transition-colors hover:bg-hairline hover:text-ink disabled:opacity-60"
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin text-brand-strong' : ''} />
          </button>
          {onToggleFav && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleFav()
              }}
              aria-label={isFav ? 'Unfollow team' : 'Follow team'}
              className={`text-[15px] leading-none ${isFav ? 'text-ink' : 'text-hairline hover:text-muted'}`}
            >
              ★
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-baseline justify-between gap-3">
        <span className="min-w-0 flex-1 break-words text-[16px] font-semibold leading-tight text-ink sm:text-[19px]">
          {match.teamA?.name}
        </span>
        <div className="shrink-0 text-right">
          <p className="font-display text-[28px] font-bold leading-none text-ink sm:text-[32px]">
            {match.teamA?.score}
          </p>
          {match.teamA?.overs && (
            <p className="mt-1 text-[11px] font-medium text-muted">
              {match.teamA.overs}
            </p>
          )}
        </div>
      </div>

      <div className="my-4 h-px w-full bg-hairline" />

      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 flex-1 break-words text-[16px] font-semibold leading-tight text-ink sm:text-[19px]">
          {match.teamB?.name}
        </span>
        <div className="shrink-0 text-right">
          <p className="font-display text-[28px] font-bold leading-none text-ink sm:text-[32px]">
            {match.teamB?.score}
          </p>
          {match.teamB?.overs && (
            <p className="mt-1 text-[11px] font-medium text-muted">
              {match.teamB.overs}
            </p>
          )}
        </div>
      </div>

      {match.meta?.need && (
        <p className="mt-5 text-[12px] font-semibold text-brand-strong">
          {match.meta.need}
        </p>
      )}
    </motion.div>
  )
}

function AtTheCreaseCard({ match, detail }) {
  const batters = detail?.batters?.length ? detail.batters : match?.batters || []
  const crr = detail?.meta?.crr || match?.meta?.crr || ''
  if (!batters.length && !crr) return null

  return (
    <div className="mt-6">
      <h2 className="text-[20px] font-semibold text-ink">At the crease</h2>
      <div className="mt-3 rounded-[16px] bg-white p-4">
        <div className="grid grid-cols-[1fr_32px_32px_28px_28px] items-center gap-1 text-[10px] font-bold uppercase tracking-[0.06em] text-muted">
          <span>BATTER</span>
          <span className="text-right">R</span>
          <span className="text-right">B</span>
          <span className="text-right">4s</span>
          <span className="text-right">6s</span>
        </div>

        <div className="mt-3 space-y-3">
          {batters.map((b, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_32px_32px_28px_28px] items-center gap-1 text-[14px]"
            >
              <span className="truncate font-semibold text-ink">
                {b.name}
                {i === 0 ? ' *' : ''}
              </span>
              <span className="text-right font-display font-bold text-ink">{b.runs}</span>
              <span className="text-right font-medium text-muted">{b.balls}</span>
              <span className="text-right font-medium text-muted">{b.fours ?? 0}</span>
              <span className="text-right font-medium text-muted">{b.sixes ?? 0}</span>
            </div>
          ))}
        </div>

        {crr && (
          <p className="mt-4 border-t border-hairline pt-3 text-[12px] font-medium text-muted">
            Current run rate  <span className="font-bold text-ink">{crr}</span>
          </p>
        )}
      </div>
    </div>
  )
}

// 05 · Live scores (Football) & 12 · Live cricket + Following (Leagues & Teams Live / Next Match)
export default function LiveScoresSection() {
  const sport = useScoreStore((s) => s.sport)
  const setSport = useScoreStore((s) => s.setSport)
  const selectedDate = useScoreStore((s) => s.selectedDate)
  const setSelectedDate = useScoreStore((s) => s.setSelectedDate)
  const activeLeague = useScoreStore((s) => s.activeLeague)
  const setActiveLeague = useScoreStore((s) => s.setActiveLeague)
  const football = useScoreStore((s) => s.football)
  const cricket = useScoreStore((s) => s.cricket)
  const status = useScoreStore((s) => s.status)
  const error = useScoreStore((s) => s.error)
  const fetchScores = useScoreStore((s) => s.fetchScores)
  const openMatch = useScoreStore((s) => s.openMatch)
  const favTeams = useScoreStore((s) => s.favTeams)
  const favLeagues = useScoreStore((s) => s.favLeagues)
  const toggleFav = useScoreStore((s) => s.toggleFav)
  const refreshMatch = useScoreStore((s) => s.refreshMatch)
  const refreshingMatches = useScoreStore((s) => s.refreshingMatches)
  const refreshTick = useScoreStore((s) => s.refreshTick)

  const [featuredDetailState, setFeaturedDetailState] = useState({ key: null, data: null })

  useEffect(() => {
    fetchScores(sport, selectedDate)
    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return
      fetchScores(sport, selectedDate)
    }
    const onVis = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchScores(sport, selectedDate)
      }
    }
    const t = setInterval(tick, 60000)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVis)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport, selectedDate])

  const sportPool = useMemo(() => {
    if (sport === 'football') return football || []
    if (sport === 'cricket') return cricket || []
    return [...(football || []), ...(cricket || [])]
  }, [sport, football, cricket])

  // "Your Chosen Leagues & Teams — Live & Next Match" spotlight cards
  const personalLiveOrNext = useMemo(
    () => pickLiveOrNextForSelections(sportPool, favTeams, favLeagues),
    [sportPool, favTeams, favLeagues],
  )

  // Main matches list for current tab & league filter
  const { allMatches, isShowingUpcomingLookahead } = useMemo(() => {
    if (sport === 'following') {
      return { allMatches: personalLiveOrNext, isShowingUpcomingLookahead: true }
    }

    let pool = sportPool
    if (activeLeague && activeLeague !== 'all') {
      pool = pool.filter((m) => isFavLeagueMatch(m, [activeLeague]))
    }

    // If viewing today without a specific league filter, prefer today's/live matches first;
    // if a chosen league has no match today, automatically surface its upcoming next matches!
    if (selectedDate === todayISO()) {
      const todayOrLive = pool.filter(
        (m) => m.status === 'live' || !m.dateISO || m.dateISO === todayISO(),
      )
      if (todayOrLive.length > 0 && activeLeague === 'all') {
        return { allMatches: todayOrLive, isShowingUpcomingLookahead: false }
      }
      return {
        allMatches: pool,
        isShowingUpcomingLookahead: todayOrLive.length === 0 && pool.length > 0,
      }
    }

    return { allMatches: pool, isShowingUpcomingLookahead: false }
  }, [sport, sportPool, activeLeague, selectedDate, personalLiveOrNext])

  const featured =
    allMatches.find((m) => m.status === 'live' && isFavMatch(m, favTeams)) ||
    allMatches.find((m) => m.status === 'live') ||
    allMatches.find((m) => isFavMatch(m, favTeams)) ||
    allMatches[0] ||
    null

  const remaining = featured ? allMatches.filter((m) => m.id !== featured.id) : []
  const liveCount = allMatches.filter((m) => m.status === 'live').length

  // Load live "At the crease" batters for featured cricket match
  const featuredCricketKey =
    featured?.sport === 'cricket' && featured?.rawId
      ? `${featured.rawId}:${featured.seriesId || ''}`
      : null

  useEffect(() => {
    if (!featuredCricketKey || !featured?.rawId) return undefined
    let alive = true
    fetchCricketDetail(featured.rawId, featured.seriesId, { force: refreshTick > 0 })
      .then((d) => {
        if (alive) setFeaturedDetailState({ key: featuredCricketKey, data: d })
      })
      .catch(() => {
        if (alive) setFeaturedDetailState({ key: featuredCricketKey, data: null })
      })
    return () => {
      alive = false
    }
  }, [featuredCricketKey, featured?.rawId, featured?.seriesId, refreshTick])

  const featuredCricketDetail =
    featuredCricketKey && featuredDetailState.key === featuredCricketKey
      ? featuredDetailState.data
      : null

  const prevDate = shiftISO(selectedDate, -1)
  const nextDate = shiftISO(selectedDate, 1)

  const toggleMatchFav = (m) => {
    const aFav = (favTeams || []).some((t) => teamMatchesName(m?.teamA?.name, t))
    const bFav = (favTeams || []).some((t) => teamMatchesName(m?.teamB?.name, t))
    if (aFav) toggleFav(m.teamA.name)
    else if (bFav) toggleFav(m.teamB.name)
    else toggleFav(m?.teamA?.name)
  }

  const hasSelections = (favTeams?.length || 0) + (favLeagues?.length || 0) > 0

  return (
    <section className="mx-auto w-full max-w-[460px] px-6 pb-28 pt-2 lg:max-w-[780px] lg:pt-8">

      <h1 className="mt-1.5 text-[34px] font-medium leading-[1.12] tracking-[-0.02em] text-ink">
        Live Scores
      </h1>

      {/* Sport Pills: Football | Cricket | Following */}
      <div className="mt-5 flex items-center gap-2">
        {SPORT_TABS.map((t) => {
          const active = sport === t.id
          const countBadge =
            t.id === 'following' && hasSelections
              ? (favTeams?.length || 0) + (favLeagues?.length || 0)
              : 0
          return (
            <button
              key={t.id}
              onClick={() => setSport(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] transition-colors ${active ? 'bg-pulse font-semibold text-ink' : 'bg-sage font-medium text-muted hover:text-ink'
                }`}
            >
              <span>{t.label}</span>
              {countBadge > 0 && (
                <span className="rounded-full bg-white/80 px-1.5 py-0.2 text-[10px] font-bold text-ink">
                  {countBadge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* League Pills & "Choose Leagues & Teams" Picker */}
      <ScorePreferencesBar defaultOpen={sport === 'following' && !hasSelections} />

      {/* Date Switcher */}
      <div className="mt-5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setSelectedDate(prevDate)}
          aria-label="Previous day"
          className="px-2 text-[22px] leading-none text-muted transition-colors hover:text-ink"
        >
          ‹
        </button>

        <button
          type="button"
          onClick={() => setSelectedDate(prevDate)}
          className="text-[12px] font-medium text-muted transition-colors hover:text-ink"
        >
          {formatPillDate(prevDate)}
        </button>

        <span className="rounded-full bg-pulse px-4 py-2 text-[12px] font-bold text-ink">
          {formatPillDate(selectedDate)}
        </span>

        <button
          type="button"
          onClick={() => setSelectedDate(nextDate)}
          className="text-[12px] font-medium text-muted transition-colors hover:text-ink"
        >
          {formatPillDate(nextDate)}
        </button>

        <button
          type="button"
          onClick={() => setSelectedDate(nextDate)}
          aria-label="Next day"
          className="px-2 text-[22px] leading-none text-muted transition-colors hover:text-ink"
        >
          ›
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-[14px] bg-sage px-4 py-2.5 text-[12px] font-medium text-ink">
          <span className="truncate">{error}</span>
          <button
            onClick={() => fetchScores(sport, selectedDate)}
            className="shrink-0 font-bold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Dedicated Spotlight: Your Chosen Leagues & Teams (Live Score or Next Match) */}
      {sport !== 'following' && activeLeague === 'all' && personalLiveOrNext.length > 0 && (
        <div className="mt-6 rounded-[20px] bg-sage/80 p-4 sm:p-5">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-strong">
                YOUR LEAGUES & TEAMS
              </p>
              <h2 className="text-[18px] font-semibold text-ink">
                Live scores & next matches
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSport('following')}
              className="text-[12px] font-semibold text-brand-strong hover:underline"
            >
              View all ({personalLiveOrNext.length}) →
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {personalLiveOrNext.slice(0, 4).map((m) => (
              <MatchCard
                key={`pick-${m.id}`}
                match={m}
                showLeagueBadge
                isFav={isFavMatch(m, favTeams)}
                onToggleFav={() => toggleMatchFav(m)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="mt-5">
        {status === 'loading' && !allMatches.length ? (
          <div className="space-y-4">
            <div className="h-[220px] animate-pulse rounded-[22px] bg-sage" />
            <div className="h-[96px] animate-pulse rounded-[16px] bg-white" />
            <div className="h-[96px] animate-pulse rounded-[16px] bg-white" />
          </div>
        ) : sport === 'following' && !allMatches.length ? (
          <div className="rounded-[20px] bg-white p-8 text-center">
            <p className="text-[18px] font-semibold text-ink">
              {hasSelections
                ? 'No live or upcoming fixtures found for your picks.'
                : 'Choose your favourite leagues & teams above.'}
            </p>
            <p className="mt-1.5 text-[13px] text-muted">
              Pick any league or team in the selector above (or tap ★ on any match) to track their live score and next match here.
            </p>
            <button
              type="button"
              onClick={() => setSport('football')}
              className="mt-5 rounded-full bg-pulse px-5 py-2.5 text-[13px] font-bold text-ink"
            >
              Browse all fixtures
            </button>
          </div>
        ) : !allMatches.length ? (
          <div className="rounded-[20px] bg-white p-8 text-center">
            <p className="text-[17px] font-semibold text-ink">
              No fixtures listed for {activeLeague !== 'all' ? activeLeague : 'this date'}.
            </p>
            <p className="mt-1 text-[13px] text-muted">
              {activeLeague !== 'all'
                ? 'Try switching back to All Leagues or another day.'
                : 'Try switching to an adjacent day above.'}
            </p>
            {activeLeague !== 'all' && (
              <button
                type="button"
                onClick={() => setActiveLeague('all')}
                className="mt-4 rounded-full bg-pulse px-4 py-2 text-[12px] font-bold text-ink"
              >
                Show all leagues
              </button>
            )}
          </div>
        ) : (
          <>
            {isShowingUpcomingLookahead && (
              <div className="mb-3 rounded-[14px] bg-sage-leader/70 px-4 py-2 text-[12px] font-semibold text-brand-strong">
                No match today for {activeLeague !== 'all' ? activeLeague : 'your selection'} — showing next upcoming fixtures.
              </div>
            )}

            {/* Featured Hero Card */}
            {featured?.sport === 'cricket' ? (
              <>
                <CricketHeroCard
                  match={featured}
                  onOpen={openMatch}
                  isFav={isFavMatch(featured, favTeams)}
                  onToggleFav={() => toggleMatchFav(featured)}
                  onRefresh={refreshMatch}
                  isRefreshing={Boolean(refreshingMatches?.[featured.id])}
                />
                <AtTheCreaseCard match={featured} detail={featuredCricketDetail} />
              </>
            ) : (
              <FootballHeroCard
                match={featured}
                onOpen={openMatch}
                isFav={isFavMatch(featured, favTeams)}
                onToggleFav={() => toggleMatchFav(featured)}
                onRefresh={refreshMatch}
                isRefreshing={Boolean(refreshingMatches?.[featured?.id])}
              />
            )}

            {/* Remaining Fixtures ("Around the grounds") */}
            {remaining.length > 0 && (
              <div className="mt-7">
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="text-[20px] font-semibold text-ink">
                    {sport === 'following'
                      ? 'Your live & upcoming schedule'
                      : activeLeague !== 'all'
                        ? activeLeague
                        : 'Around the grounds'}
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                    {liveCount > 0 ? `${liveCount} LIVE` : `${remaining.length} MATCHES`}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {remaining.map((m) => (
                    <MatchCard
                      key={m.id}
                      match={m}
                      showLeagueBadge={sport === 'following' || activeLeague === 'all'}
                      isFav={isFavMatch(m, favTeams)}
                      onToggleFav={() => toggleMatchFav(m)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
