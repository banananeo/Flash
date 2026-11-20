import { useScoreStore } from '../../store/useScoreStore'

// Clean white rounded editorial match row ("Around the grounds").
export default function MatchCard({ match, isFav = false, onToggleFav }) {
  const openMatch = useScoreStore((s) => s.openMatch)
  if (!match?.teamA || !match?.teamB) return null

  const isLive = match.status === 'live'
  const isFootball = match.sport === 'football'

  return (
    <div
      onClick={() => openMatch(match)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          openMatch(match)
        }
      }}
      className="flex w-full cursor-pointer items-center gap-4 rounded-[16px] bg-white px-5 py-4 text-left transition-colors hover:bg-white/80 active:scale-[0.99]"
    >
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {match.teamA.logo && (
              <img
                src={match.teamA.logo}
                alt=""
                loading="lazy"
                className="h-5 w-5 shrink-0 object-contain"
              />
            )}
            <span className="min-w-0 break-words text-[15px] font-medium leading-tight text-ink">
              {match.teamA.name}
            </span>
          </div>
          <span className="shrink-0 font-display text-[17px] font-bold text-ink">
            {isFootball ? (match.teamA.score ?? '–') : match.teamA.score}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {match.teamB.logo && (
              <img
                src={match.teamB.logo}
                alt=""
                loading="lazy"
                className="h-5 w-5 shrink-0 object-contain"
              />
            )}
            <span className="min-w-0 break-words text-[15px] font-medium leading-tight text-ink">
              {match.teamB.name}
            </span>
          </div>
          <span className="shrink-0 font-display text-[17px] font-bold text-ink">
            {isFootball ? (match.teamB.score ?? '–') : match.teamB.score}
          </span>
        </div>

        {!isFootball && (match.meta?.need || match.leagueName) && (
          <p className="truncate pt-0.5 text-[11px] font-medium text-muted">
            {match.meta?.need || match.leagueName}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2 pl-2">
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-live px-2.5 py-0.5 text-[11px] font-bold text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            {isFootball ? match.minute : 'LIVE'}
          </span>
        ) : (
          <span className="text-[12px] font-semibold text-muted">
            {isFootball ? match.minute : match.status === 'scheduled' ? 'SCHED' : 'FT'}
          </span>
        )}

        {onToggleFav && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleFav()
            }}
            aria-label={isFav ? 'Unfollow team' : 'Follow team'}
            aria-pressed={isFav}
            className={`text-[14px] leading-none transition-colors ${
              isFav ? 'text-ink' : 'text-hairline hover:text-muted'
            }`}
          >
            ★
          </button>
        )}
      </div>
    </div>
  )
}
