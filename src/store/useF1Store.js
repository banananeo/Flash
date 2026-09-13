import { create } from 'zustand'
import {
  fetchDriverStandings,
  fetchTeamStandings,
  fetchSchedule,
  deriveNextRace,
  fetchRoundResults,
  fetchRoundQualifying,
} from '../lib/f1'
import {
  MOCK_F1_DRIVERS,
  MOCK_F1_TEAMS,
  MOCK_F1_SEASON,
  MOCK_F1_ROUND,
  MOCK_F1_SCHEDULE,
  MOCK_F1_RESULTS,
  MOCK_F1_QUALI,
} from '../data/mockF1'

// F1 section (Jolpica Ergast-compatible API): standings + schedule +
// per-round race/qualifying results.
// status: mock | loading | live | error — failures keep last-good (or mock)
// data visible with an explanatory banner. Memo-cached in lib
// (standings 1h, schedule 24h, results 15min).
export const useF1Store = create((set, get) => ({
  status: 'mock',
  error: null,
  driverStandings: MOCK_F1_DRIVERS,
  teamStandings: MOCK_F1_TEAMS,
  season: MOCK_F1_SEASON,
  round: MOCK_F1_ROUND,
  source: 'mock', // mock | live

  // ---- schedule + next race ----
  schedule: MOCK_F1_SCHEDULE,
  nextRace: null, // derived after first schedule fetch

  // ---- per-round session results ----
  resultsRound: '', // e.g. '13' — '' means not loaded yet
  raceResults: MOCK_F1_RESULTS,
  qualiResults: MOCK_F1_QUALI,
  resultsLoading: false,

  fetchF1: async () => {
    if (get().status === 'loading') return
    set({ status: get().source === 'live' ? 'live' : 'loading', error: null })
    try {
      const [d, t] = await Promise.all([fetchDriverStandings(), fetchTeamStandings()])
      set((st) => ({
        status: 'live',
        error: null,
        source: 'live',
        driverStandings: d.rows.length ? d.rows : st.driverStandings,
        teamStandings: t.rows.length ? t.rows : st.teamStandings,
        season: d.season || t.season || st.season,
        round: d.round || t.round || st.round,
      }))
    } catch (e) {
      set({
        status: get().source === 'live' ? 'live' : 'mock',
        error: e?.message || 'F1 unreachable — showing last data',
      })
    }
  },

  retryNow: () => {
    set({ status: get().source === 'live' ? 'live' : 'mock' })
    get().fetchF1()
  },

  fetchSchedule: async () => {
    try {
      const s = await fetchSchedule()
      if (s.races.length) {
        set((st) => ({
          schedule: s.races,
          nextRace: deriveNextRace(s.races),
          season: s.season || st.season,
          source: 'live',
        }))
      }
    } catch {
      // schedule failures are silent — countdown/calendar fall back to mocks
      // and the standings error banner (if any) already explains state.
      set((st) => ({ nextRace: st.nextRace ?? deriveNextRace(st.schedule) }))
    }
  },

  // Load race + qualifying for one round (default: latest completed round).
  fetchRound: async (round) => {
    const r = String(round || get().resultsRound || 'last')
    if (get().resultsLoading) return
    set({ resultsLoading: true })
    try {
      const [race, quali] = await Promise.all([fetchRoundResults(r), fetchRoundQualifying(r)])
      set((st) => ({
        resultsLoading: false,
        resultsRound: race.round || quali.round || r,
        raceResults: race.rows.length ? race : st.raceResults,
        qualiResults: quali.rows.length ? quali : st.qualiResults,
        source: 'live',
      }))
    } catch {
      set({ resultsLoading: false })
    }
  },
}))
