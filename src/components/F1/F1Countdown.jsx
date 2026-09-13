import { useEffect, useState } from 'react'
import { countdownParts } from '../../lib/f1'

function fmtLocal(dateUTC) {
  if (!dateUTC) return ''
  try {
    return new Date(dateUTC).toLocaleString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

// Persistent next-race countdown banner. Ticks client-side every 30s —
// zero API load. Times shown in the viewer's local timezone.
export default function F1Countdown({ nextRace }) {
  // Clock lives in state (set from an effect) so render stays pure.
  const [now, setNow] = useState(null)

  useEffect(() => {
    // Kick async (not sync setState) + 30s tick — render stays pure.
    const kick = setTimeout(() => setNow(Date.now()), 0)
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => {
      clearTimeout(kick)
      clearInterval(t)
    }
  }, [])

  if (!nextRace?.dateUTC) {
    return (
      <div className="border-[3px] border-black bg-white px-3 py-2 text-xs font-black uppercase text-black shadow-brutal-xs dark:border-bone dark:bg-surface dark:text-bone">
        2026 season complete — see you next year
      </div>
    )
  }

  const target = new Date(nextRace.dateUTC).getTime()
  const parts = now == null ? null : countdownParts(target, now)
  const { d, h, m, live } = parts || {}
  const pad = (n) => String(n).padStart(2, '0')

  return (
    <div className="border-[3px] border-black bg-black p-3 text-white shadow-brutal-sm dark:border-bone dark:bg-ink">
      <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-brutal-yellow">
        {live ? 'Race window' : 'Next race'}
      </p>
      <p className="mt-0.5 font-black text-lg leading-tight">
        {nextRace.name}
        {nextRace.hasSprint ? <span className="ml-2 border-2 border-brutal-pink bg-brutal-pink px-1.5 py-0.5 align-middle font-mono text-[10px] text-black">SPRINT</span> : null}
      </p>
      <p className="font-mono text-[11px] font-bold uppercase text-white/70">
        {nextRace.circuit ? `${nextRace.circuit} • ` : ''}{fmtLocal(nextRace.dateUTC)}
      </p>
      {!live ? (
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          {[
            [parts ? d : '••', 'days'],
            [parts ? `${pad(h)}:${pad(m)}` : '••:••', 'hrs:min'],
            [`R${nextRace.round}`, 'round'],
          ].map(([v, l]) => (
            <div key={l} className="border-[3px] border-brutal-yellow bg-brutal-yellow px-2 py-1 text-black">
              <p className="font-black text-2xl leading-none">{v}</p>
              <p className="font-mono text-[10px] font-bold uppercase">{l}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 inline-block border-2 border-brutal-mint bg-brutal-mint px-2 py-0.5 font-mono text-[11px] font-black uppercase text-black">
          Lights out window — results land after the flag
        </p>
      )}
    </div>
  )
}
