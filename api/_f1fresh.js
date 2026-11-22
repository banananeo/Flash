// Low-latency F1 race results & championship standings aggregator (free, keyless).
// Combines real-time post-session standings/classifications with the FIA/Jolpica archive
// so updated points and race/qualifying results appear immediately after a session finishes.
//
// Leading `_` = helper module, not counted as a separate Vercel serverless function.

const ARCHIVE_BASE = 'https://api.jolpi.ca/ergast/f1/current';
const LIVE_STANDINGS_URL =
  'https://site.web.api.espn.com/apis/v2/sports/racing/f1/standings';
const LIVE_HEADER_URL =
  'https://site.web.api.espn.com/apis/v2/scoreboard/header?sport=racing&league=f1';

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0',
  Accept: 'application/json',
};

// Team colours (hex without '#') matching src/lib/f1.js
const TEAM_COLOURS = {
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
  racing_bulls: '6692FF',
  cadillac: 'D4AF37',
};

function colourForTeam(constructorId = '', teamName = '', fallbackHex = '') {
  const id = String(constructorId || '').toLowerCase();
  if (TEAM_COLOURS[id]) return TEAM_COLOURS[id];
  const n = String(teamName || '').toLowerCase();
  if (n.includes('mercedes')) return TEAM_COLOURS.mercedes;
  if (n.includes('ferrari')) return TEAM_COLOURS.ferrari;
  if (n.includes('mclaren')) return TEAM_COLOURS.mclaren;
  if (n.includes('racing bulls') || n === 'rb' || n.includes('rb f1') || n.includes('visa cash')) {
    return TEAM_COLOURS.rb;
  }
  if (n.includes('red bull')) return TEAM_COLOURS.red_bull;
  if (n.includes('williams')) return TEAM_COLOURS.williams;
  if (n.includes('aston')) return TEAM_COLOURS.aston_martin;
  if (n.includes('alpine')) return TEAM_COLOURS.alpine;
  if (n.includes('haas')) return TEAM_COLOURS.haas;
  if (n.includes('audi') || n.includes('sauber') || n.includes('kick')) return TEAM_COLOURS.audi;
  if (n.includes('cadillac') || n.includes('andretti')) return TEAM_COLOURS.cadillac;
  const clean = String(fallbackHex || '').replace(/^#/, '').toUpperCase();
  if (/^[0-9A-F]{6}$/.test(clean) && clean !== 'FFFFFF') return clean;
  return '666666';
}

function normKey(str = '') {
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function lastNameKey(name = '') {
  const parts = normKey(name).split(' ').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}

function canonicalTeamKey(name = '') {
  const n = normKey(name);
  if (n.includes('mercedes')) return 'mercedes';
  if (n.includes('ferrari')) return 'ferrari';
  if (n.includes('mclaren')) return 'mclaren';
  if (n.includes('racing bulls') || n === 'rb' || n.includes('rb f1')) return 'rb';
  if (n.includes('red bull')) return 'red_bull';
  if (n.includes('williams')) return 'williams';
  if (n.includes('aston')) return 'aston_martin';
  if (n.includes('alpine')) return 'alpine';
  if (n.includes('haas')) return 'haas';
  if (n.includes('audi') || n.includes('sauber')) return 'audi';
  if (n.includes('cadillac')) return 'cadillac';
  return n;
}

async function fetchJsonSafe(url, timeoutMs = 7000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: FETCH_HEADERS });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const cache = {
  schedule: { ts: 0, data: null },
  liveStandings: { ts: 0, data: null },
  liveHeader: { ts: 0, data: null },
};

// In-flight promise coalescing: parallel requests (drivers + constructors + results + qualifying)
// share a single upstream fetch instead of firing duplicate network calls.
const inflight = new Map();

function coalesce(key, fn) {
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = Promise.resolve()
    .then(fn)
    .finally(() => {
      if (inflight.get(key) === p) inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
}

async function getLiveStandings(force = false) {
  if (!force && cache.liveStandings.data && Date.now() - cache.liveStandings.ts < 45 * 1000) {
    return cache.liveStandings.data;
  }
  return coalesce(force ? 'standings-force' : 'standings', async () => {
    const json = await fetchJsonSafe(LIVE_STANDINGS_URL, 7000);
    if (json?.children?.length) {
      cache.liveStandings = { ts: Date.now(), data: json };
    }
    return json || cache.liveStandings.data;
  });
}

async function getLiveHeader(force = false) {
  if (!force && cache.liveHeader.data && Date.now() - cache.liveHeader.ts < 30 * 1000) {
    return cache.liveHeader.data;
  }
  return coalesce(force ? 'header-force' : 'header', async () => {
    const json = await fetchJsonSafe(LIVE_HEADER_URL, 7000);
    if (json?.sports?.length) {
      cache.liveHeader = { ts: Date.now(), data: json };
    }
    return json || cache.liveHeader.data;
  });
}

export async function fetchFreshSchedule({ force = false } = {}) {
  if (!force && cache.schedule.data && Date.now() - cache.schedule.ts < 6 * 3600 * 1000) {
    return cache.schedule.data;
  }
  return coalesce(force ? 'schedule-force' : 'schedule', async () => {
    const json = await fetchJsonSafe(`${ARCHIVE_BASE}/`, 7500);
    if (json?.MRData?.RaceTable?.Races?.length) {
      cache.schedule = { ts: Date.now(), data: json };
    }
    return json || cache.schedule.data;
  });
}

function getScheduleRaces(scheduleJson) {
  return scheduleJson?.MRData?.RaceTable?.Races || [];
}

function matchScheduleRound(scheduleRaces, liveEvent) {
  if (!Array.isArray(scheduleRaces) || !scheduleRaces.length || !liveEvent) return null;
  const evMs = liveEvent.date ? Date.parse(liveEvent.date) : NaN;
  const evName = normKey(liveEvent.name || '');

  if (Number.isFinite(evMs)) {
    let best = null;
    let bestDiff = Infinity;
    for (const r of scheduleRaces) {
      const rMs = Date.parse(`${r.date}T${r.time || '12:00:00Z'}`);
      if (!Number.isFinite(rMs)) continue;
      const diff = Math.abs(rMs - evMs);
      if (diff < 3.5 * 86400 * 1000 && diff < bestDiff) {
        bestDiff = diff;
        best = r;
      }
    }
    if (best) return best;
  }

  if (evName) {
    for (const r of scheduleRaces) {
      const rn = normKey(r.raceName || '').replace(/\bgrand prix\b/g, '').trim();
      const loc = normKey(r.Circuit?.Location?.locality || '');
      if ((rn && evName.includes(rn)) || (loc && loc.length > 3 && evName.includes(loc))) {
        return r;
      }
    }
  }
  return null;
}

function parseLiveHeaderSummary(headerJson) {
  const events = headerJson?.sports?.[0]?.leagues?.[0]?.events || [];
  const driverMetaByName = new Map();
  const driverMetaByLast = new Map();
  let raceEvent = null;
  let qualEvent = null;

  for (const ev of events) {
    const abbr = String(ev?.competitionType?.abbreviation || '').toUpperCase();
    const text = String(ev?.competitionType?.text || '').toLowerCase();
    if (abbr === 'RACE' || text === 'race') raceEvent = ev;
    else if (abbr === 'QUAL' || (text.includes('qual') && !text.includes('sprint'))) qualEvent = ev;

    for (const c of ev?.competitors || []) {
      const full = normKey(c.displayName || c.name || '');
      const last = lastNameKey(c.lastName || c.displayName || '');
      const meta = {
        num: String(c?.vehicle?.number || ''),
        team: c?.vehicle?.manufacturer || '',
        teamColor: String(c?.vehicle?.teamColor || '').replace(/^#/, ''),
      };
      if (full && (!driverMetaByName.has(full) || meta.team)) {
        driverMetaByName.set(full, meta);
      }
      if (last && (!driverMetaByLast.has(last) || meta.team)) {
        driverMetaByLast.set(last, meta);
      }
    }
  }

  let raceWinnerName = '';
  let raceWinnerTeam = '';
  if (raceEvent && String(raceEvent.status || '').toLowerCase() === 'post') {
    const winner = (raceEvent.competitors || []).find(
      (c) => Number(c.place) === 1 || Number(c.order) === 1 || c.winner === true,
    );
    if (winner) {
      raceWinnerName = normKey(winner.displayName || winner.name || '');
      raceWinnerTeam = canonicalTeamKey(winner.vehicle?.manufacturer || '');
    }
  }

  return {
    raceEvent,
    qualEvent,
    driverMetaByName,
    driverMetaByLast,
    raceWinnerName,
    raceWinnerTeam,
  };
}

function readStatNumber(stats = [], statName) {
  const st = (stats || []).find(
    (s) => s.name === statName || String(s.abbreviation || '').toUpperCase() === statName,
  );
  if (!st) return 0;
  const val = Number(st.value);
  if (Number.isFinite(val)) return val;
  const parsed = Number(String(st.displayValue || '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanSponsorPrefix(gpName = '') {
  const m = String(gpName).match(
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\s+Grand Prix|Grand Prix of\s+[A-Z][a-zA-Z\s]+)/,
  );
  return m ? m[1].trim() : String(gpName || '').trim();
}

// ==================== 1. DRIVER STANDINGS ====================
export async function fetchFreshDriverStandings({ force = false } = {}) {
  const [liveStRes, archiveRes, liveHdrRes, schedRes] = await Promise.allSettled([
    getLiveStandings(force),
    fetchJsonSafe(`${ARCHIVE_BASE}/driverstandings/`, 10000),
    getLiveHeader(force),
    fetchFreshSchedule({ force: false }),
  ]);

  const liveJson = liveStRes.status === 'fulfilled' ? liveStRes.value : null;
  const archiveJson = archiveRes.status === 'fulfilled' ? archiveRes.value : null;
  const hdrJson = liveHdrRes.status === 'fulfilled' ? liveHdrRes.value : null;
  const schedJson = schedRes.status === 'fulfilled' ? schedRes.value : null;

  const schedRaces = getScheduleRaces(schedJson);
  const hdr = parseLiveHeaderSummary(hdrJson);

  const jLists = archiveJson?.MRData?.StandingsTable?.StandingsLists || [];
  const jFirst = jLists[0] || {};
  const jSeason = String(archiveJson?.MRData?.StandingsTable?.season || '');
  const jRound = String(jFirst.round || archiveJson?.MRData?.StandingsTable?.round || '');
  const jRows = (jFirst.DriverStandings || []).map((s) => {
    const d = s?.Driver || {};
    const c = s?.Constructors?.[0] || {};
    const name = `${d.givenName || ''} ${d.familyName || ''}`.trim() || 'Unknown';
    return {
      pos: Number(s?.position) || 99,
      num: String(d.permanentNumber || ''),
      name,
      acro: String(d.code || '').toUpperCase() || lastNameKey(name).slice(0, 3).toUpperCase() || '???',
      team: c.name || '',
      constructorId: c.constructorId || '',
      colour: colourForTeam(c.constructorId, c.name),
      points: Number(s?.points) || 0,
      wins: Number(s?.wins) || 0,
      gap: 0,
    };
  });
  jRows.sort((a, b) => a.pos - b.pos);

  const jByAcro = new Map();
  const jByName = new Map();
  const jByLast = new Map();
  for (const r of jRows) {
    if (r.acro) jByAcro.set(r.acro, r);
    jByName.set(normKey(r.name), r);
    jByLast.set(lastNameKey(r.name), r);
  }

  const dChild = (liveJson?.children || []).find((c) =>
    String(c?.name || '').toLowerCase().includes('driver'),
  ) || liveJson?.children?.[0];
  const liveEntries = dChild?.standings?.entries || [];

  const liveRows = liveEntries.map((entry, idx) => {
    const ath = entry?.athlete || {};
    const stats = entry?.stats || [];
    const name = ath.displayName || ath.name || 'Unknown';
    const acro = String(ath.abbreviation || '').toUpperCase() || lastNameKey(name).slice(0, 3).toUpperCase();
    const pts = readStatNumber(stats, 'championshipPts') || readStatNumber(stats, 'points');
    const rank = readStatNumber(stats, 'rank') || idx + 1;

    const nFull = normKey(name);
    const nLast = lastNameKey(name);
    const jMatch = jByAcro.get(acro) || jByName.get(nFull) || jByLast.get(nLast) || null;
    const hMatch = hdr.driverMetaByName.get(nFull) || hdr.driverMetaByLast.get(nLast) || null;

    const team = hMatch?.team || jMatch?.team || '';
    const num = hMatch?.num || jMatch?.num || '';
    const colour = colourForTeam(jMatch?.constructorId, team, hMatch?.teamColor);

    const wonLatest =
      Boolean(hdr.raceWinnerName) &&
      (hdr.raceWinnerName === nFull || lastNameKey(hdr.raceWinnerName) === nLast) &&
      pts > (jMatch?.points ?? -1);
    const wins = (jMatch?.wins || 0) + (wonLatest ? 1 : 0);

    return {
      pos: rank,
      num,
      name,
      acro,
      team,
      colour,
      points: pts,
      wins,
      gap: 0,
    };
  });
  liveRows.sort((a, b) => a.pos - b.pos || b.points - a.points);

  const sumTop = (rows) => rows.slice(0, 10).reduce((acc, r) => acc + (Number(r.points) || 0), 0);
  const useLive = liveRows.length > 0 && (sumTop(liveRows) > sumTop(jRows) || !jRows.length);

  const matchedRace = matchScheduleRound(schedRaces, hdr.raceEvent);
  const resolvedRound = String(
    useLive ? matchedRace?.round || jRound || '' : jRound || matchedRace?.round || '',
  );
  const resolvedSeason = String(
    jSeason || schedJson?.MRData?.RaceTable?.season || new Date().getUTCFullYear(),
  );

  const finalRows = (useLive ? liveRows : jRows).map((r, i) => ({
    pos: i + 1,
    num: r.num,
    name: r.name,
    acro: r.acro,
    team: r.team,
    colour: r.colour,
    points: r.points,
    wins: r.wins,
    gap: 0,
  }));

  const leaderPts = finalRows.length ? finalRows[0].points : 0;
  for (const r of finalRows) r.gap = leaderPts - r.points;

  return {
    normalized: true,
    season: resolvedSeason,
    round: resolvedRound,
    rows: finalRows,
  };
}

// ==================== 2. CONSTRUCTOR STANDINGS ====================
export async function fetchFreshConstructorStandings({ force = false } = {}) {
  const [liveStRes, archiveRes, liveHdrRes, schedRes] = await Promise.allSettled([
    getLiveStandings(force),
    fetchJsonSafe(`${ARCHIVE_BASE}/constructorstandings/`, 10000),
    getLiveHeader(force),
    fetchFreshSchedule({ force: false }),
  ]);

  const liveJson = liveStRes.status === 'fulfilled' ? liveStRes.value : null;
  const archiveJson = archiveRes.status === 'fulfilled' ? archiveRes.value : null;
  const hdrJson = liveHdrRes.status === 'fulfilled' ? liveHdrRes.value : null;
  const schedJson = schedRes.status === 'fulfilled' ? schedRes.value : null;

  const schedRaces = getScheduleRaces(schedJson);
  const hdr = parseLiveHeaderSummary(hdrJson);

  const jLists = archiveJson?.MRData?.StandingsTable?.StandingsLists || [];
  const jFirst = jLists[0] || {};
  const jSeason = String(archiveJson?.MRData?.StandingsTable?.season || '');
  const jRound = String(jFirst.round || archiveJson?.MRData?.StandingsTable?.round || '');
  const jRows = (jFirst.ConstructorStandings || []).map((s) => {
    const c = s?.Constructor || {};
    return {
      pos: Number(s?.position) || 99,
      team: c.name || 'Unknown',
      constructorId: c.constructorId || '',
      colour: colourForTeam(c.constructorId, c.name),
      points: Number(s?.points) || 0,
      wins: Number(s?.wins) || 0,
      gap: 0,
    };
  });
  jRows.sort((a, b) => a.pos - b.pos);

  const jByTeamKey = new Map();
  for (const r of jRows) jByTeamKey.set(canonicalTeamKey(r.team), r);

  const cChild = (liveJson?.children || []).find((c) =>
    String(c?.name || '').toLowerCase().includes('constructor'),
  ) || liveJson?.children?.[1];
  const liveEntries = cChild?.standings?.entries || [];

  const liveRows = liveEntries.map((entry, idx) => {
    const tm = entry?.team || {};
    const stats = entry?.stats || [];
    const team = tm.displayName || tm.name || 'Unknown';
    const tKey = canonicalTeamKey(team);
    const pts = readStatNumber(stats, 'points') || readStatNumber(stats, 'championshipPts');
    const rank = readStatNumber(stats, 'rank') || idx + 1;

    const jMatch = jByTeamKey.get(tKey) || null;
    const colour = colourForTeam(jMatch?.constructorId, team, tm.color);
    const wonLatest =
      Boolean(hdr.raceWinnerTeam) &&
      hdr.raceWinnerTeam === tKey &&
      pts > (jMatch?.points ?? -1);
    const wins = (jMatch?.wins || 0) + (wonLatest ? 1 : 0);

    return {
      pos: rank,
      team,
      colour,
      points: pts,
      wins,
      gap: 0,
    };
  });
  liveRows.sort((a, b) => a.pos - b.pos || b.points - a.points);

  const sumAll = (rows) => rows.reduce((acc, r) => acc + (Number(r.points) || 0), 0);
  const useLive = liveRows.length > 0 && (sumAll(liveRows) > sumAll(jRows) || !jRows.length);

  const matchedRace = matchScheduleRound(schedRaces, hdr.raceEvent);
  const resolvedRound = String(
    useLive ? matchedRace?.round || jRound || '' : jRound || matchedRace?.round || '',
  );
  const resolvedSeason = String(
    jSeason || schedJson?.MRData?.RaceTable?.season || new Date().getUTCFullYear(),
  );

  const finalRows = (useLive ? liveRows : jRows).map((r, i) => ({
    pos: i + 1,
    team: r.team,
    colour: r.colour,
    points: r.points,
    wins: r.wins,
    gap: 0,
  }));

  const leaderPts = finalRows.length ? finalRows[0].points : 0;
  for (const r of finalRows) r.gap = leaderPts - r.points;

  return {
    normalized: true,
    season: resolvedSeason,
    round: resolvedRound,
    rows: finalRows,
  };
}

// ==================== 3. RACE RESULTS ====================
function normalizeArchiveRace(json) {
  const table = json?.MRData?.RaceTable || {};
  const race = (table.Races || [])[0] || {};
  const rows = (race.Results || []).map((r) => {
    const d = r?.Driver || {};
    const c = r?.Constructor || {};
    const p = Number(r?.position);
    return {
      num: String(d.permanentNumber || r?.number || ''),
      name: `${d.givenName || ''} ${d.familyName || ''}`.trim() || 'Unknown',
      acro: String(d.code || '').toUpperCase() || lastNameKey(d.familyName || '').slice(0, 3).toUpperCase() || '???',
      team: c.name || '',
      colour: colourForTeam(c.constructorId, c.name),
      pos: Number.isFinite(p) && p > 0 ? p : null,
      posText: String(r?.positionText || r?.position || ''),
      points: Number(r?.points) || 0,
      grid: r?.grid != null && r.grid !== '' ? Number(r.grid) : null,
      laps: Number(r?.laps) || 0,
      status: String(r?.status || ''),
      time: String(r?.Time?.time || ''),
      fastest: String(r?.FastestLap?.Time?.time || ''),
      fastestLap: r?.FastestLap?.lap != null ? Number(r.FastestLap.lap) : null,
    };
  });

  rows.sort((a, b) => {
    if (a.pos != null && b.pos != null) return a.pos - b.pos;
    if (a.pos != null) return -1;
    if (b.pos != null) return 1;
    return b.laps - a.laps;
  });

  return {
    normalized: true,
    season: String(table.season || race.season || ''),
    round: String(table.round || race.round || ''),
    raceName: race.raceName || '',
    circuit: race.Circuit?.circuitName || '',
    dateUTC: race.date ? `${race.date}T${race.time || '00:00:00Z'}` : '',
    rows,
  };
}

function normalizeLiveRaceEvent(liveEv, matchedSched, seasonFallback) {
  const competitors = Array.isArray(liveEv?.competitors) ? liveEv.competitors : [];
  const rows = competitors.map((c, idx) => {
    const place = Number(c?.place) || Number(c?.order) || idx + 1;
    const statusText = String(c?.status?.displayValue || c?.status?.type?.description || '');
    const statusName = String(c?.status?.type?.name || '').toUpperCase();
    const isRetired =
      statusName.includes('RETIRED') ||
      statusName.includes('DNF') ||
      statusName.includes('DSQ') ||
      statusName.includes('DNS') ||
      /retired|dnf|disqualified|did not start/i.test(statusText);

    const team = c?.vehicle?.manufacturer || '';
    const fullName = c?.displayName || c?.name || 'Driver';
    const last = c?.lastName || fullName.split(' ').slice(-1)[0] || '';
    const timeDisplay = isRetired ? '' : place === 1 ? c?.time || '' : c?.behindTime || c?.time || '';

    return {
      num: String(c?.vehicle?.number || ''),
      name: fullName,
      acro: String(last).slice(0, 3).toUpperCase(),
      team,
      colour: colourForTeam('', team, c?.vehicle?.teamColor),
      pos: isRetired ? null : place,
      posText: isRetired ? 'R' : String(place),
      points: Number(c?.score) || 0,
      grid: c?.startOrder != null && Number(c.startOrder) > 0 ? Number(c.startOrder) : null,
      laps: Number(c?.laps) || Number(c?.status?.period) || 0,
      status: isRetired ? statusText || 'Retired' : statusText === 'Classified' ? 'Finished' : statusText || 'Finished',
      time: timeDisplay,
      fastest: '',
      fastestLap: null,
    };
  });

  rows.sort((a, b) => {
    if (a.pos != null && b.pos != null) return a.pos - b.pos;
    if (a.pos != null) return -1;
    if (b.pos != null) return 1;
    return b.laps - a.laps;
  });

  return {
    normalized: true,
    season: String(matchedSched?.season || seasonFallback || new Date().getUTCFullYear()),
    round: String(matchedSched?.round || ''),
    raceName: matchedSched?.raceName || cleanSponsorPrefix(liveEv?.name || ''),
    circuit: matchedSched?.Circuit?.circuitName || liveEv?.location || '',
    rows,
  };
}

export async function fetchFreshRaceResults(round = 'last', { force = false } = {}) {
  const r = String(round || 'last');
  const [archiveRes, liveHdrRes, schedRes] = await Promise.allSettled([
    fetchJsonSafe(`${ARCHIVE_BASE}/${r}/results/`, 10000),
    getLiveHeader(force),
    fetchFreshSchedule({ force: false }),
  ]);

  const archiveJson = archiveRes.status === 'fulfilled' ? archiveRes.value : null;
  const hdrJson = liveHdrRes.status === 'fulfilled' ? liveHdrRes.value : null;
  const schedJson = schedRes.status === 'fulfilled' ? schedRes.value : null;

  const schedRaces = getScheduleRaces(schedJson);
  const seasonFallback = schedJson?.MRData?.RaceTable?.season || '';
  const jNorm = normalizeArchiveRace(archiveJson);

  const hdr = parseLiveHeaderSummary(hdrJson);
  const liveRace = hdr.raceEvent;
  const liveState = String(liveRace?.status || '').toLowerCase();
  const liveHasData = Boolean(liveRace?.competitors?.length) && (liveState === 'post' || liveState === 'in');
  const matchedSched = liveHasData ? matchScheduleRound(schedRaces, liveRace) : null;
  const liveRoundNum = Number(matchedSched?.round || 0);
  const jRoundNum = Number(jNorm.round || 0);

  if (liveHasData) {
    if (r === 'last') {
      const liveDateMs = liveRace?.date ? Date.parse(liveRace.date) : 0;
      const jDateMs = jNorm.dateUTC ? Date.parse(jNorm.dateUTC) : 0;
      const isNewer =
        !jNorm.rows.length ||
        (liveRoundNum > 0 && liveRoundNum > jRoundNum) ||
        (liveDateMs > 0 && liveDateMs - jDateMs > 12 * 3600 * 1000);
      if (isNewer) {
        return normalizeLiveRaceEvent(liveRace, matchedSched, seasonFallback);
      }
    } else if (String(r) === String(liveRoundNum) && !jNorm.rows.length) {
      return normalizeLiveRaceEvent(liveRace, matchedSched, seasonFallback);
    }
  }

  return {
    normalized: true,
    season: jNorm.season,
    round: jNorm.round,
    raceName: jNorm.raceName,
    circuit: jNorm.circuit,
    rows: jNorm.rows,
  };
}

// ==================== 4. QUALIFYING RESULTS ====================
function normalizeArchiveQuali(json) {
  const table = json?.MRData?.RaceTable || {};
  const race = (table.Races || [])[0] || {};
  const rows = (race.QualifyingResults || []).map((r) => {
    const d = r?.Driver || {};
    const c = r?.Constructor || {};
    return {
      pos: Number(r?.position) || 99,
      num: String(d.permanentNumber || r?.number || ''),
      name: `${d.givenName || ''} ${d.familyName || ''}`.trim() || 'Unknown',
      acro: String(d.code || '').toUpperCase() || lastNameKey(d.familyName || '').slice(0, 3).toUpperCase() || '???',
      team: c.name || '',
      colour: colourForTeam(c.constructorId, c.name),
      q1: String(r?.Q1 || ''),
      q2: String(r?.Q2 || ''),
      q3: String(r?.Q3 || ''),
      best: String(r?.Q3 || r?.Q2 || r?.Q1 || ''),
    };
  });
  rows.sort((a, b) => a.pos - b.pos);

  return {
    normalized: true,
    season: String(table.season || race.season || ''),
    round: String(table.round || race.round || ''),
    raceName: race.raceName || '',
    circuit: race.Circuit?.circuitName || '',
    dateUTC: race.date ? `${race.date}T${race.time || '00:00:00Z'}` : '',
    rows,
  };
}

function normalizeLiveQualiEvent(liveEv, matchedSched, seasonFallback) {
  const competitors = Array.isArray(liveEv?.competitors) ? liveEv.competitors : [];
  const rows = competitors.map((c, idx) => {
    const place = Number(c?.place) || Number(c?.order) || idx + 1;
    const team = c?.vehicle?.manufacturer || '';
    const fullName = c?.displayName || c?.name || 'Driver';
    const last = c?.lastName || fullName.split(' ').slice(-1)[0] || '';
    const best = String(c?.time || '');
    return {
      pos: place,
      num: String(c?.vehicle?.number || ''),
      name: fullName,
      acro: String(last).slice(0, 3).toUpperCase(),
      team,
      colour: colourForTeam('', team, c?.vehicle?.teamColor),
      q1: '',
      q2: '',
      q3: '',
      best,
    };
  });
  rows.sort((a, b) => a.pos - b.pos);

  return {
    normalized: true,
    season: String(matchedSched?.season || seasonFallback || new Date().getUTCFullYear()),
    round: String(matchedSched?.round || ''),
    raceName: matchedSched?.raceName || cleanSponsorPrefix(liveEv?.name || ''),
    circuit: matchedSched?.Circuit?.circuitName || liveEv?.location || '',
    rows,
  };
}

export async function fetchFreshQualifying(round = 'last', { force = false } = {}) {
  const r = String(round || 'last');
  const [archiveRes, liveHdrRes, schedRes] = await Promise.allSettled([
    fetchJsonSafe(`${ARCHIVE_BASE}/${r}/qualifying/`, 10000),
    getLiveHeader(force),
    fetchFreshSchedule({ force: false }),
  ]);

  const archiveJson = archiveRes.status === 'fulfilled' ? archiveRes.value : null;
  const hdrJson = liveHdrRes.status === 'fulfilled' ? liveHdrRes.value : null;
  const schedJson = schedRes.status === 'fulfilled' ? schedRes.value : null;

  const schedRaces = getScheduleRaces(schedJson);
  const seasonFallback = schedJson?.MRData?.RaceTable?.season || '';
  const jNorm = normalizeArchiveQuali(archiveJson);

  const hdr = parseLiveHeaderSummary(hdrJson);
  const liveQual = hdr.qualEvent;
  const liveState = String(liveQual?.status || '').toLowerCase();
  const liveHasData = Boolean(liveQual?.competitors?.length) && (liveState === 'post' || liveState === 'in');
  const matchedSched = liveHasData ? matchScheduleRound(schedRaces, liveQual) : null;
  const liveRoundNum = Number(matchedSched?.round || 0);
  const jRoundNum = Number(jNorm.round || 0);

  if (liveHasData) {
    if (r === 'last') {
      const liveDateMs = liveQual?.date ? Date.parse(liveQual.date) : 0;
      const jDateMs = jNorm.dateUTC ? Date.parse(jNorm.dateUTC) : 0;
      const isNewer =
        !jNorm.rows.length ||
        (liveRoundNum > 0 && liveRoundNum > jRoundNum) ||
        (liveDateMs > 0 && liveDateMs - jDateMs > 12 * 3600 * 1000);
      if (isNewer) {
        return normalizeLiveQualiEvent(liveQual, matchedSched, seasonFallback);
      }
    } else if (String(r) === String(liveRoundNum) && !jNorm.rows.length) {
      return normalizeLiveQualiEvent(liveQual, matchedSched, seasonFallback);
    }
  }

  return {
    normalized: true,
    season: jNorm.season,
    round: jNorm.round,
    raceName: jNorm.raceName,
    circuit: jNorm.circuit,
    rows: jNorm.rows,
  };
}
