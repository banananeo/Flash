import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

// 01 · Splash — pure white startup screen with centered public/logo.svg mark (#171916).
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-white px-6 py-12"
      aria-label="Loading flash"
    >
      <div className="h-6" />
      <motion.div
        initial={reduced ? false : { opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center justify-center"
      >
        <svg
          width="56"
          height="56"
          viewBox="0 0 73.2563 73.5"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="flash"
          className="h-[56px] w-[56px] object-contain"
        >
          <path
            d="M30.0656 0H72.0656C73.05 0 73.5094 0.65625 73.1156 1.575L68.5875 13.125C68.2594 13.9781 67.6031 14.4375 66.6844 14.4375H43.8469L39.2531 26.25H60.2531C61.2375 26.25 61.6969 26.9063 61.3031 27.825L56.775 39.375C56.4469 40.2281 55.7906 40.6875 54.8719 40.6875H33.675L21.4031 72.1875C21.075 73.0406 20.4188 73.5 19.5 73.5H1.19063C0.206251 73.5 -0.253124 72.8438 0.140626 71.925L12.3469 40.6875H1.19063C0.206251 40.6875 -0.253124 40.0312 0.140626 39.1125L4.66875 27.5625C4.99688 26.7094 5.65313 26.25 6.57188 26.25H17.925L27.4406 1.8375C27.9 0.65625 28.7531 0 30.0656 0Z"
            fill="#171916"
          />
        </svg>
      </motion.div>

      <div className="mb-12 flex flex-col items-center">
        <div className="relative h-[3px] w-[62px] overflow-hidden rounded-[2px] bg-hairline">
          <motion.div
            initial={{ x: reduced ? 0 : '-100%' }}
            animate={{ x: '0%' }}
            transition={{ duration: reduced ? 0.1 : 0.95, ease: [0.22, 1, 0.36, 1] }}
            className="h-full w-full rounded-[2px] bg-[#171916]"
          />
        </div>
      </div>
    </motion.div>
  )
}
