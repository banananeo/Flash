import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import {
  IPL_ALL_TIME_RECORDS,
  IPL_FRANCHISES,
  IPL_ROLL_OF_HONOUR,
  IPL_SEASONS_DATA,
  IPL_SEASON_YEARS,
  IPL_TEAM_FILTERS,
} from '../../data/iplArchive'
import { useScoreStore } from '../../store/useScoreStore'

const SUB_TABS = [
  { id: 'matches', label: 'Matches' },
  { id: 'table', label: 'Standings' },
  { id: 'champions', label: 'Champions' },
  { id: 'records', label: 'Records' },
]

const pad2 = (n) => String(n).padStart(2, '0')

function franchiseOf(short) {
  return IPL_FRANCHISES[short] || { short, name: short, color: '#64748B', titles: [] }
}

function FormDot({ res }) {
  const r = String(res || '').toUpperCase()
  const cls =
    r === 'W'
      ? 'bg-sage-tint text-brand-strong'
      : r === 'L'
        ? 'bg-rose-50 text-live'
        : 'bg-sage text-muted'
  return (
    <span
      className={`grid h-[18px] w-[18px] place-items-center rounded-full font-display text-[9px] font-bold ${cls}`}
    >
      {r}
    </span>
  )
}

export default function IPLSection() {
  const openMatch = useScoreStore((s) => s.openMatch)

  const [seasonYear, setSeasonYear] = useState('2026')
  const [subTab, setSubTab] = useState('matches') // matches | table | champions | records
  const [teamFilter, setTeamFilter] = useState('ALL')
  const [stageFilter, setStageFilter] = useState('all') // all | playoff | league

  const season = IPL_SEASONS_DATA[seasonYear] || IPL_SEASONS_DATA['2026']
  const champ = franchiseOf(season.champion)
  const runner = franchiseOf(season.runnerUp)
  const isSeasonScoped = subTab === 'matches' || subTab === 'table'

  // Franchise trophy cabinet sorted by title count
  const trophyCabinet = useMemo(() => {
    return Object.values(IPL_FRANCHISES)
      .filter((f) => f.titles && f.titles.length > 0)
      .sort(
        (a, b) =>
          b.titles.length - a.titles.length ||
          b.titles[b.titles.length - 1] - a.titles[a.titles.length - 1],
      )
  }, [])
  const maxTitles = trophyCabinet[0]?.titles?.length || 1

  // Filtered matches for the selected season
  const filteredMatches = useMemo(() => {
    return (season.matches || []).filter((m) => {
      if (stageFilter !== 'all' && m.stageKind !== stageFilter) return false
      if (teamFilter !== 'ALL') {
        const a = m.teamA?.short
        const b = m.teamB?.short
        if (a !== teamFilter && b !== teamFilter) return false
      }
      return true
    })
  }, [season, stageFilter, teamFilter])

  // Only show team filter options that participate in the selected season's matches
  const availableTeams = useMemo(() => {
    const present = new Set()
    for (const m of season.matches || []) {
      if (m.teamA?.short) present.add(m.teamA.short)
      if (m.teamB?.short) present.add(m.teamB.short)
    }
    return IPL_TEAM_FILTERS.filter((code) => code === 'ALL' || present.has(code))
  }, [season])

  const selectSeason = (yr) => {
    if (IPL_SEASONS_DATA[yr]) {
      setSeasonYear(yr)
      setTeamFilter('ALL')
      setStageFilter('all')
    }
  }

  const jumpToSeason = (yr) => {
    if (IPL_SEASONS_DATA[yr]) {
      selectSeason(yr)
      setSubTab('matches')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="mt-6">
      {/* Minimal Header + Contextual Season Selector */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
            2008 – 2026 ARCHIVE
          </p>
          <h2 className="mt-1 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[25px]">
            Indian Premier League
          </h2>
        </div>

        {isSeasonScoped && (
          <select
            aria-label="Select IPL season"
            value={seasonYear}
            onChange={(e) => selectSeason(e.target.value)}
            className="h-8 shrink-0 rounded-full border border-hairline bg-white px-3.5 font-display text-[12px] font-semibold text-ink shadow-[0_1px_2px_rgba(15,23,42,0.03)] focus:outline-none focus:ring-2 focus:ring-pulse"
          >
            {IPL_SEASON_YEARS.map((yr) => (
              <option key={yr} value={yr}>
                IPL {yr}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Spring Segmented Navigation: Matches | Standings | Champions | Records */}
      <div
        role="tablist"
        aria-label="IPL sections"
        className="mt-5 grid grid-cols-4 rounded-full bg-sage/90 p-1"
      >
        {SUB_TABS.map((t) => {
          const active = subTab === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSubTab(t.id)}
              className={`relative rounded-full py-2 text-[12.5px] transition-colors sm:text-[13px] ${
                active ? 'font-semibold text-ink' : 'font-medium text-muted hover:text-ink'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="ipl-nav-pill"
                  transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                  className="absolute inset-0 rounded-full bg-white shadow-sm ring-1 ring-black/[0.04]"
                />
              )}
              <span className="relative z-[1]">{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* Season Spotlight Card (full on Matches; compact 1-line bar on Standings; hidden on all-time tabs) */}
      {subTab === 'matches' && (
        <div className="mt-5 overflow-hidden rounded-[22px] border border-hairline bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <div className="h-[3px] w-full" style={{ backgroundColor: champ.color }} />
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand-strong">
                IPL {season.year} · {season.edition}
              </span>
              <span className="text-[11.5px] font-medium text-muted">
                Runner-up · <span className="font-semibold text-ink">{runner.name}</span>
              </span>
            </div>

            <div className="mt-2.5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                  Season Champions
                </p>
                <h3 className="mt-0.5 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[26px]">
                  {champ.name}
                </h3>
                <p className="mt-1 text-[13px] font-medium text-brand-strong">
                  {season.finalSummary}
                </p>
              </div>

              {season.finalScore && (
                <span className="self-start rounded-full bg-sage px-3 py-1 font-display text-[12px] font-bold tabular-nums text-ink sm:self-auto">
                  {season.finalScore}
                </span>
              )}
            </div>

            {/* Clean Typographic Season Honours Strip */}
            <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3.5 border-t border-hairline pt-4 sm:grid-cols-4">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#EA580C]" />
                  <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-muted">
                    Orange Cap
                  </p>
                </div>
                <p className="mt-1 truncate text-[13px] font-semibold text-ink">
                  {season.orangeCap.player}
                </p>
                <p className="font-display text-[12px] font-bold tabular-nums text-ink">
                  {season.orangeCap.value}{' '}
                  <span className="font-sans text-[11px] font-medium text-muted">
                    · {season.orangeCap.team}
                  </span>
                </p>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#7C3AED]" />
                  <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-muted">
                    Purple Cap
                  </p>
                </div>
                <p className="mt-1 truncate text-[13px] font-semibold text-ink">
                  {season.purpleCap.player}
                </p>
                <p className="font-display text-[12px] font-bold tabular-nums text-ink">
                  {season.purpleCap.value}{' '}
                  <span className="font-sans text-[11px] font-medium text-muted">
                    · {season.purpleCap.team}
                  </span>
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-muted">
                  Season MVP
                </p>
                <p className="mt-1 truncate text-[13px] font-semibold text-ink">
                  {season.mvp.player}
                </p>
                <p className="truncate text-[11.5px] font-medium text-muted">{season.mvp.value}</p>
              </div>

              <div className="min-w-0">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-muted">
                  Highest Total
                </p>
                <p className="mt-1 font-display text-[13.5px] font-bold tabular-nums text-ink">
                  {season.highestTotal.team} {season.highestTotal.value}
                </p>
                <p className="truncate text-[11.5px] font-medium text-muted">
                  {season.highestTotal.vs}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'table' && (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-full border border-hairline bg-white px-4 py-2.5 text-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: champ.color }}
            />
            <span className="truncate font-semibold text-ink">
              {season.year} Champions · {champ.name}
            </span>
          </div>
          <span className="shrink-0 font-display text-[11.5px] font-semibold tabular-nums text-muted">
            {season.edition}
          </span>
        </div>
      )}

      <div className="mt-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${subTab}-${isSeasonScoped ? seasonYear : 'all'}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            {/* ==================== TAB 1: MATCHES ==================== */}
            {subTab === 'matches' && (
              <div className="space-y-4">
                {/* Single Clean Filter Row: Stage Underline Tabs + Compact Team Select */}
                <div className="flex items-end justify-between gap-3 border-b border-hairline">
                  <div className="flex items-center gap-5" role="tablist" aria-label="Match stage">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'playoff', label: 'Playoffs' },
                      { id: 'league', label: 'League' },
                    ].map((st) => {
                      const active = stageFilter === st.id
                      return (
                        <button
                          key={st.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setStageFilter(st.id)}
                          className={`relative pb-3 text-[13.5px] transition-colors ${
                            active ? 'font-bold text-ink' : 'font-medium text-muted hover:text-ink'
                          }`}
                        >
                          {st.label}
                          {active && (
                            <motion.span
                              layoutId="ipl-stage-underline"
                              transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                              className="absolute bottom-0 left-0 right-0 h-[2px] bg-pulse"
                            />
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {availableTeams.length > 2 && (
                    <div className="pb-2">
                      <select
                        aria-label="Filter by team"
                        value={teamFilter}
                        onChange={(e) => setTeamFilter(e.target.value)}
                        className="h-7 rounded-full bg-sage px-3 text-[11.5px] font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-pulse"
                      >
                        {availableTeams.map((code) => (
                          <option key={code} value={code}>
                            {code === 'ALL' ? 'All teams' : code}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {filteredMatches.length === 0 ? (
                  <div className="rounded-[22px] border border-hairline bg-white p-8 text-center">
                    <p className="text-[15px] font-semibold text-ink">
                      No matches match this filter in IPL {seasonYear}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setTeamFilter('ALL')
                        setStageFilter('all')
                      }}
                      className="mt-3 rounded-full bg-sage px-4 py-1.5 text-[12px] font-semibold text-ink transition-colors hover:bg-hairline"
                    >
                      Reset filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
                    {filteredMatches.map((m) => {
                      const isFinal = m.stage === 'FINAL'
                      return (
                        <div
                          key={m.id}
                          onClick={() => openMatch(m)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              openMatch(m)
                            }
                          }}
                          className="group flex cursor-pointer flex-col justify-between rounded-[22px] border border-hairline bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] transition-all hover:border-hairline-soft active:scale-[0.99]"
                        >
                          <div>
                            {/* Stage & Date */}
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] ${
                                  isFinal
                                    ? 'bg-sage-tint text-brand-strong'
                                    : 'bg-sage text-muted'
                                }`}
                              >
                                {m.stage}
                              </span>
                              <span className="font-display text-[11.5px] font-medium tabular-nums text-muted">
                                {m.dateLabel}
                              </span>
                            </div>

                            {/* Team A */}
                            <div className="mt-4 flex items-baseline justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-2.5">
                                <span
                                  className="h-5 w-[3px] shrink-0 rounded-full"
                                  style={{ backgroundColor: m.teamA.color }}
                                />
                                <span className="truncate text-[14.5px] font-semibold text-ink">
                                  {m.teamA.name}
                                </span>
                              </div>
                              <div className="shrink-0 text-right font-display tabular-nums">
                                <span className="text-[16.5px] font-bold text-ink">
                                  {m.teamA.score}
                                </span>
                                {m.teamA.overs && (
                                  <span className="ml-1 font-sans text-[11px] font-medium text-muted">
                                    ({m.teamA.overs})
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Team B */}
                            <div className="mt-2.5 flex items-baseline justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-2.5">
                                <span
                                  className="h-5 w-[3px] shrink-0 rounded-full"
                                  style={{ backgroundColor: m.teamB.color }}
                                />
                                <span className="truncate text-[14.5px] font-semibold text-ink">
                                  {m.teamB.name}
                                </span>
                              </div>
                              <div className="shrink-0 text-right font-display tabular-nums">
                                <span className="text-[16.5px] font-bold text-ink">
                                  {m.teamB.score}
                                </span>
                                {m.teamB.overs && (
                                  <span className="ml-1 font-sans text-[11px] font-medium text-muted">
                                    ({m.teamB.overs})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Result + Scorecard Link */}
                          <div className="mt-4 flex items-center justify-between gap-3 border-t border-hairline pt-3">
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-semibold text-brand-strong">
                                {m.meta?.need}
                              </p>
                              <p className="mt-0.5 truncate text-[11px] font-medium text-muted">
                                {m.potm ? `POTM · ${m.potm}` : m.venue}
                              </p>
                            </div>

                            <span className="inline-flex shrink-0 items-center gap-0.5 text-[11.5px] font-semibold text-muted transition-colors group-hover:text-ink">
                              <span>Scorecard</span>
                              <ChevronRight
                                size={13}
                                className="transition-transform group-hover:translate-x-0.5"
                              />
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ==================== TAB 2: POINTS TABLE ==================== */}
            {subTab === 'table' && (
              <div className="overflow-hidden rounded-[22px] border border-hairline bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] sm:p-5">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h3 className="text-[16px] font-semibold text-ink">
                      IPL {season.year} Points Table
                    </h3>
                    <p className="text-[11.5px] font-medium text-muted">
                      Top 4 teams qualified for the Playoffs
                    </p>
                  </div>
                  <span className="rounded-full bg-sage px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-muted">
                    {(season.standings || []).length} teams
                  </span>
                </div>

                {/* Responsive Grid — fits mobile cleanly without horizontal scrolling */}
                <div className="grid grid-cols-[28px_minmax(0,1fr)_24px_24px_24px_50px_32px] items-center gap-1 border-b border-hairline pb-2 text-[10px] font-bold uppercase tracking-[0.06em] text-muted sm:grid-cols-[32px_minmax(0,1fr)_30px_30px_30px_58px_38px_88px] sm:gap-1.5">
                  <span className="pl-2">#</span>
                  <span>Team</span>
                  <span className="text-right">M</span>
                  <span className="text-right">W</span>
                  <span className="text-right">L</span>
                  <span className="text-right">NRR</span>
                  <span className="text-right">Pts</span>
                  <span className="hidden text-right sm:inline">Form</span>
                </div>

                <div className="divide-y divide-hairline/70">
                  {(season.standings || []).map((row) => {
                    const f = franchiseOf(row.short)
                    const isChamp = row.short === season.champion
                    const isLeader = row.pos === 1
                    const nrrPositive = String(row.nrr || '').startsWith('+')

                    return (
                      <div
                        key={row.short}
                        className={`grid grid-cols-[28px_minmax(0,1fr)_24px_24px_24px_50px_32px] items-center gap-1 py-3 text-[12.5px] sm:grid-cols-[32px_minmax(0,1fr)_30px_30px_30px_58px_38px_88px] sm:gap-1.5 sm:py-3.5 sm:text-[13px] ${
                          isLeader ? 'bg-sage-tint/55' : ''
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-4 w-[3px] shrink-0 rounded-full"
                            style={{
                              backgroundColor: row.qualified ? '#0D9488' : 'transparent',
                            }}
                          />
                          <span className="font-display text-[11.5px] font-bold tabular-nums text-muted sm:text-[12px]">
                            {pad2(row.pos)}
                          </span>
                        </div>

                        <div className="flex min-w-0 items-center gap-2 pr-1">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: f.color }}
                          />
                          <span className="truncate font-semibold text-ink" title={f.name}>
                            <span className="sm:hidden">{f.short}</span>
                            <span className="hidden sm:inline">{f.name}</span>
                          </span>
                          {isChamp ? (
                            <span className="shrink-0 rounded-full bg-sage-tint px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-[0.04em] text-brand-strong">
                              C
                            </span>
                          ) : row.qualified ? (
                            <span className="shrink-0 rounded bg-sage px-1.5 py-0.2 font-display text-[9px] font-bold text-muted">
                              Q
                            </span>
                          ) : null}
                        </div>

                        <span className="text-right font-display tabular-nums text-muted">
                          {row.played}
                        </span>
                        <span className="text-right font-display font-semibold tabular-nums text-ink">
                          {row.won}
                        </span>
                        <span className="text-right font-display tabular-nums text-muted">
                          {row.lost}
                        </span>
                        <span
                          className={`text-right font-display text-[11.5px] font-medium tabular-nums sm:text-[12px] ${
                            nrrPositive ? 'text-brand-strong' : 'text-muted'
                          }`}
                        >
                          {row.nrr}
                        </span>
                        <span className="text-right font-display text-[14px] font-bold tabular-nums text-ink">
                          {row.points}
                        </span>

                        <div className="hidden justify-end gap-1 sm:flex">
                          {(row.form || []).slice(-4).map((r, idx) => (
                            <FormDot key={idx} res={r} />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-hairline pt-3 text-[11px] font-medium text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-pulse" />
                    Playoff qualification (Q)
                  </span>
                  <span>C · Season Champion</span>
                </div>
              </div>
            )}

            {/* ==================== TAB 3: CHAMPIONS (2008–2026) ==================== */}
            {subTab === 'champions' && (
              <div className="space-y-6">
                {/* Titles by Franchise (with proportional bars like F1 Constructors) */}
                <div className="overflow-hidden rounded-[22px] border border-hairline bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
                  <div className="flex items-baseline justify-between border-b border-hairline px-4 py-3.5 sm:px-6">
                    <div>
                      <h3 className="text-[16px] font-semibold text-ink">Titles by Franchise</h3>
                      <p className="text-[11.5px] font-medium text-muted">
                        Championships won across 19 seasons
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                      Titles
                    </span>
                  </div>

                  <div className="divide-y divide-hairline/70">
                    {trophyCabinet.map((f, idx) => {
                      const barPct = Math.max(
                        12,
                        Math.round((f.titles.length / maxTitles) * 100),
                      )
                      return (
                        <div
                          key={f.short}
                          className="flex items-center gap-3.5 px-4 py-3.5 sm:gap-4 sm:px-6"
                        >
                          <span className="w-5 shrink-0 font-display text-[12px] font-medium tabular-nums text-muted">
                            {pad2(idx + 1)}
                          </span>
                          <span
                            className="h-7 w-[3px] shrink-0 rounded-full"
                            style={{ backgroundColor: f.color }}
                          />
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              <p className="truncate text-[14.5px] font-semibold text-ink">
                                {f.name}
                              </p>
                              <span className="font-display text-[11px] font-medium tabular-nums text-muted">
                                {f.titles.join(', ')}
                              </span>
                            </div>
                            <div className="mt-2 h-[3px] w-full max-w-[220px] overflow-hidden rounded-full bg-sage">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${barPct}%`, backgroundColor: f.color }}
                              />
                            </div>
                          </div>
                          <span className="w-8 shrink-0 text-right font-display text-[17px] font-bold tabular-nums text-ink">
                            {f.titles.length}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Complete 2008–2026 Roll of Honour */}
                <div className="overflow-hidden rounded-[22px] border border-hairline bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
                  <div className="flex items-baseline justify-between border-b border-hairline px-4 py-3.5 sm:px-6">
                    <div>
                      <h3 className="text-[16px] font-semibold text-ink">Season Finals</h3>
                      <p className="text-[11.5px] font-medium text-muted">
                        Tap any season to view its matches and points table
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                      {IPL_ROLL_OF_HONOUR.length} Seasons
                    </span>
                  </div>

                  <div className="divide-y divide-hairline/70">
                    {IPL_ROLL_OF_HONOUR.map((ed) => {
                      const win = franchiseOf(ed.winner)
                      const run = franchiseOf(ed.runnerUp)
                      const hasArchive = Boolean(IPL_SEASONS_DATA[ed.year])

                      return (
                        <button
                          key={ed.year}
                          type="button"
                          disabled={!hasArchive}
                          onClick={() => hasArchive && jumpToSeason(ed.year)}
                          className={`group flex w-full items-center gap-3.5 px-4 py-4 text-left transition-colors sm:gap-4 sm:px-6 ${
                            hasArchive ? 'cursor-pointer hover:bg-sage/40' : 'cursor-default'
                          }`}
                        >
                          <span className="w-11 shrink-0 font-display text-[16px] font-bold tabular-nums text-ink">
                            {ed.year}
                          </span>

                          <span className="h-8 w-px shrink-0 bg-hairline" />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: win.color }}
                              />
                              <span className="truncate text-[14.5px] font-semibold text-ink">
                                {win.name}
                              </span>
                              <span className="text-[11.5px] font-medium text-muted">
                                def. {run.short}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-[12px] font-medium text-brand-strong">
                              {ed.margin} <span className="text-muted">· {ed.venue}</span>
                            </p>
                            <p className="mt-1 truncate text-[11px] font-medium text-muted">
                              Orange: {ed.orangeCap} · Purple: {ed.purpleCap}
                            </p>
                          </div>

                          {hasArchive && (
                            <ChevronRight
                              size={15}
                              className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
                            />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TAB 4: ALL-TIME RECORDS ==================== */}
            {subTab === 'records' && (
              <div className="space-y-6">
                {/* Key Individual & Season Benchmarks */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {IPL_ALL_TIME_RECORDS.iconicFeats.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-4 rounded-[20px] border border-hairline bg-white px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)]"
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                          {feat.label}
                        </p>
                        <p className="mt-1 truncate text-[14px] font-semibold text-ink">
                          {feat.holder}
                        </p>
                      </div>
                      <span className="shrink-0 font-display text-[19px] font-bold tabular-nums text-brand-strong">
                        {feat.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Most Runs + Most Wickets */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="overflow-hidden rounded-[22px] border border-hairline bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
                    <div className="flex items-baseline justify-between border-b border-hairline px-4 py-3.5 sm:px-5">
                      <h3 className="text-[15px] font-semibold text-ink">Most Runs</h3>
                      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                        Runs
                      </span>
                    </div>
                    <div className="divide-y divide-hairline/70">
                      {IPL_ALL_TIME_RECORDS.mostRuns.map((p, idx) => (
                        <div
                          key={p.player}
                          className={`flex items-center justify-between gap-3 px-4 py-3 sm:px-5 ${
                            idx === 0 ? 'bg-sage-tint/45' : ''
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={`w-5 shrink-0 font-display text-[12px] tabular-nums ${
                                idx === 0
                                  ? 'font-bold text-brand-strong'
                                  : 'font-medium text-muted'
                              }`}
                            >
                              {pad2(p.pos)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-[14px] font-semibold text-ink">
                                {p.player}
                              </p>
                              <p className="truncate text-[11.5px] font-medium text-muted">
                                {p.team} · {p.matches} matches
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 font-display text-[15px] font-bold tabular-nums text-ink">
                            {p.runs}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[22px] border border-hairline bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
                    <div className="flex items-baseline justify-between border-b border-hairline px-4 py-3.5 sm:px-5">
                      <h3 className="text-[15px] font-semibold text-ink">Most Wickets</h3>
                      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                        Wkts
                      </span>
                    </div>
                    <div className="divide-y divide-hairline/70">
                      {IPL_ALL_TIME_RECORDS.mostWickets.map((p, idx) => (
                        <div
                          key={p.player}
                          className={`flex items-center justify-between gap-3 px-4 py-3 sm:px-5 ${
                            idx === 0 ? 'bg-sage-tint/45' : ''
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={`w-5 shrink-0 font-display text-[12px] tabular-nums ${
                                idx === 0
                                  ? 'font-bold text-brand-strong'
                                  : 'font-medium text-muted'
                              }`}
                            >
                              {pad2(p.pos)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-[14px] font-semibold text-ink">
                                {p.player}
                              </p>
                              <p className="truncate text-[11.5px] font-medium text-muted">
                                {p.team} · Best {p.best}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 font-display text-[15px] font-bold tabular-nums text-ink">
                            {p.wickets}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Highest Team Totals */}
                <div className="overflow-hidden rounded-[22px] border border-hairline bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
                  <div className="flex items-baseline justify-between border-b border-hairline px-4 py-3.5 sm:px-6">
                    <h3 className="text-[15px] font-semibold text-ink">Highest Team Totals</h3>
                    <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                      Score
                    </span>
                  </div>
                  <div className="divide-y divide-hairline/70">
                    {IPL_ALL_TIME_RECORDS.highestTotals.map((t, idx) => {
                      const f = franchiseOf(t.team)
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-6"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="w-5 shrink-0 font-display text-[12px] font-medium tabular-nums text-muted">
                              {pad2(idx + 1)}
                            </span>
                            <span
                              className="h-6 w-[3px] shrink-0 rounded-full"
                              style={{ backgroundColor: f.color }}
                            />
                            <div className="min-w-0">
                              <p className="truncate text-[14px] font-semibold text-ink">
                                {f.name}
                              </p>
                              <p className="truncate text-[11.5px] font-medium text-muted">
                                {t.vs} · {t.venue} · {t.year}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 font-display text-[16px] font-bold tabular-nums text-ink">
                            {t.score}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
