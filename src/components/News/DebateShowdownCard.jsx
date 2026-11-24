import { motion } from 'framer-motion'
import { CheckCircle2, Flame, Swords } from 'lucide-react'
import { SPORT_BADGE_META } from '../../data/mockPaddock'
import { useNewsStore } from '../../store/useNewsStore'

const hexColor = (c) => `#${String(c || '0D9488').replace(/^#/, '')}`

export default function DebateShowdownCard({ debate, featured = false }) {
  const userChoice = useNewsStore((s) => s.debateVotes?.[debate?.id] || null)
  const voteDebate = useNewsStore((s) => s.voteDebate)

  if (!debate) return null

  const { athleteA, athleteB, stats = [] } = debate
  const votesA = (athleteA?.baseVotes || 1000) + (userChoice === 'A' ? 1 : 0)
  const votesB = (athleteB?.baseVotes || 1000) + (userChoice === 'B' ? 1 : 0)
  const totalVotes = Math.max(1, votesA + votesB)
  const pctA = Math.round((votesA / totalVotes) * 100)
  const pctB = 100 - pctA

  const sportMeta = SPORT_BADGE_META[debate.sport] || SPORT_BADGE_META.football
  const colorA = hexColor(athleteA?.colour)
  const colorB = hexColor(athleteB?.colour)

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`overflow-hidden rounded-[22px] border border-hairline bg-white p-5 shadow-sm sm:p-6 ${
        featured ? 'ring-1 ring-pulse/35' : ''
      }`}
    >
      {/* Top Header: Sport + Rivalry Tag + Total Votes */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-pulse px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink">
            <Swords size={11} />
            {sportMeta.label} DEBATE
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
            {debate.tag}
          </span>
        </div>

        <span className="inline-flex items-center gap-1 rounded-full bg-sage px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-muted">
          <Flame size={11} className="text-live" />
          {totalVotes.toLocaleString()} Fan Votes
        </span>
      </div>

      {/* Debate Prompt */}
      <h3 className="mt-3 text-[19px] font-semibold leading-snug tracking-[-0.015em] text-ink sm:text-[22px]">
        {debate.question}
      </h3>
      {debate.context && (
        <p className="mt-1 text-[13px] font-normal text-muted">
          {debate.context}
        </p>
      )}

      {/* Split Contenders Grid */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {/* Contender A */}
        <button
          type="button"
          onClick={() => voteDebate(debate.id, 'A')}
          className={`group relative flex flex-col justify-between rounded-[18px] border p-3.5 text-left transition-all sm:p-4 ${
            userChoice === 'A'
              ? 'border-ink bg-sage-tint shadow-sm'
              : 'border-hairline bg-sage/60 hover:border-ink/40 hover:bg-sage'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className="rounded-full px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-white"
              style={{ backgroundColor: colorA }}
            >
              {athleteA.acro}
            </span>
            {userChoice === 'A' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                <CheckCircle2 size={10} />
                Your Pick
              </span>
            )}
          </div>

          <div className="mt-3">
            <p className="text-[16px] font-bold leading-tight text-ink sm:text-[18px]">
              {athleteA.name}
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-muted">
              {athleteA.team} · <span className="font-semibold text-brand-strong">{athleteA.badge}</span>
            </p>
          </div>

          <div className="mt-3 flex items-baseline justify-between border-t border-hairline/80 pt-2.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted group-hover:text-ink">
              {userChoice === 'A' ? 'Locked In' : 'Back ' + athleteA.shortName}
            </span>
            <span className="font-display text-[20px] font-bold leading-none text-ink">
              {pctA}%
            </span>
          </div>
        </button>

        {/* Contender B */}
        <button
          type="button"
          onClick={() => voteDebate(debate.id, 'B')}
          className={`group relative flex flex-col justify-between rounded-[18px] border p-3.5 text-left transition-all sm:p-4 ${
            userChoice === 'B'
              ? 'border-ink bg-sage-tint shadow-sm'
              : 'border-hairline bg-sage/60 hover:border-ink/40 hover:bg-sage'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className="rounded-full px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-white"
              style={{ backgroundColor: colorB }}
            >
              {athleteB.acro}
            </span>
            {userChoice === 'B' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                <CheckCircle2 size={10} />
                Your Pick
              </span>
            )}
          </div>

          <div className="mt-3">
            <p className="text-[16px] font-bold leading-tight text-ink sm:text-[18px]">
              {athleteB.name}
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-muted">
              {athleteB.team} · <span className="font-semibold text-brand-strong">{athleteB.badge}</span>
            </p>
          </div>

          <div className="mt-3 flex items-baseline justify-between border-t border-hairline/80 pt-2.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted group-hover:text-ink">
              {userChoice === 'B' ? 'Locked In' : 'Back ' + athleteB.shortName}
            </span>
            <span className="font-display text-[20px] font-bold leading-none text-ink">
              {pctB}%
            </span>
          </div>
        </button>
      </div>

      {/* Live Tug-of-War Crowd Split Bar */}
      <div className="mt-3.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-ink">
          <span>
            {athleteA.shortName} · {pctA}%
          </span>
          <span className="text-[10px] uppercase tracking-[0.08em] text-muted">
            {userChoice ? 'Crowd Verdict Split' : 'Tap a card above to vote'}
          </span>
          <span>
            {pctB}% · {athleteB.shortName}
          </span>
        </div>
        <div className="mt-1.5 flex h-2.5 w-full overflow-hidden rounded-full bg-sage p-0.5">
          <motion.div
            initial={{ width: '50%' }}
            animate={{ width: `${pctA}%` }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="h-full rounded-l-full bg-pulse"
          />
          <motion.div
            initial={{ width: '50%' }}
            animate={{ width: `${pctB}%` }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="h-full rounded-r-full bg-ink"
          />
        </div>
      </div>

      {/* 3-Stat Tale of the Tape */}
      {stats.length > 0 && (
        <div className="mt-4 space-y-2.5 rounded-[16px] bg-sage/65 p-3.5 sm:p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
            TALE OF THE TAPE
          </p>
          {stats.map((st, idx) => {
            const leftPct = Math.max(15, Math.min(85, Number(st.pctA) || 50))
            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-display font-bold text-ink">{st.valA}</span>
                  <span className="text-[11px] font-semibold text-muted">{st.label}</span>
                  <span className="font-display font-bold text-ink">{st.valB}</span>
                </div>
                <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full bg-pulse transition-all"
                    style={{ width: `${leftPct}%` }}
                  />
                  <div
                    className="h-full bg-ink/75 transition-all"
                    style={{ width: `${100 - leftPct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </motion.article>
  )
}
