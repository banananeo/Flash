import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import SplashScreen from './components/SplashScreen'
import ErrorBoundary from './components/ErrorBoundary'
import { TopBar, BottomNav } from './components/AppShell'
import BriefingSection from './components/News/BriefingSection'
import InstallPrompt from './components/LiveScores/InstallPrompt'
import { useScoreStore } from './store/useScoreStore'
import { useNewsStore } from './store/useNewsStore'
import { useF1Store } from './store/useF1Store'
import { useReminderStore } from './store/useReminderStore'

const LiveScoresSection = lazy(() => import('./components/LiveScores/LiveScoresSection'))
const F1Section = lazy(() => import('./components/F1/F1Section'))
const ArticleModal = lazy(() => import('./components/ArticleModal'))
const ScoreboardModal = lazy(() => import('./components/LiveScores/ScoreboardModal'))
const MorningReminder = lazy(() => import('./components/MorningReminder'))

function SectionFallback() {
  return (
    <div className="mx-auto w-full max-w-[460px] space-y-4 px-6 pb-28 pt-8 lg:max-w-[780px]">
      <div className="h-9 w-44 animate-pulse rounded-[12px] bg-sage" />
      <div className="h-[190px] animate-pulse rounded-[20px] bg-sage" />
      <div className="h-16 animate-pulse rounded-[16px] bg-white" />
    </div>
  )
}

export default function App() {
  const view = useScoreStore((s) => s.view)
  const fetchBoth = useScoreStore((s) => s.fetchBoth)
  const fetchSchedule = useF1Store((s) => s.fetchSchedule)
  const readingArticle = useNewsStore((s) => s.readingArticle)
  const closeReader = useNewsStore((s) => s.closeReader)
  const selectedMatch = useScoreStore((s) => s.selected)
  const reminderVisible = useReminderStore((s) => s.visible)
  const [splash, setSplash] = useState(true)

  const hideSplash = useCallback(() => setSplash(false), [])

  useEffect(() => {
    // Warm scores + F1 schedule for the live badge and desktop right rail.
    fetchBoth()
    fetchSchedule()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = setTimeout(hideSplash, 2200)
    return () => clearTimeout(t)
  }, [hideSplash])

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
    <ErrorBoundary>
      <div className="min-h-screen bg-paper font-sans text-ink">
        <AnimatePresence>{splash && <SplashScreen onDone={hideSplash} />}</AnimatePresence>

        <TopBar />

        <main>
          <ErrorBoundary key={view}>
            <Suspense fallback={<SectionFallback />}>
              {view === 'scores' ? (
                <LiveScoresSection />
              ) : view === 'f1' ? (
                <F1Section />
              ) : (
                <BriefingSection />
              )}
            </Suspense>
          </ErrorBoundary>
        </main>

        <BottomNav />

        {/* Editorial Story Reader, Match Centre, PWA Install & Morning Brief */}
        <ErrorBoundary>
          <Suspense fallback={null}>
            <ArticleModal
              key={readingArticle?.id || readingArticle?.url || 'closed'}
              article={readingArticle}
              onClose={closeReader}
            />
            <ScoreboardModal />
            <MorningReminder />
          </Suspense>
        </ErrorBoundary>
        <InstallPrompt />
      </div>
    </ErrorBoundary>
  )
}
