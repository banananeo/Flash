// Vercel serverless proxy for Cricket via CricketData.org (CricAPI).
// Why: vite.config.js `server.proxy` only runs on `vite dev` (localhost).
// This function makes /api/cricket work in production and injects the
// CricketData key server-side so it never ships to the browser.
// Client calls: /api/cricket/live , /api/cricket/detail?id=<uuid>
// Upstream: https://api.cricapi.com/v1/currentMatches + /match_info

const UPSTREAM = 'https://api.cricapi.com/v1';

function getKey() {
  return (
    process.env.VITE_CRICKETDATA_KEY ||
    process.env.CRICKETDATA_KEY ||
    process.env.VITE_CRICKETDATA_API_KEY ||
    process.env.CRICAPI_KEY ||
    ''
  );
}

async function fetchUpstream(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 10000);
  try {
    return await fetch(url, { signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
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
        'Server missing CricketData key. Add VITE_CRICKETDATA_KEY in Vercel Dashboard → Settings → Environment Variables, then redeploy.',
    });
  }

  const url = new URL(req.url, 'http://localhost');
  let subpath = url.pathname.replace(/^\/api\/cricket/, '') || '/live';
  if (!subpath.startsWith('/')) subpath = `/${subpath}`;
  // legacy compat (old RapidAPI/Cricbuzz routes)
  if (subpath === '/cricScore' || subpath === '/cricScore/') subpath = '/live';
  if (subpath === '/match_info' || subpath === '/match_info/') subpath = '/detail';
  const params = new URLSearchParams(url.searchParams);

  try {
    // ---- LIST: current matches ----
    if (subpath === '/live' || subpath === '/') {
      const offset = params.get('offset') || '0';
      const upstream = await fetchUpstream(
        `${UPSTREAM}/currentMatches?apikey=${encodeURIComponent(key)}&offset=${encodeURIComponent(offset)}`
      );
      const body = await upstream.text();
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=30');
      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
      return res.status(upstream.status).send(body);
    }

    // ---- DETAIL: single match info (free tier, same Match shape) ----
    if (subpath === '/detail') {
      const id = params.get('id') || params.get('matchId');
      if (!id) return res.status(400).json({ error: 'Missing ?id= match id (uuid)' });
      const rawId = String(id).replace(/^cr-/, '');
      const upstream = await fetchUpstream(
        `${UPSTREAM}/match_info?apikey=${encodeURIComponent(key)}&id=${encodeURIComponent(rawId)}`
      );
      const body = await upstream.text();
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
      return res.status(upstream.status).send(body);
    }

    return res.status(404).json({ error: `Unknown cricket route ${subpath}. Use /api/cricket/live or /api/cricket/detail?id=` });
  } catch (e) {
    return res.status(502).json({ error: `Cricket upstream unreachable: ${e.message}` });
  }
}
