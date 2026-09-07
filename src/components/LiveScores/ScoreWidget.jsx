import { motion } from 'framer-motion'
import { Trophy } from 'lucide-react'
import { useScoreStore } from '../../store/useScoreStore'

// Mobile-only sticky ticker — tap jumps to scores section.
export default function ScoreWidget() {
  const football = useScoreStore((s) => s.football)
  const cricket = useScoreStore((s) => s.cricket)
  const openMatch = useScoreStore((s) => s.openMatch)

  const live = [...football, ...cricket].find((m) => m.status === 'live')
  const view = useScoreStore((s) => s.view)
  const setView = useScoreStore((s) => s.setView)
  if (!live || view === 'scores') return null

  const label =
    live.sport === 'football'
      ? `${live.teamA.short} ${live.teamA.score}-${live.teamB.score} ${live.teamB.short} • ${live.minute}`
      : `${live.teamA.short} ${live.teamA.score} vs ${live.teamB.short} ${live.teamB.score}`

  const goScores = () => {
    setView('scores')
  }

  return (
    <motion.button
      initial={{ y: 80 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      onClick={() => (window.innerWidth < 1024 ? goScores() : openMatch(live))}
      className="fixed bottom-3 left-3 right-3 z-40 flex items-center gap-2 border-[3px] border-brutal-yellow bg-black px-3 py-2.5 text-left text-white shadow-brutal lg:hidden"
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute h-full w-full animate-ping rounded-full bg-red-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
      </span>
      <Trophy size={16} strokeWidth={3} className="shrink-0 text-brutal-yellow" />
      <span className="truncate font-mono text-xs font-bold">{label}</span>
      <span className="ml-auto shrink-0 border-2 border-brutal-yellow bg-brutal-yellow px-1.5 font-black text-[10px] text-black">
        OPEN
      </span>
    </motion.button>
  )
}
