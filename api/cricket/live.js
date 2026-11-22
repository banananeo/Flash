// Vercel serverless route: GET /api/cricket/live[?date=YYYYMMDD]
import { fetchEspnLiveMatches } from '../_cricket.js';
import { applyApiSecurity, sendApiError } from '../_security.js';

export default async function handler(req, res) {
  if (applyApiSecurity(req, res)) return;

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
    return res.status(200).json({ date: safeDate || 'today', matches });
  } catch (e) {
    return sendApiError(res, e?.status === 400 ? 400 : 502, 'Cricket scores temporarily unavailable.');
  }
}
