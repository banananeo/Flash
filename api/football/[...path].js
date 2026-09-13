// Vercel serverless proxy for API-Football.
// Why: vite.config.js `server.proxy` only runs on `vite dev` (localhost).
// On Vercel production /api/football/* 404s → client falls back to direct
// browser fetch which needs the key in the bundle + can throw "Failed to fetch".
// This function makes /api/football work in production and keeps the key server-side.
// Client calls: /api/football/fixtures?live=all , /api/football/fixtures/events?fixture=123
// Key sent upstream as x-apisports-key header.

function getKey() {
  return (
    process.env.VITE_FOOTBALL ||
    process.env.VITE_FOOTBALL_API_KEY ||
    process.env.FOOTBALL_API_KEY ||
    process.env.API_FOOTBALL_KEY ||
    ''
  );
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-apisports-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = getKey();
  if (!key) {
    return res.status(500).json({
      error:
        'Server missing football key. Add VITE_FOOTBALL in Vercel Dashboard → Settings → Environment Variables, then redeploy.',
    });
  }

  // Everything after /api/football is forwarded, e.g. ?path=/fixtures?live=all
  // Vercel gives us req.query with the query string; req.url holds the full path.
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname.replace(/^\/api\/football/, '') || '/fixtures';
  const upstreamUrl = `https://v3.football.api-sports.io${pathname}${url.search}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { 'x-apisports-key': key },
    });
    const body = await upstream.text();
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=30');
    return res.status(upstream.status).send(body);
  } catch (e) {
    return res.status(502).json({ error: `Football upstream unreachable: ${e.message}` });
  }
}
