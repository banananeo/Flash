// Vercel serverless route: GET /api/football/detail?id=<eventId>&league=<leagueSlug>
// Backed by ESPN Soccer summary public JSON API (no API key).
import { setCors, fetchEspnFootballDetail } from '../_football.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, 'http://localhost');
  const id = url.searchParams.get('id') || url.searchParams.get('fixture');
  const league = url.searchParams.get('league') || url.searchParams.get('leagueSlug') || '';

  if (!id) {
    return res.status(400).json({ error: 'Missing ?id= ESPN football event id' });
  }

  try {
    const detail = await fetchEspnFootballDetail(id, league);
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=30');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(detail);
  } catch (e) {
    return res.status(e?.status || 502).json({
      error: e?.message || 'ESPN Football detail failed',
    });
  }
}
