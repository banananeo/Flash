// Vercel serverless proxy for CricAPI.
// Why: vite.config.js `server.proxy` only runs on `vite dev` (localhost).
// On Vercel production /api/cricket/* 404s → client falls back to direct
// browser fetch with the key in the URL. This function makes /api/cricket
// work in production and injects the key server-side.
// Client calls: /api/cricket/cricScore , /api/cricket/match_info?id=xxx
// (endpoint name without the /v1 prefix; key injected here).

function getKey() {
  return (
    process.env.VITE_CRICAPI ||
    process.env.VITE_CRICAPI_KEY ||
    process.env.CRICAPI_KEY ||
    process.env.CRICAPI ||
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
        'Server missing cricket key. Add VITE_CRICAPI in Vercel Dashboard → Settings → Environment Variables, then redeploy.',
    });
  }

  const url = new URL(req.url, 'http://localhost');
  let subpath = url.pathname.replace(/^\/api\/cricket/, '') || '/cricScore';
  if (!subpath.startsWith('/')) subpath = `/${subpath}`;
  const params = new URLSearchParams(url.searchParams);
  if (!params.has('apikey')) params.set('apikey', key);
  const upstreamUrl = `https://api.cricapi.com/v1${subpath}?${params}`;

  try {
    const upstream = await fetch(upstreamUrl);
    const body = await upstream.text();
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=30');
    return res.status(upstream.status).send(body);
  } catch (e) {
    return res.status(502).json({ error: `Cricket upstream unreachable: ${e.message}` });
  }
}
