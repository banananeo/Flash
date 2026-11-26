import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Analytics } from '@vercel/analytics/react'
import SplashScreen from './components/SplashScreen'
import ErrorBoundary from './components/ErrorBoundary'
import { TopBar, BottomNav } from './components/AppShell'
import HomeSection from './components/Home/HomeSection'
import LiveScoresSection from './components/LiveScores/LiveScoresSection'
import InstallPrompt from './components/LiveScores/InstallPrompt'
import { useScoreStore } from './store/useScoreStore'
import { useF1Store } from './store/useF1Store'

const F1Section = lazy(() => import('./components/F1/F1Section'))
const ScoreboardModal = lazy(() => import('./components/LiveScores/ScoreboardModal'))

function SectionFallback() {
  return (
    <div className="mx-auto w-full max-w-[480px] space-y-4 px-6 pb-28 pt-8 sm:max-w-[640px] lg:max-w-[860px]">
      <div className="h-9 w-44 animate-pulse rounded-[12px] bg-sage" />
      <div className="h-[190px] animate-pulse rounded-[20px] bg-sage" />
      <div className="h-16 animate-pulse rounded-[16px] bg-white" />
    </div>
  )
}

export default function App() {
  const view = useScoreStore((s) => s.view)
  const fetchBoth = useScoreStore((s) => s.fetchBoth)
  const fetchF1 = useF1Store((s) => s.fetchF1)
  const fetchSchedule = useF1Store((s) => s.fetchSchedule)
  const selectedMatch = useScoreStore((s) => s.selected)
  const [splash, setSplash] = useState(true)

  const hideSplash = useCallback(() => setSplash(false), [])

  useEffect(() => {
    // Warm scores + F1 standings & schedule on startup
    fetchBoth()
    fetchF1()
    fetchSchedule()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = setTimeout(hideSplash, 2200)
    return () => clearTimeout(t)
  }, [hideSplash])

  useEffect(() => {
    if (!selectedMatch) return undefined

    const bodyOverflow = document.body.style.overflow
    const rootOverflow = document.documentElement.style.overflow
    const bodyOverscroll = document.body.style.overscrollBehavior
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'

    return () => {
      document.body.style.overflow = bodyOverflow
      document.documentElement.style.overflow = rootOverflow
      document.documentElement.style.overscrollBehavior = bodyOverscroll
    }
  }, [selectedMatch])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-paper font-sans text-ink">
        <AnimatePresence>{splash && <SplashScreen onDone={hideSplash} />}</AnimatePresence>

        <TopBar />

        <main>
          <ErrorBoundary key={view}>
            <Suspense fallback={<SectionFallback />}>
              {view === 'f1' ? (
                <F1Section />
              ) : view === 'scores' ? (
                <LiveScoresSection />
              ) : (
                <HomeSection />
              )}
            </Suspense>
          </ErrorBoundary>
        </main>

        <BottomNav />

        {/* Match Centre & PWA Install */}
        <ErrorBoundary>
          <Suspense fallback={null}>
            <ScoreboardModal />
          </Suspense>
        </ErrorBoundary>
        <InstallPrompt />
        <Analytics />
      </div>
    </ErrorBoundary>
  )
}
