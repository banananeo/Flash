import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { fetchFootballStandings } from '../../lib/football'
import { safeColor, safeImageUrl } from '../../lib/safeUrl'
import { useScoreStore, teamMatchesName } from '../../store/useScoreStore'

const STANDINGS_TABS = [
  { id: 'eng.1', label: 'Premier League' },
  { id: 'uefa.champions', label: 'Champions League' },
]

function zoneAccentColor(note) {
  if (!note?.label) return ''
  const lower = note.label.toLowerCase()
  if (/relegat|eliminat/.test(lower)) return '#E11D48'
  if (/champions league|round of 16/.test(lower)) return '#0D9488'
  if (/europa|seeded/.test(lower) && !/unseeded/.test(lower)) return '#0EA5E9'
  if (/unseeded|conference/.test(lower)) return '#94A3B8'
  return safeColor(note.color, '#94A3B8')
}

function TeamCrest({ src }) {
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
      className="h-4 w-4 shrink-0 object-contain sm:h-5 sm:w-5"
    />
  )
}

export default function FootballStandings() {
  const favTeams = useScoreStore((s) => s.favTeams)
  const toggleFav = useScoreStore((s) => s.toggleFav)
  const league = useScoreStore((s) => s.standingsLeague) || 'eng.1'
  const setLeague = useScoreStore((s) => s.setStandingsLeague)

  const [tables, setTables] = useState({})
  const [reqMeta, setReqMeta] = useState({ league: null, loading: false, error: '' })
  const [refreshNonce, setRefreshNonce] = useState(0)
  const lastRefreshRef = useRef(0)

  useEffect(() => {
    let alive = true
    const force = refreshNonce !== lastRefreshRef.current
    lastRefreshRef.current = refreshNonce
    const req = fetchFootballStandings(league, { force })

    req
      .then((data) => {
        if (!alive) return
        setTables((prev) => ({ ...prev, [league]: data }))
        setReqMeta({ league, loading: false, error: '' })
      })
      .catch((e) => {
        if (!alive) return
        setReqMeta({
          league,
          loading: false,
          error: e?.message || 'Unable to load standings right now.',
        })
      })

    return () => {
      alive = false
    }
  }, [league, refreshNonce])

  const current = tables[league] || null
  const isInitialLoading = !current && (reqMeta.league !== league || reqMeta.loading)
  const isRefreshing = Boolean(current) && reqMeta.loading && reqMeta.league === league
  const error = reqMeta.league === league ? reqMeta.error : ''

  const handleRefresh = () => {
    setReqMeta({ league, loading: true, error: '' })
    setRefreshNonce((n) => n + 1)
  }

  const rows = current?.rows || []
  const zones = current?.zones || []
  const seasonTag = current?.stage || current?.season || ''

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[20px] font-semibold text-ink">Standings</h2>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isInitialLoading || isRefreshing}
          title="Refresh standings"
          aria-label="Refresh standings"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sage text-muted transition-colors hover:bg-hairline hover:text-ink disabled:opacity-60"
        >
          <RefreshCw
            size={13}
            className={isInitialLoading || isRefreshing ? 'animate-spin text-brand-strong' : ''}
          />
        </button>
      </div>

      {/* Competition Tabs: Premier League | Champions League */}
      <div className="mt-3 flex items-center justify-between gap-3 border-b border-hairline">
        <div className="flex items-center gap-6">
          {STANDINGS_TABS.map((t) => {
            const active = league === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setLeague(t.id)}
                className={`relative pb-2.5 text-[14px] transition-colors ${
                  active ? 'font-bold text-ink' : 'font-medium text-muted hover:text-ink'
                }`}
              >
                {t.label}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-pulse" />
                )}
              </button>
            )
          })}
        </div>

        {seasonTag && (
          <span className="hidden truncate pb-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted sm:inline">
            {seasonTag}
          </span>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-[14px] bg-sage px-4 py-2.5 text-[12px] font-medium text-ink">
          <span className="truncate">{error}</span>
          <button
            type="button"
            onClick={handleRefresh}
            className="shrink-0 font-bold underline"
          >
            Retry
          </button>
        </div>
      )}

      {isInitialLoading ? (
        <div className="mt-4 space-y-2.5 rounded-[20px] border border-hairline bg-white p-4 shadow-sm sm:p-5">
          <div className="h-5 w-44 animate-pulse rounded bg-sage" />
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="h-10 animate-pulse rounded-[10px] bg-sage/80" />
          ))}
        </div>
      ) : rows.length > 0 ? (
        <div className="mt-4 rounded-[20px] border border-hairline bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-[16px] font-semibold text-ink">
                {current?.name}
                {current?.stage ? ` · ${current.stage}` : ''}
              </h3>
              {current?.season && (
                <p className="text-[11px] font-medium text-muted">{current.season}</p>
              )}
            </div>
            <span className="shrink-0 rounded-full bg-sage px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-muted">
              {rows.length} teams
            </span>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[26px_minmax(0,1fr)_22px_22px_22px_22px_30px_32px] items-center gap-1 border-b border-hairline pb-2 text-[10px] font-bold uppercase tracking-[0.06em] text-muted sm:grid-cols-[30px_minmax(0,1fr)_32px_32px_32px_32px_40px_40px] sm:gap-1.5">
            <span className="pl-2">#</span>
            <span>Team</span>
            <span className="text-right">P</span>
            <span className="text-right">W</span>
            <span className="text-right">D</span>
            <span className="text-right">L</span>
            <span className="text-right">GD</span>
            <span className="text-right">PTS</span>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-hairline/70">
            {rows.map((row) => {
              const accent = zoneAccentColor(row.note)
              const isLeader = row.rank === 1
              const isFav = (favTeams || []).some((t) => teamMatchesName(row.name, t))
              const gdTone =
                row.gdNum > 0
                  ? 'text-brand-strong'
                  : row.gdNum < 0
                    ? 'text-live'
                    : 'text-muted'

              return (
                <div
                  key={row.teamId || `${row.rank}-${row.short}`}
                  className={`grid grid-cols-[26px_minmax(0,1fr)_22px_22px_22px_22px_30px_32px] items-center gap-1 py-2.5 text-[12px] sm:grid-cols-[30px_minmax(0,1fr)_32px_32px_32px_32px_40px_40px] sm:gap-1.5 sm:py-3 sm:text-[13px] ${
                    isLeader ? 'rounded-[12px] bg-sage-tint/80' : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-4 w-[3px] shrink-0 rounded-full"
                      style={{ backgroundColor: accent || 'transparent' }}
                    />
                    <span className="font-display text-[11px] font-bold text-muted sm:text-[12px]">
                      {row.rank}
                    </span>
                  </div>

                  <div className="flex min-w-0 items-center gap-1.5 pr-1 sm:gap-2">
                    <TeamCrest src={row.logo} />
                    <span className="min-w-0 flex-1 truncate font-semibold text-ink" title={row.name}>
                      {row.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleFav(row.name)}
                      aria-label={isFav ? `Unfollow ${row.name}` : `Follow ${row.name}`}
                      aria-pressed={isFav}
                      className={`shrink-0 text-[12px] leading-none transition-colors ${
                        isFav ? 'text-ink' : 'text-hairline hover:text-muted'
                      }`}
                    >
                      ★
                    </button>
                  </div>

                  <span className="text-right font-medium text-muted">{row.played}</span>
                  <span className="text-right font-semibold text-ink">{row.won}</span>
                  <span className="text-right text-muted">{row.drawn}</span>
                  <span className="text-right text-muted">{row.lost}</span>
                  <span className={`text-right font-display text-[11px] font-semibold sm:text-[12px] ${gdTone}`}>
                    {row.gd}
                  </span>
                  <span className="text-right font-display text-[13px] font-bold text-ink sm:text-[14px]">
                    {row.points}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Qualification / Relegation Zone Legend */}
          {zones.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-hairline pt-3">
              {zones.map((z) => (
                <div key={z.label} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: zoneAccentColor(z) }}
                  />
                  <span>{z.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-[20px] bg-white p-8 text-center">
          <p className="text-[16px] font-semibold text-ink">
            Standings are not available right now.
          </p>
          <p className="mt-1 text-[13px] text-muted">
            Tap refresh above to try again.
          </p>
        </div>
      )}
    </div>
  )
}
