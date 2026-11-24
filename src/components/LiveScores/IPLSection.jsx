import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Award, Calendar, ChevronRight, Flame, Medal, Trophy } from 'lucide-react'
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
  { id: 'table', label: 'Table' },
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
      ? 'bg-sage-leader text-brand-strong'
      : r === 'L'
        ? 'bg-rose-100 text-rose-700'
        : 'bg-sage text-muted'
  return (
    <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[9px] font-extrabold ${cls}`}>
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

  // Franchise trophy cabinet sorted by title count
  const trophyCabinet = useMemo(() => {
    return Object.values(IPL_FRANCHISES)
      .filter((f) => f.titles && f.titles.length > 0)
      .sort((a, b) => b.titles.length - a.titles.length || b.titles[b.titles.length - 1] - a.titles[a.titles.length - 1])
  }, [])

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

  // Only show team filter pills that participate in the selected season's matches
  const availableTeams = useMemo(() => {
    const present = new Set()
    for (const m of season.matches || []) {
      if (m.teamA?.short) present.add(m.teamA.short)
      if (m.teamB?.short) present.add(m.teamB.short)
    }
    return IPL_TEAM_FILTERS.filter((code) => code === 'ALL' || present.has(code))
  }, [season])

  const jumpToSeason = (yr) => {
    if (IPL_SEASONS_DATA[yr]) {
      setSeasonYear(yr)
      setTeamFilter('ALL')
      setStageFilter('all')
      setSubTab('matches')
    }
  }

  return (
    <div className="mt-5 space-y-5">
      {/* Season Selector Strip (All 19 Seasons: 2026–2008) + Quick Jump Dropdown */}
      <div className="flex items-center justify-between gap-2">
        <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-0.5">
          {IPL_SEASON_YEARS.map((yr) => {
            const active = yr === seasonYear
            return (
              <button
                key={yr}
                type="button"
                onClick={() => {
                  setSeasonYear(yr)
                  setTeamFilter('ALL')
                  setStageFilter('all')
                }}
                className={`shrink-0 rounded-full px-3.5 py-1.5 font-display text-[12px] transition-colors ${
                  active
                    ? 'bg-ink font-bold text-white'
                    : 'bg-sage font-semibold text-muted hover:text-ink'
                }`}
              >
                {yr}
              </button>
            )
          })}
        </div>

        <select
          aria-label="Select IPL Season"
          value={seasonYear}
          onChange={(e) => {
            setSeasonYear(e.target.value)
            setTeamFilter('ALL')
            setStageFilter('all')
          }}
          className="h-8 shrink-0 rounded-full border border-hairline bg-white px-3 font-display text-[12px] font-bold text-ink focus:outline-none focus:ring-2 focus:ring-pulse"
        >
          {IPL_SEASON_YEARS.map((yr) => (
            <option key={yr} value={yr}>
              IPL {yr}
            </option>
          ))}
        </select>
      </div>

      {/* Season Hero Card: Champion, Final Result & Cap Holders */}
      <motion.div
        key={season.year}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-[22px] border border-hairline bg-white shadow-sm"
      >
        <div className="h-1.5 w-full" style={{ backgroundColor: champ.color }} />
        <div className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-leader px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-brand-strong">
              <Trophy size={11} />
              IPL {season.year} · {season.edition}
            </span>
            <span className="text-[11px] font-semibold text-muted">
              Finalist: <span className="font-bold text-ink">{runner.name}</span>
            </span>
          </div>

          <div className="mt-3.5 flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                CHAMPIONS
              </p>
              <h2 className="mt-0.5 text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[26px]">
                {champ.name}
              </h2>
              <p className="mt-1 text-[13px] font-semibold text-brand-strong">
                {season.finalSummary}
              </p>
            </div>
            <div className="rounded-[14px] bg-sage/80 px-3.5 py-2 text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-muted">FINAL SCORE</p>
              <p className="mt-0.5 font-display text-[12px] font-bold text-ink">{season.finalScore}</p>
            </div>
          </div>

          {/* 4-Tile Season Honours Grid */}
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-[14px] bg-[#FFF7ED] p-3 ring-1 ring-[#FDBA74]/50">
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#C2410C]">
                ORANGE CAP
              </p>
              <p className="mt-1 truncate text-[13px] font-bold text-ink">{season.orangeCap.player}</p>
              <p className="font-display text-[12px] font-bold text-[#EA580C]">
                {season.orangeCap.value} <span className="font-sans text-[10px] font-medium text-muted">· {season.orangeCap.team}</span>
              </p>
            </div>

            <div className="rounded-[14px] bg-[#F5F3FF] p-3 ring-1 ring-[#C4B5FD]/50">
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#6D28D9]">
                PURPLE CAP
              </p>
              <p className="mt-1 truncate text-[13px] font-bold text-ink">{season.purpleCap.player}</p>
              <p className="font-display text-[12px] font-bold text-[#7C3AED]">
                {season.purpleCap.value} <span className="font-sans text-[10px] font-medium text-muted">· {season.purpleCap.team}</span>
              </p>
            </div>

            <div className="rounded-[14px] bg-sage/70 p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted">
                SEASON MVP
              </p>
              <p className="mt-1 truncate text-[13px] font-bold text-ink">{season.mvp.player}</p>
              <p className="truncate text-[11px] font-semibold text-brand-strong">
                {season.mvp.value}
              </p>
            </div>

            <div className="rounded-[14px] bg-sage/70 p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted">
                HIGHEST TOTAL
              </p>
              <p className="mt-1 font-display text-[15px] font-bold leading-tight text-ink">
                {season.highestTotal.team} {season.highestTotal.value}
              </p>
              <p className="truncate text-[11px] font-medium text-muted">
                {season.highestTotal.vs}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 4-Way Segmented Control: Matches | Table | Champions | Records */}
      <div className="grid grid-cols-4 rounded-full bg-sage p-1">
        {SUB_TABS.map((t) => {
          const active = subTab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`rounded-full py-2 text-[12px] transition-colors sm:text-[13px] ${
                active ? 'bg-pulse font-bold text-ink' : 'font-medium text-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ==================== TAB 1: MATCHES & RESULTS ==================== */}
      {subTab === 'matches' && (
        <div className="space-y-4">
          {/* Stage + Franchise Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'playoff', label: 'Playoffs & Final' },
                { id: 'league', label: 'League Classics' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStageFilter(st.id)}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
                    stageFilter === st.id
                      ? 'bg-ink text-white'
                      : 'bg-sage text-muted hover:text-ink'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {availableTeams.length > 2 && (
            <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {availableTeams.map((code) => {
                const active = teamFilter === code
                const f = IPL_FRANCHISES[code]
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setTeamFilter(code)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
                      active
                        ? 'bg-pulse text-ink'
                        : 'bg-white text-muted ring-1 ring-hairline hover:text-ink'
                    }`}
                  >
                    {f && (
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: f.color }}
                      />
                    )}
                    <span>{code === 'ALL' ? 'All Teams' : code}</span>
                  </button>
                )
              })}
            </div>
          )}

          {filteredMatches.length === 0 ? (
            <div className="rounded-[20px] border border-hairline bg-white p-8 text-center">
              <p className="text-[15px] font-semibold text-ink">
                No archived matches found for this filter in IPL {seasonYear}.
              </p>
              <button
                type="button"
                onClick={() => {
                  setTeamFilter('ALL')
                  setStageFilter('all')
                }}
                className="mt-3 rounded-full bg-pulse px-4 py-1.5 text-[12px] font-bold text-ink"
              >
                Show all IPL {seasonYear} matches
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
              {filteredMatches.map((m) => (
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
                  className="group cursor-pointer rounded-[20px] border border-hairline bg-white p-4 shadow-sm transition-all hover:border-ink/30 active:scale-[0.99]"
                >
                  {/* Stage & Date Header */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${
                        m.stage === 'FINAL'
                          ? 'bg-pulse text-ink'
                          : 'bg-sage text-brand-strong'
                      }`}
                    >
                      {m.stage}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted">
                      <Calendar size={11} />
                      {m.dateLabel}
                    </span>
                  </div>

                  {/* Team A Row */}
                  <div className="mt-3.5 flex items-baseline justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-5 w-[3px] shrink-0 rounded-full"
                        style={{ backgroundColor: m.teamA.color }}
                      />
                      <span className="truncate text-[15px] font-semibold text-ink">
                        {m.teamA.name}
                      </span>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="font-display text-[17px] font-bold text-ink">
                        {m.teamA.score}
                      </span>
                      {m.teamA.overs && (
                        <span className="ml-1.5 text-[11px] text-muted">({m.teamA.overs})</span>
                      )}
                    </div>
                  </div>

                  {/* Team B Row */}
                  <div className="mt-2 flex items-baseline justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-5 w-[3px] shrink-0 rounded-full"
                        style={{ backgroundColor: m.teamB.color }}
                      />
                      <span className="truncate text-[15px] font-semibold text-ink">
                        {m.teamB.name}
                      </span>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="font-display text-[17px] font-bold text-ink">
                        {m.teamB.score}
                      </span>
                      {m.teamB.overs && (
                        <span className="ml-1.5 text-[11px] text-muted">({m.teamB.overs})</span>
                      )}
                    </div>
                  </div>

                  {/* Result + Venue + Scorecard Prompt */}
                  <div className="mt-3.5 border-t border-hairline/80 pt-3">
                    <p className="text-[12px] font-semibold text-brand-strong">
                      {m.meta?.need}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {m.potm ? (
                        <span className="inline-flex min-w-0 items-center gap-1 truncate rounded-full bg-sage px-2.5 py-0.5 text-[10px] font-semibold text-ink">
                          <Award size={11} className="shrink-0 text-brand-strong" />
                          <span className="truncate">POTM: {m.potm}</span>
                        </span>
                      ) : (
                        <span className="truncate text-[11px] text-muted">{m.venue}</span>
                      )}

                      <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-bold text-ink group-hover:text-brand-strong">
                        Scorecard
                        <ChevronRight size={13} />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 2: POINTS TABLE ==================== */}
      {subTab === 'table' && (
        <div className="rounded-[20px] border border-hairline bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <div>
              <h3 className="text-[18px] font-semibold text-ink">IPL {season.year} Points Table</h3>
              <p className="text-[11px] text-muted">Top 4 teams qualified for the Playoffs (Q)</p>
            </div>
            <span className="rounded-full bg-sage-leader px-2.5 py-0.5 text-[10px] font-bold uppercase text-brand-strong">
              Final Standings
            </span>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[440px]">
              <div className="grid grid-cols-[28px_1fr_32px_32px_32px_58px_38px_108px] items-center gap-1 border-b border-hairline pb-2 text-[10px] font-bold uppercase tracking-[0.06em] text-muted">
                <span>#</span>
                <span>Team</span>
                <span className="text-right">M</span>
                <span className="text-right">W</span>
                <span className="text-right">L</span>
                <span className="text-right">NRR</span>
                <span className="text-right">PTS</span>
                <span className="text-right">Form</span>
              </div>

              <div className="divide-y divide-hairline/70">
                {(season.standings || []).map((row) => {
                  const f = franchiseOf(row.short)
                  const isChamp = row.short === season.champion
                  return (
                    <div
                      key={row.short}
                      className={`grid grid-cols-[28px_1fr_32px_32px_32px_58px_38px_108px] items-center gap-1 py-3 text-[13px] ${
                        row.qualified ? 'bg-sage-tint/45' : ''
                      }`}
                    >
                      <span className="font-display text-[12px] font-bold text-muted">
                        {pad2(row.pos)}
                      </span>
                      <div className="flex min-w-0 items-center gap-2 pr-2">
                        <span
                          className="h-5 w-[3px] shrink-0 rounded-full"
                          style={{ backgroundColor: f.color }}
                        />
                        <span className="truncate font-semibold text-ink">{f.name}</span>
                        {row.qualified && (
                          <span className="shrink-0 rounded bg-sage-leader px-1.5 py-0.2 text-[9px] font-extrabold text-brand-strong">
                            Q
                          </span>
                        )}
                        {isChamp && (
                          <Trophy size={12} className="shrink-0 text-[#D97706]" title="Season Champion" />
                        )}
                      </div>
                      <span className="text-right text-muted">{row.played}</span>
                      <span className="text-right font-semibold text-ink">{row.won}</span>
                      <span className="text-right text-muted">{row.lost}</span>
                      <span className="text-right font-display text-[12px] font-medium text-muted">
                        {row.nrr}
                      </span>
                      <span className="text-right font-display text-[14px] font-bold text-ink">
                        {row.points}
                      </span>
                      <div className="flex justify-end gap-1">
                        {(row.form || []).slice(-4).map((r, idx) => (
                          <FormDot key={idx} res={r} />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: CHAMPIONS (2008–2026) ==================== */}
      {subTab === 'champions' && (
        <div className="space-y-6">
          {/* Franchise Trophy Cabinet */}
          <div className="rounded-[20px] border border-hairline bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3.5 flex items-center gap-2">
              <Trophy size={16} className="text-brand-strong" />
              <div>
                <h3 className="text-[17px] font-semibold text-ink">Franchise Trophy Cabinet</h3>
                <p className="text-[11px] text-muted">All-time IPL title winners (2008–2026)</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {trophyCabinet.map((f) => (
                <div
                  key={f.short}
                  className="rounded-[16px] border border-hairline bg-sage/45 p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 font-display text-[10px] font-bold text-white"
                      style={{ backgroundColor: f.color }}
                    >
                      {f.short}
                    </span>
                    <span className="font-display text-[20px] font-bold leading-none text-ink">
                      {f.titles.length}
                      <span className="ml-0.5 font-sans text-[10px] font-semibold text-muted">
                        {f.titles.length === 1 ? 'title' : 'titles'}
                      </span>
                    </span>
                  </div>
                  <p className="mt-2 truncate text-[13px] font-semibold text-ink">{f.name}</p>
                  <p className="mt-1 text-[10px] font-medium leading-snug text-muted">
                    {f.titles.join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Complete 2008–2026 Roll of Honour Timeline */}
          <div className="rounded-[20px] border border-hairline bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <div>
                <h3 className="text-[17px] font-semibold text-ink">Roll of Honour (2008–2026)</h3>
                <p className="text-[11px] text-muted">Every IPL Final, Orange Cap & Purple Cap winner</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                {IPL_ROLL_OF_HONOUR.length} Editions
              </span>
            </div>

            <div className="divide-y divide-hairline/80">
              {IPL_ROLL_OF_HONOUR.map((ed) => {
                const win = franchiseOf(ed.winner)
                const run = franchiseOf(ed.runnerUp)
                const hasArchive = Boolean(IPL_SEASONS_DATA[ed.year])

                return (
                  <div
                    key={ed.year}
                    onClick={() => hasArchive && jumpToSeason(ed.year)}
                    role={hasArchive ? 'button' : undefined}
                    tabIndex={hasArchive ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (hasArchive && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault()
                        jumpToSeason(ed.year)
                      }
                    }}
                    className={`flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between ${
                      hasArchive ? 'cursor-pointer rounded-[12px] transition-colors hover:bg-sage/45 sm:px-2' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid h-9 w-12 shrink-0 place-items-center rounded-[10px] bg-sage font-display text-[13px] font-bold text-ink">
                        {ed.year}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: win.color }}
                          />
                          <span className="text-[14px] font-bold text-ink">{win.name}</span>
                          <span className="text-[11px] font-medium text-muted">
                            beat {run.short}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[12px] font-medium text-brand-strong">
                          {ed.margin} · <span className="text-muted">{ed.venue}</span>
                        </p>
                        <p className="mt-1 text-[11px] text-muted">
                          <span className="font-semibold text-[#C2410C]">Orange:</span> {ed.orangeCap} ·{' '}
                          <span className="font-semibold text-[#6D28D9]">Purple:</span> {ed.purpleCap}
                        </p>
                      </div>
                    </div>

                    {hasArchive && (
                      <span className="inline-flex shrink-0 items-center gap-0.5 self-end text-[11px] font-bold text-ink sm:self-center">
                        Explore
                        <ChevronRight size={13} />
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: ALL-TIME RECORDS ==================== */}
      {subTab === 'records' && (
        <div className="space-y-5">
          {/* Iconic Individual & Season Feats */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {IPL_ALL_TIME_RECORDS.iconicFeats.map((feat, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 rounded-[18px] border border-hairline bg-white p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                    {feat.label}
                  </p>
                  <p className="mt-1 truncate text-[13px] font-semibold text-ink">{feat.holder}</p>
                </div>
                <span className="shrink-0 rounded-[12px] bg-sage-leader px-3 py-1.5 font-display text-[15px] font-bold text-brand-strong">
                  {feat.value}
                </span>
              </div>
            ))}
          </div>

          {/* Most Runs + Most Wickets Side-by-Side on Desktop */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* All-Time Most Runs */}
            <div className="rounded-[20px] border border-hairline bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <Flame size={15} className="text-[#EA580C]" />
                <h3 className="text-[16px] font-semibold text-ink">All-Time Most Runs</h3>
              </div>
              <div className="divide-y divide-hairline/70">
                {IPL_ALL_TIME_RECORDS.mostRuns.map((p) => (
                  <div key={p.player} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="w-5 font-display text-[12px] font-bold text-muted">
                        {pad2(p.pos)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-ink">{p.player}</p>
                        <p className="truncate text-[11px] text-muted">
                          {p.team} · {p.matches} M
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 font-display text-[15px] font-bold text-ink">
                      {p.runs}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* All-Time Most Wickets */}
            <div className="rounded-[20px] border border-hairline bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <Medal size={15} className="text-[#7C3AED]" />
                <h3 className="text-[16px] font-semibold text-ink">All-Time Most Wickets</h3>
              </div>
              <div className="divide-y divide-hairline/70">
                {IPL_ALL_TIME_RECORDS.mostWickets.map((p) => (
                  <div key={p.player} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="w-5 font-display text-[12px] font-bold text-muted">
                        {pad2(p.pos)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-ink">{p.player}</p>
                        <p className="truncate text-[11px] text-muted">
                          {p.team} · Best {p.best}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 font-display text-[15px] font-bold text-ink">
                      {p.wickets}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Highest Team Totals */}
          <div className="rounded-[20px] border border-hairline bg-white p-4 shadow-sm sm:p-5">
            <h3 className="mb-3 text-[16px] font-semibold text-ink">Highest Team Totals in IPL History</h3>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {IPL_ALL_TIME_RECORDS.highestTotals.map((t, idx) => {
                const f = franchiseOf(t.team)
                return (
                  <div key={idx} className="rounded-[14px] bg-sage/60 p-3">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className="rounded px-1.5 py-0.5 font-display text-[10px] font-bold text-white"
                        style={{ backgroundColor: f.color }}
                      >
                        {t.team}
                      </span>
                      <span className="text-[10px] font-bold text-muted">{t.year}</span>
                    </div>
                    <p className="mt-2 font-display text-[20px] font-bold leading-none text-ink">
                      {t.score}
                    </p>
                    <p className="mt-1 truncate text-[11px] text-muted">
                      {t.vs} · {t.venue}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
