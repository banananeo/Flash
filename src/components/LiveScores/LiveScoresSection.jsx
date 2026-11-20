import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import MatchCard from './MatchCard'
import { fetchCricketDetail } from '../../lib/cricket'
import {
  useScoreStore,
  isFavMatch,
  normalizeTeam,
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

function FootballHeroCard({ match, onOpen }) {
  if (!match) return null
  const isLive = match.status === 'live'
  const homeScorers = (match.teamA?.scorers || []).join(', ')
  const awayScorers = (match.teamB?.scorers || []).join(', ')

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
        {isLive ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-live px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            LIVE
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
            {match.minute}
          </span>
        )}
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
        {match.minute}
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

function CricketHeroCard({ match, onOpen }) {
  if (!match) return null
  const isLive = match.status === 'live'

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
        {isLive ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-live px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            LIVE
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
            {match.status === 'scheduled' ? 'SCHED' : 'FT'}
          </span>
        )}
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

// 05 · Live scores (Football) & 12 · Live cricket + Following
export default function LiveScoresSection() {
  const sport = useScoreStore((s) => s.sport)
  const setSport = useScoreStore((s) => s.setSport)
  const selectedDate = useScoreStore((s) => s.selectedDate)
  const setSelectedDate = useScoreStore((s) => s.setSelectedDate)
  const football = useScoreStore((s) => s.football)
  const cricket = useScoreStore((s) => s.cricket)
  const status = useScoreStore((s) => s.status)
  const error = useScoreStore((s) => s.error)
  const fetchScores = useScoreStore((s) => s.fetchScores)
  const openMatch = useScoreStore((s) => s.openMatch)
  const favTeams = useScoreStore((s) => s.favTeams)
  const toggleFav = useScoreStore((s) => s.toggleFav)

  const [featuredCricketDetail, setFeaturedCricketDetail] = useState(null)

  useEffect(() => {
    fetchScores(sport, selectedDate)
    const t = setInterval(() => fetchScores(sport, selectedDate), 60000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport, selectedDate])

  const allMatches =
    sport === 'football'
      ? football || []
      : sport === 'cricket'
        ? cricket || []
        : [...(football || []), ...(cricket || [])].filter((m) => isFavMatch(m, favTeams))

  const featured =
    allMatches.find((m) => m.status === 'live') || allMatches[0] || null
  const remaining = featured ? allMatches.filter((m) => m.id !== featured.id) : []
  const liveCount = allMatches.filter((m) => m.status === 'live').length

  // Load live "At the crease" batters for featured cricket match (12 · Live cricket)
  useEffect(() => {
    if (sport !== 'cricket' || !featured?.rawId) {
      setFeaturedCricketDetail(null)
      return
    }
    let alive = true
    fetchCricketDetail(featured.rawId, featured.seriesId)
      .then((d) => {
        if (alive) setFeaturedCricketDetail(d)
      })
      .catch(() => {
        if (alive) setFeaturedCricketDetail(null)
      })
    return () => {
      alive = false
    }
  }, [sport, featured?.rawId, featured?.seriesId])

  const prevDate = shiftISO(selectedDate, -1)
  const nextDate = shiftISO(selectedDate, 1)

  const toggleMatchFav = (m) => {
    const favSet = new Set((favTeams || []).map(normalizeTeam))
    if (favSet.has(normalizeTeam(m?.teamA?.name))) toggleFav(m.teamA.name)
    else if (favSet.has(normalizeTeam(m?.teamB?.name))) toggleFav(m.teamB.name)
    else toggleFav(m?.teamA?.name)
  }

  return (
    <section className="mx-auto w-full max-w-[460px] px-6 pb-28 pt-2 lg:max-w-[780px] lg:pt-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
        DON’T MISS A MOMENT
      </p>
      <h1 className="mt-1.5 text-[34px] font-medium leading-[1.12] tracking-[-0.02em] text-ink">
        The live pulse.
      </h1>

      {/* Sport Pills: Football | Cricket | Following */}
      <div className="mt-5 flex items-center gap-2">
        {SPORT_TABS.map((t) => {
          const active = sport === t.id
          return (
            <button
              key={t.id}
              onClick={() => setSport(t.id)}
              className={`rounded-full px-4 py-1.5 text-[13px] transition-colors ${
                active ? 'bg-pulse font-semibold text-ink' : 'bg-sage font-medium text-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Date Switcher (‹ Sat 05 | Today, 06 Jul | Mon 07 ›) */}
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

      {/* Content */}
      <div className="mt-5">
        {status === 'loading' && !allMatches.length ? (
          <div className="space-y-4">
            <div className="h-[220px] animate-pulse rounded-[22px] bg-sage" />
            <div className="h-[96px] animate-pulse rounded-[16px] bg-white" />
            <div className="h-[96px] animate-pulse rounded-[16px] bg-white" />
          </div>
        ) : sport === 'following' && !allMatches.length ? (
          <div className="rounded-[20px] bg-white p-8 text-center">
            <p className="text-[18px] font-semibold text-ink">No followed matches today.</p>
            <p className="mt-1.5 text-[13px] text-muted">
              Tap the ★ on any football or cricket fixture to follow that team here.
            </p>
            <button
              type="button"
              onClick={() => setSport('football')}
              className="mt-5 rounded-full bg-pulse px-5 py-2.5 text-[13px] font-bold text-ink"
            >
              Browse live scores
            </button>
          </div>
        ) : !allMatches.length ? (
          <div className="rounded-[20px] bg-white p-8 text-center">
            <p className="text-[17px] font-semibold text-ink">No fixtures listed for this date.</p>
            <p className="mt-1 text-[13px] text-muted">Try switching to an adjacent day above.</p>
          </div>
        ) : (
          <>
            {/* Featured Hero Card */}
            {featured?.sport === 'cricket' ? (
              <>
                <CricketHeroCard match={featured} onOpen={openMatch} />
                <AtTheCreaseCard match={featured} detail={featuredCricketDetail} />
              </>
            ) : (
              <FootballHeroCard match={featured} onOpen={openMatch} />
            )}

            {/* Remaining Fixtures ("Around the grounds") */}
            {remaining.length > 0 && (
              <div className="mt-7">
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="text-[20px] font-semibold text-ink">
                    Around the grounds
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
