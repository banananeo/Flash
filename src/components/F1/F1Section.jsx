import { useEffect, useState } from 'react'
import { useF1Store } from '../../store/useF1Store'
import F1Standings from './F1Standings'
import F1Countdown from './F1Countdown'
import F1Calendar from './F1Calendar'
import F1Results from './F1Results'
import F1Telemetry from './F1Telemetry'

// 07 · Formula 1 | 08 · Race calendar | 09 · Race results | 10 · Live Pit Wall Telemetry
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

  return (
    <section className="mx-auto w-full max-w-[460px] px-6 pb-28 pt-2 lg:max-w-[780px] lg:pt-8">
      <div className="mt-1.5 flex items-baseline justify-between gap-3">
        <h1 className="text-[34px] font-medium leading-[1.12] tracking-[-0.02em] text-ink">
          Formula 1.
        </h1>
        {!!season && (
          <span className="text-[14px] font-semibold text-muted">{season}</span>
        )}
      </div>

      <div className="mt-5">
        <F1Countdown nextRace={nextRace} schedule={schedule} season={season} />
      </div>

      {/* Segmented Control: Standings | Calendar | Results | Telemetry */}
      <div className="mt-5 grid grid-cols-4 rounded-full bg-sage p-1">
        {[
          { id: 'standings', label: 'Standings' },
          { id: 'calendar', label: 'Calendar' },
          { id: 'results', label: 'Results' },
          { id: 'telemetry', label: 'Telemetry' },
        ].map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full py-2 text-[13px] transition-colors ${active ? 'bg-pulse font-semibold text-ink' : 'font-medium text-muted hover:text-ink'
                }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {error && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-[14px] bg-sage px-4 py-2.5 text-[12px] font-medium text-ink">
          <span className="truncate">{error}</span>
          <button type="button" onClick={retryNow} className="shrink-0 font-bold underline">
            Retry
          </button>
        </div>
      )}

      <div className="mt-6">
        {status === 'loading' && !driverStandings?.length ? (
          <div className="space-y-4">
            <div className="h-[180px] animate-pulse rounded-[20px] bg-sage" />
            <div className="h-14 animate-pulse rounded-[14px] bg-white" />
            <div className="h-14 animate-pulse rounded-[14px] bg-white" />
          </div>
        ) : (
          <>
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
              <F1Results nextRound={nextRace?.round} onOpenTelemetry={() => setTab('telemetry')} />
            )}
            {tab === 'telemetry' && <F1Telemetry />}
          </>
        )}
      </div>
    </section>
  )
}
