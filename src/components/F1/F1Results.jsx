import { useState } from 'react'
import { useF1Store } from '../../store/useF1Store'

const pad2 = (n) => String(n).padStart(2, '0')

function fmtRaceMeta(schedule, round, circuit) {
  const hit = (schedule || []).find((r) => String(r.round) === String(round))
  let dateStr = ''
  if (hit?.dateUTC) {
    try {
      const d = new Date(hit.dateUTC)
      const dd = String(d.getUTCDate()).padStart(2, '0')
      const mon = d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }).toUpperCase()
      dateStr = `${dd} ${mon} ${d.getUTCFullYear()}`
    } catch { /* ignore */ }
  }
  return [circuit || hit?.circuit, dateStr, round ? `ROUND ${round}` : '']
    .filter(Boolean)
    .join(' · ')
    .toUpperCase()
}

// 09 · Race results — teal winner hero card + classification table
export default function F1Results({ nextRound }) {
  const [mode, setMode] = useState('race') // race | qualifying | practice
  const schedule = useF1Store((s) => s.schedule)
  const resultsRound = useF1Store((s) => s.resultsRound)
  const raceResults = useF1Store((s) => s.raceResults)
  const qualiResults = useF1Store((s) => s.qualiResults)
  const resultsLoading = useF1Store((s) => s.resultsLoading)
  const fetchRound = useF1Store((s) => s.fetchRound)

  const doneRounds = [...(schedule || [])]
    .filter((r) => nextRound == null || r.round < nextRound)
    .sort((a, b) => b.round - a.round)

  const data = mode === 'qualifying' ? qualiResults : raceResults
  const rows = data?.rows || []
  const winner = rows[0] || null
  const rest = rows.slice(1)
  const activeRound = data?.round || resultsRound

  return (
    <div>
      {/* Title + Round picker */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[28px] font-medium leading-tight tracking-[-0.02em] text-ink">
            {data?.raceName || 'Latest Grand Prix'}
          </h2>
          <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
            {fmtRaceMeta(schedule, activeRound, data?.circuit)}
          </p>
        </div>

        {doneRounds.length > 0 && (
          <select
            aria-label="Select round"
            value={resultsRound || ''}
            onChange={(e) => fetchRound(e.target.value || 'last')}
            className="shrink-0 rounded-full bg-sage px-3 py-1.5 text-[12px] font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-pulse"
          >
            {!resultsRound && <option value="">Latest</option>}
            {!!resultsRound && !doneRounds.some((r) => String(r.round) === String(resultsRound)) && (
              <option value={resultsRound}>R{resultsRound}</option>
            )}
            {doneRounds.map((r) => (
              <option key={r.round} value={r.round}>
                R{r.round}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Session Pills: Race | Qualifying | Practice */}
      <div className="mt-5 flex items-center gap-2">
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
              onClick={() => setMode(t.id)}
              className={`rounded-full px-4 py-1.5 text-[13px] transition-colors ${
                active ? 'bg-pulse font-semibold text-ink' : 'font-medium text-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {resultsLoading ? (
        <div className="mt-6 space-y-4">
          <div className="h-[160px] animate-pulse rounded-[20px] bg-sage" />
          <div className="h-12 animate-pulse rounded-[12px] bg-white" />
          <div className="h-12 animate-pulse rounded-[12px] bg-white" />
        </div>
      ) : mode === 'practice' ? (
        <div className="mt-6 rounded-[20px] bg-white p-6 text-center">
          <p className="text-[16px] font-semibold text-ink">Practice timing unavailable</p>
          <p className="mt-1.5 text-[13px] text-muted">
            Jolpica provides official Qualifying and Race classifications. Switch tabs above to inspect session results.
          </p>
        </div>
      ) : !rows.length ? (
        <div className="mt-6 rounded-[20px] bg-white p-6 text-center text-[13px] text-muted">
          Classification pending — results land after the chequered flag.
        </div>
      ) : (
        <div className="mt-6">
          {/* Winner / Pole Hero Card */}
          {winner && (
            <div className="flex items-center justify-between gap-4 rounded-[20px] bg-pulse p-6 text-ink">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink/75">
                  {mode === 'qualifying' ? 'POLE POSITION' : 'RACE WINNER'}
                </p>
                <p className="mt-2.5 text-[28px] font-semibold leading-[1.12] tracking-[-0.02em] text-ink">
                  {winner.name}
                </p>
                <p className="mt-3 text-[12px] font-bold text-ink/85">
                  {winner.team}
                  {mode === 'qualifying'
                    ? winner.best
                      ? ` · ${winner.best}`
                      : ''
                    : winner.time
                      ? ` · ${winner.time}`
                      : ''}
                </p>
              </div>
              <span className="shrink-0 font-display text-[56px] font-bold leading-none tracking-tight text-ink">
                01
              </span>
            </div>
          )}

          {/* Classification Table */}
          <div className="mt-6 flex items-center justify-between border-b border-hairline pb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
            <span>CLASSIFICATION</span>
            <span>{mode === 'qualifying' ? 'BEST LAP' : 'TIME / GAP'}</span>
          </div>

          <div className="divide-y divide-hairline/80">
            {rest.map((r, i) => {
              const posLabel =
                mode === 'qualifying'
                  ? r.pos < 99
                    ? pad2(r.pos)
                    : '–'
                  : r.pos != null
                    ? pad2(r.pos)
                    : r.posText || '–'
              const rightVal =
                mode === 'qualifying'
                  ? r.best || 'No time'
                  : r.time || r.status || '—'
              return (
                <div key={r.num || r.acro || i} className="flex items-center gap-4 py-3.5">
                  <span className="w-7 shrink-0 font-display text-[13px] font-medium text-muted">
                    {posLabel}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-ink">{r.name}</p>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-muted">
                      {r.team}
                    </p>
                  </div>
                  <span className="shrink-0 font-display text-[13px] font-semibold text-ink">
                    {rightVal}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
