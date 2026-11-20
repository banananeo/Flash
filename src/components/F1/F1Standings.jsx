import { useState } from 'react'

const teamColour = (c) => `#${String(c || '64748B').replace(/^#/, '')}`
const pad2 = (n) => String(n).padStart(2, '0')

// 07 · Formula 1 — "The championship" Drivers | Constructors table
export default function F1Standings({ drivers, teams }) {
  const [tab, setTab] = useState('drivers') // drivers | constructors

  const dRows = [...(drivers || [])].sort((a, b) => a.pos - b.pos)
  const tRows = [...(teams || [])].sort((a, b) => a.pos - b.pos)

  return (
    <div>
      <h2 className="text-[20px] font-semibold text-ink">The championship</h2>

      <div className="mt-3 flex items-center justify-between border-b border-hairline">
        <div className="flex items-center gap-6">
          {[
            { id: 'drivers', label: 'Drivers' },
            { id: 'constructors', label: 'Constructors' },
          ].map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`relative pb-2.5 text-[14px] transition-colors ${
                  active ? 'font-bold text-ink' : 'font-medium text-muted hover:text-ink'
                }`}
              >
                {t.label}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-pulse" />
                )}
              </button>
            )
          })}
        </div>
        <span className="pb-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
          PTS
        </span>
      </div>

      {tab === 'drivers' ? (
        <div className="mt-3">
          {dRows.map((r, i) => {
            const isLeader = i === 0
            return (
              <div
                key={r.num || r.acro || i}
                className={`flex items-center gap-4 px-3 py-3.5 ${
                  isLeader
                    ? 'rounded-[14px] bg-sage-leader'
                    : 'border-b border-hairline/80 last:border-b-0'
                }`}
              >
                <span className="w-6 shrink-0 font-display text-[13px] font-medium text-muted">
                  {pad2(r.pos)}
                </span>
                <span
                  className="h-7 w-[3px] shrink-0 rounded-full"
                  style={{ backgroundColor: teamColour(r.colour) }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold leading-tight text-ink">
                    {r.name}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] font-medium text-muted">
                    {r.team}
                  </p>
                </div>
                <span className="shrink-0 font-display text-[16px] font-bold text-ink">
                  {r.points}
                </span>
              </div>
            )
          })}
          {!dRows.length && (
            <p className="mt-4 rounded-[16px] bg-white p-5 text-center text-[13px] text-muted">
              No driver standings available right now.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-3">
          {tRows.map((r, i) => {
            const isLeader = i === 0
            return (
              <div
                key={r.team || i}
                className={`flex items-center gap-4 px-3 py-3.5 ${
                  isLeader
                    ? 'rounded-[14px] bg-sage-leader'
                    : 'border-b border-hairline/80 last:border-b-0'
                }`}
              >
                <span className="w-6 shrink-0 font-display text-[13px] font-medium text-muted">
                  {pad2(r.pos)}
                </span>
                <span
                  className="h-7 w-[3px] shrink-0 rounded-full"
                  style={{ backgroundColor: teamColour(r.colour) }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold leading-tight text-ink">
                    {r.team}
                  </p>
                  {!!r.wins && (
                    <p className="mt-0.5 text-[11px] font-medium text-muted">
                      {r.wins} {r.wins === 1 ? 'win' : 'wins'}
                    </p>
                  )}
                </div>
                <span className="shrink-0 font-display text-[16px] font-bold text-ink">
                  {r.points}
                </span>
              </div>
            )
          })}
          {!tRows.length && (
            <p className="mt-4 rounded-[16px] bg-white p-5 text-center text-[13px] text-muted">
              No constructor standings available right now.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
