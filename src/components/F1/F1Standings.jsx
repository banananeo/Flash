import { useState } from 'react'
import { motion } from 'framer-motion'

const teamColour = (c) => `#${String(c || '64748B').replace(/^#/, '')}`
const pad2 = (n) => String(n).padStart(2, '0')

// Championship Standings — Drivers & Constructors
export default function F1Standings({ drivers, teams }) {
  const [tab, setTab] = useState('drivers') // drivers | constructors

  const dRows = [...(drivers || [])].sort((a, b) => a.pos - b.pos)
  const tRows = [...(teams || [])].sort((a, b) => a.pos - b.pos)
  const topDriverPts = dRows[0]?.points || 0
  const topTeamPts = tRows[0]?.points || 0

  return (
    <div>
      {/* Minimal Header + Underline Switcher */}
      <div className="flex items-end justify-between border-b border-hairline">
        <div className="flex items-center gap-6" role="tablist" aria-label="Championship tables">
          {[
            { id: 'drivers', label: 'Drivers' },
            { id: 'constructors', label: 'Constructors' },
          ].map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`relative pb-3 text-[14px] transition-colors ${
                  active ? 'font-bold text-ink' : 'font-medium text-muted hover:text-ink'
                }`}
              >
                {t.label}
                {active && (
                  <motion.span
                    layoutId="f1-champ-underline"
                    transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-pulse"
                  />
                )}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-5 pb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
          <span className="hidden sm:inline">Gap</span>
          <span className="w-11 text-right">Pts</span>
        </div>
      </div>

      {tab === 'drivers' ? (
        dRows.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-[22px] border border-hairline bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
            <div className="divide-y divide-hairline/70">
              {dRows.map((r, i) => {
                const isLeader = i === 0
                const isPodium = i < 3
                const gap = r.gap != null ? r.gap : Math.max(0, topDriverPts - (r.points || 0))

                return (
                  <div
                    key={r.num || r.acro || i}
                    className={`flex items-center gap-3.5 px-4 py-3.5 transition-colors sm:gap-4 sm:px-6 sm:py-4 ${
                      isLeader ? 'bg-sage-tint/55' : 'hover:bg-sage/35'
                    }`}
                  >
                    <span
                      className={`w-6 shrink-0 font-display text-[13px] tabular-nums ${
                        isLeader
                          ? 'font-bold text-brand-strong'
                          : isPodium
                            ? 'font-semibold text-ink'
                            : 'font-medium text-muted'
                      }`}
                    >
                      {pad2(r.pos)}
                    </span>

                    <span
                      className="h-7 w-[3px] shrink-0 rounded-full"
                      style={{ backgroundColor: teamColour(r.colour) }}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="truncate text-[14.5px] font-semibold leading-tight text-ink sm:text-[15px]">
                          {r.name}
                        </p>
                        {r.num && (
                          <span className="hidden shrink-0 font-display text-[11px] font-medium text-muted/75 sm:inline">
                            #{r.num}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[12px] font-medium text-muted">
                        {r.team}
                        {r.wins > 0 && (
                          <span className="text-brand-strong">
                            {' · '}
                            {r.wins} {r.wins === 1 ? 'win' : 'wins'}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-baseline gap-4">
                      {isLeader ? (
                        <span className="hidden rounded-full bg-sage-leader/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-brand-strong sm:inline-block">
                          Leader
                        </span>
                      ) : gap > 0 ? (
                        <span className="hidden font-display text-[12px] font-medium tabular-nums text-muted sm:inline">
                          −{gap}
                        </span>
                      ) : null}

                      <span className="w-11 text-right font-display text-[16px] font-bold tabular-nums text-ink">
                        {r.points}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="mt-4 rounded-[22px] border border-hairline bg-white p-6 text-center text-[13px] text-muted">
            No driver standings available right now.
          </p>
        )
      ) : tRows.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-[22px] border border-hairline bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <div className="divide-y divide-hairline/70">
            {tRows.map((r, i) => {
              const isLeader = i === 0
              const isPodium = i < 3
              const gap = r.gap != null ? r.gap : Math.max(0, topTeamPts - (r.points || 0))
              const barPct = topTeamPts > 0 ? Math.max(4, Math.round((r.points / topTeamPts) * 100)) : 0
              const accent = teamColour(r.colour)

              return (
                <div
                  key={r.team || i}
                  className={`flex items-center gap-3.5 px-4 py-4 transition-colors sm:gap-4 sm:px-6 ${
                    isLeader ? 'bg-sage-tint/55' : 'hover:bg-sage/35'
                  }`}
                >
                  <span
                    className={`w-6 shrink-0 font-display text-[13px] tabular-nums ${
                      isLeader
                        ? 'font-bold text-brand-strong'
                        : isPodium
                          ? 'font-semibold text-ink'
                          : 'font-medium text-muted'
                    }`}
                  >
                    {pad2(r.pos)}
                  </span>

                  <span
                    className="h-8 w-[3px] shrink-0 rounded-full"
                    style={{ backgroundColor: accent }}
                  />

                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-baseline gap-2">
                      <p className="truncate text-[15px] font-semibold leading-tight text-ink">
                        {r.team}
                      </p>
                      {r.wins > 0 && (
                        <span className="shrink-0 text-[11px] font-semibold text-brand-strong">
                          {r.wins} {r.wins === 1 ? 'win' : 'wins'}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 h-[3px] w-full max-w-[220px] overflow-hidden rounded-full bg-sage">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${barPct}%`, backgroundColor: accent }}
                      />
                    </div>
                  </div>

                  <div className="flex shrink-0 items-baseline gap-4">
                    {isLeader ? (
                      <span className="hidden rounded-full bg-sage-leader/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-brand-strong sm:inline-block">
                        Leader
                      </span>
                    ) : gap > 0 ? (
                      <span className="hidden font-display text-[12px] font-medium tabular-nums text-muted sm:inline">
                        −{gap}
                      </span>
                    ) : null}

                    <span className="w-11 text-right font-display text-[16px] font-bold tabular-nums text-ink">
                      {r.points}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-[22px] border border-hairline bg-white p-6 text-center text-[13px] text-muted">
          No constructor standings available right now.
        </p>
      )}
    </div>
  )
}
