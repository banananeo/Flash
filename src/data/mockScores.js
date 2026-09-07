// Mock-first fixtures — same shape as normalized live data.
// Shown instantly + on quota errors. Real APIs map into this shape.

export const MOCK_FOOTBALL = [
  {
    id: 'fb1',
    sport: 'football',
    league: 'Premier League • Matchday 24',
    status: 'live',
    minute: "67'",
    teamA: { name: 'Arsenal', short: 'ARS', score: 2 },
    teamB: { name: 'Chelsea', short: 'CHE', score: 1 },
    events: [
      { min: "23'", text: '⚽ Saka (ARS) — curler from the edge' },
      { min: "41'", text: '🟨 Caicedo (CHE) — tactical foul' },
      { min: "55'", text: '⚽ Palmer (CHE) — penalty' },
      { min: "63'", text: '⚽ Ødegaard (ARS) — tap-in' },
    ],
    stats: [
      { label: 'Possession', a: 54, b: 46, display: '54% — 46%' },
      { label: 'Shots', a: 12, b: 8, display: '12 — 8' },
      { label: 'Corners', a: 6, b: 3, display: '6 — 3' },
    ],
  },
  {
    id: 'fb2',
    sport: 'football',
    league: 'La Liga • Matchday 22',
    status: 'live',
    minute: "34'",
    teamA: { name: 'Real Madrid', short: 'RMA', score: 1 },
    teamB: { name: 'Girona', short: 'GIR', score: 0 },
    events: [{ min: "19'", text: '⚽ Bellingham (RMA) — header' }],
    stats: [
      { label: 'Possession', a: 61, b: 39, display: '61% — 39%' },
      { label: 'Shots', a: 7, b: 2, display: '7 — 2' },
    ],
  },
  {
    id: 'fb3',
    sport: 'football',
    league: 'Serie A • FT',
    status: 'ft',
    minute: 'FT',
    teamA: { name: 'Inter', short: 'INT', score: 3 },
    teamB: { name: 'Napoli', short: 'NAP', score: 0 },
    events: [
      { min: "12'", text: '⚽ Lautaro (INT)' },
      { min: "48'", text: '⚽ Thuram (INT)' },
      { min: "77'", text: '⚽ Barella (INT)' },
    ],
    stats: [{ label: 'Possession', a: 48, b: 52, display: '48% — 52%' }],
  },
]

export const MOCK_CRICKET = [
  {
    id: 'cr1',
    sport: 'cricket',
    league: 'T20 • IND vs AUS',
    status: 'live',
    teamA: { name: 'India', short: 'IND', score: '187/4', overs: '18.2' },
    teamB: { name: 'Australia', short: 'AUS', score: 'Yet to bat', overs: '' },
    meta: { crr: '10.2', need: 'AUS needs briefing', lastWicket: 'Kohli 68 (41) c Head b Zampa' },
    recentBalls: ['4', '6', '1', 'W', '2', '4'],
    batters: [
      { name: 'Suryakumar', runs: 42, balls: 22 },
      { name: 'Hardik', runs: 18, balls: 9 },
    ],
    bowlers: [{ name: 'Zampa', overs: '3.2', runs: 34, wickets: 2 }],
  },
  {
    id: 'cr2',
    sport: 'cricket',
    league: 'ODI • ENG vs NZ',
    status: 'live',
    teamA: { name: 'England', short: 'ENG', score: '246/8', overs: '50' },
    teamB: { name: 'New Zealand', short: 'NZ', score: '112/2', overs: '24.3' },
    meta: { crr: '4.6', need: 'NZ need 135 off 153', lastWicket: 'Conway 54 (71) b Rashid' },
    recentBalls: ['1', '1', '4', '0', '2', '1'],
    batters: [
      { name: 'Williamson', runs: 38, balls: 52 },
      { name: 'Mitchell', runs: 12, balls: 18 },
    ],
    bowlers: [{ name: 'Rashid', overs: '5.3', runs: 22, wickets: 1 }],
  },
  {
    id: 'cr3',
    sport: 'cricket',
    league: 'Test • Day 3',
    status: 'ft',
    teamA: { name: 'India', short: 'IND', score: '402 & 178/4', overs: '' },
    teamB: { name: 'England', short: 'ENG', score: '319 & 260', overs: '' },
    meta: { crr: '', need: 'IND won by 6 wickets', lastWicket: '' },
    recentBalls: [],
    batters: [],
    bowlers: [],
  },
]
