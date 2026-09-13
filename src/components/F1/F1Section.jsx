import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCw, Flag } from 'lucide-react'
import { useF1Store } from '../../store/useF1Store'
import F1Standings from './F1Standings'
import F1Countdown from './F1Countdown'
import F1Calendar from './F1Calendar'
import F1Results from './F1Results'

// F1 section (Jolpica Ergast-compatible API): persistent next-race
// countdown banner + sub-tabs (Standings | Calendar | Results).
// Single fetch on mount + manual refresh — standings/schedule/results only
// change around races (lib memo-caches), so no polling interval.
export default function F1Section() {
  const [tab, setTab] = useState('standings') // standings | calendar | results
  const status = useF1Store((s) => s.status)
  const error = useF1Store((s) => s.error)
  const driverStandings = useF1Store((s) => s.driverStandings)
  const teamStandings = useF1Store((s) => s.teamStandings)
  const season = useF1Store((s) => s.season)
  const round = useF1Store((s) => s.round)
  const source = useF1Store((s) => s.source)
  const schedule = useF1Store((s) => s.schedule)
  const nextRace = useF1Store((s) => s.nextRace)
  const fetchF1 = useF1Store((s) => s.fetchF1)
  const fetchSchedule = useF1Store((s) => s.fetchSchedule)
  const fetchRound = useF1Store((s) => s.fetchRound)
  const retryNow = useF1Store((s) => s.retryNow)

  useEffect(() => {
    fetchF1()
    fetchSchedule()
    fetchRound('last')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const goResults = (r) => {
    fetchRound(r)
    setTab('results')
  }

  return (
    <section id="f1-section" className="mx-auto w-full max-w-2xl scroll-mt-24">
      <div className="card-brutal bg-white p-4 dark:border-bone dark:bg-surface dark:text-bone sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-2 border-[3px] border-black bg-black px-3 py-1 font-black text-lg text-white dark:border-bone">
            <Flag size={18} strokeWidth={3} className="text-brutal-red" /> FORMULA 1
          </span>
          <span className={`badge-brutal ${source === 'live' ? 'bg-brutal-mint' : 'bg-brutal-yellow'}`}>
            {status === 'loading' ? 'SYNC…' : source === 'live' ? '● LIVE' : 'MOCK'}
          </span>
          {!!season && (
            <span className="badge-brutal bg-black text-white dark:border-bone">
              {season}{round ? ` • RD ${round}` : ''}
            </span>
          )}
          <motion.button
            whileTap={{ scale: 0.9, rotate: -30 }}
            onClick={() => { retryNow(); fetchSchedule() }}
            className="btn-brutal ml-auto flex items-center gap-1 bg-white px-3 py-1.5 text-xs text-black dark:border-bone dark:bg-raised dark:text-bone"
          >
            <RefreshCw size={14} strokeWidth={3} /> Refresh
          </motion.button>
        </div>

        {error && (
          <div className="mt-3 flex items-center justify-between gap-2 border-[3px] border-black bg-brutal-yellow px-3 py-1.5 text-xs font-black text-black shadow-brutal-xs dark:border-bone">
            <span className="truncate">{error}</span>
            <button onClick={retryNow} className="shrink-0 border-2 border-black bg-white px-2 py-0.5 text-black dark:border-bone dark:bg-surface dark:text-bone">RETRY</button>
          </div>
        )}

        <div className="mt-3">
          <F1Countdown nextRace={nextRace} />
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          {[
            { id: 'standings', label: 'Points' },
            { id: 'calendar', label: 'Calendar' },
            { id: 'results', label: 'Results' },
          ].map((t) => (
            <motion.button
              key={t.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => setTab(t.id)}
              className={`border-[3px] border-black px-2 py-1.5 text-xs font-black uppercase dark:border-bone sm:text-sm ${tab === t.id ? 'bg-black text-white shadow-brutal-sm' : 'bg-white text-black shadow-brutal-xs dark:bg-surface dark:text-bone'}`}
            >
              {t.label}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {status === 'loading' ? (
            [0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse border-[3px] border-black bg-white p-4 shadow-brutal-sm dark:border-bone dark:bg-surface">
                <div className="h-4 bg-black/20" />
                <div className="mt-2 h-6 bg-black/40" />
              </div>
            ))
          ) : (
            <motion.div key={`f1-${tab}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {tab === 'standings' && <F1Standings drivers={driverStandings} teams={teamStandings} />}
              {tab === 'calendar' && <F1Calendar schedule={schedule} nextRound={nextRace?.round} onSelectRound={goResults} />}
              {tab === 'results' && <F1Results nextRound={nextRace?.round} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="mt-3 text-center font-mono text-[10px] font-bold uppercase text-black/50 dark:text-bone/50">
        Standings • Calendar • Session results — updates after each race
      </p>
    </section>
  )
}
