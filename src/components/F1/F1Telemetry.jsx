import { useEffect, useRef, useState } from 'react'
import { CloudRain, Flag, Gauge, Pause, Play, RefreshCw, Sun, Thermometer, Timer, Volume2, Wind } from 'lucide-react'
import { useF1Store } from '../../store/useF1Store'
import { safeHttpUrl } from '../../lib/safeUrl'

const pad2 = (n) => String(n).padStart(2, '0')
const teamColour = (c) => `#${String(c || '64748B').replace(/^#/, '')}`

const COMPOUND_META = {
  SOFT: { short: 'S', label: 'Soft', bg: 'bg-[#E11D48] text-white' },
  MEDIUM: { short: 'M', label: 'Medium', bg: 'bg-[#F59E0B] text-ink' },
  HARD: { short: 'H', label: 'Hard', bg: 'bg-ink text-white' },
  INTERMEDIATE: { short: 'I', label: 'Inter', bg: 'bg-[#10B981] text-white' },
  WET: { short: 'W', label: 'Wet', bg: 'bg-[#2563EB] text-white' },
}

export function TyreBadge({ compound, showLabel = false }) {
  const key = String(compound || '').toUpperCase()
  const meta = COMPOUND_META[key]
  if (!meta) return null
  return (
    <span
      title={`${meta.label} tyre`}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] ${meta.bg}`}
    >
      <span>{meta.short}</span>
      {showLabel && <span className="font-semibold">{meta.label}</span>}
    </span>
  )
}

function FlagBadge({ flag, category }) {
  const f = String(flag || category || 'INFO').toUpperCase()
  let cls = 'bg-sage text-ink'
  if (f.includes('RED')) cls = 'bg-live text-white'
  else if (f.includes('YELLOW')) cls = 'bg-[#F59E0B] text-ink'
  else if (f.includes('GREEN') || f.includes('CLEAR')) cls = 'bg-[#10B981] text-white'
  else if (f.includes('CHEQUERED')) cls = 'bg-ink text-white'
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] ${cls}`}>
      {f}
    </span>
  )
}

export default function F1Telemetry() {
  const telemetry = useF1Store((s) => s.telemetry)
  const telemetryLoading = useF1Store((s) => s.telemetryLoading)
  const telemetryError = useF1Store((s) => s.telemetryError)
  const fetchTelemetry = useF1Store((s) => s.fetchTelemetry)

  const [subTab, setSubTab] = useState('timing') // timing | tyres | control
  const [playingId, setPlayingId] = useState(null)
  const audioRef = useRef(null)

  const sessions = telemetry?.sessions || []
  const active = telemetry?.activeSession || null
  const weather = telemetry?.weather || null
  const drivers = telemetry?.drivers || []
  const raceControl = telemetry?.raceControl || []
  const teamRadio = telemetry?.teamRadio || []

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

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

  return (
    <div className="space-y-6">
      {/* Header: Grand Prix Weekend + Refresh */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="mt-1 text-[26px] font-medium leading-tight tracking-[-0.02em] text-ink">
            {telemetry?.meetingName || 'Grand Prix Telemetry'}
          </h2>
          {telemetry?.location && (
            <p className="mt-0.5 text-[12px] font-medium text-muted">
              {telemetry.location}{telemetry.country ? ` · ${telemetry.country}` : ''}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => fetchTelemetry(active?.code || '')}
          title="Refresh telemetry"
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-sage px-3.5 text-[12px] font-semibold text-ink transition-colors hover:bg-hairline"
        >
          <RefreshCw size={13} className={telemetryLoading ? 'animate-spin' : ''} />
          <span>Sync</span>
        </button>
      </div>

      {/* Weekend Session Selector Pills (FP1 | FP2 | FP3 | QUAL | RACE) */}
      {sessions.length > 0 && (
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
          {sessions.map((s) => {
            const isSelected = active?.code === s.code
            const isLive = s.status === 'live'
            return (
              <button
                key={s.code}
                type="button"
                onClick={() => fetchTelemetry(s.code)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] transition-colors ${isSelected
                    ? 'bg-pulse font-bold text-ink'
                    : 'bg-white font-semibold text-muted ring-1 ring-hairline hover:text-ink'
                  }`}
              >
                {isLive && <span className="h-2 w-2 rounded-full bg-live" />}
                <span>{s.name}</span>
                {s.status === 'upcoming' && (
                  <span className="text-[10px] font-normal opacity-75">(Upcoming)</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Track Weather Strip */}
      {weather && (
        <div className="grid grid-cols-2 gap-2.5 rounded-[18px] border border-hairline bg-white p-4 sm:grid-cols-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sage text-brand-strong">
              <Thermometer size={15} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-muted">Track / Air</p>
              <p className="font-display text-[14px] font-bold text-ink">
                {weather.trackTemp}°C <span className="font-normal text-muted">/ {weather.airTemp}°C</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sage text-brand-strong">
              {weather.rainfall ? <CloudRain size={15} /> : <Sun size={15} />}
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-muted">Surface</p>
              <p className="font-display text-[14px] font-bold text-ink">
                {weather.rainfall ? 'Wet Track' : 'Dry Track'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sage text-brand-strong">
              <Wind size={15} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-muted">Wind</p>
              <p className="font-display text-[14px] font-bold text-ink">{weather.windSpeed} m/s</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sage text-brand-strong">
              <Gauge size={15} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-muted">Humidity</p>
              <p className="font-display text-[14px] font-bold text-ink">{weather.humidity}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Sub-view Switcher: Timing & Sectors | Tyre Strategy | Race Control & Radio */}
      <div className="flex items-center gap-2">
        {[
          { id: 'timing', label: 'Timing & Sectors', icon: Timer },
          { id: 'tyres', label: 'Tyre Stints', icon: Gauge },
          {
            id: 'control',
            label: `Race Control & Radio${raceControl.length || teamRadio.length ? ` (${raceControl.length + teamRadio.length})` : ''}`,
            icon: Flag,
          },
        ].map((t) => {
          const Icon = t.icon
          const isAct = subTab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] transition-colors ${isAct ? 'bg-ink font-bold text-white' : 'bg-sage font-medium text-muted hover:text-ink'
                }`}
            >
              <Icon size={13} />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {telemetryError && (
        <div className="rounded-[14px] bg-sage px-4 py-3 text-[12px] font-medium text-ink">
          {telemetryError}
        </div>
      )}

      {telemetryLoading && !drivers.length ? (
        <div className="space-y-3">
          <div className="h-14 animate-pulse rounded-[14px] bg-white" />
          <div className="h-14 animate-pulse rounded-[14px] bg-white" />
          <div className="h-14 animate-pulse rounded-[14px] bg-white" />
        </div>
      ) : !drivers.length ? (
        <div className="rounded-[20px] bg-white p-8 text-center">
          <p className="text-[16px] font-semibold text-ink">
            {active?.name || 'Session'} hasn’t started yet.
          </p>
          <p className="mt-1 text-[13px] text-muted">
            Select a completed or active session pill above to inspect lap times, sector splits, and tyre stints.
          </p>
        </div>
      ) : subTab === 'timing' ? (
        /* ==================== 1. TIMING, SECTORS & SPEED TRAP ==================== */
        <div className="rounded-[20px] border border-hairline bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center justify-between border-b border-hairline pb-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
            <span>DRIVER / SECTORS (S1 · S2 · S3)</span>
            <span>BEST LAP / SPEED TRAP</span>
          </div>

          <div className="divide-y divide-hairline/80">
            {drivers.map((d, idx) => {
              const isLeader = idx === 0
              return (
                <div
                  key={d.num || d.acro || idx}
                  className={`flex items-center justify-between gap-3 py-3 ${isLeader ? '-mx-2 rounded-[14px] bg-sage-leader/60 px-2' : ''
                    }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="w-6 shrink-0 font-display text-[13px] font-bold text-muted">
                      {pad2(d.pos || idx + 1)}
                    </span>
                    <span
                      className="h-8 w-[3px] shrink-0 rounded-full"
                      style={{ backgroundColor: teamColour(d.colour) }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[14px] font-semibold text-ink sm:text-[15px]">
                          {d.name}
                        </p>
                        <TyreBadge compound={d.currentCompound} />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-medium text-muted">
                        <span>{d.team}</span>
                        {d.laps > 0 && <span>· {d.laps}L</span>}
                        {(d.s1 || d.s2 || d.s3) && (
                          <span className="inline-flex items-center gap-1 font-display text-[11px]">
                            <span
                              className={`rounded px-1 ${d.purpleS1 ? 'bg-[#9333EA] font-bold text-white' : 'bg-sage text-ink'
                                }`}
                            >
                              S1 {d.s1 || '–'}
                            </span>
                            <span
                              className={`rounded px-1 ${d.purpleS2 ? 'bg-[#9333EA] font-bold text-white' : 'bg-sage text-ink'
                                }`}
                            >
                              S2 {d.s2 || '–'}
                            </span>
                            <span
                              className={`rounded px-1 ${d.purpleS3 ? 'bg-[#9333EA] font-bold text-white' : 'bg-sage text-ink'
                                }`}
                            >
                              S3 {d.s3 || '–'}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-display text-[14px] font-bold text-ink">
                      {d.bestLapDisplay || d.statusText || '—'}
                    </p>
                    <p className="mt-0.5 font-display text-[11px] font-semibold text-muted">
                      {d.gapDisplay ? d.gapDisplay : isLeader && d.bestLapDisplay ? 'SESSION BEST' : ''}
                      {d.topSpeed ? `${d.gapDisplay || isLeader ? ' · ' : ''}${d.topSpeed} km/h` : ''}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : subTab === 'tyres' ? (
        /* ==================== 2. TYRE STRATEGY & STINTS ==================== */
        <div className="rounded-[20px] border border-hairline bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center justify-between border-b border-hairline pb-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
            <span>DRIVER</span>
            <span>STINT HISTORY (COMPOUND & LAP RANGE)</span>
          </div>

          <div className="divide-y divide-hairline/80">
            {drivers.map((d, idx) => (
              <div key={d.num || idx} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 font-display text-[12px] font-bold text-muted">
                    {pad2(d.pos || idx + 1)}
                  </span>
                  <span
                    className="h-6 w-[3px] rounded-full"
                    style={{ backgroundColor: teamColour(d.colour) }}
                  />
                  <div>
                    <p className="text-[14px] font-semibold text-ink">{d.name}</p>
                    <p className="text-[11px] text-muted">{d.team} · {d.laps} laps</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {d.stints?.length ? (
                    d.stints.map((st) => (
                      <div
                        key={st.stintNumber}
                        className="inline-flex items-center gap-1.5 rounded-full bg-sage px-2.5 py-1 text-[11px] font-semibold text-ink"
                      >
                        <TyreBadge compound={st.compound} />
                        <span>
                          L{st.lapStart}–{st.lapEnd}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-[11px] text-muted">No stint telemetry logged</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ==================== 3. FIA RACE CONTROL & TEAM RADIO ==================== */
        <div className="space-y-6">
          {/* Team Radio Clips */}
          {teamRadio.length > 0 && (
            <div className="rounded-[20px] border border-hairline bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <Volume2 size={15} className="text-brand-strong" />
                <h3 className="text-[15px] font-semibold text-ink">Team Radio Clips</h3>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {teamRadio.map((clip) => {
                  const isPlaying = playingId === clip.id
                  return (
                    <button
                      key={clip.id}
                      type="button"
                      onClick={() => toggleAudio(clip)}
                      className={`flex items-center justify-between gap-3 rounded-[14px] px-3.5 py-2.5 text-left transition-colors ${isPlaying ? 'bg-pulse text-ink' : 'bg-sage hover:bg-hairline'
                        }`}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="h-6 w-[3px] shrink-0 rounded-full"
                          style={{ backgroundColor: teamColour(clip.colour) }}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-ink">
                            {clip.acro} · {clip.name}
                          </p>
                          <p className="truncate text-[11px] text-muted">{clip.team}</p>
                        </div>
                      </div>
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-ink shadow-sm">
                        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* FIA Race Control Feed */}
          <div className="rounded-[20px] border border-hairline bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Flag size={15} className="text-brand-strong" />
              <h3 className="text-[15px] font-semibold text-ink">FIA Race Control Messages</h3>
            </div>
            {raceControl.length === 0 ? (
              <p className="text-[13px] text-muted">No race control messages for this session.</p>
            ) : (
              <div className="divide-y divide-hairline/80">
                {raceControl.map((rc) => (
                  <div key={rc.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium leading-snug text-ink">{rc.message}</p>
                      {rc.lap && (
                        <p className="mt-0.5 text-[11px] text-muted">Lap {rc.lap}</p>
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
