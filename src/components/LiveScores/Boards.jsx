import { motion } from 'framer-motion'

export function ScoreHero({ match }) {
  const isLive = match.status === 'live'
  const scoreLine =
    match.sport === 'football'
      ? `${match.teamA.score} — ${match.teamB.score}`
      : `${match.teamA.score} vs ${match.teamB.score}`
  return (
    <div className="border-[3px] border-black bg-black p-4 text-center text-white shadow-brutal-sm dark:border-bone dark:bg-ink">
      <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-brutal-yellow">{match.league}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <div className="flex-1">
          <p className="font-black text-xl leading-tight">{match.teamA.short}</p>
          <p className="font-mono text-[10px] uppercase text-white/60">{match.teamA.name}</p>
        </div>
        <motion.p
          key={scoreLine}
          initial={{ scale: 1.35 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          className="border-[3px] border-brutal-yellow bg-brutal-yellow px-3 py-1 font-black text-2xl text-black"
        >
          {scoreLine}
        </motion.p>
        <div className="flex-1">
          <p className="font-black text-xl leading-tight">{match.teamB.short}</p>
          <p className="font-mono text-[10px] uppercase text-white/60">{match.teamB.name}</p>
        </div>
      </div>
      <p className="mt-2 inline-block border-2 border-white/30 px-2 py-0.5 font-mono text-[11px] font-bold uppercase">
        {match.sport === 'football' ? match.minute : match.meta?.need || match.status.toUpperCase()}
        {isLive ? ' • ● LIVE' : ''}
      </p>
    </div>
  )
}

export function FootballBoard({ match }) {
  return (
    <div className="flex flex-col gap-3">
      <ScoreHero match={match} />
      <div className="border-[3px] border-black bg-white p-3 text-black shadow-brutal-xs dark:border-bone dark:bg-surface dark:text-bone">
        <p className="font-black text-sm uppercase">Timeline</p>
        <div className="mt-2 flex flex-col gap-1.5">
          {(match.events || []).length ? (
            match.events.map((e, i) => (
              <div key={i} className="flex gap-2 border-2 border-black/10 bg-brutal-cream p-2 text-sm font-bold dark:border-bone/20 dark:bg-raised">
                <span className="shrink-0 border-2 border-black bg-black px-1.5 font-mono text-xs text-white dark:border-bone">{e.min}</span>
                <span>{e.text}</span>
              </div>
            ))
          ) : (
            <p className="font-mono text-xs font-bold uppercase text-black/50 dark:text-bone/50">No events yet — kick-off soon.</p>
          )}
        </div>
      </div>
      {(match.stats || []).length > 0 && (
        <div className="border-[3px] border-black bg-brutal-yellow p-3 text-black shadow-brutal-xs dark:border-bone">
          <p className="font-black text-sm uppercase">Stats</p>
          {match.stats.map((s, i) => (
            <div key={i} className="mt-1 flex items-center justify-between border-2 border-black bg-white px-2 py-1 text-sm font-bold dark:bg-surface dark:text-bone">
              <span>{s.label}</span>
              <span className="font-mono">{s.display}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function CricketBoard({ match, detail }) {
  const d = detail || {}
  return (
    <div className="flex flex-col gap-3">
      <ScoreHero match={match} />
      {match.meta?.crr && (
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="border-[3px] border-black bg-brutal-mint p-2 shadow-brutal-xs">
            <p className="font-black text-2xl">{match.meta.crr}</p>
            <p className="font-mono text-[10px] font-bold uppercase">Run rate</p>
          </div>
          <div className="border-[3px] border-black bg-white p-2 text-black shadow-brutal-xs dark:border-bone dark:bg-surface dark:text-bone">
            <p className="font-black text-sm leading-tight">{match.meta.lastWicket || '—'}</p>
            <p className="font-mono text-[10px] font-bold uppercase">Last wicket</p>
          </div>
        </div>
      )}
      {(match.recentBalls || []).length > 0 && (
        <div className="border-[3px] border-black bg-white p-3 text-black shadow-brutal-xs dark:border-bone dark:bg-surface dark:text-bone">
          <p className="font-black text-sm uppercase">Recent balls</p>
          <div className="mt-2 flex gap-1.5">
            {match.recentBalls.map((b, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 400, damping: 15 }}
                className={`grid h-9 w-9 place-items-center border-[3px] border-black font-black dark:border-bone ${b === 'W' ? 'bg-brutal-red text-white' : b === '6' || b === '4' ? 'bg-brutal-mint text-black' : 'bg-white text-black dark:bg-raised dark:text-bone'}`}
              >
                {b}
              </motion.span>
            ))}
          </div>
        </div>
      )}
      {(match.batters || []).length > 0 && (
        <div className="border-[3px] border-black bg-white p-3 text-black shadow-brutal-xs dark:border-bone dark:bg-surface dark:text-bone">
          <p className="font-black text-sm uppercase">Batting</p>
          {match.batters.map((b, i) => (
            <div key={i} className="mt-1 flex justify-between border-b-2 border-dashed border-black/20 py-1 text-sm font-bold dark:border-bone/25">
              <span>{b.name}</span>
              <span className="font-mono">{b.runs} ({b.balls})</span>
            </div>
          ))}
        </div>
      )}
      {d.score && (
        <div className="border-[3px] border-dashed border-black bg-brutal-cream p-3 font-mono text-xs font-bold text-black dark:border-bone dark:bg-raised dark:text-bone">
          {(d.score || []).map((s, i) => (
            <p key={i}>{s.inning}: {s.r}/{s.w} ({s.o} ov)</p>
          ))}
        </div>
      )}
    </div>
  )
}
