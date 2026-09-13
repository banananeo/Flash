import { useF1Store } from '../../store/useF1Store'

function fmtShort(dateUTC) {
  if (!dateUTC) return 'TBD'
  try {
    return new Date(dateUTC).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  } catch {
    return 'TBD'
  }
}

// Round-number comparison keeps render pure (no wall-clock reads):
// rounds run in order, so anything before the next round is done.
function raceState(race, nextRound) {
  if (nextRound == null) return { label: 'DONE', cls: 'bg-brutal-mint text-black' }
  if (race.round === nextRound) return { label: 'NEXT', cls: 'bg-brutal-yellow text-black' }
  if (race.round < nextRound) return { label: 'DONE', cls: 'bg-brutal-mint text-black' }
  return { label: fmtShort(race.dateUTC).toUpperCase(), cls: 'bg-white text-black dark:bg-raised dark:text-bone' }
}

// Full-season calendar. Tapping a completed round jumps to its results.
export default function F1Calendar({ schedule, nextRound, onSelectRound }) {
  const resultsRound = useF1Store((s) => s.resultsRound)
  const list = [...(schedule || [])].sort((a, b) => a.round - b.round)

  if (!list.length) {
    return (
      <p className="border-[3px] border-dashed border-black bg-white p-4 text-center font-mono text-xs font-bold uppercase dark:border-bone dark:bg-surface dark:text-bone">
        No calendar right now
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {list.map((r) => {
        const st = raceState(r, nextRound)
        const done = st.label === 'DONE'
        const active = String(resultsRound) === String(r.round)
        return (
          <button
            key={r.round}
            disabled={!done}
            onClick={() => done && onSelectRound?.(r.round)}
            className={`flex items-center gap-2 border-[3px] border-black px-2 py-1.5 text-left shadow-brutal-xs dark:border-bone ${active ? 'bg-black text-white dark:bg-ink dark:text-bone' : 'bg-white text-black dark:bg-surface dark:text-bone'} ${done ? '' : 'opacity-90'}`}
          >
            <span className="w-8 shrink-0 font-black text-lg">R{r.round}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-black text-sm leading-tight">{r.name}</p>
              <p className="truncate font-mono text-[10px] font-bold uppercase opacity-60">
                {r.locality ? `${r.locality}, ` : ''}{r.country}
                {r.hasSprint ? ' • Sprint' : ''}
              </p>
            </div>
            <span className={`shrink-0 border-2 border-black px-1.5 py-0.5 font-mono text-[10px] font-black ${st.cls}`}>
              {st.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
