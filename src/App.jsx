import { motion } from 'framer-motion'
import { Newspaper, ThumbsDown, ThumbsUp, Trophy } from 'lucide-react'
import Header from './components/Header'
import Marquee from './components/Marquee'
import CategoryPills from './components/CategoryPills'
import CardStack from './components/CardStack'
import LiveScoresSection from './components/LiveScores/LiveScoresSection'
import ScoreboardModal from './components/LiveScores/ScoreboardModal'
import ScoreWidget from './components/LiveScores/ScoreWidget'
import InstallPrompt from './components/LiveScores/InstallPrompt'
import { useNewsStore } from './store/useNewsStore'
import { useScoreStore } from './store/useScoreStore'

function ReactionPanel() {
  const likes = useNewsStore((s) => s.likes)
  const dislikes = useNewsStore((s) => s.dislikes)
  const clearReactions = useNewsStore((s) => s.clearReactions)

  return (
    <div className="flex flex-col gap-4">
      <motion.div
        initial={{ x: 40, opacity: 0, rotate: 1 }}
        animate={{ x: 0, opacity: 1, rotate: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="card-brutal bg-white p-5"
      >
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="border-[3px] border-black bg-brutal-mint p-3 shadow-brutal-xs">
            <ThumbsUp size={22} strokeWidth={3} className="mx-auto" />
            <p className="font-black text-3xl leading-none">{likes.length}</p>
            <p className="font-mono text-[10px] font-bold uppercase">Likes</p>
          </div>
          <div className="border-[3px] border-black bg-brutal-red p-3 text-white shadow-brutal-xs">
            <ThumbsDown size={22} strokeWidth={3} className="mx-auto" />
            <p className="font-black text-3xl leading-none">{dislikes.length}</p>
            <p className="font-mono text-[10px] font-bold uppercase">Dislikes</p>
          </div>
        </div>
        {(likes.length > 0 || dislikes.length > 0) && (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={clearReactions}
            className="btn-brutal mt-3 w-full bg-black px-4 py-2 text-xs text-white"
          >
            Clear reactions
          </motion.button>
        )}
      </motion.div>

      <motion.div
        initial={{ x: 40, opacity: 0, rotate: -1 }}
        animate={{ x: 0, opacity: 1, rotate: -1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
        className="card-brutal bg-black p-5 text-white"
      >
        <p className="inline-block -rotate-2 border-2 border-brutal-yellow bg-brutal-yellow px-2 py-0.5 font-black text-sm text-black">
          LIKED ★ {likes.length}
        </p>
        <div className="mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto">
          {likes.length === 0 ? (
            <p className="border-2 border-white/20 bg-white/5 p-3 text-sm font-bold">
              Nothing liked yet. Swipe right on any card.
            </p>
          ) : (
            likes.map((a) => (
              <div key={a.id} className="border-2 border-white/20 bg-white/5 p-2">
                <p className="text-sm font-black leading-tight">{a.title}</p>
                <p className="font-mono text-[10px] font-bold uppercase text-white/60">{a.source}</p>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  )
}

function ViewSwitcher() {
  const view = useScoreStore((s) => s.view)
  const setView = useScoreStore((s) => s.setView)
  const liveCount = useScoreStore((s) => s.liveCount)()

  const tabs = [
    { id: 'news', label: 'News', icon: <Newspaper size={16} strokeWidth={3} />, bg: '#4D7CFE' },
    { id: 'scores', label: `Scores${liveCount ? ` (${liveCount})` : ''}`, icon: <Trophy size={16} strokeWidth={3} />, bg: '#00D9A5' },
  ]

  return (
    <div className="mx-auto mt-4 grid max-w-2xl grid-cols-2 gap-2">
      {tabs.map((t) => {
        const active = view === t.id
        return (
          <motion.button
            key={t.id}
            whileTap={{ scale: 0.96 }}
            onClick={() => setView(t.id)}
            className={`relative flex items-center justify-center gap-2 border-[4px] border-black px-4 py-2.5 font-black text-base uppercase tracking-tight ${active ? 'text-white shadow-brutal' : 'shadow-brutal-sm'}`}
            style={{ backgroundColor: active ? '#000' : t.bg }}
          >
            {active && (
              <motion.span
                layoutId="view-tab-star"
                className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border-2 border-black bg-brutal-yellow text-[10px] text-black"
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                ★
              </motion.span>
            )}
            {t.icon} {t.label}
          </motion.button>
        )
      })}
    </div>
  )
}

export default function App() {
  const view = useScoreStore((s) => s.view)

  return (
    <div className="min-h-screen font-grotesk text-black">
      <Header />
      <Marquee />

      <main className="mx-auto max-w-5xl px-4 pb-24">
        <ViewSwitcher />

        {view === 'scores' ? (
          /* separate scores section — mobile-perfect vertical list */
          <div className="mt-4">
            <LiveScoresSection />
          </div>
        ) : (
          /* news section */
          <>
            <CategoryPills />
            <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
              <CardStack />
              <ReactionPanel />
            </div>
          </>
        )}
      </main>

      <footer className="border-t-[4px] border-black bg-black py-4 text-center font-black text-sm uppercase tracking-widest text-white">
        News By Sabareesh
      </footer>

      {/* modal scoreboard + mobile ticker + PWA install */}
      <ScoreboardModal />
      <ScoreWidget />
      <InstallPrompt />
    </div>
  )
}
