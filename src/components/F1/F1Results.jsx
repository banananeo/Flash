import { useState } from 'react'
import { motion } from 'framer-motion'
import { useF1Store } from '../../store/useF1Store'

function ResultRow({ r, i }) {
  const classified = r.pos != null
  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: Math.min(i * 0.02, 0.3) }}
      className={`flex items-center gap-2 border-[3px] px-2 py-1.5 shadow-brutal-xs ${r.pos === 1 ? 'border-black bg-brutal-yellow text-black' : 'border-black bg-white text-black dark:border-bone dark:bg-surface dark:text-bone'}`}
    >
      <span className="w-7 shrink-0 font-black text-lg">{classified ? r.pos : r.posText || '–'}</span>
      <span className="h-7 w-1.5 shrink-0 border border-black" style={{ backgroundColor: `#${r.colour || '666666'}` }} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-black text-sm leading-tight">
          {r.acro} <span className="font-mono text-[10px] font-bold uppercase opacity-60">{r.team}</span>
        </p>
        <p className="truncate font-mono text-[10px] font-bold uppercase opacity-60">
          {r.grid != null ? `P${r.grid} → ` : ''}{r.status || ''}
          {r.fastest ? ` • FL ${r.fastest}` : ''}
        </p>
      </div>
      {r.points > 0 && (
        <span className="shrink-0 font-mono text-[10px] font-bold opacity-60">+{r.points}</span>
      )}
      <span className="shrink-0 font-mono text-xs font-black">{r.time || (classified ? '' : r.status)}</span>
    </motion.div>
  )
}

// Per-round session results: Race | Qualifying toggle + round selector.
export default function F1Results({ nextRound }) {
  const [mode, setMode] = useState('race') // race | qualifying
  const schedule = useF1Store((s) => s.schedule)
  const resultsRound = useF1Store((s) => s.resultsRound)
  const raceResults = useF1Store((s) => s.raceResults)
  const qualiResults = useF1Store((s) => s.qualiResults)
  const resultsLoading = useF1Store((s) => s.resultsLoading)
  const fetchRound = useF1Store((s) => s.fetchRound)

  // Completed = rounds before the next one (pure render, no clock reads).
  const doneRounds = [...(schedule || [])]
    .filter((r) => nextRound == null || r.round < nextRound)
    .sort((a, b) => b.round - a.round)

  const data = mode === 'race' ? raceResults : qualiResults
  const rows = data?.rows || []

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs font-black uppercase">
          Round
          <select
            value={resultsRound || ''}
            onChange={(e) => e.target.value && fetchRound(e.target.value)}
            className="border-2 border-black bg-white px-2 py-1.5 text-sm font-bold text-black"
          >
            {!resultsRound && <option value="">Latest</option>}
            {doneRounds.map((r) => (
              <option key={r.round} value={r.round}>R{r.round} • {r.name}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2 self-end">
          {[
            { id: 'race', label: 'Race' },
            { id: 'qualifying', label: 'Quali' },
          ].map((t) => (
            <motion.button
              key={t.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => setMode(t.id)}
              className={`border-[3px] border-black px-2 py-1.5 text-xs font-black uppercase dark:border-bone ${mode === t.id ? 'bg-black text-white' : 'bg-white text-black dark:bg-surface dark:text-bone'}`}
            >
              {t.label}
            </motion.button>
          ))}
        </div>
      </div>

      {!!data?.raceName && (
        <p className="font-mono text-[11px] font-bold uppercase opacity-60">
          {data.raceName}{data.circuit ? ` • ${data.circuit}` : ''}
        </p>
      )}

      {resultsLoading ? (
        <div className="animate-pulse border-[3px] border-black bg-white p-4 shadow-brutal-sm dark:border-bone dark:bg-surface">
          <div className="h-4 bg-black/20" />
          <div className="mt-2 h-6 bg-black/40" />
        </div>
      ) : mode === 'race' ? (
        <div className="flex flex-col gap-1.5">
          {rows.map((r, i) => <ResultRow key={r.num || r.acro || i} r={r} i={i} />)}
          {!rows.length && (
            <p className="border-[3px] border-dashed border-black bg-white p-4 text-center font-mono text-xs font-bold uppercase dark:border-bone dark:bg-surface dark:text-bone">
              Results pending — lands after the flag
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {rows.map((r, i) => (
            <div
              key={r.num || r.acro || i}
              className={`flex items-center gap-2 border-[3px] px-2 py-1.5 shadow-brutal-xs ${r.pos === 1 ? 'border-black bg-brutal-mint text-black' : 'border-black bg-white text-black dark:border-bone dark:bg-surface dark:text-bone'}`}
            >
              <span className="w-7 shrink-0 font-black text-lg">P{r.pos}</span>
              <span className="h-7 w-1.5 shrink-0 border border-black" style={{ backgroundColor: `#${r.colour || '666666'}` }} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-black text-sm leading-tight">
                  {r.acro} <span className="font-mono text-[10px] font-bold uppercase opacity-60">{r.team}</span>
                </p>
                <p className="truncate font-mono text-[10px] font-bold uppercase opacity-60">
                  {[r.q1 && `Q1 ${r.q1}`, r.q2 && `Q2 ${r.q2}`, r.q3 && `Q3 ${r.q3}`].filter(Boolean).join(' • ') || 'No time'}
                </p>
              </div>
              {!!r.best && (
                <span className="shrink-0 border-2 border-brutal-red bg-brutal-red px-1.5 py-0.5 font-mono text-[11px] font-black text-white">
                  {r.best}
                </span>
              )}
            </div>
          ))}
          {!rows.length && (
            <p className="border-[3px] border-dashed border-black bg-white p-4 text-center font-mono text-xs font-bold uppercase dark:border-bone dark:bg-surface dark:text-bone">
              Qualifying pending — lands after Saturday quali
            </p>
          )}
        </div>
      )}
    </div>
  )
}
