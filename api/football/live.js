// Vercel serverless route: GET /api/football/live[?date=YYYYMMDD]
// Backed by ESPN Soccer public JSON APIs (no API key / no daily quota).
import { setCors, fetchEspnFootballMatches, sanitizeDateParam } from '../_football.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, 'http://localhost');
  const date = sanitizeDateParam(url.searchParams.get('date'));
  const upcomingParam = url.searchParams.get('upcoming');
  const upcoming = upcomingParam == null ? !date : upcomingParam === '1' || upcomingParam === 'true';
  const noCache = url.searchParams.has('t');

  try {
    const matches = await fetchEspnFootballMatches(date, { upcoming });
    res.setHeader('Cache-Control', noCache ? 'no-store' : 's-maxage=30, stale-while-revalidate=30');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ provider: 'espn', date: date || 'today', matches });
  } catch (e) {
    return res.status(e?.status || 502).json({
      error: `ESPN Football upstream unreachable: ${e?.message || 'Unknown error'}`,
    });
  }
}
