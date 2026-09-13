// RapidAPI Cricbuzz → normalized Match shape.
// Upstream: https://cricbuzz-cricket.p.rapidapi.com/matches/v1/live
// Key + host injected server-side; client uses /api/cricket/live + /api/cricket/detail?id=
// Never put the RapidAPI key in client code.

function fmtInnings(side) {
  if (!side) return 'Yet to bat';
  const i1 = side.inngs1;
  const i2 = side.inngs2;
  const fmt = (i) => (i ? `${i.runs ?? 0}/${i.wickets ?? 0} (${i.overs ?? 0} ov)` : null);
  const parts = [fmt(i1), fmt(i2)].filter(Boolean);
  return parts.length ? parts.join(' & ') : 'Yet to bat';
}

function shortInnings(side) {
  if (!side?.inngs1) return 'Yet to bat';
  const i = side.inngs1;
  return `${i.runs ?? 0}/${i.wickets ?? 0}`;
}

function oversOf(side) {
  const o = side?.inngs1?.overs;
  return o != null ? String(o) : '';
}

function mapCricbuzz(matchInfo = {}, matchScore = {}) {
  const rawId = matchInfo.matchId;
  const t1 = matchInfo.team1 || {};
  const t2 = matchInfo.team2 || {};
  const t1Name = t1.teamName || 'Team A';
  const t2Name = t2.teamName || 'Team B';
  const t1Short = t1.teamSName || t1Name.slice(0, 3).toUpperCase();
  const t2Short = t2.teamSName || t2Name.slice(0, 3).toUpperCase();
  const state = matchInfo.state || matchInfo.stateTitle || '';
  const isLive = /in.?progress|^live/i.test(state);
  const isDone = /complete|result|won|draw|tie/i.test(state) || /won|draw|tie|complete|result/i.test(matchInfo.status || '');
  const seriesName = matchInfo.seriesName || 'Cricket';
  const desc = matchInfo.matchDesc || '';
  const format = matchInfo.matchFormat || '';
  return {
    id: `cr-${rawId}`,
    sport: 'cricket',
    league: `${seriesName}${desc ? ` • ${desc}` : ''}${format ? ` • ${format}` : ''}`,
    leagueName: seriesName,
    format,
    // cricket series carry no league-country; country filter matches team names
    country: '',
    status: isLive ? 'live' : isDone ? 'ft' : 'scheduled',
    teamA: {
      name: t1Name,
      short: t1Short,
      score: shortInnings(matchScore.team1Score),
      fullScore: fmtInnings(matchScore.team1Score),
      overs: oversOf(matchScore.team1Score),
    },
    teamB: {
      name: t2Name,
      short: t2Short,
      score: shortInnings(matchScore.team2Score),
      fullScore: fmtInnings(matchScore.team2Score),
      overs: oversOf(matchScore.team2Score),
    },
    meta: { need: matchInfo.status || state || '', crr: '', lastWicket: '' },
    recentBalls: [],
    batters: [],
    bowlers: [],
    rawId,
    time: matchInfo.startDate ? new Date(Number(matchInfo.startDate)).toISOString() : undefined,
    venue: matchInfo.venueInfo?.ground || matchInfo.venueInfo?.city || '',
  };
}

export function flattenCricbuzz(data) {
  const out = [];
  const typeMatches = data?.typeMatches || data?.type_matches || [];
  for (const tm of typeMatches) {
    for (const series of tm.seriesMatches || tm.series_matches || []) {
      const list = series.seriesMatches || series.series_matches || [];
      for (const m of list) {
        if (m?.matchInfo?.matchId) out.push(m);
      }
    }
  }
  // some responses return a flat list instead
  if (!out.length && Array.isArray(data?.matches)) {
    for (const m of data.matches) if (m?.matchInfo?.matchId || m?.matchId) out.push(m.matchInfo ? m : { matchInfo: m, matchScore: {} });
  }
  return out;
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
    if (cached && Date.now() - cached.ts < 90 * 1000 && cached.matches?.length) {
      return { matches: cached.matches, cached: true };
    }
  } catch { /* ignore */ }

  // proxy-only: RapidAPI key must never touch the browser
  let res;
  try {
    res = await fetch('/api/cricket/live');
    if (res.status === 404) throw new Error('proxy-miss');
  } catch (e) {
    throw friendlyCricketError(e);
  }
  if (!res) throw new Error('Add VITE_RAPIDAPI_KEY in Vercel env vars for live — showing mock');
  if (res.status === 429) throw new Error('Cricket quota hit — showing mock');
  if (res.status === 401 || res.status === 403) throw new Error('Cricket key rejected (401/403) — check RapidAPI key — showing mock');
  if (res.status === 500) throw new Error('Add VITE_RAPIDAPI_KEY in Vercel env vars for live — showing mock');
  if (!res.ok) {
    let msg = `Cricket error ${res.status}`;
    try {
      const err = await res.clone().json();
      if (err?.error) msg = String(err.error).slice(0, 160);
      else if (err?.message) msg = String(err.message).slice(0, 160);
    } catch { /* keep default */ }
    throw new Error(msg);
  }
  const data = await res.json();
  const flat = flattenCricbuzz(data);
  const live = flat.filter((m) => /in.?progress|^live/i.test(m.matchInfo?.state || ''));
  const matches = (live.length ? live : flat).slice(0, 15).map((m) => mapCricbuzz(m.matchInfo, m.matchScore));

  try {
    localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), matches }));
  } catch { /* ignore */ }
  return { matches, cached: false };
}

// Full scoreboard: normalized { matchHeader, innings[], commentary[] }
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
  const data = await res.json();
  return normalizeDetail(data);
}

function asArray(v) {
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'object') return Object.values(v);
  return [];
}

export function normalizeDetail(data) {
  const scard = data?.scorecard || data;
  const comm = data?.commentary || null;
  const rawCards = scard?.scoreCard ?? scard?.scorecard ?? [];
  const scoreCards = Array.isArray(rawCards) ? rawCards : rawCards ? [rawCards] : [];
  const matchHeader = scard?.matchHeader || scard?.matchHeaders || comm?.matchHeader || {};
  const innings = scoreCards.map((s) => {
    const bat = s.batTeamDetails || {};
    const bowl = s.bowlTeamDetails || {};
    const sd = s.scoreDetails || {};
    // NOTE: upstream nests player tables inside the team blocks
    // (batTeamDetails.batsmenData / bowlTeamDetails.bowlersData),
    // with legacy top-level s.batsmenData / s.bowlersData as fallback.
    // Preserve API order (batting order) — do not re-sort batsmen.
    const batsmen = asArray(s.batsmenData ?? bat.batsmenData)
      .filter((b) => b && (b.batName || b.name))
      .map((b) => ({ name: b.batName || b.name, runs: b.runs ?? 0, balls: b.balls ?? 0, fours: b.fours ?? 0, sixes: b.sixes ?? 0, out: b.outDesc || b.out || 'not out' }))
      .slice(0, 11);
    const bowlers = asArray(s.bowlersData ?? bowl.bowlersData)
      .filter((b) => b && (b.bowlName || b.name))
      .map((b) => ({ name: b.bowlName || b.name, overs: b.overs ?? 0, runs: b.runs ?? 0, wickets: b.wickets ?? 0, economy: b.economy ?? '' }))
      .sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)
      .slice(0, 8);
    return {
      teamName: bat.batTeamName || '',
      teamShort: bat.batTeamShort || '',
      runs: sd.runs ?? 0,
      wickets: sd.wickets ?? 0,
      overs: sd.overs ?? 0,
      runRate: sd.runRate ?? '',
      batsmen,
      bowlers,
    };
  });
  const rawList = comm?.commentaryList || comm?.commentary_list || scard?.commentaryList || [];
  const commentary = rawList
    .filter((c) => c && (c.commText || c.commentary || c.text))
    .slice(0, 12)
    .map((c) => ({
      over: c.overNumber != null ? `${c.overNumber}` : c.over ? String(c.over) : '',
      text: String(c.commText || c.commentary || c.text || '').replace(/<[^>]*>/g, '').slice(0, 280),
      timestamp: c.timestamp || '',
    }));
  return { matchHeader, innings, commentary, raw: data };
}
