import { useState } from 'react'
import { motion } from 'framer-motion'
import { useScoreStore } from '../../store/useScoreStore'

const teamColour = (c) => `#${String(c || '666666').replace(/^#/, '')}`

function StarButton({ label, active, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={active ? `Unpin ${label}` : `Pin ${label}`}
      aria-label={active ? `Unpin ${label}` : `Pin ${label}`}
      aria-pressed={!!active}
      className={`grid h-7 w-7 shrink-0 place-items-center border-2 border-black text-sm leading-none ${active ? 'bg-black text-brutal-yellow' : 'bg-brutal-cream text-black/50'}`}
    >
      ★
    </button>
  )
}

// Championship tables: Drivers | Constructors toggle.
export default function F1Standings({ drivers, teams }) {
  const [tab, setTab] = useState('drivers') // drivers | teams
  // driver pins live in their own slice — sharing team favs made the scores
  // section show "no favourite-team matches" after pinning VER
  const f1Favs = useScoreStore((s) => s.f1Favs)
  const toggleF1Fav = useScoreStore((s) => s.toggleF1Fav)
  const favSet = new Set(f1Favs || [])

  const dRows = [...(drivers || [])].sort((a, b) => {
    const af = favSet.has(a.acro) ? 0 : 1
    const bf = favSet.has(b.acro) ? 0 : 1
    return af - bf || a.pos - b.pos
  })
  const tRows = [...(teams || [])].sort((a, b) => a.pos - b.pos)

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        {[
          { id: 'drivers', label: 'Drivers' },
          { id: 'teams', label: 'Teams' },
        ].map((t) => (
          <motion.button
            key={t.id}
            whileTap={{ scale: 0.96 }}
            onClick={() => setTab(t.id)}
            className={`border-[3px] border-black px-4 py-2 text-sm font-black uppercase dark:border-bone ${tab === t.id ? 'bg-black text-white shadow-brutal-sm' : 'bg-white text-black shadow-brutal-xs dark:bg-surface dark:text-bone'}`}
          >
            {t.label}
          </motion.button>
        ))}
      </div>

      {tab === 'drivers' ? (
        <div className="flex flex-col gap-1.5">
          {(dRows.length ? dRows : []).map((r, i) => (
            <div
              key={r.num || r.acro || i}
              className="flex items-center gap-2 border-[3px] border-black bg-white px-2 py-1.5 text-black shadow-brutal-xs dark:border-bone dark:bg-surface dark:text-bone"
            >
              <StarButton label={r.acro} active={favSet.has(r.acro)} onToggle={() => r.acro && toggleF1Fav(r.acro)} />
              <span className="w-7 shrink-0 font-black text-lg">{r.pos}</span>
              <span className="h-7 w-1.5 shrink-0 border border-black" style={{ backgroundColor: teamColour(r.colour) }} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-black text-sm leading-tight">{r.acro}</p>
                <p className="truncate font-mono text-[10px] font-bold uppercase opacity-60">{r.name} • {r.team}</p>
              </div>
              {!!r.wins && (
                <span className="shrink-0 font-mono text-[10px] font-bold opacity-60">{r.wins}W</span>
              )}
              <span className="shrink-0 border-2 border-black bg-brutal-yellow px-1.5 py-0.5 font-mono text-xs font-black text-black">
                {r.points} PTS
              </span>
            </div>
          ))}
          {!dRows.length && (
            <p className="border-[3px] border-dashed border-black bg-white p-4 text-center font-mono text-xs font-bold uppercase dark:border-bone dark:bg-surface dark:text-bone">
              No driver standings right now
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {(tRows.length ? tRows : []).map((r, i) => (
            <div
              key={r.team || i}
              className="flex items-center gap-2 border-[3px] border-black bg-white px-2 py-1.5 text-black shadow-brutal-xs dark:border-bone dark:bg-surface dark:text-bone"
            >
              <span className="w-7 shrink-0 font-black text-lg">{r.pos}</span>
              <span className="h-7 w-1.5 shrink-0 border border-black" style={{ backgroundColor: teamColour(r.colour) }} />
              <p className="min-w-0 flex-1 truncate font-black text-sm">{r.team}</p>
              {!!r.wins && (
                <span className="shrink-0 font-mono text-[10px] font-bold opacity-60">{r.wins}W</span>
              )}
              <span className="shrink-0 border-2 border-black bg-brutal-mint px-1.5 py-0.5 font-mono text-xs font-black text-black">
                {r.points} PTS
              </span>
            </div>
          ))}
          {!tRows.length && (
            <p className="border-[3px] border-dashed border-black bg-white p-4 text-center font-mono text-xs font-bold uppercase dark:border-bone dark:bg-surface dark:text-bone">
              No team standings right now
            </p>
          )}
        </div>
      )}
    </div>
  )
}
