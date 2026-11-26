import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { countdownParts, deriveNextSession } from '../../lib/f1'

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

function fmtDateShort(dateUTC) {
  if (!dateUTC) return ''
  try {
    const d = new Date(dateUTC)
    const day = String(d.getUTCDate()).padStart(2, '0')
    const mon = d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }).toUpperCase()
    return `${day} ${mon}`
  } catch {
    return ''
  }
}

const pad2 = (n) => String(n).padStart(2, '0')

// Minimalist UP NEXT Grand Prix card + compact single-line ticker for secondary tabs
export default function F1Countdown({
  nextRace,
  schedule,
  season,
  compact = false,
  onOpenCalendar,
}) {
  const [nowMs, setNowMs] = useState(() => Date.now())

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

  const nextSession = deriveNextSession(schedule, nowMs)
  const countdown = nextSession ? countdownParts(nextSession.dateUTC.getTime(), nowMs) : null

  const sessionDateLocal = nextSession?.dateUTC.toLocaleString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })

  if (!nextRace?.dateUTC && !nextSession) {
    if (compact) return null
    return (
      <div className="rounded-[22px] border border-hairline bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
          SEASON COMPLETE
        </p>
        <p className="mt-2 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink">
          {season || '2026'} World Championship concluded
        </p>
      </div>
    )
  }

  const flag = COUNTRY_FLAG[nextRace?.country] || ''
  const locationLine = [nextRace?.circuit, nextRace?.locality || nextRace?.country]
    .filter(Boolean)
    .join(' · ')

  if (compact) {
    const shortName = (nextRace?.name || nextSession?.raceName || 'Grand Prix').replace(
      'Grand Prix',
      'GP',
    )
    return (
      <button
        type="button"
        onClick={onOpenCalendar}
        className="group flex w-full items-center justify-between gap-3 rounded-full border border-hairline bg-white px-4 py-2.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.02)] transition-colors hover:border-hairline-soft"
      >
        <div className="flex min-w-0 items-center gap-2 text-[12px]">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-pulse" />
          <span className="truncate font-semibold text-ink">
            {flag ? `${flag} ` : ''}
            {shortName}
          </span>
          {nextSession && (
            <span className="truncate text-muted">· {nextSession.label}</span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {countdown && (
            <span className="font-display text-[12px] font-bold tabular-nums text-brand-strong">
              {countdown.d > 0 ? `${countdown.d}d ` : ''}
              {pad2(countdown.h)}h {pad2(countdown.m)}m
            </span>
          )}
          <ChevronRight
            size={13}
            className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
          />
        </div>
      </button>
    )
  }

  return (
    <div className="rounded-[22px] border border-hairline bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] sm:p-6">
      {/* Top Meta Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand-strong">
            {nextRace ? `UP NEXT · ROUND ${nextRace.round}` : 'UP NEXT'}
          </span>
          {nextRace?.hasSprint && (
            <span className="rounded-full bg-sage px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-ink">
              Sprint
            </span>
          )}
        </div>

        {nextRace?.dateUTC && (
          <span className="font-display text-[12px] font-semibold tracking-[0.06em] text-muted">
            {fmtDateShort(nextRace.dateUTC)}
          </span>
        )}
      </div>

      {/* Race Title + Single Location Line */}
      <div className="mt-3">
        <h2 className="text-[24px] font-semibold leading-[1.15] tracking-[-0.02em] text-ink sm:text-[28px]">
          {flag && <span className="mr-2">{flag}</span>}
          {nextRace?.name || nextSession?.raceName || 'Formula 1 Grand Prix'}
        </h2>
        {locationLine && (
          <p className="mt-1 truncate text-[13px] font-medium text-muted">{locationLine}</p>
        )}
      </div>

      {/* Hairline Divider + Session Countdown */}
      <div className="mt-5 border-t border-hairline pt-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
              NEXT SESSION
            </p>
            {nextSession ? (
              <>
                <p className="mt-1 text-[15px] font-semibold leading-snug text-ink">
                  {nextSession.label}
                </p>
                <p className="mt-0.5 text-[12px] font-medium text-muted">{sessionDateLocal}</p>
              </>
            ) : (
              <p className="mt-1 text-[13px] font-medium text-muted">
                Session schedule to be confirmed
              </p>
            )}
          </div>

          {nextSession && countdown && (
            <div
              aria-label="Time until next session"
              className="flex items-baseline gap-2.5 self-start rounded-[14px] bg-sage/65 px-3.5 py-2.5 sm:self-auto sm:bg-transparent sm:p-0"
            >
              {[
                { label: 'D', full: 'Days', value: countdown.d },
                { label: 'H', full: 'Hrs', value: countdown.h },
                { label: 'M', full: 'Min', value: countdown.m },
                { label: 'S', full: 'Sec', value: countdown.s },
              ].map((part, i) => (
                <div key={part.label} className="flex items-baseline gap-2.5">
                  {i > 0 && (
                    <span className="font-display text-[16px] font-medium text-muted/50">:</span>
                  )}
                  <div className="text-center sm:min-w-[34px]">
                    <p className="font-display text-[22px] font-bold leading-none tabular-nums tracking-tight text-ink sm:text-[25px]">
                      {pad2(part.value)}
                    </p>
                    <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] text-muted">
                      {part.full}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
