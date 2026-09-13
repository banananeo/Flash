import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCw, Trophy } from 'lucide-react'
import MatchCard from './MatchCard'
import ScoreFilters from './ScoreFilters'
import { useScoreStore, isFavMatch, normalizeTeam } from '../../store/useScoreStore'

const TABS = [
  { id: 'football', label: '⚽ Football', bg: '#00D9A5' },
  { id: 'cricket', label: '🏏 Cricket', bg: '#FFDE59' },
]

// Separate full section — mobile-first vertical list, full-width rows.
export default function LiveScoresSection() {
  const sport = useScoreStore((s) => s.sport)
  const setSport = useScoreStore((s) => s.setSport)
  const football = useScoreStore((s) => s.football)
  const cricket = useScoreStore((s) => s.cricket)
  const status = useScoreStore((s) => s.status)
  const error = useScoreStore((s) => s.error)
  const source = useScoreStore((s) => s.source)
  const fetchScores = useScoreStore((s) => s.fetchScores)
  const liveCount = useScoreStore((s) => s.liveCount)()
  const favTeams = useScoreStore((s) => s.favTeams)
  const toggleFav = useScoreStore((s) => s.toggleFav)
  const getVisibleMatches = useScoreStore((s) => s.getVisibleMatches)

  const { matches, total, filteredCount, favMiss } = getVisibleMatches(sport)
  // star removes the already-favourited side, otherwise pins teamA
  const toggleMatchFav = (m) => {
    const favSet = new Set((favTeams || []).map(normalizeTeam))
    if (favSet.has(normalizeTeam(m?.teamA?.name))) toggleFav(m.teamA.name)
    else if (favSet.has(normalizeTeam(m?.teamB?.name))) toggleFav(m.teamB.name)
    else toggleFav(m?.teamA?.name)
  }
  const favMatches = favTeams?.length ? matches.filter((m) => isFavMatch(m, favTeams)) : []
  const otherMatches = favTeams?.length ? matches.filter((m) => !isFavMatch(m, favTeams)) : matches
  const liveFavs = favMatches.filter((m) => m.status === 'live')
  const doneFavs = favMatches.filter((m) => m.status !== 'live')
  const liveOthers = otherMatches.filter((m) => m.status === 'live')
  const doneOthers = otherMatches.filter((m) => m.status !== 'live')
  const showCount = `Showing ${filteredCount} of ${total}`

  // fetch on mount + 60s poll (cached 90s inside lib to protect quotas)
  useEffect(() => {
    // clear stale mock cache once so fresh live data replaces it
    try {
      if (sport === 'football' && import.meta.env.VITE_FOOTBALL) {
        const c = JSON.parse(localStorage.getItem('live-cache-football') || 'null')
        if (c && c.matches?.length <= 3 && c.matches[0]?.id?.startsWith('fb') && !c.matches[0]?.rawId) {
          localStorage.removeItem('live-cache-football')
        }
      }
    } catch { /* ignore */ }
    fetchScores(sport)
    const t = setInterval(() => fetchScores(sport), 60000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport])

  return (
    <section id="live-scores" className="mx-auto w-full max-w-2xl scroll-mt-24">
      <div className="card-brutal bg-white p-4 dark:border-bone dark:bg-surface dark:text-bone sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-2 border-[3px] border-black bg-black px-3 py-1 font-black text-lg text-white dark:border-bone">
            <Trophy size={18} strokeWidth={3} className="text-brutal-yellow" /> LIVE SCORES
          </span>
          <span className="badge-brutal bg-brutal-red text-white">{liveCount} LIVE NOW</span>
          <span className={`badge-brutal ${source[sport] === 'live' ? 'bg-brutal-mint' : 'bg-brutal-yellow'}`}>
            {status === 'loading' ? 'SYNC…' : source[sport] === 'live' ? '● LIVE' : 'MOCK'}
          </span>
          <motion.button
            whileTap={{ scale: 0.9, rotate: -30 }}
            onClick={() => {
              try {
                localStorage.removeItem(`live-cache-${sport === 'football' ? 'football' : 'cricket'}`)
              } catch { /* ignore */ }
              fetchScores(sport)
            }}
            className="btn-brutal ml-auto flex items-center gap-1 bg-white px-3 py-1.5 text-xs text-black dark:border-bone dark:bg-raised dark:text-bone"
          >
            <RefreshCw size={14} strokeWidth={3} /> Refresh
          </motion.button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {TABS.map((t) => {
            const active = sport === t.id
            const count = t.id === 'football' ? football.length : cricket.length
            return (
              <motion.button
                key={t.id}
                whileTap={{ scale: 0.96 }}
                onClick={() => setSport(t.id)}
                className={`relative border-[3px] border-black px-4 py-2.5 text-sm font-black uppercase dark:border-bone ${active ? 'text-white shadow-brutal-sm' : 'text-black shadow-brutal-xs'}`}
                style={{ backgroundColor: active ? '#000' : t.bg }}
              >
                {active && (
                  <motion.span
                    layoutId="score-tab-star"
                    className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border-2 border-black bg-brutal-pink text-[10px] text-black"
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  >
                    ★
                  </motion.span>
                )}
                {t.label} ({count})
              </motion.button>
            )
          })}
        </div>

        {error && (
          <div className="mt-3 flex items-center justify-between gap-2 border-[3px] border-black bg-brutal-yellow px-3 py-1.5 text-xs font-black text-black shadow-brutal-xs dark:border-bone">
            <span className="truncate">{error}</span>
            <button onClick={() => fetchScores(sport)} className="shrink-0 border-2 border-black bg-white px-2 py-0.5 text-black dark:border-bone dark:bg-surface dark:text-bone">RETRY</button>
          </div>
        )}

        <ScoreFilters sport={sport} />
        <p className="mt-2 font-mono text-[10px] font-bold uppercase text-black/50 dark:text-bone/50">{showCount}</p>
      </div>

      {/* vertical mobile-perfect list */}
      <div className="mt-3 flex flex-col gap-2.5">
        {favMiss && (
          <div className="border-[3px] border-dashed border-black bg-white px-3 py-2 text-xs font-black uppercase dark:border-bone dark:bg-raised dark:text-bone">
            No favourite-team matches right now — showing other scores
          </div>
        )}
        <AnimatePresence mode="popLayout">
          {status === 'loading' && !matches.length ? (
            [0, 1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse border-[3px] border-black bg-white p-4 shadow-brutal-sm dark:border-bone dark:bg-surface">
                <div className="h-4 bg-black/20" />
                <div className="mt-2 h-6 bg-black/40" />
              </div>
            ))
          ) : (
            <>
              {favMatches.length > 0 && (
                <p className="badge-brutal w-fit bg-brutal-yellow">★ YOUR TEAMS ({favMatches.length})</p>
              )}
              {liveFavs.map((m, i) => (
                <MatchCard key={m.id} match={m} index={i} isFav onToggleFav={() => toggleMatchFav(m)} />
              ))}
              {doneFavs.map((m, i) => (
                <MatchCard key={m.id} match={m} index={i} isFav onToggleFav={() => toggleMatchFav(m)} />
              ))}
              {liveOthers.length > 0 && (
                <p className="badge-brutal w-fit bg-brutal-mint">● Live ({liveOthers.length})</p>
              )}
              {liveOthers.map((m, i) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  index={i}
                  isFav={isFavMatch(m, favTeams)}
                  onToggleFav={() => toggleMatchFav(m)}
                />
              ))}
              {doneOthers.length > 0 && (
                <p className="badge-brutal mt-1 w-fit bg-black text-white dark:border-bone">Finished / Scheduled ({doneOthers.length})</p>
              )}
              {doneOthers.map((m, i) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  index={i}
                  isFav={isFavMatch(m, favTeams)}
                  onToggleFav={() => toggleMatchFav(m)}
                />
              ))}
              {!matches.length && (
                <div className="card-brutal bg-brutal-yellow p-6 text-center font-black text-black dark:border-bone">
                  NO MATCHES FOR THESE FILTERS — RESET TO SEE ALL
                </div>
              )}
            </>
          )}
        </AnimatePresence>
      </div>
      <p className="mt-3 text-center font-mono text-[10px] font-bold uppercase text-black/50 dark:text-bone/50">
        Tap any match for the full scoreboard • Auto-refreshes every 60s
      </p>
    </section>
  )
}
