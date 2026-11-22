// Lightweight widget endpoint: TOP 1 live match only, minimal payload (<1KB).
// Purpose: feed a compact Android/PWA home-screen widget — both football & cricket
// use ESPN public JSON APIs (zero API keys, zero daily quotas).
// GET /api/widget-scores?sport=auto|football|cricket  (default auto)
// Response: { live, source, match: {sport,league,teamA,teamB,minute,status,deepLink} | null, updatedAt }
import { fetchEspnLiveMatches } from './_cricket.js';
import { fetchEspnFootballMatches } from './_football.js';
import { applyApiSecurity } from './_security.js';

async function topFootballLive() {
  try {
    const matches = await fetchEspnFootballMatches();
    const m = matches.find((x) => x.status === 'live') || matches[0];
    if (!m) return null;
    return {
      sport: 'football',
      league: m.leagueName || m.league || 'Football',
      teamA: `${m.teamA?.short || 'HOM'} ${m.teamA?.score ?? 0}`.trim(),
      teamB: `${m.teamB?.short || 'AWY'} ${m.teamB?.score ?? 0}`.trim(),
      minute: m.status === 'live' ? m.minute : m.minute || '',
      status: m.status,
      deepLink: `/?view=scores&sport=football&match=${encodeURIComponent(m.id)}`,
    };
  } catch {
    return null;
  }
}

async function topCricketLive() {
  try {
    const matches = await fetchEspnLiveMatches();
    const m = matches.find((x) => x.status === 'live') || matches[0];
    if (!m) return null;
    return {
      sport: 'cricket',
      league: m.league || 'Cricket',
      teamA: `${m.teamA?.short || 'T1'} ${m.teamA?.score || ''}`.trim(),
      teamB: `${m.teamB?.short || 'T2'} ${m.teamB?.score || ''}`.trim(),
      minute: m.status === 'live' ? 'LIVE' : m.meta?.need || '',
      status: m.status,
      deepLink: `/?view=scores&sport=cricket&match=${encodeURIComponent(m.id)}`,
    };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (applyApiSecurity(req, res, { allowCrossOrigin: true })) return;

  const url = new URL(req.url || '/api/widget-scores', 'http://localhost');
  const rawWant = String(req.query?.sport || url.searchParams.get('sport') || 'auto').toLowerCase();
  const want = ['auto', 'football', 'cricket'].includes(rawWant) ? rawWant : 'auto';

  const jobs = [];
  if (want === 'auto' || want === 'football') jobs.push(topFootballLive());
  if (want === 'auto' || want === 'cricket') jobs.push(topCricketLive());

  const results = await Promise.all(jobs);
  const pick =
    results.find((m) => m && m.sport === 'football' && m.status === 'live') ||
    results.find((m) => m && m.status === 'live') ||
    results.find(Boolean) ||
    null;

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    live: !!pick && pick.status === 'live',
    source: pick ? pick.sport : 'none',
    match: pick,
    updatedAt: new Date().toISOString(),
  });
}
