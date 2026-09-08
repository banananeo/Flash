import { motion } from 'framer-motion'

const WORD = 'FLASH!'.split('')

// Boot splash — black stage, yellow slam-in logo, staggered wordmark,
// live ticker rails + loading bar. Dismissed by App after ~2.1s (tap skips).
export default function SplashScreen({ onDone }) {
  return (
    <motion.div
      initial={{ y: 0 }}
      exit={{ y: '-100%' }}
      transition={{ duration: 0.55, ease: [0.7, 0, 0.2, 1] }}
      onClick={onDone}
      className="fixed inset-0 z-[100] flex cursor-pointer flex-col overflow-hidden bg-black text-bone"
      aria-label="Loading FLASH!"
    >
      {/* top ticker rail */}
      <div className="overflow-hidden border-b-[4px] border-brutal-yellow bg-brutal-yellow py-1.5 text-black">
        <div className="marquee-track gap-8 pr-8">
          {[0, 1].map((half) => (
            <div key={half} className="flex shrink-0 items-center gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} className="whitespace-nowrap font-mono text-xs font-bold tracking-widest">
                  ★ BREAKING <span className="mx-2">///</span> LIVE SCORES <span className="mx-2">///</span> TOP HEADLINES
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* stage */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-6">
        {/* backdrop shapes */}
        <motion.div
          initial={{ opacity: 0, rotate: -14, scale: 0.6 }}
          animate={{ opacity: 1, rotate: -8, scale: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 160, damping: 18 }}
          className="absolute h-56 w-56 border-[4px] border-brutal-pink/70 sm:h-72 sm:w-72"
          aria-hidden
        />
        <motion.div
          initial={{ opacity: 0, rotate: 12, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 6, scale: 1 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 160, damping: 18 }}
          className="absolute h-56 w-56 border-[4px] border-brutal-blue/70 sm:h-72 sm:w-72"
          aria-hidden
        />

        {/* logo slam */}
        <motion.img
          src="/logo.svg"
          alt="FLASH! logo"
          initial={{ scale: 0, rotate: -14 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          className="relative h-28 w-28 border-[4px] border-brutal-yellow shadow-[8px_8px_0_#FFDE59] sm:h-36 sm:w-36"
          draggable={false}
        />

        {/* wordmark stagger */}
        <div className="relative mt-6 flex overflow-hidden" aria-hidden>
          {WORD.map((ch, i) => (
            <motion.span
              key={i}
              initial={{ y: 90 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.35 + i * 0.06, type: 'spring', stiffness: 320, damping: 22 }}
              className={`font-black text-6xl tracking-tighter sm:text-7xl ${ch === '!' ? 'text-brutal-yellow' : ''}`}
            >
              {ch}
            </motion.span>
          ))}
        </div>

        {/* tagline */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
          className="relative mt-3 border-2 border-bone/40 bg-white/5 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.25em]"
        >
          Brutal news + live scores<span className="ml-1 inline-block h-3 w-2 animate-pulse bg-brutal-yellow align-middle" />
        </motion.p>

        {/* loading bar */}
        <div className="relative mt-8 w-56 sm:w-72">
          <motion.div
            initial={{ width: '4%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.6, ease: 'easeInOut' }}
            className="h-5 border-[3px] border-brutal-yellow bg-brutal-yellow shadow-[4px_4px_0_rgba(255,222,89,0.35)]"
          />
          <div className="-mt-5 h-5 border-[3px] border-bone/30" aria-hidden />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-2 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-bone/60"
          >
            Loading headlines…
          </motion.p>
        </div>
      </div>

      {/* bottom rail */}
      <div className="border-t-[4px] border-brutal-yellow bg-black py-2 text-center font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-bone/50">
        News by Sabareesh
      </div>
      {/* yellow wipe edge revealed on exit */}
      <div className="h-1.5 bg-brutal-yellow" aria-hidden />
    </motion.div>
  )
}
