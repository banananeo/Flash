import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { useF1Store } from '../../store/useF1Store'
import { TyreBadge } from './F1Telemetry'

const pad2 = (n) => String(n).padStart(2, '0')
const teamColour = (c) => `#${String(c || '64748B').replace(/^#/, '')}`

function fmtRaceMeta(schedule, round, circuit) {
  const hit = (schedule || []).find((r) => String(r.round) === String(round))
  let dateStr = ''
  if (hit?.dateUTC) {
    try {
      const d = new Date(hit.dateUTC)
      const dd = String(d.getUTCDate()).padStart(2, '0')
      const mon = d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }).toUpperCase()
      dateStr = `${dd} ${mon}`
    } catch {
      /* ignore */
    }
  }
  return [round ? `ROUND ${round}` : '', hit?.locality || circuit || hit?.circuit, dateStr]
    .filter(Boolean)
    .join(' · ')
    .toUpperCase()
}

function shortRaceOption(r) {
  const place = r.locality || r.country || String(r.name || '').replace(/\s*Grand Prix$/i, '')
  return place ? `R${r.round} · ${place}` : `R${r.round}`
}

function parseLapSeconds(str) {
  if (!str) return Infinity
  const parts = String(str).trim().split(':')
  if (parts.length === 2) {
    const mins = Number(parts[0])
    const secs = Number(parts[1])
    if (Number.isFinite(mins) && Number.isFinite(secs)) return mins * 60 + secs
  }
  const v = Number(str)
  return Number.isFinite(v) ? v : Infinity
}

// Session Results — Race, Qualifying & Practice
export default function F1Results({ nextRound, onOpenTelemetry }) {
  const [mode, setMode] = useState('race') // race | qualifying | practice
  const schedule = useF1Store((s) => s.schedule)
  const resultsRound = useF1Store((s) => s.resultsRound)
  const raceResults = useF1Store((s) => s.raceResults)
  const qualiResults = useF1Store((s) => s.qualiResults)
  const resultsLoading = useF1Store((s) => s.resultsLoading)
  const fetchRound = useF1Store((s) => s.fetchRound)
  const telemetry = useF1Store((s) => s.telemetry)
  const telemetryLoading = useF1Store((s) => s.telemetryLoading)
  const fetchTelemetry = useF1Store((s) => s.fetchTelemetry)

  // Only show practice telemetry when it belongs to an active race weekend
  const practiceSessions = telemetry?.telemetryClosed
    ? []
    : (telemetry?.sessions || []).filter((s) => ['FP1', 'FP2', 'FP3'].includes(s.code))
  const practiceDrivers = telemetry?.telemetryClosed ? [] : telemetry?.drivers || []

  const doneRounds = useMemo(
    () =>
      [...(schedule || [])]
        .filter((r) => nextRound == null || r.round < nextRound)
        .sort((a, b) => b.round - a.round),
    [schedule, nextRound],
  )

  const data = mode === 'qualifying' ? qualiResults : raceResults
  const rows = useMemo(() => data?.rows || [], [data])
  const winner = rows[0] || null
  const rest = rows.slice(1)
  const activeRound = data?.round || resultsRound

  // Identify overall fastest lap holder in Race mode
  const fastestDriverAcro = useMemo(() => {
    if (mode !== 'race' || !rows.length) return ''
    let bestSec = Infinity
    let bestAcro = ''
    for (const r of rows) {
      const s = parseLapSeconds(r.fastest)
      if (s < bestSec) {
        bestSec = s
        bestAcro = r.acro || r.name
      }
    }
    return bestAcro
  }, [mode, rows])

  return (
    <div>
      {/* Header + Round Selector */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
            {fmtRaceMeta(schedule, activeRound, data?.circuit)}
          </p>
          <h2 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[25px]">
            {data?.raceName || 'Latest Grand Prix'}
          </h2>
        </div>

        {doneRounds.length > 0 && (
          <select
            aria-label="Select round"
            value={resultsRound || ''}
            onChange={(e) => fetchRound(e.target.value || 'last')}
            className="h-8 shrink-0 rounded-full border border-hairline bg-white px-3.5 font-display text-[12px] font-semibold text-ink shadow-[0_1px_2px_rgba(15,23,42,0.03)] focus:outline-none focus:ring-2 focus:ring-pulse"
          >
            {!resultsRound && <option value="">Latest</option>}
            {!!resultsRound &&
              !doneRounds.some((r) => String(r.round) === String(resultsRound)) && (
                <option value={resultsRound}>R{resultsRound}</option>
              )}
            {doneRounds.map((r) => (
              <option key={r.round} value={r.round}>
                {shortRaceOption(r)}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Underline Session Tabs: Race | Qualifying | Practice */}
      <div
        role="tablist"
        aria-label="Session classification"
        className="mt-5 flex items-center gap-6 border-b border-hairline"
      >
        {[
          { id: 'race', label: 'Race' },
          { id: 'qualifying', label: 'Qualifying' },
          { id: 'practice', label: 'Practice' },
        ].map((t) => {
          const active = mode === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMode(t.id)}
              className={`relative pb-3 text-[14px] transition-colors ${
                active ? 'font-bold text-ink' : 'font-medium text-muted hover:text-ink'
              }`}
            >
              {t.label}
              {active && (
                <motion.span
                  layoutId="f1-results-underline"
                  transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-pulse"
                />
              )}
            </button>
          )
        })}
      </div>

      {resultsLoading ? (
        <div className="mt-5 space-y-4">
          <div className="h-[136px] animate-pulse rounded-[22px] border border-hairline bg-white" />
          <div className="h-[260px] animate-pulse rounded-[22px] border border-hairline bg-white" />
        </div>
      ) : mode === 'practice' ? (
        <div className="mt-5 space-y-4">
          {/* Practice Switcher + Telemetry Link */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-full bg-sage p-1">
              {(practiceSessions.length
                ? practiceSessions
                : [
                    { code: 'FP1', name: 'FP1' },
                    { code: 'FP2', name: 'FP2' },
                    { code: 'FP3', name: 'FP3' },
                  ]
              ).map((ps) => {
                const isAct = telemetry?.activeSession?.code === ps.code
                return (
                  <button
                    key={ps.code}
                    type="button"
                    onClick={() => fetchTelemetry(ps.code)}
                    className={`rounded-full px-3 py-1 text-[12px] transition-colors ${
                      isAct
                        ? 'bg-white font-semibold text-ink shadow-sm'
                        : 'font-medium text-muted hover:text-ink'
                    }`}
                  >
                    {ps.code || ps.name}
                  </button>
                )
              })}
            </div>

            {onOpenTelemetry && (
              <button
                type="button"
                onClick={onOpenTelemetry}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-strong transition-colors hover:text-ink"
              >
                <span>Pit wall telemetry</span>
                <ArrowUpRight size={13} />
              </button>
            )}
          </div>

          {telemetryLoading && !practiceDrivers.length ? (
            <div className="h-[240px] animate-pulse rounded-[22px] border border-hairline bg-white" />
          ) : !practiceDrivers.length ? (
            <div className="rounded-[22px] border border-hairline bg-white p-6 text-center text-[13px] text-muted">
              No practice laps recorded for this session yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-[22px] border border-hairline bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
              <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted sm:px-6">
                <span>
                  {telemetry?.meetingName} · {telemetry?.activeSession?.name}
                </span>
                <span>Best / Gap</span>
              </div>
              <div className="divide-y divide-hairline/70">
                {practiceDrivers.map((d, i) => (
                  <div
                    key={d.num || d.acro || i}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-6"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="w-6 shrink-0 font-display text-[12.5px] font-medium tabular-nums text-muted">
                        {pad2(d.pos || i + 1)}
                      </span>
                      <span
                        className="h-6 w-[3px] shrink-0 rounded-full"
                        style={{ backgroundColor: teamColour(d.colour) }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[14.5px] font-semibold text-ink">{d.name}</p>
                          <TyreBadge compound={d.currentCompound} />
                        </div>
                        <p className="mt-0.5 truncate text-[11.5px] font-medium text-muted">
                          {d.team}
                          {d.laps ? ` · ${d.laps} laps` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right font-display tabular-nums">
                      <p className="text-[13.5px] font-bold text-ink">{d.bestLapDisplay || '—'}</p>
                      {d.gapDisplay && (
                        <p className="mt-0.5 text-[11px] font-medium text-muted">{d.gapDisplay}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : !rows.length ? (
        <div className="mt-5 rounded-[22px] border border-hairline bg-white p-6 text-center text-[13px] text-muted">
          Classification pending — results land after the chequered flag.
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {/* Minimalist Winner / Pole Spotlight Card */}
          {winner && (
            <div className="overflow-hidden rounded-[22px] border border-hairline bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
              <div
                className="h-[3px] w-full"
                style={{ backgroundColor: teamColour(winner.colour) }}
              />
              <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand-strong">
                    {mode === 'qualifying' ? 'POLE POSITION' : 'RACE WINNER'}
                  </p>
                  <p className="mt-2 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[26px]">
                    {winner.name}
                  </p>
                  <p className="mt-0.5 text-[13px] font-medium text-muted">{winner.team}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {(mode === 'qualifying' ? winner.best : winner.time) && (
                      <span className="rounded-full bg-sage px-3 py-1 font-display text-[12px] font-bold tabular-nums text-ink">
                        {mode === 'qualifying' ? winner.best : winner.time}
                      </span>
                    )}
                    {mode === 'race' && winner.points > 0 && (
                      <span className="rounded-full bg-sage-tint px-2.5 py-1 font-display text-[11px] font-bold tabular-nums text-brand-strong">
                        +{winner.points} PTS
                      </span>
                    )}
                    {mode === 'race' && winner.grid > 1 && (
                      <span className="rounded-full bg-sage/75 px-2.5 py-1 text-[11px] font-semibold text-muted">
                        Grid P{winner.grid} → P1
                      </span>
                    )}
                  </div>
                </div>

                <span className="shrink-0 font-display text-[40px] font-bold leading-none tracking-tight text-ink/10 sm:text-[48px]">
                  01
                </span>
              </div>
            </div>
          )}

          {/* Contained Classification Card */}
          {rest.length > 0 && (
            <div className="overflow-hidden rounded-[22px] border border-hairline bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
              <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted sm:px-6">
                <span>Classification</span>
                <span>{mode === 'qualifying' ? 'Best Lap' : 'Time / Pts'}</span>
              </div>

              <div className="divide-y divide-hairline/70">
                {rest.map((r, i) => {
                  const isClassified = mode === 'qualifying' ? r.pos < 99 : r.pos != null
                  const posLabel = isClassified
                    ? pad2(r.pos)
                    : r.posText === 'R'
                      ? 'DNF'
                      : r.posText || '–'
                  const rightVal =
                    mode === 'qualifying'
                      ? r.best || 'No time'
                      : r.time || r.status || '—'
                  const hasFastest =
                    mode === 'race' &&
                    fastestDriverAcro &&
                    (r.acro === fastestDriverAcro || r.name === fastestDriverAcro)
                  const koStage =
                    mode === 'qualifying'
                      ? !r.q2
                        ? 'Q1'
                        : !r.q3
                          ? 'Q2'
                          : ''
                      : ''

                  return (
                    <div
                      key={r.num || r.acro || i}
                      className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-sage/35 sm:gap-4 sm:px-6"
                    >
                      <span
                        className={`w-7 shrink-0 font-display text-[12.5px] tabular-nums ${
                          isClassified ? 'font-medium text-muted' : 'font-semibold text-muted/70'
                        }`}
                      >
                        {posLabel}
                      </span>

                      <span
                        className="h-6 w-[3px] shrink-0 rounded-full"
                        style={{ backgroundColor: teamColour(r.colour) }}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[14.5px] font-semibold leading-tight text-ink">
                            {r.name}
                          </p>
                          {hasFastest && (
                            <span
                              title={`Fastest lap: ${r.fastest}`}
                              className="shrink-0 rounded-full bg-purple-50 px-1.5 py-0.5 font-display text-[9px] font-bold tracking-[0.04em] text-[#7E22CE]"
                            >
                              FL
                            </span>
                          )}
                          {koStage && (
                            <span className="shrink-0 rounded bg-sage px-1.5 py-0.5 font-display text-[9px] font-bold text-muted">
                              {koStage}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[12px] font-medium text-muted">
                          {r.team}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-baseline gap-3 font-display tabular-nums">
                        <span
                          className={`text-[13px] ${
                            isClassified ? 'font-semibold text-ink' : 'font-medium text-muted'
                          }`}
                        >
                          {rightVal}
                        </span>
                        {mode === 'race' && (
                          <span
                            className={`hidden w-9 text-right text-[12px] sm:inline ${
                              r.points > 0 ? 'font-bold text-brand-strong' : 'text-muted/50'
                            }`}
                          >
                            {r.points > 0 ? `+${r.points}` : '—'}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
