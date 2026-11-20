import { useMemo, useState } from 'react'
import { Check, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import {
  useScoreStore,
  normalizeLeague,
  normalizeTeam,
  teamMatchesName,
  POPULAR_FOOTBALL_LEAGUES,
  POPULAR_FOOTBALL_TEAMS,
  POPULAR_CRICKET_TEAMS,
} from '../../store/useScoreStore'

export default function ScorePreferencesBar({ defaultOpen = false }) {
  const sport = useScoreStore((s) => s.sport)
  const football = useScoreStore((s) => s.football)
  const cricket = useScoreStore((s) => s.cricket)
  const activeLeague = useScoreStore((s) => s.activeLeague)
  const setActiveLeague = useScoreStore((s) => s.setActiveLeague)
  const favTeams = useScoreStore((s) => s.favTeams)
  const favLeagues = useScoreStore((s) => s.favLeagues)
  const toggleFav = useScoreStore((s) => s.toggleFav)
  const toggleFavLeague = useScoreStore((s) => s.toggleFavLeague)
  const clearSelections = useScoreStore((s) => s.clearSelections)

  const [open, setOpen] = useState(defaultOpen)
  const [query, setQuery] = useState('')

  const pool = useMemo(() => {
    if (sport === 'football') return football || []
    if (sport === 'cricket') return cricket || []
    return [...(football || []), ...(cricket || [])]
  }, [sport, football, cricket])

  // Discover available leagues and teams from live + upcoming multi-day schedule, merged with curated popular ones
  const { leagues, teams } = useMemo(() => {
    const lgMap = new Map()
    const tmMap = new Map()

    const addLg = (name) => {
      const n = String(name || '').trim()
      if (!n) return
      const k = normalizeLeague(n)
      if (!lgMap.has(k)) lgMap.set(k, n)
    }
    const addTm = (name) => {
      const n = String(name || '').trim()
      if (!n || /^tbd$/i.test(n)) return
      const k = normalizeTeam(n)
      if (!tmMap.has(k)) tmMap.set(k, n)
    }

    if (sport === 'football' || sport === 'following') {
      POPULAR_FOOTBALL_LEAGUES.forEach(addLg)
      POPULAR_FOOTBALL_TEAMS.forEach(addTm)
    }
    if (sport === 'cricket' || sport === 'following') {
      POPULAR_CRICKET_TEAMS.forEach(addTm)
    }

    for (const m of pool) {
      addLg(m.leagueName || m.league)
      addTm(m.teamA?.name)
      addTm(m.teamB?.name)
    }

    return {
      leagues: [...lgMap.values()],
      teams: [...tmMap.values()],
    }
  }, [pool, sport])

  const q = query.trim().toLowerCase()
  const filteredLeagues = useMemo(
    () => (q ? leagues.filter((l) => l.toLowerCase().includes(q)) : leagues).slice(0, 18),
    [leagues, q],
  )
  const filteredTeams = useMemo(
    () => (q ? teams.filter((t) => t.toLowerCase().includes(q)) : teams).slice(0, 24),
    [teams, q],
  )

  const isLeagueFav = (name) =>
    (favLeagues || []).some((l) => normalizeLeague(l) === normalizeLeague(name))
  const isTeamFav = (name) =>
    (favTeams || []).some((t) => teamMatchesName(name, t))

  const totalSelected = (favTeams?.length || 0) + (favLeagues?.length || 0)

  // Quick league pills row: "All Leagues", followed leagues first, then top available leagues
  const pillLeagues = useMemo(() => {
    const out = []
    const seen = new Set()
    for (const l of favLeagues || []) {
      const k = normalizeLeague(l)
      if (leagues.some((x) => normalizeLeague(x) === k) && !seen.has(k)) {
        seen.add(k)
        out.push(l)
      }
    }
    for (const l of leagues) {
      const k = normalizeLeague(l)
      if (!seen.has(k)) {
        seen.add(k)
        out.push(l)
      }
      if (out.length >= 12) break
    }
    return out
  }, [leagues, favLeagues])

  return (
    <div className="mt-4">
      {/* Horizontal League Filter Strip + "Choose Leagues & Teams" trigger */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors ${
            open || totalSelected > 0
              ? 'bg-ink text-white'
              : 'bg-white text-ink ring-1 ring-hairline hover:bg-sage'
          }`}
        >
          <SlidersHorizontal size={13} />
          <span>Leagues & Teams</span>
          {totalSelected > 0 && (
            <span className="rounded-full bg-pulse px-1.5 py-0.2 text-[10px] font-bold text-ink">
              {totalSelected}
            </span>
          )}
        </button>

        {sport !== 'following' && (
          <div className="no-scrollbar flex flex-1 items-center gap-1.5 overflow-x-auto py-0.5">
            <button
              type="button"
              onClick={() => setActiveLeague('all')}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] transition-colors ${
                activeLeague === 'all'
                  ? 'bg-pulse font-bold text-ink'
                  : 'bg-sage font-medium text-muted hover:text-ink'
              }`}
            >
              All Leagues
            </button>

            {pillLeagues.map((lg) => {
              const active = normalizeLeague(activeLeague) === normalizeLeague(lg)
              const fav = isLeagueFav(lg)
              return (
                <button
                  key={lg}
                  type="button"
                  onClick={() => setActiveLeague(active ? 'all' : lg)}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3.5 py-1.5 text-[12px] transition-colors ${
                    active
                      ? 'bg-pulse font-bold text-ink'
                      : fav
                        ? 'bg-white font-semibold text-ink ring-1 ring-pulse/60'
                        : 'bg-sage font-medium text-muted hover:text-ink'
                  }`}
                >
                  {fav && <span className="text-[11px] text-brand-strong">★</span>}
                  <span>{lg}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Expandable Picker Drawer: Choose Leagues & Teams */}
      {open && (
        <div className="mt-3 rounded-[20px] border border-hairline bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-strong">
                PERSONALISE LIVE SCORES
              </p>
              <h3 className="text-[16px] font-semibold text-ink">
                Choose leagues & teams for live scores or next match
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {totalSelected > 0 && (
                <button
                  type="button"
                  onClick={clearSelections}
                  className="text-[11px] font-semibold text-muted underline hover:text-ink"
                >
                  Clear all
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close picker"
                className="grid h-7 w-7 place-items-center rounded-full bg-sage text-ink hover:bg-hairline"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Search box */}
          <div className="relative mt-3">
            <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search leagues or teams (e.g. Premier League, Arsenal, India)…"
              className="h-9 w-full rounded-full bg-sage pl-9 pr-8 text-[13px] text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-pulse"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Leagues section */}
          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
              Leagues & Competitions ({(favLeagues || []).length} selected)
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {filteredLeagues.map((lg) => {
                const selected = isLeagueFav(lg)
                return (
                  <button
                    key={lg}
                    type="button"
                    onClick={() => toggleFavLeague(lg)}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] transition-colors ${
                      selected
                        ? 'bg-pulse font-bold text-ink'
                        : 'bg-sage font-medium text-ink hover:bg-hairline'
                    }`}
                  >
                    {selected ? <Check size={12} /> : <Plus size={12} className="text-muted" />}
                    <span>{lg}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Teams section */}
          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
              Teams & Clubs ({(favTeams || []).length} selected)
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {filteredTeams.map((tm) => {
                const selected = isTeamFav(tm)
                return (
                  <button
                    key={tm}
                    type="button"
                    onClick={() => toggleFav(tm)}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] transition-colors ${
                      selected
                        ? 'bg-ink font-bold text-white'
                        : 'bg-sage font-medium text-ink hover:bg-hairline'
                    }`}
                  >
                    {selected ? <Check size={12} /> : <Plus size={12} className="text-muted" />}
                    <span>{tm}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
