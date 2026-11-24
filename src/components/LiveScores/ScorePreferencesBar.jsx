import { useMemo, useState } from 'react'
import { Check, Plus, Search, SlidersHorizontal, Star, X } from 'lucide-react'
import {
  useScoreStore,
  normalizeLeague,
  normalizeTeam,
  teamMatchesName,
  todayISO,
  POPULAR_FOOTBALL_LEAGUES,
  POPULAR_FOOTBALL_TEAMS,
  POPULAR_CRICKET_TEAMS,
} from '../../store/useScoreStore'

export default function ScorePreferencesBar({ defaultOpen = false }) {
  const sport = useScoreStore((s) => s.sport)
  const selectedDate = useScoreStore((s) => s.selectedDate)
  const football = useScoreStore((s) => s.football)
  const cricket = useScoreStore((s) => s.cricket)
  const activeLeague = useScoreStore((s) => s.activeLeague)
  const setActiveLeague = useScoreStore((s) => s.setActiveLeague)
  const favTeams = useScoreStore((s) => s.favTeams)
  const favLeagues = useScoreStore((s) => s.favLeagues)
  const toggleFav = useScoreStore((s) => s.toggleFav)
  const toggleFavLeague = useScoreStore((s) => s.toggleFavLeague)
  const clearSelections = useScoreStore((s) => s.clearSelections)

  const [manualOpen, setManualOpen] = useState(null)
  const [prevDefaultOpen, setPrevDefaultOpen] = useState(defaultOpen)
  const [pickerTab, setPickerTab] = useState('teams') // 'teams' | 'leagues'
  const [query, setQuery] = useState('')

  if (defaultOpen !== prevDefaultOpen) {
    setPrevDefaultOpen(defaultOpen)
    if (defaultOpen) setManualOpen(true)
  }
  const open = manualOpen ?? defaultOpen
  const setOpen = (next) => {
    setManualOpen((cur) => {
      const current = cur ?? defaultOpen
      return typeof next === 'function' ? next(current) : next
    })
  }

  const pool = useMemo(() => {
    if (sport === 'football') return football || []
    if (sport === 'cricket') return cricket || []
    return [...(football || []), ...(cricket || [])]
  }, [sport, football, cricket])

  // Matches actually happening on the selected date (or live right now)
  const currentDayMatches = useMemo(() => {
    const isToday = selectedDate === todayISO()
    return pool.filter((m) => {
      if (isToday && m.status === 'live') return true
      return !m.dateISO || m.dateISO === selectedDate
    })
  }, [pool, selectedDate])

  // Leagues that actually have matches on the current view (for clean, zero-dead-end league pills)
  const activeMatchLeagues = useMemo(() => {
    const map = new Map()
    for (const m of currentDayMatches) {
      const name = String(m.leagueName || m.league || '').trim()
      if (!name) continue
      const key = normalizeLeague(name)
      if (!map.has(key)) {
        map.set(key, { name, count: 0 })
      }
      map.get(key).count += 1
    }
    return [...map.values()]
  }, [currentDayMatches])

  // Full directory of leagues & teams for the Follow Picker
  const { allLeagues, allTeams } = useMemo(() => {
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
      allLeagues: [...lgMap.values()],
      allTeams: [...tmMap.values()],
    }
  }, [pool, sport])

  const q = query.trim().toLowerCase()
  const filteredLeagues = useMemo(
    () => (q ? allLeagues.filter((l) => l.toLowerCase().includes(q)) : allLeagues).slice(0, 14),
    [allLeagues, q],
  )
  const filteredTeams = useMemo(
    () => (q ? allTeams.filter((t) => t.toLowerCase().includes(q)) : allTeams).slice(0, 16),
    [allTeams, q],
  )

  const isLeagueFav = (name) =>
    (favLeagues || []).some((l) => normalizeLeague(l) === normalizeLeague(name))
  const isTeamFav = (name) =>
    (favTeams || []).some((t) => teamMatchesName(name, t))

  const totalSelected = (favTeams?.length || 0) + (favLeagues?.length || 0)

  return (
    <div className="mt-4">
      {/* Clean Single-Row Filter Bar */}
      {sport !== 'following' ? (
        <div className="flex items-center justify-between gap-2">
          {/* Active-only League Filter Pills */}
          <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-0.5">
            <button
              type="button"
              onClick={() => setActiveLeague('all')}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] transition-colors ${
                activeLeague === 'all'
                  ? 'bg-ink font-bold text-white'
                  : 'bg-sage font-medium text-muted hover:text-ink'
              }`}
            >
              All ({currentDayMatches.length})
            </button>

            {activeMatchLeagues.map(({ name, count }) => {
              const active = normalizeLeague(activeLeague) === normalizeLeague(name)
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setActiveLeague(active ? 'all' : name)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] transition-colors ${
                    active
                      ? 'bg-ink font-bold text-white'
                      : 'bg-sage font-medium text-muted hover:text-ink'
                  }`}
                >
                  <span>{name}</span>
                  <span className={`text-[10px] ${active ? 'text-white/75' : 'text-muted/80'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Compact Filter / Follow Trigger */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            title="Manage followed leagues & teams"
            className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold transition-colors ${
              open
                ? 'bg-ink text-white'
                : 'bg-white text-ink ring-1 ring-hairline hover:bg-sage'
            }`}
          >
            <SlidersHorizontal size={12} />
            <span className="hidden sm:inline">Follow</span>
            {totalSelected > 0 && (
              <span className="rounded-full bg-pulse px-1.5 text-[10px] font-bold text-ink">
                {totalSelected}
              </span>
            )}
          </button>
        </div>
      ) : (
        /* Following Tab Header Bar: Active Followed Chips + Edit Button */
        <div className="flex items-center justify-between gap-2">
          <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-0.5">
            {totalSelected === 0 ? (
              <span className="text-[12px] font-medium text-muted">
                No teams or leagues followed yet
              </span>
            ) : (
              <>
                {(favTeams || []).map((tm) => (
                  <span
                    key={`fav-tm-${tm}`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-ink ring-1 ring-hairline"
                  >
                    <Star size={11} className="fill-pulse text-pulse" />
                    <span>{tm}</span>
                    <button
                      type="button"
                      onClick={() => toggleFav(tm)}
                      aria-label={`Unfollow ${tm}`}
                      className="text-muted hover:text-ink"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {(favLeagues || []).map((lg) => (
                  <span
                    key={`fav-lg-${lg}`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-ink ring-1 ring-hairline"
                  >
                    <span>{lg}</span>
                    <button
                      type="button"
                      onClick={() => toggleFavLeague(lg)}
                      aria-label={`Unfollow ${lg}`}
                      className="text-muted hover:text-ink"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-bold transition-colors ${
              open
                ? 'bg-ink text-white'
                : 'bg-pulse text-ink'
            }`}
          >
            <SlidersHorizontal size={12} />
            <span>{open ? 'Done' : 'Edit Picks'}</span>
          </button>
        </div>
      )}

      {/* Clean, Tabbed Picker Popover */}
      {open && (
        <div className="mt-3 rounded-[20px] border border-hairline bg-white p-4 shadow-sm">
          {/* Top Bar: Segmented Switcher (Teams | Leagues) + Clear / Close */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-full bg-sage p-1">
              <button
                type="button"
                onClick={() => setPickerTab('teams')}
                className={`rounded-full px-3.5 py-1 text-[12px] transition-colors ${
                  pickerTab === 'teams'
                    ? 'bg-white font-bold text-ink shadow-sm'
                    : 'font-medium text-muted hover:text-ink'
                }`}
              >
                Teams {(favTeams?.length || 0) > 0 ? `(${favTeams.length})` : ''}
              </button>
              <button
                type="button"
                onClick={() => setPickerTab('leagues')}
                className={`rounded-full px-3.5 py-1 text-[12px] transition-colors ${
                  pickerTab === 'leagues'
                    ? 'bg-white font-bold text-ink shadow-sm'
                    : 'font-medium text-muted hover:text-ink'
                }`}
              >
                Leagues {(favLeagues?.length || 0) > 0 ? `(${favLeagues.length})` : ''}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {totalSelected > 0 && (
                <button
                  type="button"
                  onClick={clearSelections}
                  className="text-[11px] font-semibold text-muted hover:text-ink hover:underline"
                >
                  Reset
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

          {/* Compact Search Input */}
          <div className="relative mt-3">
            <Search size={13} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                pickerTab === 'teams'
                  ? 'Filter teams (e.g. Arsenal, Real Madrid, India)…'
                  : 'Filter leagues (e.g. Premier League, Champions League)…'
              }
              className="h-9 w-full rounded-full bg-sage pl-9 pr-8 text-[12px] font-medium text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-pulse"
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

          {/* Single Active List (Teams OR Leagues — never both walls at once) */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {pickerTab === 'teams' ? (
              filteredTeams.length === 0 ? (
                <p className="py-2 text-[12px] text-muted">No matching teams found.</p>
              ) : (
                filteredTeams.map((tm) => {
                  const selected = isTeamFav(tm)
                  return (
                    <button
                      key={tm}
                      type="button"
                      onClick={() => toggleFav(tm)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] transition-colors ${
                        selected
                          ? 'bg-ink font-bold text-white'
                          : 'bg-sage/80 font-medium text-ink hover:bg-hairline'
                      }`}
                    >
                      {selected ? <Check size={12} /> : <Plus size={12} className="text-muted" />}
                      <span>{tm}</span>
                    </button>
                  )
                })
              )
            ) : filteredLeagues.length === 0 ? (
              <p className="py-2 text-[12px] text-muted">No matching leagues found.</p>
            ) : (
              filteredLeagues.map((lg) => {
                const selected = isLeagueFav(lg)
                return (
                  <button
                    key={lg}
                    type="button"
                    onClick={() => toggleFavLeague(lg)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] transition-colors ${
                      selected
                        ? 'bg-pulse font-bold text-ink'
                        : 'bg-sage/80 font-medium text-ink hover:bg-hairline'
                    }`}
                  >
                    {selected ? <Check size={12} /> : <Plus size={12} className="text-muted" />}
                    <span>{lg}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
