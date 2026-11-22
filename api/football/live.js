// Vercel serverless route: GET /api/football/live[?date=YYYYMMDD]
import { fetchEspnFootballMatches, sanitizeDateParam } from '../_football.js';
import { applyApiSecurity, sendApiError } from '../_security.js';

export default async function handler(req, res) {
  if (applyApiSecurity(req, res)) return;

  const url = new URL(req.url, 'http://localhost');
  const date = sanitizeDateParam(url.searchParams.get('date'));
  const upcomingParam = url.searchParams.get('upcoming');
  const upcoming = upcomingParam == null ? !date : upcomingParam === '1' || upcomingParam === 'true';
  const noCache = url.searchParams.has('t');

  try {
    const matches = await fetchEspnFootballMatches(date, { upcoming });
    res.setHeader('Cache-Control', noCache ? 'no-store' : 's-maxage=30, stale-while-revalidate=30');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ date: date || 'today', matches });
  } catch (e) {
    return sendApiError(res, e?.status === 400 ? 400 : 502, 'Football scores temporarily unavailable.');
  }
}
