import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { CloudRain, Pause, Play, RefreshCw, Sun, Volume2 } from 'lucide-react'
import { useF1Store } from '../../store/useF1Store'
import { countdownParts, getTelemetryWeekendState } from '../../lib/f1'
import { safeHttpUrl } from '../../lib/safeUrl'

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

const COMPOUND_META = {
  SOFT: { short: 'S', label: 'Soft', ring: '#E11D48' },
  MEDIUM: { short: 'M', label: 'Medium', ring: '#F59E0B' },
  HARD: { short: 'H', label: 'Hard', ring: '#334155' },
  INTERMEDIATE: { short: 'I', label: 'Inter', ring: '#10B981' },
  WET: { short: 'W', label: 'Wet', ring: '#2563EB' },
}

// Minimalist F1 TV-inspired compound ring badge
export function TyreBadge({ compound, showLabel = false }) {
  const key = String(compound || '').toUpperCase()
  const meta = COMPOUND_META[key]
  if (!meta) return null

  const ringEl = (
    <span
      title={!showLabel ? `${meta.label} tyre` : undefined}
      style={{ borderColor: meta.ring }}
      className="inline-grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[2px] bg-white font-display text-[9.5px] font-extrabold leading-none text-ink"
    >
      {meta.short}
    </span>
  )

  if (!showLabel) return ringEl
  return (
    <span
      title={`${meta.label} tyre`}
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink"
    >
      {ringEl}
      <span>{meta.label}</span>
    </span>
  )
}

function FlagBadge({ flag, category }) {
  const f = String(flag || category || 'INFO').toUpperCase()
  let cls = 'bg-sage text-muted'
  if (f.includes('RED')) cls = 'bg-live/10 text-live'
  else if (f.includes('YELLOW')) cls = 'bg-amber-50 text-amber-700'
  else if (f.includes('GREEN') || f.includes('CLEAR')) cls = 'bg-sage-tint text-brand-strong'
  else if (f.includes('CHEQUERED')) cls = 'bg-ink text-white'
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.06em] ${cls}`}
    >
      {f}
    </span>
  )
}

function shortSessionLabel(s) {
  const c = String(s?.code || '').toUpperCase()
  if (c === 'QUAL' || c === 'QUALI') return 'Quali'
  if (c === 'RACE') return 'Race'
  if (c === 'SPRINT' || c === 'SPR') return 'Sprint'
  if (c) return c
  return s?.name || 'Session'
}

function fmtLocalSession(dateUTC) {
  if (!dateUTC) return { day: '', time: '' }
  try {
    const d = dateUTC instanceof Date ? dateUTC : new Date(dateUTC)
    const day = d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' })
    const time = d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    })
    return { day, time }
  } catch {
    return { day: '', time: '' }
  }
}

export default function F1Telemetry() {
  const schedule = useF1Store((s) => s.schedule)
  const season = useF1Store((s) => s.season)
  const telemetry = useF1Store((s) => s.telemetry)
  const telemetryLoading = useF1Store((s) => s.telemetryLoading)
  const telemetryError = useF1Store((s) => s.telemetryError)
  const fetchTelemetry = useF1Store((s) => s.fetchTelemetry)

  const [nowMs, setNowMs] = useState(() => Date.now())
  const [subTab, setSubTab] = useState('timing') // timing | tyres | control
  const [playingId, setPlayingId] = useState(null)
  const audioRef = useRef(null)

  useEffect(() => {
    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return
      setNowMs(Date.now())
    }
    const onVis = () => {
      if (typeof document !== 'undefined' && !document.hidden) setNowMs(Date.now())
    }
    const timer = setInterval(tick, 1000)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const weekendState = getTelemetryWeekendState(schedule, telemetry, nowMs)

  // Stop any playing radio clip if the 3-hour post-race window closes
  useEffect(() => {
    if (!weekendState.isOpen && audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setPlayingId(null)
    }
  }, [weekendState.isOpen])

  const toggleAudio = (clip) => {
    const safeUrl = safeHttpUrl(clip?.url)
    if (!safeUrl) return
    if (playingId === clip.id && audioRef.current) {
      audioRef.current.pause()
      setPlayingId(null)
      return
    }
    if (audioRef.current) {
      audioRef.current.pause()
    }
    const audio = new Audio(safeUrl)
    audioRef.current = audio
    setPlayingId(clip.id)
    audio.onended = () => setPlayingId(null)
    audio.onerror = () => setPlayingId(null)
    audio.play().catch(() => setPlayingId(null))
  }

  // ==================== BETWEEN RACE WEEKENDS (>3H AFTER PREVIOUS RACE) ====================
  if (!weekendState.isOpen) {
    const { nextWeekend, targetDateUTC, targetLabel, weekendSessions } = weekendState
    const countdown = targetDateUTC ? countdownParts(targetDateUTC.getTime(), nowMs) : null
    const flag = COUNTRY_FLAG[nextWeekend?.country] || ''
    const raceTitle =
      nextWeekend?.name ||
      (telemetry?.meetingName && telemetry.meetingName !== 'Next Grand Prix'
        ? telemetry.meetingName
        : '')
    const locationLine = [
      nextWeekend?.circuit || telemetry?.location,
      nextWeekend?.locality || nextWeekend?.country,
    ]
      .filter(Boolean)
      .join(' · ')
    const targetFmt = fmtLocalSession(targetDateUTC)

    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[24px]">
            Race Telemetry
          </h2>
          <p className="mt-1 text-[13px] font-medium text-muted">
            Previous race telemetry closes 3 hours after the finish. Live timing opens when the next race weekend begins.
          </p>
        </div>

        {!raceTitle && !targetDateUTC ? (
          <div className="rounded-[22px] border border-hairline bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
              SEASON COMPLETE
            </p>
            <p className="mt-2 text-[20px] font-semibold tracking-[-0.02em] text-ink">
              {season || '2026'} Championship concluded
            </p>
          </div>
        ) : (
          <>
            {/* Next Race Weekend Countdown Card */}
            <div className="rounded-[22px] border border-hairline bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand-strong">
                    {nextWeekend?.round
                      ? `NEXT RACE WEEKEND · ROUND ${nextWeekend.round}`
                      : 'NEXT RACE WEEKEND'}
                  </span>
                </div>
                {nextWeekend?.hasSprint && (
                  <span className="rounded-full bg-sage px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-ink">
                    Sprint
                  </span>
                )}
              </div>

              <div className="mt-3">
                <h3 className="text-[24px] font-semibold leading-[1.15] tracking-[-0.02em] text-ink sm:text-[28px]">
                  {flag && <span className="mr-2">{flag}</span>}
                  {raceTitle || 'Upcoming Grand Prix'}
                </h3>
                {locationLine && (
                  <p className="mt-1 truncate text-[13px] font-medium text-muted">{locationLine}</p>
                )}
              </div>

              {countdown && (
                <div className="mt-5 border-t border-hairline pt-4">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                        TELEMETRY OPENS · {targetLabel.toUpperCase()}
                      </p>
                      {(targetFmt.day || targetFmt.time) && (
                        <p className="mt-1 text-[13px] font-medium text-ink">
                          {[targetFmt.day, targetFmt.time].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>

                    <div
                      aria-label="Countdown to next race weekend"
                      className="flex items-baseline gap-2.5 self-start rounded-[14px] bg-sage/65 px-3.5 py-2.5 sm:self-auto sm:bg-transparent sm:p-0"
                    >
                      {[
                        { label: 'Days', value: countdown.d },
                        { label: 'Hrs', value: countdown.h },
                        { label: 'Min', value: countdown.m },
                        { label: 'Sec', value: countdown.s },
                      ].map((part, i) => (
                        <div key={part.label} className="flex items-baseline gap-2.5">
                          {i > 0 && (
                            <span className="font-display text-[16px] font-medium text-muted/50">
                              :
                            </span>
                          )}
                          <div className="text-center sm:min-w-[34px]">
                            <p className="font-display text-[22px] font-bold leading-none tabular-nums tracking-tight text-ink sm:text-[25px]">
                              {pad2(part.value)}
                            </p>
                            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] text-muted">
                              {part.label}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Weekend Session Timetable */}
            {weekendSessions.length > 0 && (
              <div className="overflow-hidden rounded-[22px] border border-hairline bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
                <div className="flex items-center justify-between border-b border-hairline px-4 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-muted sm:px-6">
                  <span>Weekend Schedule</span>
                  <span>Local Time</span>
                </div>
                <div className="divide-y divide-hairline/70">
                  {weekendSessions.map((ws, idx) => {
                    const fmt = fmtLocalSession(ws.dateUTC)
                    const isFirst = idx === 0
                    return (
                      <div
                        key={`${ws.code}-${idx}`}
                        className={`flex items-center justify-between gap-3 px-4 py-3.5 sm:px-6 ${
                          isFirst ? 'bg-sage-tint/45' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isFirst ? 'bg-pulse' : 'bg-hairline-soft'
                            }`}
                          />
                          <span className="text-[14px] font-semibold text-ink">{ws.label}</span>
                        </div>
                        <div className="text-right font-display text-[12px] tabular-nums">
                          <span className="font-medium text-muted">{fmt.day}</span>
                          {fmt.time && (
                            <span className="ml-2 font-bold text-ink">{fmt.time}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // ==================== ACTIVE RACE WEEKEND TELEMETRY ====================
  const sessions = telemetry?.sessions || []
  const active = telemetry?.activeSession || null
  const weather = telemetry?.weather || null
  const drivers = telemetry?.drivers || []
  const raceControl = telemetry?.raceControl || []
  const teamRadio = telemetry?.teamRadio || []
  const controlCount = raceControl.length + teamRadio.length

  return (
    <div className="space-y-5">
      {/* Consolidated Header + Inline Weather Telemetry */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {telemetry?.location && (
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
              {[telemetry.location, telemetry.country].filter(Boolean).join(' · ')}
            </p>
          )}
          <h2 className="mt-1 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[25px]">
            {telemetry?.meetingName || 'Race Telemetry'}
          </h2>

          {weather && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-medium text-muted">
              <span className="inline-flex items-center gap-1 text-ink">
                {weather.rainfall ? (
                  <CloudRain size={12} className="text-brand-strong" />
                ) : (
                  <Sun size={12} className="text-brand-strong" />
                )}
                <span>{weather.rainfall ? 'Wet' : 'Dry'}</span>
              </span>
              <span>·</span>
              <span className="font-display tabular-nums">
                Track <strong className="font-semibold text-ink">{weather.trackTemp}°C</strong>
              </span>
              <span>·</span>
              <span className="font-display tabular-nums">
                Air <strong className="font-semibold text-ink">{weather.airTemp}°C</strong>
              </span>
              {weather.windSpeed != null && (
                <>
                  <span className="hidden sm:inline">·</span>
                  <span className="hidden font-display tabular-nums sm:inline">
                    Wind {weather.windSpeed} m/s
                  </span>
                </>
              )}
              {weather.humidity != null && (
                <>
                  <span className="hidden sm:inline">·</span>
                  <span className="hidden font-display tabular-nums sm:inline">
                    {weather.humidity}% RH
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => fetchTelemetry(active?.code || '')}
          title="Sync telemetry"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-hairline bg-white px-3 text-[12px] font-semibold text-ink shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors hover:bg-sage"
        >
          <RefreshCw size={12} className={telemetryLoading ? 'animate-spin text-brand-strong' : ''} />
          <span>Sync</span>
        </button>
      </div>

      {/* Compact Weekend Session Selector */}
      {sessions.length > 0 && (
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto py-0.5">
          {sessions.map((s) => {
            const isSelected = active?.code === s.code
            const isLive = s.status === 'live'
            const isUpcoming = s.status === 'upcoming'
            return (
              <button
                key={s.code}
                type="button"
                onClick={() => fetchTelemetry(s.code)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] transition-colors ${
                  isSelected
                    ? 'bg-ink font-semibold text-white'
                    : isUpcoming
                      ? 'bg-sage/60 font-medium text-muted/65 hover:text-ink'
                      : 'bg-sage font-medium text-muted hover:text-ink'
                }`}
              >
                {isLive && <span className="h-1.5 w-1.5 rounded-full bg-live" />}
                <span>{shortSessionLabel(s)}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Underline Sub-view Tabs */}
      <div
        role="tablist"
        aria-label="Telemetry views"
        className="flex items-center gap-6 border-b border-hairline"
      >
        {[
          { id: 'timing', label: 'Timing' },
          { id: 'tyres', label: 'Tyre Stints' },
          {
            id: 'control',
            label: controlCount > 0 ? `Race Control (${controlCount})` : 'Race Control',
          },
        ].map((t) => {
          const isAct = subTab === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isAct}
              onClick={() => setSubTab(t.id)}
              className={`relative pb-3 text-[14px] transition-colors ${
                isAct ? 'font-bold text-ink' : 'font-medium text-muted hover:text-ink'
              }`}
            >
              {t.label}
              {isAct && (
                <motion.span
                  layoutId="f1-telem-underline"
                  transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-pulse"
                />
              )}
            </button>
          )
        })}
      </div>

      {telemetryError && (
        <div className="rounded-[14px] border border-hairline bg-white px-4 py-3 text-[12px] font-medium text-muted">
          {telemetryError}
        </div>
      )}

      {telemetryLoading && !drivers.length ? (
        <div className="h-[280px] animate-pulse rounded-[22px] border border-hairline bg-white" />
      ) : !drivers.length ? (
        <div className="rounded-[22px] border border-hairline bg-white p-8 text-center">
          <p className="text-[15px] font-semibold text-ink">
            {active?.name || 'Session'} has not started yet
          </p>
          <p className="mt-1 text-[12.5px] text-muted">
            Select a completed or active session above to inspect lap times, sectors, and stints.
          </p>
        </div>
      ) : subTab === 'timing' ? (
        <div className="overflow-hidden rounded-[22px] border border-hairline bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted sm:px-6">
            <span>Driver · Sectors</span>
            <span>Best / Gap</span>
          </div>

          <div className="divide-y divide-hairline/70">
            {drivers.map((d, idx) => {
              const isLeader = idx === 0
              return (
                <div
                  key={d.num || d.acro || idx}
                  className={`flex items-center justify-between gap-3 px-4 py-3.5 transition-colors sm:px-6 ${
                    isLeader ? 'bg-sage-tint/55' : 'hover:bg-sage/35'
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span
                      className={`w-6 shrink-0 font-display text-[12.5px] tabular-nums ${
                        isLeader ? 'font-bold text-brand-strong' : 'font-medium text-muted'
                      }`}
                    >
                      {pad2(d.pos || idx + 1)}
                    </span>

                    <span
                      className="h-7 w-[3px] shrink-0 rounded-full"
                      style={{ backgroundColor: teamColour(d.colour) }}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[14.5px] font-semibold leading-tight text-ink">
                          {d.name}
                        </p>
                        <TyreBadge compound={d.currentCompound} />
                      </div>

                      <div className="mt-1 flex items-center gap-2 truncate text-[11.5px] font-medium text-muted">
                        <span className="truncate">{d.team}</span>
                        {d.laps > 0 && (
                          <span className="shrink-0 font-display text-[11px] tabular-nums">
                            · {d.laps}L
                          </span>
                        )}
                        {(d.s1 || d.s2 || d.s3) && (
                          <span className="hidden shrink-0 items-center gap-1.5 font-display text-[11px] tabular-nums sm:inline-flex">
                            <span>·</span>
                            <span
                              className={
                                d.purpleS1
                                  ? 'rounded bg-purple-50 px-1 font-bold text-[#7E22CE]'
                                  : 'text-muted'
                              }
                            >
                              {d.s1 || '–'}
                            </span>
                            <span className="text-muted/40">/</span>
                            <span
                              className={
                                d.purpleS2
                                  ? 'rounded bg-purple-50 px-1 font-bold text-[#7E22CE]'
                                  : 'text-muted'
                              }
                            >
                              {d.s2 || '–'}
                            </span>
                            <span className="text-muted/40">/</span>
                            <span
                              className={
                                d.purpleS3
                                  ? 'rounded bg-purple-50 px-1 font-bold text-[#7E22CE]'
                                  : 'text-muted'
                              }
                            >
                              {d.s3 || '–'}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right font-display tabular-nums">
                    <p className="text-[13.5px] font-bold text-ink sm:text-[14px]">
                      {d.bestLapDisplay || d.statusText || '—'}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-muted">
                      {d.gapDisplay
                        ? d.gapDisplay
                        : isLeader && d.bestLapDisplay
                          ? 'Fastest'
                          : ''}
                      {d.topSpeed
                        ? `${d.gapDisplay || (isLeader && d.bestLapDisplay) ? ' · ' : ''}${d.topSpeed} km/h`
                        : ''}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : subTab === 'tyres' ? (
        <div className="overflow-hidden rounded-[22px] border border-hairline bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted sm:px-6">
            <span>Driver</span>
            <span>Compound & Lap Window</span>
          </div>

          <div className="divide-y divide-hairline/70">
            {drivers.map((d, idx) => (
              <div
                key={d.num || idx}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-6 shrink-0 font-display text-[12.5px] font-medium tabular-nums text-muted">
                    {pad2(d.pos || idx + 1)}
                  </span>
                  <span
                    className="h-6 w-[3px] shrink-0 rounded-full"
                    style={{ backgroundColor: teamColour(d.colour) }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[14.5px] font-semibold text-ink">{d.name}</p>
                    <p className="truncate text-[11.5px] text-muted">
                      {d.team}
                      {d.laps ? ` · ${d.laps} laps` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {d.stints?.length ? (
                    d.stints.map((st) => (
                      <div
                        key={st.stintNumber}
                        className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-sage/45 px-2.5 py-1 font-display text-[11px] font-semibold tabular-nums text-ink"
                      >
                        <TyreBadge compound={st.compound} />
                        <span>
                          L{st.lapStart}–{st.lapEnd}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-[11.5px] text-muted">No stint data</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {teamRadio.length > 0 && (
            <div className="overflow-hidden rounded-[22px] border border-hairline bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <Volume2 size={14} className="text-brand-strong" />
                <h3 className="text-[14px] font-semibold text-ink">Team Radio</h3>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {teamRadio.map((clip) => {
                  const isPlaying = playingId === clip.id
                  return (
                    <button
                      key={clip.id}
                      type="button"
                      onClick={() => toggleAudio(clip)}
                      className={`flex items-center justify-between gap-3 rounded-[14px] border px-3.5 py-2.5 text-left transition-colors ${
                        isPlaying
                          ? 'border-pulse/40 bg-sage-tint text-ink'
                          : 'border-hairline bg-white hover:bg-sage/45'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="h-6 w-[3px] shrink-0 rounded-full"
                          style={{ backgroundColor: teamColour(clip.colour) }}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-ink">
                            <span className="font-display font-bold">{clip.acro}</span> · {clip.name}
                          </p>
                          <p className="truncate text-[11px] text-muted">{clip.team}</p>
                        </div>
                      </div>
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition-colors ${
                          isPlaying ? 'bg-pulse text-white' : 'bg-sage text-ink'
                        }`}
                      >
                        {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-[22px] border border-hairline bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
            <div className="border-b border-hairline px-4 py-3 sm:px-6">
              <h3 className="text-[14px] font-semibold text-ink">FIA Race Control</h3>
            </div>
            {raceControl.length === 0 ? (
              <p className="p-6 text-center text-[13px] text-muted">
                No race control messages for this session.
              </p>
            ) : (
              <div className="divide-y divide-hairline/70">
                {raceControl.map((rc) => (
                  <div
                    key={rc.id}
                    className="flex items-start justify-between gap-3 px-4 py-3.5 sm:px-6"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium leading-relaxed text-ink">
                        {rc.message}
                      </p>
                      {rc.lap && (
                        <p className="mt-0.5 font-display text-[11px] text-muted">Lap {rc.lap}</p>
                      )}
                    </div>
                    <FlagBadge flag={rc.flag} category={rc.category} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
