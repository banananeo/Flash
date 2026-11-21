import { useEffect, useState } from 'react'
import { countdownParts, deriveNextSession } from '../../lib/f1'

// Country flag colors for minimal editorial flag strip (matches 07 · Formula 1)
const COUNTRY_CODE = {
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

function fmtDateUTC(dateUTC) {
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

function fmtTimeUTC(dateUTC) {
  if (!dateUTC) return ''
  try {
    const d = new Date(dateUTC)
    const hh = String(d.getUTCHours()).padStart(2, '0')
    const mm = String(d.getUTCMinutes()).padStart(2, '0')
    return `${hh}:${mm} UTC`
  } catch {
    return ''
  }
}

// 07 · Formula 1 — UP NEXT Grand Prix card
export default function F1Countdown({ nextRace, schedule, season }) {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(timer)
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
    return (
      <div className="rounded-[20px] border border-hairline bg-white p-6 text-ink shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
          SEASON COMPLETE
        </p>
        <p className="mt-2.5 text-[24px] font-semibold leading-tight">
          {season || '2026'} World Championship concluded.
        </p>
      </div>
    )
  }

  const flag = COUNTRY_CODE[nextRace?.country] || ''

  return (
    <div className="rounded-[20px] border border-hairline bg-white p-6 text-ink shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
            {nextRace ? `UP NEXT / ROUND ${nextRace.round}` : 'UP NEXT'}
          </p>
          <h2 className="mt-3 text-[26px] font-semibold leading-[1.18] tracking-[-0.015em] text-ink">
            {nextRace?.name || 'Formula 1 session'}
          </h2>
        </div>

        {flag && (
          <span className="shrink-0 text-[28px] leading-none" aria-hidden="true">
            {flag}
          </span>
        )}
      </div>

      {nextRace && <div className="mt-6 flex items-end justify-between gap-4">
        <p className="min-w-0 truncate text-[12px] font-medium text-muted">
          {nextRace.circuit || nextRace.locality}
        </p>
        <div className="shrink-0 text-right">
          <p className="font-display text-[15px] font-bold text-brand-strong">
            {fmtDateUTC(nextRace.dateUTC)}
          </p>
          <p className="mt-0.5 text-[11px] font-bold tracking-[0.04em] text-brand-strong">
            {fmtTimeUTC(nextRace.dateUTC)}
          </p>
        </div>
      </div>}

      <div className="mt-5 rounded-[16px] bg-sage-tint p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-strong">
              NEXT SESSION
            </p>
            {nextSession ? (
              <>
                <p className="mt-1.5 text-[15px] font-semibold leading-tight text-ink">
                  {nextSession.label}
                </p>
                <p className="mt-0.5 truncate text-[11px] font-medium text-muted">
                  {nextSession.raceName}{nextSession.circuit ? ` · ${nextSession.circuit}` : ''}
                </p>
              </>
            ) : (
              <p className="mt-1.5 text-[13px] font-semibold text-ink">No upcoming session times available.</p>
            )}
          </div>
          {nextSession && (
            <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-brand-strong">
              Local time
            </span>
          )}
        </div>

        {nextSession && countdown && (
          <>
            <p className="mt-3 text-[11px] font-semibold text-muted">{sessionDateLocal}</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {[
                { label: 'Days', value: countdown.d },
                { label: 'Hours', value: countdown.h },
                { label: 'Mins', value: countdown.m },
                { label: 'Secs', value: countdown.s },
              ].map((part) => (
                <div key={part.label} className="rounded-[11px] bg-white px-2 py-2 text-center">
                  <p className="font-display text-[19px] font-bold leading-none text-ink">
                    {String(part.value).padStart(2, '0')}
                  </p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-muted">{part.label}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
