import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useScoreStore, todayISO } from '../../store/useScoreStore'
import { safeImageUrl } from '../../lib/safeUrl'

function TeamLogo({ src }) {
  const [failed, setFailed] = useState(false)
  const safeSrc = safeImageUrl(src)
  if (!safeSrc || failed) return null
  return (
    <img
      src={safeSrc}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-5 w-5 shrink-0 object-contain"
    />
  )
}

// Clean white rounded editorial match row ("Around the grounds" & "Your Leagues & Teams").
export default function MatchCard({ match, isFav = false, onToggleFav, showLeagueBadge = false }) {
  const openMatch = useScoreStore((s) => s.openMatch)
  const refreshMatch = useScoreStore((s) => s.refreshMatch)
  const isRefreshing = useScoreStore((s) => Boolean(s.refreshingMatches?.[match?.id]))
  if (!match?.teamA || !match?.teamB) return null

  const isLive = match.status === 'live'
  const isScheduled = match.status === 'scheduled'
  const isFootball = match.sport === 'football'
  const isFutureDay = Boolean(match.dateISO && match.dateISO > todayISO())

  const timeBadge = isLive
    ? isFootball
      ? match.minute
      : 'LIVE'
    : isScheduled
      ? match.kickoffLabel || (isFootball ? match.minute : 'NEXT')
      : 'FT'

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
        {(showLeagueBadge || isFutureDay) && (
          <div className="flex items-center gap-2">
            <span className="truncate text-[10px] font-bold uppercase tracking-[0.07em] text-muted">
              {match.leagueName || match.league}
            </span>
            {isScheduled && (
              <span className="shrink-0 rounded-full bg-sage-leader px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-brand-strong">
                NEXT MATCH
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <TeamLogo src={match.teamA.logo} />
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
            <TeamLogo src={match.teamB.logo} />
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
            {timeBadge}
          </span>
        ) : (
          <span className="text-right text-[11px] font-semibold text-muted">
            {timeBadge}
          </span>
        )}

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              refreshMatch(match)
            }}
            disabled={isRefreshing}
            title="Refresh match score"
            aria-label="Refresh match score"
            className="grid h-6 w-6 place-items-center rounded-full bg-sage text-muted transition-colors hover:bg-hairline hover:text-ink disabled:opacity-60"
          >
            <RefreshCw size={11} className={isRefreshing ? 'animate-spin text-brand-strong' : ''} />
          </button>

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
    </div>
  )
}
