import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { useScoreStore } from '../../store/useScoreStore'

function LiveDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute h-full w-full animate-ping rounded-full bg-red-600" />
      <span className="h-2.5 w-2.5 rounded-full border border-black bg-red-500" />
    </span>
  )
}

function TeamLogo({ logo, short }) {
  if (logo) {
    return <img src={logo} alt="" className="h-8 w-8 shrink-0 object-contain" loading="lazy" />
  }
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center border-2 border-black bg-brutal-yellow font-black text-[10px]">
      {short}
    </span>
  )
}

// Full-width row — tap opens full modal scoreboard. No like/dislike here.
export default function MatchCard({ match, index = 0 }) {
  const openMatch = useScoreStore((s) => s.openMatch)
  const isLive = match.status === 'live'

  return (
    <motion.button
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26, delay: Math.min(index * 0.04, 0.3) }}
      onClick={() => openMatch(match)}
      className="flex w-full items-center gap-3 border-[3px] border-black bg-white p-3 text-left text-black shadow-brutal-sm active:shadow-none dark:border-bone dark:bg-surface dark:text-bone"
    >
      {match.sport === 'football' ? (
        <>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <TeamLogo logo={match.teamA.logo} short={match.teamA.short} />
            <span className="truncate font-black text-sm">{match.teamA.name}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2 border-[3px] border-black bg-black px-2.5 py-1 text-white dark:border-bone">
            <span className="font-black text-xl leading-none">{match.teamA.score}</span>
            <span className="flex flex-col items-center">
              {isLive ? <LiveDot /> : <span className="font-mono text-[9px] font-bold">{match.minute}</span>}
              <span className="font-mono text-[9px] font-bold text-brutal-yellow">{isLive ? match.minute : 'VS'}</span>
            </span>
            <span className="font-black text-xl leading-none">{match.teamB.score}</span>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <span className="truncate text-right font-black text-sm">{match.teamB.name}</span>
            <TeamLogo logo={match.teamB.logo} short={match.teamB.short} />
          </div>
          <ChevronRight size={18} strokeWidth={3} className="shrink-0" />
        </>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <p className="truncate font-black text-sm leading-tight">
              {match.teamA.short} {match.teamA.score} <span className="font-mono text-[10px] text-black/50 dark:text-bone/50">vs</span> {match.teamB.short} {match.teamB.score}
            </p>
            <p className="truncate font-mono text-[10px] font-bold uppercase text-black/60 dark:text-bone/60">
              {match.meta?.need || match.league}
            </p>
          </div>
          {isLive ? (
            <span className="flex shrink-0 items-center gap-1 border-2 border-black bg-brutal-mint px-1.5 py-0.5 font-mono text-[10px] font-bold">
              <LiveDot /> LIVE
            </span>
          ) : (
            <span className="shrink-0 border-2 border-black bg-black px-1.5 py-0.5 font-mono text-[10px] font-bold text-white dark:border-bone">FT</span>
          )}
          <ChevronRight size={18} strokeWidth={3} className="shrink-0" />
        </>
      )}
    </motion.button>
  )
}
