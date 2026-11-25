// Vercel serverless route: GET /api/football/standings?league=eng.1|uefa.champions
import { fetchEspnFootballStandings, sanitizeLeagueParam } from '../_football.js';
import { applyApiSecurity, sendApiError } from '../_security.js';

export default async function handler(req, res) {
  if (applyApiSecurity(req, res)) return;

  const url = new URL(req.url, 'http://localhost');
  const noCache = url.searchParams.has('t');

  try {
    const league =
      sanitizeLeagueParam(url.searchParams.get('league') || url.searchParams.get('leagueSlug')) ||
      'eng.1';
    const data = await fetchEspnFootballStandings(league);
    res.setHeader(
      'Cache-Control',
      noCache ? 'no-store' : 's-maxage=120, stale-while-revalidate=300',
    );
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(data);
  } catch (e) {
    const status = e?.status === 400 || e?.status === 404 ? e.status : 502;
    return sendApiError(
      res,
      status,
      status === 400 ? e.message : 'Football standings temporarily unavailable.',
    );
  }
}
