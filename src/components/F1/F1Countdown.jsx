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
export default function F1Countdown({ nextRace, season }) {
  if (!nextRace?.dateUTC) {
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

  const flag = COUNTRY_CODE[nextRace.country] || ''

  return (
    <div className="rounded-[20px] border border-hairline bg-white p-6 text-ink shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
            UP NEXT / ROUND {nextRace.round}
          </p>
          <h2 className="mt-3 text-[26px] font-semibold leading-[1.18] tracking-[-0.015em] text-ink">
            {nextRace.name}
          </h2>
        </div>

        {flag && (
          <span className="shrink-0 text-[28px] leading-none" aria-hidden="true">
            {flag}
          </span>
        )}
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
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
      </div>
    </div>
  )
}
