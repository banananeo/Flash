import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'

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

const pad2 = (n) => String(n).padStart(2, '0')

// Season Race Calendar — grouped cleanly by month with Upcoming / Completed filtering
export default function F1Calendar({ schedule, season, nextRound, onSelectRound }) {
  const [filter, setFilter] = useState('all') // all | upcoming | completed

  const list = useMemo(
    () => [...(schedule || [])].sort((a, b) => a.round - b.round),
    [schedule],
  )

  const filtered = useMemo(() => {
    if (filter === 'upcoming') {
      return list.filter((r) => nextRound != null && r.round >= nextRound)
    }
    if (filter === 'completed') {
      return list.filter((r) => nextRound == null || r.round < nextRound)
    }
    return list
  }, [list, filter, nextRound])

  const groups = useMemo(() => {
    const out = []
    const byKey = new Map()
    for (const r of filtered) {
      const mk = monthKey(r.dateUTC)
      const id = `${mk.year}-${mk.label}`
      if (!byKey.has(id)) {
        const g = { id, label: mk.label, year: mk.year || season || '', races: [] }
        byKey.set(id, g)
        out.push(g)
      }
      byKey.get(id).races.push(r)
    }
    return out
  }, [filtered, season])

  if (!list.length) {
    return (
      <p className="rounded-[22px] border border-hairline bg-white p-6 text-center text-[13px] text-muted">
        Race calendar unavailable right now.
      </p>
    )
  }

  return (
    <div>
      {/* Clean Header + Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink">
            Season calendar
          </h2>
          <p className="mt-0.5 text-[12px] font-medium text-muted">
            {list.length} rounds · Tap any completed race for results
          </p>
        </div>

        <div className="inline-flex rounded-full bg-sage p-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'completed', label: 'Done' },
          ].map((f) => {
            const active = filter === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`rounded-full px-3 py-1 text-[11.5px] transition-colors ${
                  active
                    ? 'bg-white font-semibold text-ink shadow-sm'
                    : 'font-medium text-muted hover:text-ink'
                }`}
              >
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="mt-6 rounded-[22px] border border-hairline bg-white p-6 text-center text-[13px] text-muted">
          No {filter} rounds to display.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          {groups.map((g) => (
            <div key={g.id}>
              {/* Quiet typographic month overline (no duplicate card box) */}
              <div className="mb-2.5 flex items-baseline justify-between px-1">
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
                  {g.label}
                </span>
                <span className="font-display text-[11px] font-medium text-muted/75">
                  {g.year}
                </span>
              </div>

              <div className="divide-y divide-hairline/70 overflow-hidden rounded-[22px] border border-hairline bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
                {g.races.map((r) => {
                  const isNext = nextRound != null && r.round === nextRound
                  const isDone = nextRound == null || r.round < nextRound
                  const dp = dayParts(r.dateUTC)

                  return (
                    <button
                      key={`${r.round}-${r.name}`}
                      type="button"
                      disabled={!isDone}
                      onClick={() => isDone && onSelectRound?.(r.round)}
                      className={`group flex w-full items-center gap-3.5 px-4 py-4 text-left transition-colors sm:gap-4 sm:px-5 ${
                        isNext
                          ? 'bg-sage-tint/65'
                          : isDone
                            ? 'cursor-pointer hover:bg-sage/40'
                            : 'cursor-default'
                      }`}
                    >
                      {/* Date Column */}
                      <div className="w-11 shrink-0 text-center">
                        <p
                          className={`font-display text-[19px] font-bold leading-none tabular-nums sm:text-[21px] ${
                            isNext ? 'text-brand-strong' : isDone ? 'text-ink/80' : 'text-ink'
                          }`}
                        >
                          {dp.day}
                        </p>
                        <p className="mt-1 text-[9.5px] font-bold uppercase tracking-[0.08em] text-muted">
                          {dp.mon}
                        </p>
                      </div>

                      <span className="h-8 w-px shrink-0 bg-hairline" />

                      {/* Grand Prix Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[15px] font-semibold leading-snug text-ink">
                            {r.name}
                          </p>
                          {r.hasSprint && (
                            <span className="shrink-0 rounded-full bg-sage px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-ink">
                              Sprint
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[12px] font-medium text-muted">
                          {r.circuit || r.locality}
                        </p>
                      </div>

                      {/* Right Status / Action */}
                      <div className="flex shrink-0 items-center gap-1.5">
                        {isNext ? (
                          <span className="rounded-full bg-sage-leader/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-brand-strong">
                            Next
                          </span>
                        ) : isDone ? (
                          <span className="inline-flex items-center gap-1 font-display text-[11px] font-semibold text-muted transition-colors group-hover:text-ink">
                            <span>R{pad2(r.round)}</span>
                            <ChevronRight
                              size={14}
                              className="transition-transform group-hover:translate-x-0.5"
                            />
                          </span>
                        ) : (
                          <span className="font-display text-[11px] font-semibold text-muted/80">
                            R{pad2(r.round)}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
