function monthKey(dateUTC) {
  if (!dateUTC) return { label: 'UPCOMING', year: '' }
  try {
    const d = new Date(dateUTC)
    return {
      label: d.toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' }).toUpperCase(),
      year: String(d.getUTCFullYear()),
    }
  } catch {
    return { label: 'UPCOMING', year: '' }
  }
}

function dayParts(dateUTC) {
  if (!dateUTC) return { day: '--', mon: 'TBD' }
  try {
    const d = new Date(dateUTC)
    return {
      day: String(d.getUTCDate()).padStart(2, '0'),
      mon: d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }).toUpperCase(),
    }
  } catch {
    return { day: '--', mon: 'TBD' }
  }
}

// 08 · Race calendar — grouped by month with a clear UP NEXT highlight
export default function F1Calendar({ schedule, season, nextRound, onSelectRound }) {
  const list = [...(schedule || [])].sort((a, b) => a.round - b.round)

  if (!list.length) {
    return (
      <p className="rounded-[16px] bg-white p-6 text-center text-[13px] text-muted">
        Race calendar unavailable right now.
      </p>
    )
  }

  // Group chronologically by month
  const groups = []
  const byKey = new Map()
  for (const r of list) {
    const mk = monthKey(r.dateUTC)
    const id = `${mk.year}-${mk.label}`
    if (!byKey.has(id)) {
      byKey.set(id, { id, label: mk.label, year: mk.year || season || '', races: [] })
      groups.push(byKey.get(id))
    }
    byKey.get(id).races.push(r)
  }

  return (
    <div>
      <h2 className="text-[28px] font-medium leading-tight tracking-[-0.02em] text-ink">
        The road ahead.
      </h2>
      <p className="mt-1 text-[13px] font-medium text-muted">
        {list.length} rounds. One world championship.
      </p>

      <div className="mt-6 space-y-6">
        {groups.map((g) => (
          <div key={g.id} className="space-y-3">
            <div className="flex items-center justify-between rounded-[15px] border border-hairline bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-ink">
              <span>{g.label}</span>
              <span className="text-muted">{g.year}</span>
            </div>

            {g.races.map((r) => {
              const isNext = nextRound != null && r.round === nextRound
              const isDone = nextRound == null || r.round < nextRound
              const dp = dayParts(r.dateUTC)
              const statusTag = isNext ? 'UP NEXT' : isDone ? 'COMPLETED' : `ROUND ${r.round}`

              return (
                <button
                  key={`${r.round}-${r.name}`}
                  type="button"
                  disabled={!isDone}
                  onClick={() => isDone && onSelectRound?.(r.round)}
                  className={`flex w-full items-center gap-4 rounded-[16px] px-4 py-4 text-left transition-colors ${
                    isNext
                      ? 'bg-sage-tint'
                      : isDone
                        ? 'bg-white hover:bg-white/80'
                        : 'bg-white'
                  }`}
                >
                  <div className="flex w-12 shrink-0 flex-col items-center border-r border-hairline pr-3">
                    <span className="font-display text-[24px] font-bold leading-none text-ink">
                      {dp.day}
                    </span>
                    <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.06em] text-muted">
                      {dp.mon}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-semibold text-ink">{r.name}</p>
                    <p className="mt-0.5 truncate text-[12px] font-medium text-muted">
                      {r.circuit || r.locality}
                    </p>
                    <p
                      className={`mt-2 text-[10px] font-bold uppercase tracking-[0.08em] ${
                        isNext ? 'text-ink' : 'text-muted'
                      }`}
                    >
                      {statusTag}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <p className="mt-6 border-t border-hairline pt-4 text-[11px] font-medium text-muted">
        All times shown in UTC
      </p>
    </div>
  )
}
