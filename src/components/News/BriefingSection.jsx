import { useEffect, useMemo, useState } from 'react'
import { Flame, Radio, RefreshCw, ShieldCheck, Swords, Trophy } from 'lucide-react'
import {
  CURATED_RADAR_MOVES,
  DEBATE_SHOWDOWNS,
  PADDOCK_MODES,
  PADDOCK_SPORTS,
  TIER_META,
} from '../../data/mockPaddock'
import { useF1Store } from '../../store/useF1Store'
import { useNewsStore } from '../../store/useNewsStore'
import { useScoreStore } from '../../store/useScoreStore'
import DebateShowdownCard from './DebateShowdownCard'
import RadioSoundboard from './RadioSoundboard'
import TransferRadarCard from './TransferRadarCard'

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

function getLockerRank(takesCount) {
  if (takesCount >= 8) return { title: 'Chief Strategist', nextAt: null }
  if (takesCount >= 5) return { title: 'Paddock VIP', nextAt: 8 }
  if (takesCount >= 2) return { title: 'Locker Insider', nextAt: 5 }
  return { title: 'Rookie Scout', nextAt: 2 }
}

function DesktopRightRail({ takesCount, rankTitle }) {
  const football = useScoreStore((s) => s.football)
  const cricket = useScoreStore((s) => s.cricket)
  const openMatch = useScoreStore((s) => s.openMatch)
  const setView = useScoreStore((s) => s.setView)
  const setSport = useScoreStore((s) => s.setSport)
  const nextRace = useF1Store((s) => s.nextRace)

  const featuredMatch =
    (football || []).find((m) => m.status === 'live') ||
    (cricket || []).find((m) => m.status === 'live') ||
    (football || [])[0] ||
    (cricket || [])[0] ||
    null

  return (
    <aside className="hidden flex-col gap-6 lg:flex">
      {/* Locker Room IQ & Fan Rank Card */}
      <div>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
          LOCKER ROOM IQ
        </p>
        <div className="rounded-[20px] border border-hairline bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pulse px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink">
              <Trophy size={11} />
              {rankTitle}
            </span>
            <span className="font-display text-[12px] font-bold text-brand-strong">
              {takesCount} {takesCount === 1 ? 'Take' : 'Takes'} Locked
            </span>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            Vote on transfer moves, back your contender in Debate Club, or hype pit-wall radio clips to level up your Paddock rank.
          </p>
        </div>
      </div>

      {/* Live Score Promo Card */}
      <div>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
          Live Scores
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
                  <span className="min-w-0 flex-1 break-words text-[15px] font-semibold leading-tight text-ink">
                    {featuredMatch.teamA?.name}
                  </span>
                  <span className="shrink-0 font-display text-[22px] font-bold text-ink">
                    {featuredMatch.teamA?.score}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 flex-1 break-words text-[15px] font-semibold leading-tight text-ink">
                    {featuredMatch.teamB?.name}
                  </span>
                  <span className="shrink-0 font-display text-[22px] font-bold text-ink">
                    {featuredMatch.teamB?.score}
                  </span>
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

      {/* F1 Promo card */}
      <div>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
          FORMULA 1
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
    </aside>
  )
}

export default function BriefingSection() {
  const sportFilter = useNewsStore((s) => s.sportFilter)
  const modeFilter = useNewsStore((s) => s.modeFilter)
  const searchQuery = useNewsStore((s) => s.searchQuery)
  const setSportFilter = useNewsStore((s) => s.setSportFilter)
  const setModeFilter = useNewsStore((s) => s.setModeFilter)
  const searchNews = useNewsStore((s) => s.searchNews)
  const liveArticles = useNewsStore((s) => s.liveArticles)
  const status = useNewsStore((s) => s.status)
  const error = useNewsStore((s) => s.error)
  const fetchNews = useNewsStore((s) => s.fetchNews)
  const openReader = useNewsStore((s) => s.openReader)
  const radarVotes = useNewsStore((s) => s.radarVotes)
  const debateVotes = useNewsStore((s) => s.debateVotes)
  const radioHypes = useNewsStore((s) => s.radioHypes)
  const driverStandings = useF1Store((s) => s.driverStandings)

  const [tierFilter, setTierFilter] = useState('all')

  useEffect(() => {
    fetchNews(sportFilter, searchQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Calculate user's total interactive takes locked in
  const takesCount =
    Object.keys(radarVotes || {}).length +
    Object.keys(debateVotes || {}).length +
    Object.keys(radioHypes || {}).length
  const { title: rankTitle } = getLockerRank(takesCount)

  // Dynamically enrich F1 debates with live championship points from useF1Store when available
  const debates = useMemo(() => {
    const q = String(searchQuery || '').trim().toLowerCase()
    return DEBATE_SHOWDOWNS.map((d) => {
      if (d.sport !== 'f1' || !driverStandings?.length) return d
      const dA = driverStandings.find((dr) => dr.acro === d.athleteA.acro)
      const dB = driverStandings.find((dr) => dr.acro === d.athleteB.acro)
      if (!dA || !dB) return d
      const ptsTotal = Math.max(1, (dA.points || 0) + (dB.points || 0))
      const updatedStats = [
        {
          label: 'Season Points',
          valA: String(dA.points ?? 0),
          valB: String(dB.points ?? 0),
          pctA: Math.round(((dA.points || 0) / ptsTotal) * 100),
        },
        ...d.stats.slice(1),
      ]
      return { ...d, stats: updatedStats }
    }).filter((d) => {
      if (sportFilter !== 'all' && d.sport !== sportFilter) return false
      if (q) {
        const hay = `${d.tag} ${d.question} ${d.athleteA.name} ${d.athleteB.name} ${d.athleteA.team} ${d.athleteB.team}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [sportFilter, searchQuery, driverStandings])

  // Interleave curated Transfer/Silly-Season moves with live Sports & Motorsport wire articles
  const radarItems = useMemo(() => {
    const q = String(searchQuery || '').trim().toLowerCase()

    const curated = CURATED_RADAR_MOVES.filter((it) => {
      if (sportFilter !== 'all' && it.sport !== sportFilter) return false
      if (q) {
        const hay = `${it.subject || ''} ${it.title} ${it.summary} ${it.fromTeam || ''} ${it.toTeam || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    const live = (liveArticles || []).filter((it) => {
      const sp = it.sport || it.category || 'football'
      if (sportFilter !== 'all' && sp !== sportFilter) return false
      if (q) {
        const hay = `${it.title} ${it.summary || ''} ${it.source || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    // Interleave: 1 curated insider transfer/seat card -> 1 live sports wire story
    const combined = []
    const maxLen = Math.max(curated.length, live.length)
    const seenIds = new Set()
    for (let i = 0; i < maxLen; i++) {
      if (curated[i] && !seenIds.has(curated[i].id)) {
        seenIds.add(curated[i].id)
        combined.push(curated[i])
      }
      if (live[i] && !seenIds.has(live[i].id)) {
        seenIds.add(live[i].id)
        combined.push(live[i])
      }
    }

    if (tierFilter === 'all') return combined
    return combined.filter((it) => (it.tier || 'heating-up') === tierFilter)
  }, [sportFilter, searchQuery, liveArticles, tierFilter])

  const featuredDebate = debates[0] || null
  const remainingDebates = debates.slice(1)

  return (
    <section className="mx-auto w-full max-w-[460px] px-6 pb-28 pt-2 lg:max-w-[1360px] lg:px-10 lg:pb-16 lg:pt-8">
      <div className="lg:grid lg:grid-cols-[200px_1fr_320px] lg:gap-10">
        {/* Desktop Left Rail: Turf Selector + Paddock Modes */}
        <aside className="hidden flex-col gap-7 lg:flex">
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
              CHOOSE YOUR TURF
            </p>
            <div className="flex flex-col gap-1">
              {PADDOCK_SPORTS.map((s) => {
                const active = sportFilter === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSportFilter(s.id)}
                    className={`w-full rounded-[12px] px-4 py-2.5 text-left text-[14px] transition-colors ${
                      active
                        ? 'bg-pulse font-semibold text-ink'
                        : 'font-medium text-muted hover:bg-sage/60 hover:text-ink'
                    }`}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
              PADDOCK MODES
            </p>
            <div className="flex flex-col gap-1">
              {PADDOCK_MODES.map((m) => {
                const active = modeFilter === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModeFilter(m.id)}
                    className={`w-full rounded-[12px] px-4 py-2.5 text-left text-[13px] transition-colors ${
                      active
                        ? 'bg-ink font-semibold text-white'
                        : 'font-medium text-muted hover:bg-sage/60 hover:text-ink'
                    }`}
                  >
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        {/* Center Main Column: The Paddock & Locker Room */}
        <div className="min-w-0">
          {/* Top Metadata Bar */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                {formatEditorialDate()}
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-sage-leader px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-brand-strong">
                <span className="h-1.5 w-1.5 rounded-full bg-pulse" />
                F1 · FOOTBALL · CRICKET
              </span>
            </div>

            <button
              type="button"
              onClick={() => fetchNews(sportFilter, searchQuery)}
              title="Sync live paddock wire"
              aria-label="Sync live paddock wire"
              className="inline-flex h-7 items-center gap-1.5 rounded-full bg-sage px-3 text-[11px] font-semibold text-ink transition-colors hover:bg-hairline"
            >
              <RefreshCw size={12} className={status === 'loading' ? 'animate-spin text-brand-strong' : ''} />
              <span>Sync Wire</span>
            </button>
          </div>

          {/* Section Title & Subtitle */}
          <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-[32px] font-medium leading-[1.12] tracking-[-0.02em] text-ink lg:text-[40px]">
              The Paddock.
            </h1>

            {/* Mobile Locker IQ Badge */}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sage px-3 py-1 text-[11px] font-bold text-ink lg:hidden">
              <Trophy size={12} className="text-brand-strong" />
              {rankTitle} · {takesCount}
            </span>
          </div>
          <p className="mt-1 text-[13px] font-normal text-muted sm:text-[14px]">
            Transfer tier radar, pit-wall & stump-mic soundboard, and head-to-head fan debates.
          </p>

          {/* Active Search Filter Pill */}
          {searchQuery && (
            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-full bg-sage px-3 py-1 text-[12px] font-semibold text-ink">
                Filtering for “{searchQuery}”
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

          {/* Mobile Sport Filter Pills */}
          <div className="no-scrollbar -mx-6 mt-4 flex gap-2 overflow-x-auto px-6 lg:hidden">
            {PADDOCK_SPORTS.map((s) => {
              const active = sportFilter === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSportFilter(s.id)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] transition-colors ${
                    active
                      ? 'bg-pulse font-semibold text-ink'
                      : 'bg-sage font-medium text-muted hover:text-ink'
                  }`}
                >
                  {s.shortLabel}
                </button>
              )
            })}
          </div>

          {/* Segmented Mode Bar: All | Radar | Mic'd Up | Debates */}
          <div className="mt-4 grid grid-cols-4 rounded-full bg-sage p-1">
            {PADDOCK_MODES.map((m) => {
              const active = modeFilter === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModeFilter(m.id)}
                  className={`rounded-full py-2 text-[12px] transition-colors sm:text-[13px] ${
                    active ? 'bg-white font-bold text-ink shadow-sm' : 'font-medium text-muted hover:text-ink'
                  }`}
                >
                  {m.shortLabel}
                </button>
              )
            })}
          </div>

          {error && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-[14px] bg-sage px-4 py-2.5 text-[12px] font-medium text-ink">
              <span className="truncate">{error}</span>
              <button
                type="button"
                onClick={() => fetchNews(sportFilter, searchQuery)}
                className="shrink-0 font-bold text-ink underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* ==================== MAIN PADDOCK CONTENT ==================== */}
          <div className="mt-6 space-y-8">
            {/* 1. DEBATE CLUB SECTION */}
            {(modeFilter === 'all' || modeFilter === 'debates') && debates.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-pulse/20 text-brand-strong">
                      <Swords size={14} />
                    </span>
                    <div>
                      <h2 className="text-[19px] font-semibold leading-tight text-ink">
                        The Debate Club
                      </h2>
                      <p className="text-[12px] text-muted">
                        Tap a contender to lock your vote & shift the crowd split
                      </p>
                    </div>
                  </div>

                  {modeFilter === 'all' && debates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setModeFilter('debates')}
                      className="text-[12px] font-bold text-brand-strong hover:underline"
                    >
                      All debates ({debates.length}) →
                    </button>
                  )}
                </div>

                {featuredDebate && <DebateShowdownCard debate={featuredDebate} featured />}

                {modeFilter === 'debates' &&
                  remainingDebates.map((d) => <DebateShowdownCard key={d.id} debate={d} />)}
              </div>
            )}

            {/* 2. MIC'D UP & TEAM RADIO SOUNDBOARD */}
            {(modeFilter === 'all' || modeFilter === 'soundboard') && (
              <div className="space-y-3">
                <RadioSoundboard
                  sportFilter={sportFilter}
                  searchQuery={searchQuery}
                  compact={modeFilter === 'all'}
                />
                {modeFilter === 'all' && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setModeFilter('soundboard')}
                      className="inline-flex items-center gap-1 text-[12px] font-bold text-brand-strong hover:underline"
                    >
                      <Radio size={13} />
                      <span>Open full Mic’d Up soundboard →</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 3. TRANSFER & SILLY-SEASON TIER RADAR */}
            {(modeFilter === 'all' || modeFilter === 'radar') && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-pulse/20 text-brand-strong">
                      <ShieldCheck size={14} />
                    </span>
                    <div>
                      <h2 className="text-[19px] font-semibold leading-tight text-ink">
                        Transfer & Silly-Season Radar
                      </h2>
                      <p className="text-[12px] text-muted">
                        Reliability-tiered moves, F1 seat watch, IPL retentions & live wire
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tier Filter Pills */}
                <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
                  {[
                    { id: 'all', label: 'All Tiers' },
                    { id: 'here-we-go', label: `🟢 ${TIER_META['here-we-go'].label}` },
                    { id: 'heating-up', label: `🔥 ${TIER_META['heating-up'].label}` },
                    { id: 'radar', label: `👀 ${TIER_META.radar.label}` },
                  ].map((t) => {
                    const active = tierFilter === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTierFilter(t.id)}
                        className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] transition-colors ${
                          active
                            ? 'bg-ink text-white'
                            : 'bg-sage text-muted hover:text-ink'
                        }`}
                      >
                        {t.label}
                      </button>
                    )
                  })}
                </div>

                {radarItems.length === 0 ? (
                  <div className="rounded-[20px] border border-hairline bg-white p-8 text-center">
                    <Flame size={22} className="mx-auto text-muted" />
                    <p className="mt-2 text-[16px] font-semibold text-ink">
                      No radar items match this filter.
                    </p>
                    <p className="mt-1 text-[13px] text-muted">
                      Try switching back to All Tiers or All Turf above.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setTierFilter('all')
                        setSportFilter('all')
                        if (searchQuery) searchNews('')
                      }}
                      className="mt-4 rounded-full bg-pulse px-4 py-2 text-[12px] font-bold text-ink"
                    >
                      Reset filters
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {radarItems.map((item) => (
                      <TransferRadarCard
                        key={item.id || item.url}
                        item={item}
                        onReadFull={openReader}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Right Rail */}
        <DesktopRightRail takesCount={takesCount} rankTitle={rankTitle} />
      </div>
    </section>
  )
}
