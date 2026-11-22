// Vercel serverless route: GET /api/preview?sport=football|cricket&...
import { fetchEspnFootballPreview } from './_football.js';
import { fetchEspnCricketPreview } from './_cricket.js';
import { applyApiSecurity, clampText, sendApiError } from './_security.js';

export default async function handler(req, res) {
  if (applyApiSecurity(req, res)) return;

  const url = new URL(req.url, 'http://localhost');
  const params = {
    homeId: clampText(url.searchParams.get('homeId'), 24),
    awayId: clampText(url.searchParams.get('awayId'), 24),
    homeName: clampText(url.searchParams.get('homeName') || 'Home', 80),
    awayName: clampText(url.searchParams.get('awayName') || 'Away', 80),
    date: clampText(url.searchParams.get('date'), 40),
  };
  const sport = clampText(url.searchParams.get('sport'), 16).toLowerCase();

  try {
    let preview;
    if (sport === 'football') {
      preview = await fetchEspnFootballPreview({
        ...params,
        leagueSlug: clampText(url.searchParams.get('league'), 48),
      });
    } else if (sport === 'cricket') {
      preview = await fetchEspnCricketPreview({
        ...params,
        seriesId: clampText(url.searchParams.get('series'), 48),
        format: clampText(url.searchParams.get('format'), 24),
      });
    } else {
      return sendApiError(res, 400, 'Unsupported preview sport');
    }

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(preview);
  } catch (e) {
    return sendApiError(res, e?.status === 400 ? 400 : 502, 'Match preview unavailable.');
  }
}
