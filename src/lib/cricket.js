// CricketData.org (CricAPI) → normalized Match shape.
// Upstream: https://api.cricapi.com/v1/currentMatches + /match_info?id=
// Key injected server-side; client uses /api/cricket/live + /api/cricket/detail?id=
// Never put the CricketData key in client code.

function isDoneStatus(status) {
  return /won|draw|tie|result|no result|abandoned|cancelled/i.test(status || '');
}

function isLiveMatch(m = {}) {
  if (isDoneStatus(m.status)) return false;
  if (Array.isArray(m.score) && m.score.length > 0) {
    // has scores but no result yet → live (or innings break)
    return true;
  }
  return /live|innings|break|trail|lead|need|day \d|session|stumps|playing/i.test(m.status || '');
}

// CricAPI score entries look like { inning: "India Innings 1", r, w, o }
// (older samples also carry a `team` field) — handle both shapes.
function teamOfEntry(s) {
  if (s?.team) return String(s.team);
  const inning = String(s?.inning || '');
  // strip trailing " Inning(s) N..." suffix → team name
  const parsed = inning.replace(/\s+innings?\s+\d+.*$/i, '').trim();
  return parsed || inning;
}

function entryBelongsTo(s, team) {
  if (!s || !team) return false;
  if (s.team) return String(s.team).toLowerCase() === String(team).toLowerCase();
  const inning = String(s.inning || '').toLowerCase();
  const t = String(team).toLowerCase();
  if (inning.startsWith(t)) return true;
  return teamOfEntry(s).toLowerCase() === t;
}

function scoreEntriesFor(scores, team) {
  return (scores || []).filter((s) => entryBelongsTo(s, team));
}

function fmtEntry(s) {
  return `${s.r ?? 0}/${s.w ?? 0}`;
}

function fmtEntryFull(s) {
  return `${s.r ?? 0}/${s.w ?? 0} (${s.o ?? 0} ov)`;
}

function shortScore(scores, team) {
  const list = scoreEntriesFor(scores, team);
  if (!list.length) return 'Yet to bat';
  return list.map(fmtEntry).join(' & ');
}

function fullScore(scores, team) {
  const list = scoreEntriesFor(scores, team);
  if (!list.length) return 'Yet to bat';
  return list.map(fmtEntryFull).join(' & ');
}

function oversOf(scores, team) {
  const list = scoreEntriesFor(scores, team);
  if (!list.length) return '';
  return list.map((s) => String(s.o ?? '')).filter(Boolean).join(' & ');
}

const shortOf = (name) => String(name || '').slice(0, 3).toUpperCase();

// new Date(invalid).toISOString() throws RangeError — never trust upstream dates
const safeISODate = (v) => {
  if (!v) return undefined
  try {
    const d = new Date(v)
    return Number.isFinite(d.getTime()) ? d.toISOString() : undefined
  } catch {
    return undefined
  }
}

async function readJSON(res, what = 'Cricket') {
  try {
    return await res.json()
  } catch {
    throw new Error(`${what} sent a bad response — showing mock`)
  }
}

export function mapCricData(m = {}) {
  const rawId = m.id;
  const teams = m.teams || [];
  const scores = Array.isArray(m.score) ? m.score : [];
  const t1Name = teams[0] || 'Team A';
  const t2Name = teams[1] || 'Team B';
  const format = String(m.matchType || '').toUpperCase();
  const name = m.name || `${t1Name} vs ${t2Name}`;
  const live = isLiveMatch(m);
  const done = isDoneStatus(m.status);
  return {
    id: `cr-${rawId}`,
    sport: 'cricket',
    league: `${format ? `${format} • ` : ''}${name}`,
    leagueName: format || 'Cricket',
    format,
    // CricData free Match carries no series/country; country filter matches team names
    country: '',
    status: live ? 'live' : done ? 'ft' : 'scheduled',
    teamA: {
      name: t1Name,
      short: shortOf(t1Name),
      score: shortScore(scores, t1Name),
      fullScore: fullScore(scores, t1Name),
      overs: oversOf(scores, t1Name),
    },
    teamB: {
      name: t2Name,
      short: shortOf(t2Name),
      score: shortScore(scores, t2Name),
      fullScore: fullScore(scores, t2Name),
      overs: oversOf(scores, t2Name),
    },
    meta: { need: m.status || '', crr: '', lastWicket: '' },
    recentBalls: [],
    batters: [],
    bowlers: [],
    rawId,
    time: m.dateTimeGMT || safeISODate(m.date),
    venue: m.venue || '',
  };
}

// Keep old name as alias (nothing imports it, but cheap compat).
export function flattenCricbuzz(data) {
  return flattenCricData(data);
}

export function flattenCricData(data) {
  if (Array.isArray(data)) return data.filter((m) => m?.id);
  const list = data?.data;
  if (Array.isArray(list)) return list.filter((m) => m?.id);
  if (list && typeof list === 'object' && list.id) return [list];
  if (Array.isArray(data?.matches)) return data.matches.filter((m) => m?.id);
  return [];
}

function friendlyCricketError(e) {
  if (e instanceof TypeError || /failed to fetch|networkerror|load failed|network request failed/i.test(e?.message || '')) {
    return new Error('Network blocked — check connection / ad-blocker / VPN — showing mock');
  }
  return e;
}

export async function fetchCricketLive() {
  const cacheKey = 'live-cache-cricket';
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
    if (cached && Date.now() - cached.ts < 120 * 1000 && cached.matches?.length) {
      return { matches: cached.matches, cached: true };
    }
  } catch { /* ignore */ }

  // proxy-only: CricketData key must never touch the browser
  let res;
  try {
    res = await fetch('/api/cricket/live');
    if (res.status === 404) throw new Error('proxy-miss');
  } catch (e) {
    throw friendlyCricketError(e);
  }
  if (!res) throw new Error('Add VITE_CRICKETDATA_KEY in Vercel env vars for live — showing mock');
  if (res.status === 429) throw new Error('Cricket quota hit — showing mock');
  if (res.status === 401 || res.status === 403) throw new Error('Cricket key rejected (401/403) — check CricketData key — showing mock');
  if (res.status === 500) throw new Error('Add VITE_CRICKETDATA_KEY in Vercel env vars for live — showing mock');
  if (!res.ok) {
    let msg = `Cricket error ${res.status}`;
    try {
      const err = await res.clone().json();
      if (err?.error) msg = String(err.error).slice(0, 160);
      else if (err?.reason) msg = String(err.reason).slice(0, 160);
      else if (err?.message) msg = String(err.message).slice(0, 160);
    } catch { /* keep default */ }
    throw new Error(msg);
  }
  const data = await readJSON(res);
  if (data?.status === 'failure') {
    throw new Error(data?.reason ? String(data.reason).slice(0, 160) : 'Cricket API failure — showing mock');
  }
  const flat = flattenCricData(data);
  const live = flat.filter(isLiveMatch);
  const matches = (live.length ? live : flat).slice(0, 15).map(mapCricData);

  try {
    localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), matches }));
  } catch { /* ignore */ }
  return { matches, cached: false };
}

// Full scoreboard: normalized { matchHeader, innings[], commentary[], score[] }
// NOTE: free match_info has no ball-by-ball/batsmen/bowlers tables —
// innings[] + score[] are derived from the per-inning score array.
export async function fetchCricketDetail(matchId) {
  const rawId = String(matchId).replace(/^cr-/, '');
  let res;
  try {
    res = await fetch(`/api/cricket/detail?id=${encodeURIComponent(rawId)}`);
    if (res.status === 404) throw new Error('proxy-miss');
  } catch (e) {
    throw friendlyCricketError(e);
  }
  if (!res.ok) throw new Error(`Scoreboard error ${res.status}`);
  const data = await readJSON(res, 'Scoreboard');
  return normalizeDetail(data);
}

export function normalizeDetail(data) {
  const m = data?.data || data || {};
  const scores = Array.isArray(m.score) ? m.score : [];
  const matchHeader = {
    status: m.status || '',
    name: m.name || '',
    matchType: m.matchType || '',
    venue: m.venue || '',
    date: m.date || m.dateTimeGMT || '',
  };
  // Group per-inning entries by team, preserving API order.
  const byTeam = [];
  const seen = new Map();
  for (const s of scores) {
    if (!s || (!s.team && !s.inning)) continue;
    const key = teamOfEntry(s) || 'Unknown';
    if (!seen.has(key)) {
      seen.set(key, byTeam.length);
      byTeam.push({ team: key, entries: [] });
    }
    byTeam[seen.get(key)].entries.push(s);
  }
  const innings = byTeam.map((g) => {
    const last = g.entries[g.entries.length - 1] || {};
    return {
      teamName: g.team,
      teamShort: shortOf(g.team),
      runs: last.r ?? 0,
      wickets: last.w ?? 0,
      overs: last.o ?? 0,
      runRate: '',
      batsmen: [],
      bowlers: [],
    };
  });
  // legacy compat for Boards.jsx `d.score` block
  const score = scores.map((s) => ({
    inning: s.inning || `${s.team}`,
    r: s.r ?? 0,
    w: s.w ?? 0,
    o: s.o ?? 0,
  }));
  return { matchHeader, innings, commentary: [], score, raw: data };
}
