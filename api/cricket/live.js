// Vercel serverless route: GET /api/cricket/live[?date=YYYYMMDD]
// Backed by ESPN Cricket public JSON scoreboard header (no API key / no daily quota).
import { setCors, fetchEspnLiveMatches } from '../_cricket.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, 'http://localhost');
  const date = String(url.searchParams.get('date') || '').trim().replace(/-/g, '');
  const safeDate = /^\d{8}$/.test(date) ? date : '';
  const upcomingParam = url.searchParams.get('upcoming');
  const upcoming = upcomingParam == null ? !safeDate : upcomingParam === '1' || upcomingParam === 'true';
  const noCache = url.searchParams.has('t');

  try {
    const matches = await fetchEspnLiveMatches(safeDate, { upcoming });
    res.setHeader('Cache-Control', noCache ? 'no-store' : 's-maxage=30, stale-while-revalidate=30');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ provider: 'espn', date: safeDate || 'today', matches });
  } catch (e) {
    return res.status(e?.status || 502).json({
      error: `ESPN Cricket upstream unreachable: ${e?.message || 'Unknown error'}`,
    });
  }
}
