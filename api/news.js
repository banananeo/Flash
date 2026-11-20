// Vercel serverless route: GET /api/news?category=technology[&region=in|global][&q=search][&max=10]
// Keyless: India Regional Edition (The Hindu + NDTV + BBC India) by default, or Global Edition (BBC + ESPN).
import { setCors, getNews } from './_news.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, 'http://localhost');
  const category = String(url.searchParams.get('category') || 'all');
  const region = String(url.searchParams.get('region') || 'in');
  const q = String(url.searchParams.get('q') || '');
  const max = url.searchParams.get('max') || '10';

  try {
    const articles = await getNews({ category, q, max, region });
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      provider: q ? 'google-news-in' : region === 'global' ? 'bbc' : 'india-regional',
      region,
      articles,
    });
  } catch (e) {
    return res.status(e?.status || 502).json({ error: `News upstream unreachable: ${e?.message || 'Unknown error'}` });
  }
}
