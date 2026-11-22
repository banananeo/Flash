// Vercel serverless route: GET /api/news?category=technology[&region=in|global][&q=search][&max=10]
import { getNews } from './_news.js';
import { applyApiSecurity, sendApiError } from './_security.js';

export default async function handler(req, res) {
  if (applyApiSecurity(req, res)) return;

  const url = new URL(req.url, 'http://localhost');
  const category = String(url.searchParams.get('category') || 'all').slice(0, 32);
  const region = String(url.searchParams.get('region') || 'in').slice(0, 12);
  const q = String(url.searchParams.get('q') || '').slice(0, 120);
  const max = url.searchParams.get('max') || '10';

  try {
    const articles = await getNews({ category, q, max, region });
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      provider: q ? 'search' : region === 'global' ? 'global' : 'india-regional',
      region: region === 'global' ? 'global' : 'in',
      articles,
    });
  } catch (e) {
    return sendApiError(res, e?.status === 504 ? 504 : 502, 'News feed temporarily unavailable.');
  }
}
