// Vercel serverless route: GET /api/cricket/detail?id=<matchId>&series=<seriesId>
import { fetchEspnMatchDetail } from '../_cricket.js';
import { applyApiSecurity, sendApiError } from '../_security.js';

export default async function handler(req, res) {
  if (applyApiSecurity(req, res)) return;

  const url = new URL(req.url, 'http://localhost');
  const id = url.searchParams.get('id') || url.searchParams.get('matchId') || '';
  const series = url.searchParams.get('series') || url.searchParams.get('seriesId') || '';
  const noCache = url.searchParams.has('t');

  if (!id) {
    return sendApiError(res, 400, 'Missing ?id= match id');
  }

  try {
    const detail = await fetchEspnMatchDetail(id, series);
    res.setHeader('Cache-Control', noCache ? 'no-store' : 's-maxage=30, stale-while-revalidate=30');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(detail);
  } catch (e) {
    return sendApiError(res, e?.status === 400 || e?.status === 404 ? e.status : 502, 'Cricket scoreboard unavailable.');
  }
}
