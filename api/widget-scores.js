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
    process.env.VITE_CRICAPI ||
    process.env.VITE_CRICAPI_KEY ||
    process.env.CRICAPI_KEY ||
    process.env.CRICAPI ||
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

async function topCricketLive(key) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(`https://api.cricapi.com/v1/cricScore?apikey=${key}`, {
      signal: ctl.signal,
    });
    if (!r.ok) return null;
    const data = await r.json();
    const list = data.data || [];
    const m = list.find((x) => /live/i.test(x.status || '')) || list[0];
    if (!m) return null;
    const live = /live/i.test(m.status || '');
    return {
      sport: 'cricket',
      league: m.series || 'Cricket',
      teamA: `${m.t1short || (m.t1 || 'A').slice(0, 3).toUpperCase()} ${m.t1s || ''}`.trim(),
      teamB: `${m.t2short || (m.t2 || 'B').slice(0, 3).toUpperCase()} ${m.t2s || ''}`.trim(),
      minute: live ? 'LIVE' : m.status || '',
      status: live ? 'live' : 'scheduled',
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
      error: 'Server missing keys. Add VITE_FOOTBALL / VITE_CRICAPI in Vercel env vars, then redeploy.',
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
