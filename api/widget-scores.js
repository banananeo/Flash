// Lightweight widget endpoint: TOP 1 live match only, minimal payload (<1KB).
// Purpose: feed a compact Android home-screen widget (2x1 style) without
// burning the 100 req/day quotas — one upstream call per sport, cached 60s.
// GET /api/widget-scores?sport=auto|football|cricket  (default auto)
// Response: { live, source, match: {sport,league,teamA,teamB,minute,status,deepLink} | null, updatedAt }

function footballKey() {
  return (
    process.env.VITE_FOOTBALL ||
    process.env.VITE_FOOTBALL_API_KEY ||
    process.env.FOOTBALL_API_KEY ||
    process.env.API_FOOTBALL_KEY ||
    ''
  );
}

function cricketKey() {
  return (
    process.env.VITE_CRICKETDATA_KEY ||
    process.env.CRICKETDATA_KEY ||
    process.env.VITE_CRICKETDATA_API_KEY ||
    process.env.CRICAPI_KEY ||
    ''
  );
}

const short = (name, fb) => (fb || name || '???').slice(0, 3).toUpperCase();

async function topFootballLive(key) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch('https://v3.football.api-sports.io/fixtures?live=all', {
      headers: { 'x-apisports-key': key },
      signal: ctl.signal,
    });
    if (!r.ok) return null;
    const data = await r.json();
    const f = (data.response || [])[0];
    if (!f) return null;
    const elapsed = f.fixture?.status?.elapsed;
    return {
      sport: 'football',
      league: f.league?.name || 'Football',
      teamA: `${short(f.teams?.home?.name)} ${f.goals?.home ?? 0}`,
      teamB: `${short(f.teams?.away?.name)} ${f.goals?.away ?? 0}`,
      minute: elapsed ? `${elapsed}'` : 'LIVE',
      status: 'live',
      deepLink: `/?view=scores&sport=football&match=fb-${f.fixture?.id}`,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function entryBelongsTo(s, team) {
  if (!s || !team) return false;
  if (s.team) return String(s.team).toLowerCase() === String(team).toLowerCase();
  // CricAPI shape: { inning: "India Innings 1", r, w, o } — no `team` field
  const inning = String(s.inning || '').toLowerCase();
  return inning.startsWith(String(team).toLowerCase());
}

function fmtScoreEntry(s) {
  if (s == null) return 'Yet to bat';
  return `${s.r ?? 0}/${s.w ?? 0}`;
}

async function topCricketLive(key) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(
      `https://api.cricapi.com/v1/currentMatches?apikey=${encodeURIComponent(key)}&offset=0`,
      { signal: ctl.signal }
    );
    if (!r.ok) return null;
    const data = await r.json();
    const list = Array.isArray(data?.data) ? data.data : [];
    if (!list.length) return null;
    const isDone = (status) => /won|draw|tie|result|no result|abandoned|cancelled/i.test(status || '');
    const isLive = (m) =>
      !isDone(m?.status) &&
      ((Array.isArray(m?.score) && m.score.length > 0) ||
        /live|innings|break|trail|lead|need|day \d|session|stumps|playing/i.test(m?.status || ''));
    const m = list.find(isLive) || list[0];
    if (!m) return null;
    const teams = m.teams || [];
    const scores = Array.isArray(m.score) ? m.score : [];
    const scoreFor = (team) => scores.filter((s) => entryBelongsTo(s, team)).map(fmtScoreEntry).join(' & ') || 'Yet to bat';
    const t1 = teams[0] || 'Team A';
    const t2 = teams[1] || 'Team B';
    const live = isLive(m);
    const shortOf = (n) => String(n).slice(0, 3).toUpperCase();
    return {
      sport: 'cricket',
      league: m.matchType ? `${String(m.matchType).toUpperCase()} • ${m.name || 'Cricket'}` : m.name || 'Cricket',
      teamA: `${shortOf(t1)} ${scoreFor(t1)}`.trim(),
      teamB: `${shortOf(t2)} ${scoreFor(t2)}`.trim(),
      minute: live ? 'LIVE' : m.status || '',
      status: live ? 'live' : isDone(m.status) ? 'ft' : 'scheduled',
      deepLink: `/?view=scores&sport=cricket&match=cr-${m.id}`,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const want = String(req.query?.sport || 'auto').toLowerCase();
  const fbKey = footballKey();
  const crKey = cricketKey();

  const jobs = [];
  if ((want === 'auto' || want === 'football') && fbKey) jobs.push(topFootballLive(fbKey));
  if ((want === 'auto' || want === 'cricket') && crKey) jobs.push(topCricketLive(crKey));

  if (!jobs.length) {
    return res.status(500).json({
      live: false,
      source: 'none',
      match: null,
      updatedAt: new Date().toISOString(),
      error: 'Server missing keys. Add VITE_FOOTBALL / VITE_CRICKETDATA_KEY in Vercel env vars, then redeploy.',
    });
  }

  const results = await Promise.all(jobs);
  // prefer a live football match, then live cricket, then anything
  const pick =
    results.find((m) => m && m.sport === 'football' && m.status === 'live') ||
    results.find((m) => m && m.status === 'live') ||
    results.find(Boolean) ||
    null;

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
  return res.status(200).json({
    live: !!pick && pick.status === 'live',
    source: pick ? pick.sport : 'none',
    match: pick,
    updatedAt: new Date().toISOString(),
  });
}
