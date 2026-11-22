import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import flashSymbol from '../assets/icons/flash-symbol.svg'

// 01 · Splash — quiet warm-paper boot screen with italic f mark + loading track.
export default function SplashScreen({ onDone }) {
  const reduced = useReducedMotion()
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current?.(), reduced ? 250 : 1150)
    return () => clearTimeout(t)
  }, [reduced])

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0.1 : 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-paper px-6 py-12"
      aria-label="Loading flash"
    >
      <div className="h-6" />
      <motion.div
        initial={reduced ? false : { opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center justify-center"
      >
        <img src={flashSymbol} alt="flash" width={52} height={52} className="h-[52px] w-[52px] object-contain" />
      </motion.div>

      <div className="mb-12 flex flex-col items-center">
        <div className="relative h-[3px] w-[62px] overflow-hidden rounded-[2px] bg-hairline">
          <motion.div
            initial={{ x: reduced ? 0 : '-100%' }}
            animate={{ x: '0%' }}
            transition={{ duration: reduced ? 0.1 : 0.95, ease: [0.22, 1, 0.36, 1] }}
            className="h-full w-full rounded-[2px] bg-ink"
          />
        </div>
      </div>
    </motion.div>
  )
}
