// Vercel serverless route: GET /api/cricket/detail?id=<matchId>&series=<seriesId>
// Backed by ESPN Cricket summary + playbyplay public JSON APIs (no API key).
import { setCors, fetchEspnMatchDetail } from '../_cricket.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, 'http://localhost');
  const id = url.searchParams.get('id') || url.searchParams.get('matchId');
  const series = url.searchParams.get('series') || url.searchParams.get('seriesId') || '';

  if (!id) {
    return res.status(400).json({ error: 'Missing ?id= ESPN match id' });
  }

  try {
    const detail = await fetchEspnMatchDetail(id, series);
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=30');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(detail);
  } catch (e) {
    return res.status(e?.status || 502).json({
      error: e?.message || 'ESPN Cricket detail failed',
    });
  }
}
