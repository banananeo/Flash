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

// Latest-wins token for round fetches + one-deep queue so rapid calendar
// taps are never silently dropped (old code early-returned while loading).
let f1RoundSeq = 0
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
  resultsRound: '', // e.g. '13' — '' means not loaded yet (never 'last')
  raceResults: MOCK_F1_RESULTS,
  qualiResults: MOCK_F1_QUALI,
  resultsLoading: false,
  pendingRound: null, // latest round requested while a fetch is in flight

  fetchF1: async () => {
    if (get().status === 'loading') return
    set({ status: get().source === 'live' ? 'live' : 'loading', error: null })
    try {
      // allSettled: one failing table must not discard the other's success
      const [dRes, tRes] = await Promise.allSettled([fetchDriverStandings(), fetchTeamStandings()])
      const d = dRes.status === 'fulfilled' ? dRes.value : null
      const t = tRes.status === 'fulfilled' ? tRes.value : null
      if (!d && !t) throw new Error('F1 unreachable — showing last data')
      set((st) => ({
        status: 'live',
        error: null,
        source: 'live',
        driverStandings: d?.rows?.length ? d.rows : st.driverStandings,
        teamStandings: t?.rows?.length ? t.rows : st.teamStandings,
        season: d?.season || t?.season || st.season,
        round: d?.round || t?.round || st.round,
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
    // queue the newest request instead of dropping it on the floor
    if (get().resultsLoading) {
      set({ pendingRound: r })
      return
    }
    const mySeq = ++f1RoundSeq
    set({ resultsLoading: true, pendingRound: null })
    try {
      const [race, quali] = await Promise.all([fetchRoundResults(r), fetchRoundQualifying(r)])
      if (mySeq !== f1RoundSeq) return // a newer round won the race
      // always store a resolved numeric round so calendar/select string
      // compares match — never the literal 'last'
      const resolved = race.round || quali.round || (/^\d+$/.test(r) ? r : '')
      set((st) => ({
        resultsLoading: false,
        resultsRound: resolved || st.resultsRound,
        raceResults: race.rows.length ? race : st.raceResults,
        qualiResults: quali.rows.length ? quali : st.qualiResults,
        source: 'live',
      }))
    } catch {
      if (mySeq !== f1RoundSeq) return
      set({ resultsLoading: false })
    }
    const p = get().pendingRound
    if (p) {
      set({ pendingRound: null })
      get().fetchRound(p)
    }
  },
}))
