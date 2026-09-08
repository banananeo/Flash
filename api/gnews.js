// Vercel serverless proxy for GNews.
// Why: Vite dev proxy (vite.config.js server.proxy) does NOT exist in
// production, and direct browser calls to gnews.io expose the key + can hit
// CORS/ad-blocker "Failed to fetch" errors. Same-origin /api/gnews fixes both.
// Client calls: /api/gnews?category=sports&max=10  (or lang/country/max)
// Key is read server-side from env (never shipped to client).

const GNEWS_CATEGORY = new Set([
  'general',
  'business',
  'technology',
  'science',
  'health',
  'sports',
  'entertainment',
]);

function getKey() {
  return (
    process.env.VITE_GNEWS ||
    process.env.GNEWS_API_KEY ||
    process.env.GNEWS ||
    ''
  );
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = getKey();
  if (!key) {
    return res.status(500).json({
      error:
        'Server missing GNews key. Add VITE_GNEWS in Vercel Dashboard → Settings → Environment Variables, then redeploy.',
    });
  }

  const q = req.query || {};
  const params = new URLSearchParams({
    lang: typeof q.lang === 'string' && q.lang ? q.lang : 'en',
    country: typeof q.country === 'string' && q.country ? q.country : 'us',
    max: typeof q.max === 'string' && q.max ? q.max : '10',
    apikey: key,
  });
  if (typeof q.category === 'string' && GNEWS_CATEGORY.has(q.category)) {
    params.set('category', q.category);
  }
  // free-text search passthrough (optional)
  if (typeof q.q === 'string' && q.q) params.set('q', q.q);

  try {
    const upstream = await fetch(`https://gnews.io/api/v4/top-headlines?${params}`);
    const body = await upstream.text();
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=60');
    return res.status(upstream.status).send(body);
  } catch (e) {
    return res.status(502).json({ error: `GNews upstream unreachable: ${e.message}` });
  }
}
