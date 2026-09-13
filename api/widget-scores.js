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

function rapidKey() {
  return (
    process.env.VITE_RAPIDAPI_KEY ||
    process.env.RAPIDAPI_KEY ||
    process.env.VITE_RAPIDAPI_CRICKET_KEY ||
    ''
  );
}

function rapidHost() {
  return (
    process.env.VITE_RAPIDAPI_CRICKET_HOST ||
    process.env.RAPIDAPI_CRICKET_HOST ||
    'cricbuzz-cricket.p.rapidapi.com'
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

function flattenTypeMatches(data) {
  const out = [];
  for (const tm of data?.typeMatches || []) {
    for (const series of tm.seriesMatches || []) {
      for (const m of series.seriesMatches || []) {
        if (m?.matchInfo?.matchId) out.push(m);
      }
    }
  }
  return out;
}

function fmtSide(side) {
  const i = side?.inngs1;
  if (!i) return 'Yet to bat';
  return `${i.runs ?? 0}/${i.wickets ?? 0}`;
}

async function topCricketLive(key, host) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(`https://${host}/matches/v1/live`, {
      headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': host },
      signal: ctl.signal,
    });
    if (!r.ok) return null;
    const data = await r.json();
    const list = flattenTypeMatches(data);
    const m = list.find((x) => /in.?progress|^live/i.test(x.matchInfo?.state || '')) || list[0];
    if (!m) return null;
    const info = m.matchInfo || {};
    const score = m.matchScore || {};
    const live = /in.?progress|^live/i.test(info.state || '');
    const t1 = info.team1 || {};
    const t2 = info.team2 || {};
    return {
      sport: 'cricket',
      league: info.seriesName || 'Cricket',
      teamA: `${t1.teamSName || (t1.teamName || 'A').slice(0, 3).toUpperCase()} ${fmtSide(score.team1Score)}`.trim(),
      teamB: `${t2.teamSName || (t2.teamName || 'B').slice(0, 3).toUpperCase()} ${fmtSide(score.team2Score)}`.trim(),
      minute: live ? 'LIVE' : info.status || info.state || '',
      status: live ? 'live' : 'scheduled',
      deepLink: `/?view=scores&sport=cricket&match=cr-${info.matchId}`,
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
  const crKey = rapidKey();
  const crHost = rapidHost();

  const jobs = [];
  if ((want === 'auto' || want === 'football') && fbKey) jobs.push(topFootballLive(fbKey));
  if ((want === 'auto' || want === 'cricket') && crKey) jobs.push(topCricketLive(crKey, crHost));

  if (!jobs.length) {
    return res.status(500).json({
      live: false,
      source: 'none',
      match: null,
      updatedAt: new Date().toISOString(),
      error: 'Server missing keys. Add VITE_FOOTBALL / VITE_RAPIDAPI_KEY in Vercel env vars, then redeploy.',
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
