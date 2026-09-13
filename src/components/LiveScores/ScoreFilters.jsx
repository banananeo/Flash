import { useMemo, useState } from 'react'
import { useScoreStore, normalizeTeam } from '../../store/useScoreStore'

// Favorites (pin-to-top) + League / Country filters.
// Options are dynamic: built from currently loaded matches (live + mock fallback).
export default function ScoreFilters({ sport }) {
  const filters = useScoreStore((s) => s.filters?.[sport] || { league: 'All', country: 'All' })
  const setFilter = useScoreStore((s) => s.setFilter)
  const clearFilters = useScoreStore((s) => s.clearFilters)
  const favTeams = useScoreStore((s) => s.favTeams)
  const toggleFav = useScoreStore((s) => s.toggleFav)
  const clearFavs = useScoreStore((s) => s.clearFavs)
  const football = useScoreStore((s) => s.football)
  const cricket = useScoreStore((s) => s.cricket)
  const [query, setQuery] = useState('')
  const [showFavPicker, setShowFavPicker] = useState(false)

  const matches = sport === 'football' ? football : cricket

  const options = useMemo(() => {
    const leagues = new Set()
    const countries = new Set()
    const teams = new Set()
    for (const m of matches || []) {
      const lg = m.leagueName || String(m.league || '').split('•')[0].trim()
      if (lg) leagues.add(lg)
      if (sport === 'football') {
        if (m.country) countries.add(m.country)
      } else {
        if (m.teamA?.name) countries.add(m.teamA.name)
        if (m.teamB?.name) countries.add(m.teamB.name)
      }
      if (m.teamA?.name) teams.add(m.teamA.name)
      if (m.teamB?.name) teams.add(m.teamB.name)
    }
    const sort = (s) => [...s].sort((a, b) => a.localeCompare(b))
    return { leagues: sort(leagues), countries: sort(countries), teams: sort(teams) }
  }, [matches, sport])

  const teamSuggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    const favSet = new Set((favTeams || []).map(normalizeTeam))
    return options.teams.filter((t) => !favSet.has(normalizeTeam(t)) && (!q || t.toLowerCase().includes(q))).slice(0, 8)
  }, [options.teams, query, favTeams])

  const isFiltered = filters.league !== 'All' || filters.country !== 'All'
  const countryLabel = sport === 'football' ? 'Country' : 'Team / Country'

  return (
    <div className="mt-3 flex flex-col gap-2 border-[3px] border-black bg-brutal-cream p-3 shadow-brutal-xs dark:border-bone dark:bg-raised">
      {/* favorites */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="badge-brutal bg-black text-white dark:border-bone">★ FAVS ({favTeams.length})</span>
        {(favTeams || []).map((t) => (
          <button
            key={t}
            onClick={() => toggleFav(t)}
            title={`Remove ${t}`}
            className="border-2 border-black bg-brutal-yellow px-2 py-0.5 text-xs font-black text-black"
          >
            {t} ✕
          </button>
        ))}
        {!favTeams?.length && (
          <span className="font-mono text-[11px] font-bold uppercase text-black/60 dark:text-bone/60">
            Star teams — they pin to the top
          </span>
        )}
        <button
          onClick={() => setShowFavPicker((v) => !v)}
          className="ml-auto border-2 border-black bg-white px-2 py-0.5 text-xs font-black text-black dark:border-bone dark:bg-surface dark:text-bone"
        >
          {showFavPicker ? 'CLOSE' : '+ ADD'}
        </button>
        {!!favTeams?.length && (
          <button onClick={clearFavs} className="border-2 border-black bg-brutal-red px-2 py-0.5 text-xs font-black text-white">
            CLEAR
          </button>
        )}
      </div>

      {showFavPicker && (
        <div className="flex flex-col gap-1.5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search teams… (e.g. India, Arsenal)"
            className="border-2 border-black bg-white px-2 py-1.5 text-sm font-bold text-black placeholder:text-black/40"
          />
          <div className="flex flex-wrap gap-1.5">
            {teamSuggestions.map((t) => (
              <button
                key={t}
                onClick={() => {
                  toggleFav(t)
                  setQuery('')
                }}
                className="border-2 border-black bg-white px-2 py-0.5 text-xs font-black text-black"
              >
                + {t}
              </button>
            ))}
            {!teamSuggestions.length && (
              <span className="font-mono text-[11px] font-bold uppercase text-black/50">No more teams match</span>
            )}
          </div>
        </div>
      )}

      {/* league / country */}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs font-black uppercase">
          League
          <select
            value={filters.league}
            onChange={(e) => setFilter(sport, 'league', e.target.value)}
            className="border-2 border-black bg-white px-2 py-1.5 text-sm font-bold text-black"
          >
            <option value="All">All Leagues</option>
            {options.leagues.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-black uppercase">
          {countryLabel}
          <select
            value={filters.country}
            onChange={(e) => setFilter(sport, 'country', e.target.value)}
            className="border-2 border-black bg-white px-2 py-1.5 text-sm font-bold text-black"
          >
            <option value="All">{sport === 'football' ? 'All Countries' : 'All Teams'}</option>
            {options.countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      {isFiltered && (
        <button
          onClick={() => clearFilters(sport)}
          className="w-fit border-2 border-black bg-black px-2 py-0.5 text-xs font-black text-white dark:border-bone"
        >
          RESET FILTERS
        </button>
      )}
    </div>
  )
}
