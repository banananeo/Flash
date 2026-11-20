import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import SplashScreen from './components/SplashScreen'
import { TopBar, BottomNav } from './components/AppShell'
import BriefingSection from './components/News/BriefingSection'
import LiveScoresSection from './components/LiveScores/LiveScoresSection'
import F1Section from './components/F1/F1Section'
import ArticleModal from './components/ArticleModal'
import ScoreboardModal from './components/LiveScores/ScoreboardModal'
import InstallPrompt from './components/LiveScores/InstallPrompt'
import MorningReminder from './components/MorningReminder'
import { useScoreStore } from './store/useScoreStore'
import { useNewsStore } from './store/useNewsStore'
import { useF1Store } from './store/useF1Store'
import { useReminderStore } from './store/useReminderStore'

export default function App() {
  const view = useScoreStore((s) => s.view)
  const fetchBoth = useScoreStore((s) => s.fetchBoth)
  const fetchSchedule = useF1Store((s) => s.fetchSchedule)
  const readingArticle = useNewsStore((s) => s.readingArticle)
  const closeReader = useNewsStore((s) => s.closeReader)
  const selectedMatch = useScoreStore((s) => s.selected)
  const reminderVisible = useReminderStore((s) => s.visible)
  const [splash, setSplash] = useState(true)

  useEffect(() => {
    // Warm scores + F1 schedule for the live badge and desktop right rail.
    fetchBoth()
    fetchSchedule()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 3000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!readingArticle && !selectedMatch && !reminderVisible) return undefined

    const bodyOverflow = document.body.style.overflow
    const rootOverflow = document.documentElement.style.overflow
    const bodyOverscroll = document.body.style.overscrollBehavior
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'

    return () => {
      document.body.style.overflow = bodyOverflow
      document.documentElement.style.overflow = rootOverflow
      document.body.style.overscrollBehavior = bodyOverscroll
    }
  }, [readingArticle, selectedMatch, reminderVisible])

  return (
    <div className="min-h-screen bg-paper font-sans text-ink">
      <AnimatePresence>{splash && <SplashScreen onDone={() => setSplash(false)} />}</AnimatePresence>

      <TopBar />

      <main>
        {view === 'scores' ? (
          <LiveScoresSection />
        ) : view === 'f1' ? (
          <F1Section />
        ) : (
          <BriefingSection />
        )}
      </main>

      <BottomNav />

      {/* Editorial Story Reader, Match Centre, PWA Install & Morning Brief */}
      <ArticleModal article={readingArticle} onClose={closeReader} />
      <ScoreboardModal />
      <InstallPrompt />
      <MorningReminder />
    </div>
  )
}
