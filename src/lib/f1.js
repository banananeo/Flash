// Jolpica F1 (Ergast-compatible) → championship standings.
// Free, no key. Verified live 2026-09-13: season 2026, round 14,
// top-5 ANT 267 / RUS 201 / HAM 191 / NOR 171 / LEC 155.
// Docs: https://github.com/jolpica/jolpica-f1
//
// Same-origin only: api.jolpi.ca sends no CORS headers, so the browser
// calls /api/f1standings?kind= — Vite proxy in dev, api/f1standings.js
// (single file, query-routed) on Vercel. Never call api.jolpi.ca directly.

export class F1RateError extends Error {}
export class F1HttpError extends Error {
  constructor(status, message) {
    super(message || (status ? `F1 error ${status}` : 'F1 request failed'));
    this.status = status;
  }
}

async function fetchSameOrigin(path, { timeoutMs = 15000 } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(path, { signal: ctl.signal });
  } catch (e) {
    if (e?.name === 'AbortError') throw new F1HttpError(0, 'F1 request timed out');
    throw new F1HttpError(0, 'Network blocked — check connection / ad-blocker / VPN');
  } finally {
    clearTimeout(t);
  }
  if (res.status === 429) throw new F1RateError('F1 rate limit hit — backing off');
  if (!res.ok) throw new F1HttpError(res.status);
  try {
    return await res.json();
  } catch {
    throw new F1HttpError(res.status, 'F1 sent a bad response');
  }
}

// Jolpica carries no team colours → static map (2026 grid incl. Audi,
// Cadillac, Racing Bulls). Hexes without '#'.
export const TEAM_COLOURS = {
  mercedes: '27F4D2',
  ferrari: 'E8002D',
  mclaren: 'FF8000',
  red_bull: '3671C6',
  williams: '64C4FF',
  aston_martin: '229971',
  alpine: 'FF87BC',
  haas: 'B6BABD',
  audi: 'A6A6A6',
  rb: '6692FF',
  cadillac: 'D4AF37',
}

const colourFor = (constructorId, fallback = '666666') =>
  TEAM_COLOURS[constructorId] || fallback

function tableOf(json) {
  const lists = json?.MRData?.StandingsTable?.StandingsLists || []
  const first = lists[0] || {}
  return {
    season: String(json?.MRData?.StandingsTable?.season || ''),
    round: String(first.round || json?.MRData?.StandingsTable?.round || ''),
    list: first,
  }
}

// Row: { pos, num, name, acro, team, colour, points, wins, gap }
export function normalizeDriverStandings(json) {
  const { season, round, list } = tableOf(json)
  const rows = (list.DriverStandings || []).map((s) => {
    const d = s?.Driver || {}
    const c = s?.Constructors?.[0] || {}
    const acro = String(d.code || '').toUpperCase()
    return {
      pos: Number(s?.position) || 99,
      num: String(d.permanentNumber || ''),
      name: `${d.givenName || ''} ${d.familyName || ''}`.trim() || 'Unknown',
      acro: acro || '???',
      team: c.name || '',
      colour: colourFor(c.constructorId),
      points: Number(s?.points) || 0,
      wins: Number(s?.wins) || 0,
      gap: 0,
    }
  })
  rows.sort((a, b) => a.pos - b.pos)
  const leader = rows.length ? rows[0].points : 0
  for (const r of rows) r.gap = leader - r.points
  return { season, round, rows }
}

// Row: { pos, team, colour, points, wins, gap }
export function normalizeTeamStandings(json) {
  const { season, round, list } = tableOf(json)
  const rows = (list.ConstructorStandings || []).map((s) => {
    const c = s?.Constructor || {}
    return {
      pos: Number(s?.position) || 99,
      team: c.name || 'Unknown',
      colour: colourFor(c.constructorId),
      points: Number(s?.points) || 0,
      wins: Number(s?.wins) || 0,
      gap: 0,
    }
  })
  rows.sort((a, b) => a.pos - b.pos)
  const leader = rows.length ? rows[0].points : 0
  for (const r of rows) r.gap = leader - r.points
  return { season, round, rows }
}

const mem = { drivers: null, driversTs: 0, teams: null, teamsTs: 0 }
const STANDINGS_TTL = 3600 * 1000 // standings only change after a race

export async function fetchDriverStandings() {
  if (mem.drivers && Date.now() - mem.driversTs < STANDINGS_TTL) return mem.drivers
  const out = normalizeDriverStandings(await fetchSameOrigin('/api/f1standings?kind=drivers'))
  if (out.rows.length) {
    mem.drivers = out
    mem.driversTs = Date.now()
  }
  return out
}

export async function fetchTeamStandings() {
  if (mem.teams && Date.now() - mem.teamsTs < STANDINGS_TTL) return mem.teams
  const out = normalizeTeamStandings(await fetchSameOrigin('/api/f1standings?kind=constructors'))
  if (out.rows.length) {
    mem.teams = out
    mem.teamsTs = Date.now()
  }
  return out
}

// ---------- schedule / next race ----------

function toUTCDate(date, time) {
  if (!date) return null
  try {
    const t = time && /^\d{2}:\d{2}(:\d{2})?/.test(time) ? time : '00:00:00'
    const full = t.length === 5 ? `${t}:00` : t
    const d = new Date(`${date}T${/Z$/.test(full) ? full : `${full}Z`}`)
    return Number.isFinite(d.getTime()) ? d : null
  } catch {
    return null
  }
}

// Race: { round, name, circuit, locality, country, dateUTC: Date|null,
//         sessions: { fp1, fp2, fp3, quali, sprint, sprintQuali } (Date|null),
//         hasSprint }
export function normalizeSchedule(json) {
  const table = json?.MRData?.RaceTable || {}
  const season = String(table.season || '')
  const races = (table.Races || []).map((r) => {
    const sessions = {
      fp1: toUTCDate(r?.FirstPractice?.date, r?.FirstPractice?.time),
      fp2: toUTCDate(r?.SecondPractice?.date, r?.SecondPractice?.time),
      fp3: toUTCDate(r?.ThirdPractice?.date, r?.ThirdPractice?.time),
      quali: toUTCDate(r?.Qualifying?.date, r?.Qualifying?.time),
      sprint: toUTCDate(r?.Sprint?.date, r?.Sprint?.time),
      sprintQuali: toUTCDate(r?.SprintQualifying?.date, r?.SprintQualifying?.time),
    }
    return {
      round: Number(r?.round) || 0,
      name: r?.raceName || 'Unknown GP',
      circuit: r?.Circuit?.circuitName || '',
      locality: r?.Circuit?.Location?.locality || '',
      country: r?.Circuit?.Location?.country || '',
      dateUTC: toUTCDate(r?.date, r?.time),
      sessions,
      hasSprint: !!(r?.Sprint || r?.SprintQualifying),
    }
  }).filter((r) => r.round > 0)
  races.sort((a, b) => a.round - b.round)
  return { season, races }
}

// Next race = first whose start is within/ahead of the race window.
// nowMs injectable for tests.
export function deriveNextRace(races, nowMs = Date.now()) {
  const WINDOW_MS = 3 * 3600 * 1000
  const list = [...(races || [])].sort((a, b) => a.round - b.round)
  for (const r of list) {
    const t = r.dateUTC ? r.dateUTC.getTime() : NaN
    if (Number.isFinite(t) && t + WINDOW_MS > nowMs) return r
  }
  return null
}

export function countdownParts(targetMs, nowMs = Date.now()) {
  const diff = Math.max(0, targetMs - nowMs)
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  const live = diff <= 0
  return { d, h, m, s, live }
}

const smem = { schedule: null, scheduleTs: 0 }
const SCHEDULE_TTL = 24 * 3600 * 1000

export async function fetchSchedule() {
  if (smem.schedule && Date.now() - smem.scheduleTs < SCHEDULE_TTL) return smem.schedule
  const out = normalizeSchedule(await fetchSameOrigin('/api/f1standings?kind=schedule'))
  if (out.races.length) {
    smem.schedule = out
    smem.scheduleTs = Date.now()
  }
  return out
}

// ---------- session results (race + qualifying) ----------

function driverLine(d, c) {
  const acro = String(d?.code || '').toUpperCase() || '???'
  return {
    num: String(d?.permanentNumber || ''),
    name: `${d?.givenName || ''} ${d?.familyName || ''}`.trim() || 'Unknown',
    acro,
    team: c?.name || '',
    colour: colourFor(c?.constructorId),
  }
}

function raceOf(json) {
  const table = json?.MRData?.RaceTable || {}
  const race = (table.Races || [])[0] || {}
  return {
    season: String(table.season || race.season || ''),
    round: String(table.round || race.round || ''),
    raceName: race.raceName || '',
    circuit: race.Circuit?.circuitName || '',
    race,
  }
}

// Row: { pos (number|null — null = unclassified), posText, code…,
//        points, grid, laps, status, time, fastest }
export function normalizeRaceResults(json) {
  const { season, round, raceName, circuit, race } = raceOf(json)
  const rows = (race.Results || []).map((r) => {
    const p = Number(r?.position)
    return {
      ...driverLine(r?.Driver, r?.Constructor),
      pos: Number.isFinite(p) && p > 0 ? p : null,
      posText: String(r?.positionText || r?.position || ''),
      points: Number(r?.points) || 0,
      grid: r?.grid != null && r.grid !== '' ? Number(r.grid) : null,
      laps: Number(r?.laps) || 0,
      status: String(r?.status || ''),
      time: String(r?.Time?.time || ''),
      fastest: String(r?.FastestLap?.Time?.time || ''),
      fastestLap: r?.FastestLap?.lap != null ? Number(r.FastestLap.lap) : null,
    }
  })
  // classified by position, then the rest (R/DNF/DSQ) by laps completed desc
  rows.sort((a, b) => {
    if (a.pos != null && b.pos != null) return a.pos - b.pos
    if (a.pos != null) return -1
    if (b.pos != null) return 1
    return b.laps - a.laps
  })
  return { season, round, raceName, circuit, rows }
}

// Row: { pos, code…, q1, q2, q3, best } — Q3 missing when knocked out
export function normalizeQualifying(json) {
  const { season, round, raceName, circuit, race } = raceOf(json)
  const rows = (race.QualifyingResults || []).map((r) => ({
    ...driverLine(r?.Driver, r?.Constructor),
    pos: Number(r?.position) || 99,
    q1: String(r?.Q1 || ''),
    q2: String(r?.Q2 || ''),
    q3: String(r?.Q3 || ''),
    best: String(r?.Q3 || r?.Q2 || r?.Q1 || ''),
  }))
  rows.sort((a, b) => a.pos - b.pos)
  return { season, round, raceName, circuit, rows }
}

const rmem = { results: new Map(), quali: new Map() }
const RESULTS_TTL = 15 * 60 * 1000 // today's race flips pending→final

async function cachedMap(map, key, fetcher) {
  const hit = map.get(key)
  if (hit && Date.now() - hit.ts < RESULTS_TTL) return hit.val
  const val = await fetcher()
  map.set(key, { ts: Date.now(), val })
  return val
}

export function fetchRoundResults(round) {
  const r = String(round || 'last')
  return cachedMap(rmem.results, r, async () =>
    normalizeRaceResults(await fetchSameOrigin(`/api/f1standings?kind=results&round=${encodeURIComponent(r)}`))
  )
}

export function fetchRoundQualifying(round) {
  const r = String(round || 'last')
  return cachedMap(rmem.quali, r, async () =>
    normalizeQualifying(await fetchSameOrigin(`/api/f1standings?kind=qualifying&round=${encodeURIComponent(r)}`))
  )
}
