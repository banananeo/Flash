// Mock-first F1 standings — real 2026 championship state after round 14
// (verified 2026-09-13 vs formula1.com). Shown instantly + on API failure.
// Driver rows: { pos, num, name, acro, team, colour, points, wins, gap }
// Team rows: { pos, team, colour, points, wins, gap }

export const MOCK_F1_SEASON = '2026'
export const MOCK_F1_ROUND = '14'

export const MOCK_F1_DRIVERS = [
  { pos: 1, num: '12', name: 'Andrea Kimi Antonelli', acro: 'ANT', team: 'Mercedes', colour: '27F4D2', points: 267, wins: 7, gap: 0 },
  { pos: 2, num: '63', name: 'George Russell', acro: 'RUS', team: 'Mercedes', colour: '27F4D2', points: 201, wins: 2, gap: 66 },
  { pos: 3, num: '44', name: 'Lewis Hamilton', acro: 'HAM', team: 'Ferrari', colour: 'E8002D', points: 191, wins: 1, gap: 76 },
  { pos: 4, num: '1', name: 'Lando Norris', acro: 'NOR', team: 'McLaren', colour: 'FF8000', points: 171, wins: 2, gap: 96 },
  { pos: 5, num: '16', name: 'Charles Leclerc', acro: 'LEC', team: 'Ferrari', colour: 'E8002D', points: 155, wins: 1, gap: 112 },
  { pos: 6, num: '3', name: 'Max Verstappen', acro: 'VER', team: 'Red Bull', colour: '3671C6', points: 127, wins: 0, gap: 140 },
  { pos: 7, num: '81', name: 'Oscar Piastri', acro: 'PIA', team: 'McLaren', colour: 'FF8000', points: 116, wins: 0, gap: 151 },
  { pos: 8, num: '6', name: 'Isack Hadjar', acro: 'HAD', team: 'Red Bull', colour: '3671C6', points: 71, wins: 0, gap: 196 },
  { pos: 9, num: '30', name: 'Liam Lawson', acro: 'LAW', team: 'RB F1 Team', colour: '6692FF', points: 51, wins: 0, gap: 216 },
  { pos: 10, num: '10', name: 'Pierre Gasly', acro: 'GAS', team: 'Alpine F1 Team', colour: 'FF87BC', points: 41, wins: 0, gap: 226 },
]

export const MOCK_F1_TEAMS = [
  { pos: 1, team: 'Mercedes', colour: '27F4D2', points: 468, wins: 9, gap: 0 },
  { pos: 2, team: 'Ferrari', colour: 'E8002D', points: 346, wins: 2, gap: 122 },
  { pos: 3, team: 'McLaren', colour: 'FF8000', points: 287, wins: 2, gap: 181 },
]

// Schedule races: { round, name, circuit, locality, country, dateUTC: Date,
//                   sessions: { fp1..sprintQuali } (Date|null), hasSprint }
const D = (s) => new Date(s)
export const MOCK_F1_SCHEDULE = [
  {
    round: 13, name: 'Italian Grand Prix', circuit: 'Autodromo Nazionale di Monza',
    locality: 'Monza', country: 'Italy', dateUTC: D('2026-09-06T13:00:00Z'),
    sessions: { fp1: D('2026-09-04T10:30:00Z'), fp2: D('2026-09-04T14:00:00Z'), fp3: D('2026-09-05T10:30:00Z'), quali: D('2026-09-05T14:00:00Z'), sprint: null, sprintQuali: null },
    hasSprint: false,
  },
  {
    round: 14, name: 'Spanish Grand Prix', circuit: 'Madring',
    locality: 'Madrid', country: 'Spain', dateUTC: D('2026-09-13T13:00:00Z'),
    sessions: { fp1: D('2026-09-11T11:30:00Z'), fp2: D('2026-09-11T15:00:00Z'), fp3: D('2026-09-12T10:30:00Z'), quali: D('2026-09-12T14:00:00Z'), sprint: null, sprintQuali: null },
    hasSprint: false,
  },
  {
    round: 15, name: 'Azerbaijan Grand Prix', circuit: 'Baku City Circuit',
    locality: 'Baku', country: 'Azerbaijan', dateUTC: D('2026-09-26T11:00:00Z'),
    sessions: { fp1: D('2026-09-24T08:30:00Z'), fp2: D('2026-09-24T12:00:00Z'), fp3: D('2026-09-25T08:30:00Z'), quali: D('2026-09-25T12:00:00Z'), sprint: null, sprintQuali: null },
    hasSprint: false,
  },
]

// Race result rows: { pos|null, posText, num, name, acro, team, colour,
//                     points, grid, laps, status, time, fastest }
export const MOCK_F1_RESULTS = {
  season: '2026',
  round: '13',
  raceName: 'Italian Grand Prix',
  circuit: 'Autodromo Nazionale di Monza',
  rows: [
    { pos: 1, posText: '1', num: '12', name: 'Andrea Kimi Antonelli', acro: 'ANT', team: 'Mercedes', colour: '27F4D2', points: 25, grid: 19, laps: 53, status: 'Finished', time: '1:51:15.281', fastest: '1:23.504', fastestLap: 53 },
    { pos: 2, posText: '2', num: '63', name: 'George Russell', acro: 'RUS', team: 'Mercedes', colour: '27F4D2', points: 18, grid: 2, laps: 53, status: 'Finished', time: '+3.857', fastest: '1:24.390', fastestLap: 51 },
    { pos: 3, posText: '3', num: '3', name: 'Max Verstappen', acro: 'VER', team: 'Red Bull', colour: '3671C6', points: 15, grid: 5, laps: 53, status: 'Finished', time: '+14.718', fastest: '1:24.242', fastestLap: 37 },
    { pos: 7, posText: '7', num: '10', name: 'Pierre Gasly', acro: 'GAS', team: 'Alpine F1 Team', colour: 'FF87BC', points: 6, grid: 1, laps: 53, status: 'Finished', time: '+27.351', fastest: '1:24.927', fastestLap: 53 },
    { pos: null, posText: 'R', num: '16', name: 'Charles Leclerc', acro: 'LEC', team: 'Ferrari', colour: 'E8002D', points: 0, grid: 3, laps: 1, status: 'Retired', time: '', fastest: '', fastestLap: null },
  ],
}

// Qualifying rows: { pos, num, name, acro, team, colour, q1, q2, q3, best }
export const MOCK_F1_QUALI = {
  season: '2026',
  round: '13',
  raceName: 'Italian Grand Prix',
  circuit: 'Autodromo Nazionale di Monza',
  rows: [
    { pos: 1, num: '10', name: 'Pierre Gasly', acro: 'GAS', team: 'Alpine F1 Team', colour: 'FF87BC', q1: '1:22.612', q2: '1:22.077', q3: '1:21.786', best: '1:21.786' },
    { pos: 2, num: '63', name: 'George Russell', acro: 'RUS', team: 'Mercedes', colour: '27F4D2', q1: '1:22.779', q2: '1:22.161', q3: '1:21.846', best: '1:21.846' },
    { pos: 11, num: '5', name: 'Gabriel Bortoleto', acro: 'BOR', team: 'Audi', colour: 'A6A6A6', q1: '1:22.946', q2: '1:22.517', q3: '', best: '1:22.517' },
    { pos: 17, num: '22', name: 'Yuki Tsunoda', acro: 'TSU', team: 'RB F1 Team', colour: '6692FF', q1: '1:23.755', q2: '', q3: '', best: '1:23.755' },
  ],
}
