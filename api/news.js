// Vercel serverless route: GET /api/news?category=technology[&q=search][&max=10]
// Keyless: BBC RSS (categories), ESPN news JSON (sports), Google News RSS (search).
// No env vars needed. See api/_news.js.
import { setCors, getNews } from './_news.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, 'http://localhost');
  const category = String(url.searchParams.get('category') || 'all');
  const q = String(url.searchParams.get('q') || '');
  const max = url.searchParams.get('max') || '10';

  try {
    const articles = await getNews({ category, q, max });
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ provider: q ? 'google-news' : category === 'sports' ? 'espn' : 'bbc', articles });
  } catch (e) {
    return res.status(e?.status || 502).json({ error: `News upstream unreachable: ${e?.message || 'Unknown error'}` });
  }
}
