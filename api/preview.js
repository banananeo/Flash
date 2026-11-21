// Vercel serverless route: GET /api/preview?sport=football|cricket&...
import { fetchEspnFootballPreview, setCors as setFootballCors } from './_football.js';
import { fetchEspnCricketPreview } from './_cricket.js';

export default async function handler(req, res) {
  setFootballCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const url = new URL(req.url, 'http://localhost');
  const params = {
    homeId: url.searchParams.get('homeId') || '',
    awayId: url.searchParams.get('awayId') || '',
    homeName: url.searchParams.get('homeName') || 'Home',
    awayName: url.searchParams.get('awayName') || 'Away',
    date: url.searchParams.get('date') || '',
  };
  const sport = url.searchParams.get('sport') || '';

  try {
    let preview;
    if (sport === 'football') {
      preview = await fetchEspnFootballPreview({
        ...params,
        leagueSlug: url.searchParams.get('league') || '',
      });
    } else if (sport === 'cricket') {
      preview = await fetchEspnCricketPreview({
        ...params,
        seriesId: url.searchParams.get('series') || '',
        format: url.searchParams.get('format') || '',
      });
    } else {
      return res.status(400).json({ error: 'Unsupported preview sport' });
    }

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ provider: 'espn', ...preview });
  } catch (e) {
    return res.status(e?.status || 502).json({ error: e?.message || 'Match preview unavailable' });
  }
}
