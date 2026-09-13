import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion } from 'framer-motion'

// Signature boot splash — "PRINT → PLAY → RACE → DRAW → DOCK" ~6s showcase
// (tap skips anytime):
// 0: kinetic FLASH! masthead over halftone storm + 000→100 counter
// 1: newspaper slam (paper THROUGH the type)
// 2: balls burst out, collide, score pop
// 3: F1 depth charge + fly-past (1000ms window fits the 0.7s pass-by)
// 4: F! monogram stroke-draw (Nike-sting homage: bone outline draws,
//    yellow fill snaps, dot pops, tagline rises)
// 5: dock hold → flight up while the exit slide carries it — reads as
//    landing in the header (pure illusion, zero App changes).
// Pure CSS/inline-SVG (offline-safe, no /logo.svg img dependency).
// Self-timed; App keeps a 9s safety timeout. Reduced-motion static card.
const ACT_TIMES = [1100, 2100, 3000, 4000, 5400]
const DONE_AT = 6000

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    try {
      return !!window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      return false
    }
  })
  useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      const onChange = (e) => setReduced(!!e.matches)
      mq.addEventListener?.('change', onChange)
      return () => mq.removeEventListener?.('change', onChange)
    } catch {
      return undefined
    }
  }, [])
  return reduced
}

// Full-stage flash frame (impact cuts). Mounts, blinks, unmounts.
function FlashFrame({ color = '#fff', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.9, 0] }}
      transition={{ duration: 0.16, delay, ease: 'linear' }}
      className="pointer-events-none absolute inset-0 z-30"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  )
}

// Chromatic-aberration hit: RGB-split ghost frames for ~140ms.
// mix-blend-screen on black reads as a prism flash, not a tint.
function RGBSplit({ delay = 0 }) {
  const panes = [
    { bg: '#FF4D4D', x: [0, -14, 0] },
    { bg: '#4D7CFE', x: [0, 14, 0] },
  ]
  return (
    <div className="pointer-events-none absolute inset-0 z-30" aria-hidden>
      {panes.map((p, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 0 }}
          animate={{ opacity: [0, 0.55, 0], x: p.x }}
          transition={{ duration: 0.16, delay, ease: 'linear' }}
          className="absolute inset-0"
          style={{ backgroundColor: p.bg, mixBlendMode: 'screen' }}
        />
      ))}
    </div>
  )
}

// Expanding impact ring (paper slam, ball collision, logo landing).
function ShockRing({ size = 160, delay = 0, color = '#F5F1E6' }) {
  return (
    <motion.span
      initial={{ scale: 0.2, opacity: 0.9, x: '-50%', y: '-50%' }}
      animate={{ scale: 2.6, opacity: 0, x: '-50%', y: '-50%' }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      className="absolute left-1/2 top-1/2 rounded-full border-[5px]"
      style={{ width: size, height: size, borderColor: color }}
      aria-hidden
    />
  )
}

const WORD = ['F', 'L', 'A', 'S', 'H']

function KineticMasthead() {
  return (
    <div className="relative flex items-end" aria-hidden>
      {WORD.map((ch, i) => (
        <motion.span
          key={i}
          initial={{ y: 130, rotateX: -95, opacity: 0 }}
          animate={{ y: 0, rotateX: 0, opacity: 1 }}
          exit={{ y: -90 - i * 14, x: i % 2 ? 46 : -46, rotate: i % 2 ? 14 : -14, opacity: 0 }}
          transition={{
            delay: 0.06 + i * 0.05,
            type: 'spring', stiffness: 320, damping: 21,
          }}
          style={{ transformPerspective: 600 }}
          className={`font-black text-7xl tracking-tighter sm:text-8xl ${i % 2 ? 'text-stroke-white text-transparent' : 'text-bone'}`}
        >
          {ch}
        </motion.span>
      ))}
      {/* lightning bolt draws itself, then snaps solid */}
      <motion.svg
        viewBox="300 90 140 330"
        className="h-20 w-14 sm:h-24 sm:w-16"
        initial={{ scale: 0, rotate: -18 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ y: -140, x: 60, opacity: 0 }}
        transition={{ delay: 0.38, type: 'spring', stiffness: 340, damping: 15 }}
      >
        {/* glow pulse behind the bolt */}
        <motion.polygon
          points="396,116 328,258 366,258 342,396 428,238 386,238 412,116"
          fill="#FFDE59"
          stroke="none"
          style={{ filter: 'blur(14px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.9, 0.35] }}
          transition={{ delay: 0.72, duration: 0.32, ease: 'linear' }}
        />
        <motion.polygon
          points="396,116 328,258 366,258 342,396 428,238 386,238 412,116"
          fill="#FFDE59"
          stroke="#F5F1E6"
          strokeWidth="10"
          initial={{ pathLength: 0, fillOpacity: 0 }}
          animate={{ pathLength: 1, fillOpacity: 1 }}
          transition={{ pathLength: { delay: 0.4, duration: 0.3, ease: 'easeOut' }, fillOpacity: { delay: 0.68, duration: 0.12 } }}
        />
      </motion.svg>
    </div>
  )
}

function Newspaper() {
  return (
    <motion.div
      initial={{ y: 260, rotate: -14, opacity: 0 }}
      animate={{ y: [260, -14, 0], rotate: [-14, 2, -3], opacity: 1, x: [0, 0, 0, -7, 7, 0] }}
      exit={{ scaleY: 0.08, skewX: -14, opacity: 0 }}
      transition={{
        // NOTE: y/rotate play 3-stop keyframes, so they must be tweens —
        // a spring only honours the first segment and the slam looks dead.
        y: { duration: 0.45, ease: [0.22, 0.9, 0.3, 1] },
        rotate: { duration: 0.45, ease: [0.22, 0.9, 0.3, 1] },
        opacity: { duration: 0.2 },
        x: { delay: 0.32, duration: 0.22 },
        scaleY: { duration: 0.22, ease: 'easeIn' },
      }}
      className="relative w-56 border-[4px] border-black bg-white p-3 text-black shadow-[8px_8px_0_#FFDE59] sm:w-64"
    >
      <ShockRing size={190} delay={0.14} color="#FFDE59" />
      <p className="border-b-[3px] border-black pb-1 text-center font-black text-3xl tracking-tighter">
        FLASH<span className="text-brutal-red">!</span>
      </p>
      <p className="mt-1 text-center font-mono text-[9px] font-bold uppercase tracking-widest opacity-60">
        Morning edition
      </p>
      <div className="mt-2 flex flex-col gap-1.5">
        {[92, 100, 78].map((w, i) => (
          <motion.div
            key={i}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.15 + i * 0.07, duration: 0.2 }}
            style={{ width: `${w}%`, transformOrigin: 'left' }}
            className="h-2.5 bg-black"
          />
        ))}
      </div>
      <motion.span
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: -12 }}
        transition={{ delay: 0.32, type: 'spring', stiffness: 440, damping: 12 }}
        className="absolute -right-3 -top-3 border-[3px] border-black bg-brutal-red px-2 py-0.5 font-mono text-[10px] font-black uppercase text-white"
      >
        Live
      </motion.span>
    </motion.div>
  )
}

function Football() {
  return (
    <div className="relative grid h-24 w-24 place-items-center overflow-hidden rounded-full border-[4px] border-black bg-white sm:h-28 sm:w-28">
      <div
        className="h-8 w-8 bg-black sm:h-9 sm:w-9"
        style={{ clipPath: 'polygon(50% 0%, 100% 38%, 81% 100%, 19% 100%, 0% 38%)' }}
      />
      {[
        'left-1 top-2 h-3 w-3',
        'right-1 top-4 h-2.5 w-2.5',
        'bottom-1 left-1/2 h-3 w-3',
      ].map((c, i) => (
        <span key={i} className={`absolute rounded-full bg-black/80 ${c}`} />
      ))}
    </div>
  )
}

function CricketBall() {
  return (
    <div className="relative grid h-20 w-20 place-items-center overflow-hidden rounded-full border-[4px] border-black bg-brutal-red sm:h-24 sm:w-24">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        <path d="M 30 6 Q 46 50 30 94" fill="none" stroke="#fff" strokeWidth="4" strokeDasharray="7 5" />
        <path d="M 70 6 Q 54 50 70 94" fill="none" stroke="#fff" strokeWidth="4" strokeDasharray="7 5" />
      </svg>
      <span className="h-10 w-10 rounded-full bg-white/15" />
    </div>
  )
}

function BallsBump() {
  return (
    <div className="relative flex items-center">
      <motion.div
        initial={{ x: -200, y: 40, rotate: -140, scaleY: 1 }}
        animate={{ x: -8, y: [40, -26, 0], rotate: 0, scaleY: [1, 1, 0.82, 1] }}
        exit={{ x: -220, opacity: 0 }}
        // tween: y/scaleY are multi-stop keyframes (bounce + squash),
        // which a spring cannot play back.
        transition={{ duration: 0.5, ease: [0.22, 0.9, 0.3, 1] }}
      >
        <Football />
      </motion.div>
      <motion.div
        initial={{ x: 200, y: -40, rotate: 140, scaleY: 1 }}
        animate={{ x: 8, y: [-40, 22, 0], rotate: 0, scaleY: [1, 1, 0.82, 1] }}
        exit={{ x: 220, opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 0.9, 0.3, 1] }}
      >
        <CricketBall />
      </motion.div>
      {/* impact star-burst */}
      <motion.span
        initial={{ scale: 0, rotate: 0, opacity: 1, x: '-50%', y: '-50%' }}
        animate={{ scale: [0, 1.6, 0.4], rotate: 25, opacity: [1, 1, 0], x: '-50%', y: '-50%' }}
        transition={{ delay: 0.34, duration: 0.36, ease: 'easeOut' }}
        className="absolute left-1/2 top-1/2 bg-brutal-yellow"
        style={{ width: 90, height: 90, clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}
      />
      <ShockRing size={120} delay={0.34} color="#FFDE59" />
      <motion.span
        initial={{ scale: 0, rotate: -8, x: '-50%', y: '-50%' }}
        animate={{ scale: [0, 1.35, 1], rotate: 3, x: '-50%', y: '-50%' }}
        exit={{ opacity: 0 }}
        transition={{ delay: 0.38, duration: 0.3 }}
        className="absolute left-1/2 top-1/2 border-[3px] border-black bg-brutal-yellow px-2.5 py-1 font-black text-base text-black"
      >
        2–1 • 187/4
      </motion.span>
    </div>
  )
}

// Head-on F1 car (front view, symmetric around x=110).
function F1Car() {
  return (
    <svg viewBox="0 0 220 120" className="w-64 drop-shadow-[6px_6px_0_rgba(0,0,0,0.55)] sm:w-80" aria-hidden>
      <rect x="6" y="96" width="208" height="10" fill="#0D0D12" stroke="#F5F1E6" strokeWidth="2" />
      <rect x="6" y="72" width="12" height="34" fill="#FF4D5E" stroke="#000" strokeWidth="3" />
      <rect x="202" y="72" width="12" height="34" fill="#FF4D5E" stroke="#000" strokeWidth="3" />
      <circle cx="42" cy="82" r="24" fill="#0D0D12" stroke="#F5F1E6" strokeWidth="3" />
      <circle cx="42" cy="82" r="9" fill="#F5F1E6" />
      <circle cx="178" cy="82" r="24" fill="#0D0D12" stroke="#F5F1E6" strokeWidth="3" />
      <circle cx="178" cy="82" r="9" fill="#F5F1E6" />
      <line x1="66" y1="70" x2="92" y2="58" stroke="#F5F1E6" strokeWidth="4" />
      <line x1="154" y1="70" x2="128" y2="58" stroke="#F5F1E6" strokeWidth="4" />
      <polygon points="100,46 120,46 116,96 104,96" fill="#FF4D5E" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
      <text x="110" y="88" textAnchor="middle" fontFamily="monospace" fontWeight="900" fontSize="15" fill="#fff">1</text>
      <rect x="86" y="38" width="48" height="22" rx="6" fill="#FF4D5E" stroke="#000" strokeWidth="3" />
      <path d="M92 38 Q94 16 110 16 Q126 16 128 38" fill="none" stroke="#0D0D12" strokeWidth="7" strokeLinecap="round" />
      <circle cx="110" cy="30" r="8" fill="#FFDE59" stroke="#000" strokeWidth="3" />
    </svg>
  )
}

// Depth charge → fly-past. Centering lives on the plain outer wrapper so
// the motion child animates x in px/vw only (never mixing %-units).
function CarCharge() {
  const streaks = [
    { x: [0, -190], y: [0, -120] },
    { x: [0, 190], y: [0, -120] },
    { x: [0, -230], y: [0, -10] },
    { x: [0, 230], y: [0, -10] },
    { x: [0, -160], y: [0, 130] },
    { x: [0, 160], y: [0, 130] },
  ]
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute bottom-0 left-1/2 h-[55%] w-[130%] -translate-x-1/2 bg-[#232327]"
        style={{ clipPath: 'polygon(43% 0, 57% 0, 100% 100%, 0% 100%)' }}
        aria-hidden
      />
      <div
        className="absolute bottom-0 left-1/2 h-[55%] w-[130%] -translate-x-1/2"
        style={{
          clipPath: 'polygon(43% 0, 45.5% 0, 22% 100%, 14% 100%)',
          background: 'repeating-linear-gradient(to bottom, #FF4D5E 0 22px, #F5F1E6 22px 44px)',
        }}
        aria-hidden
      />
      <div
        className="absolute bottom-0 left-1/2 h-[55%] w-[130%] -translate-x-1/2"
        style={{
          clipPath: 'polygon(54.5% 0, 57% 0, 86% 100%, 78% 100%)',
          background: 'repeating-linear-gradient(to bottom, #FF4D5E 0 22px, #F5F1E6 22px 44px)',
        }}
        aria-hidden
      />
      {streaks.map((s, i) => (
        <motion.span
          key={i}
          initial={{ x: 0, y: 0, opacity: 0 }}
          animate={{ x: s.x, y: s.y, opacity: [0, 1, 0] }}
          transition={{ duration: 0.42, delay: 0.08 + i * 0.05, ease: 'easeOut' }}
          className="absolute left-1/2 top-[46%] h-1.5 w-16 bg-white/80"
        />
      ))}
      {/* centering lives on this plain wrapper (-translate-x-1/2) so the
          motion child below only ever animates x in one unit family.
          (Mixing '-50%' → '46vw' keyframes in a single x makes framer
          snap instead of glide.) */}
      <div className="absolute left-1/2 top-[38%] -translate-x-1/2" aria-hidden>
      <motion.div
        initial={{ scale: 0.22, y: -30, x: 0, rotate: 0, skewX: 0, opacity: 1 }}
        animate={{
          scale: [0.22, 1.6, 2.6],
          y: [-30, 30, 90],
          x: [0, 0, '46vw'],
          rotate: [0, 0, 8],
          skewX: [0, 0, -14],
          opacity: [1, 1, 0],
        }}
        transition={{ duration: 0.7, times: [0, 0.62, 1], ease: [0.25, 0.6, 0.35, 1] }}
      >
        <motion.div
          animate={{ y: [0, 4, 0, -4, 0] }}
          transition={{ duration: 0.22, repeat: Infinity, ease: 'linear' }}
        >
          <F1Car />
        </motion.div>
      </motion.div>
      </div>
    </div>
  )
}

// Finale: Nike-sting homage — the F! monogram draws itself as a bone
// outline (staggered pathLength, like a logo-reveal stroke anim), snaps to
// the brutal-yellow fill with a flash + shockwave, dot pops, tagline rises,
// then docks upward as the exit slide carries it (header illusion).
// Geometry mirrors public/logo.svg (viewBox 0 0 512 512) with rects
// rewritten as paths so framer-motion pathLength works on every stroke.
const F_STROKES = [
  { d: 'M104 116 H180 V396 H104 Z', delay: 0 },
  { d: 'M104 116 H348 V188 H104 Z', delay: 0.15 },
  { d: 'M104 244 H308 V308 H104 Z', delay: 0.3 },
]
const BOLT_POINTS = '396,116 328,258 366,258 342,396 428,238 386,238 412,116'
const DOT_D = 'M346 412 H406 V468 H346 Z'

function FlashStrokeLogo({ docked = false }) {
  return (
    <motion.div
      initial={{ y: 0 }}
      animate={{ y: docked ? '-46vh' : 0 }}
      transition={{ duration: 0.4, ease: [0.6, 0, 0.3, 1] }}
      className="relative flex flex-col items-center"
    >
      {/* snap-pop on the whole mark at the fill (~1.0s after mount) */}
      <motion.div
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1, 1.07, 1] }}
        transition={{ delay: 1.0, duration: 0.32, ease: 'easeOut' }}
        className="relative"
      >
        <ShockRing size={220} delay={1.0} color="#FFDE59" />
        <FlashFrame color="#ffffff" delay={1.0} />
        <div className="relative h-44 w-44 border-[4px] border-brutal-yellow bg-black shadow-[8px_8px_0_#FFDE59] sm:h-56 sm:w-56">
          <svg viewBox="0 0 512 512" className="absolute inset-0 h-full w-full" aria-hidden>
            {F_STROKES.map((s) => (
              <motion.path
                key={s.d}
                d={s.d}
                fill="#FFDE59"
                stroke="#F5F1E6"
                strokeWidth="10"
                initial={{ pathLength: 0, fillOpacity: 0 }}
                animate={{ pathLength: 1, fillOpacity: 1 }}
                transition={{
                  pathLength: { delay: s.delay, duration: 0.6, ease: 'easeInOut' },
                  fillOpacity: { delay: 1.0, duration: 0.15 },
                }}
              />
            ))}
            <motion.polygon
              points={BOLT_POINTS}
              fill="#FFDE59"
              stroke="#F5F1E6"
              strokeWidth="10"
              strokeLinejoin="round"
              initial={{ pathLength: 0, fillOpacity: 0 }}
              animate={{ pathLength: 1, fillOpacity: 1 }}
              transition={{
                pathLength: { delay: 0.5, duration: 0.6, ease: 'easeInOut' },
                fillOpacity: { delay: 1.0, duration: 0.15 },
              }}
            />
            <motion.path
              d={DOT_D}
              fill="#FFDE59"
              stroke="#F5F1E6"
              strokeWidth="10"
              initial={{ pathLength: 0, fillOpacity: 0 }}
              animate={{ pathLength: 1, fillOpacity: 1 }}
              transition={{
                pathLength: { delay: 0.9, duration: 0.25, ease: 'easeInOut' },
                fillOpacity: { delay: 1.05, duration: 0.12 },
              }}
            />
          </svg>
        </div>
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.25, ease: 'easeOut' }}
        className="mt-4 font-black text-4xl tracking-tighter text-bone sm:text-5xl"
        aria-hidden
      >
        FLASH<span className="text-brutal-yellow">!</span>
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.22, duration: 0.25, ease: 'easeOut' }}
        className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-bone/60"
        aria-hidden
      >
        News by Sabareesh
      </motion.p>
    </motion.div>
  )
}

const PIPS = ['Print', 'Play', 'Race', 'Draw', 'Dock']

export default function SplashScreen({ onDone }) {
  const [act, setAct] = useState(0)
  const [count, setCount] = useState(0)
  const doneRef = useRef(false)
  const reduced = useReducedMotion()

  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    onDone?.()
  }

  useEffect(() => {
    if (reduced) {
      const t = setTimeout(finish, 900)
      return () => clearTimeout(t)
    }
    const timers = [
      ...ACT_TIMES.map((ms, i) => setTimeout(() => setAct(i + 1), ms)),
      setTimeout(finish, DONE_AT),
    ]
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced])

  useEffect(() => {
    if (reduced) return undefined
    const controls = animate(0, 100, {
      duration: DONE_AT / 1000 - 0.3,
      ease: 'easeOut',
      onUpdate: (v) => setCount(Math.floor(v)),
    })
    return () => controls.stop()
  }, [reduced])

  if (reduced) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={finish}
        className="fixed inset-0 z-[100] grid cursor-pointer place-items-center bg-black text-bone"
        aria-label="Loading FLASH!"
      >
        <p className="font-black text-6xl tracking-tighter">
          FLASH<span className="text-brutal-yellow">!</span>
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ y: 0 }}
      exit={{ y: '-100%' }}
      transition={{ duration: 0.45, ease: [0.7, 0, 0.2, 1] }}
      onClick={finish}
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
                  ★ NEWS <span className="mx-2">///</span> CRICKET <span className="mx-2">///</span> FOOTBALL <span className="mx-2">///</span> F1 STANDINGS
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* stage */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-6">
        {/* halftone storm (slow drift) + animated grain jitter + vignette */}
        <motion.div
          animate={{ x: [0, -46, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
          className="halftone pointer-events-none absolute -inset-10 opacity-25"
          aria-hidden
        />
        <motion.div
          animate={{ x: [0, -18, 12, -26, 0], y: [0, 10, -12, 6, 0], opacity: [0.1, 0.16, 0.1, 0.14, 0.1] }}
          transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
          className="halftone pointer-events-none absolute -inset-10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at center, transparent 52%, rgba(0,0,0,0.75) 100%)' }}
          aria-hidden
        />
        {/* inset frame (retracts at the dock) */}
        <motion.div
          animate={{ opacity: act >= 5 ? 0 : 1, scale: act >= 5 ? 1.04 : 1 }}
          transition={{ duration: 0.3 }}
          className="pointer-events-none absolute inset-3 border-[3px] border-bone/25"
          aria-hidden
        />

        <AnimatePresence mode="popLayout">
          {act === 0 && (
            <motion.div key="masthead" exit={{ opacity: 0 }}>
              <KineticMasthead />
            </motion.div>
          )}
          {act === 1 && (
            <motion.div key="paper" exit={{ opacity: 0 }}>
              <FlashFrame color="#FFDE59" />
              <RGBSplit delay={0.12} />
              <Newspaper />
            </motion.div>
          )}
          {act === 2 && (
            <motion.div key="balls" exit={{ opacity: 0 }}>
              <FlashFrame color="#ffffff" />
              <RGBSplit delay={0.32} />
              <BallsBump />
            </motion.div>
          )}
          {act === 3 && (
            <motion.div key="car" exit={{ opacity: 0 }} className="absolute inset-0">
              <CarCharge />
            </motion.div>
          )}
          {act >= 4 && (
            <motion.div key="finale" exit={{ opacity: 0 }}>
              <RGBSplit delay={0.06} />
              <FlashStrokeLogo docked={act >= 5} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* bottom cluster: glitching counter + pips */}
      <div className="flex items-center gap-3 px-5 pb-1">
        <motion.span
          key={act}
          initial={{ x: 0, skewX: 0 }}
          animate={{ x: [0, -4, 4, 0], skewX: [0, -12, 8, 0] }}
          transition={{ duration: 0.22, ease: 'linear' }}
          className="font-mono text-xs font-black tabular-nums tracking-widest text-brutal-yellow"
        >
          {String(count).padStart(3, '0')}
        </motion.span>
        <div className="flex flex-1 gap-1.5">
          {PIPS.map((p, i) => (
            <span
              key={p}
              className={`h-2 flex-1 border border-bone/40 font-mono text-[8px] ${act > i ? 'bg-brutal-yellow' : 'bg-transparent'}`}
            />
          ))}
        </div>
      </div>
      <div className="border-t-[4px] border-brutal-yellow bg-black py-2 text-center font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-bone/50">
        News by Sabareesh
      </div>
      {/* yellow edge smears upward as the panel exits */}
      <motion.div
        className="bg-brutal-yellow"
        initial={{ height: 6 }}
        exit={{ height: 72 }}
        transition={{ duration: 0.4, ease: [0.7, 0, 0.2, 1] }}
        aria-hidden
      />
    </motion.div>
  )
}
