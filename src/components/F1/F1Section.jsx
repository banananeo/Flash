import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { useF1Store } from '../../store/useF1Store'
import F1Standings from './F1Standings'
import F1Countdown from './F1Countdown'
import F1Calendar from './F1Calendar'
import F1Results from './F1Results'
import F1Telemetry from './F1Telemetry'

const F1_TABS = [
  { id: 'standings', label: 'Standings' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'results', label: 'Results' },
  { id: 'telemetry', label: 'Telemetry' },
]

// Formula 1 hub — Standings | Calendar | Results | Pit Wall Telemetry
export default function F1Section() {
  const [tab, setTab] = useState('standings') // standings | calendar | results | telemetry
  const status = useF1Store((s) => s.status)
  const error = useF1Store((s) => s.error)
  const driverStandings = useF1Store((s) => s.driverStandings)
  const teamStandings = useF1Store((s) => s.teamStandings)
  const season = useF1Store((s) => s.season)
  const schedule = useF1Store((s) => s.schedule)
  const nextRace = useF1Store((s) => s.nextRace)
  const fetchF1 = useF1Store((s) => s.fetchF1)
  const fetchSchedule = useF1Store((s) => s.fetchSchedule)
  const fetchRound = useF1Store((s) => s.fetchRound)
  const fetchTelemetry = useF1Store((s) => s.fetchTelemetry)
  const retryNow = useF1Store((s) => s.retryNow)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    fetchF1()
    fetchSchedule()
    fetchRound('last')
    fetchTelemetry()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const goResults = (r) => {
    fetchRound(r)
    setTab('results')
  }

  const handleRefresh = async () => {
    setSyncing(true)
    try {
      await Promise.allSettled([
        fetchF1(),
        fetchSchedule(),
        tab === 'results' ? fetchRound() : Promise.resolve(),
        tab === 'telemetry' ? fetchTelemetry() : Promise.resolve(),
      ])
    } finally {
      setSyncing(false)
    }
  }

  const isLoadingInitial = status === 'loading' && !driverStandings?.length

  return (
    <section className="mx-auto w-full max-w-[460px] px-6 pb-28 pt-2 sm:max-w-[620px] lg:max-w-[860px] lg:pt-8">
      {/* Minimal Header */}
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[32px] font-medium leading-[1.1] tracking-[-0.025em] text-ink sm:text-[34px]">
            Formula 1
          </h1>

        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={syncing}
          title="Refresh Formula 1 data"
          aria-label="Refresh Formula 1 data"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-hairline bg-white text-muted transition-colors hover:bg-sage hover:text-ink disabled:opacity-50"
        >
          <RefreshCw size={13} className={syncing ? 'animate-spin text-brand-strong' : ''} />
        </button>
      </div>

      {/* Spring Segmented Navigation */}
      <div
        role="tablist"
        aria-label="Formula 1 sections"
        className="mt-5 grid grid-cols-4 rounded-full bg-sage/90 p-1"
      >
        {F1_TABS.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`relative rounded-full py-2 text-[12.5px] transition-colors sm:text-[13px] ${active ? 'font-semibold text-ink' : 'font-medium text-muted hover:text-ink'
                }`}
            >
              {active && (
                <motion.span
                  layoutId="f1-nav-pill"
                  transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                  className="absolute inset-0 rounded-full bg-white shadow-sm ring-1 ring-black/[0.04]"
                />
              )}
              <span className="relative z-[1]">{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* Full Hero on Standings; sleek 1-line live/upcoming bar on Calendar & Results */}
      {tab !== 'telemetry' && (
        <div className="mt-5">
          <F1Countdown
            nextRace={nextRace}
            schedule={schedule}
            season={season}
            compact={tab !== 'standings'}
            onOpenCalendar={() => setTab('calendar')}
          />
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-[14px] border border-hairline bg-white px-4 py-2.5 text-[12px] font-medium text-muted">
          <span className="truncate">{error}</span>
          <button
            type="button"
            onClick={retryNow}
            className="shrink-0 font-semibold text-ink underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      <div className="mt-7">
        {isLoadingInitial ? (
          <div className="space-y-3">
            <div className="h-5 w-36 animate-pulse rounded bg-sage" />
            <div className="h-[320px] animate-pulse rounded-[22px] border border-hairline bg-white" />
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              {tab === 'standings' && (
                <F1Standings drivers={driverStandings} teams={teamStandings} />
              )}
              {tab === 'calendar' && (
                <F1Calendar
                  schedule={schedule}
                  season={season}
                  nextRound={nextRace?.round}
                  onSelectRound={goResults}
                />
              )}
              {tab === 'results' && (
                <F1Results
                  nextRound={nextRace?.round}
                  onOpenTelemetry={() => setTab('telemetry')}
                />
              )}
              {tab === 'telemetry' && <F1Telemetry />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </section>
  )
}
