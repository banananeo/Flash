// Vercel serverless proxy for Cricket via RapidAPI (Cricbuzz).
// Why: vite.config.js `server.proxy` only runs on `vite dev` (localhost).
// This function makes /api/cricket work in production and injects the
// RapidAPI key + host server-side so they never ship to the browser.
// Client calls: /api/cricket/live , /api/cricket/detail?id=xxx
// Legacy compat: /api/cricket/cricScore → /live, /match_info?id= → /detail?id=

function getKey() {
  return (
    process.env.VITE_RAPIDAPI_KEY ||
    process.env.RAPIDAPI_KEY ||
    process.env.VITE_RAPIDAPI_CRICKET_KEY ||
    ''
  );
}

function getHost() {
  return (
    process.env.VITE_RAPIDAPI_CRICKET_HOST ||
    process.env.RAPIDAPI_CRICKET_HOST ||
    'cricbuzz-cricket.p.rapidapi.com'
  );
}

function headers(key, host) {
  return {
    'x-rapidapi-key': key,
    'x-rapidapi-host': host,
  };
}

async function fetchUpstream(url, key, host) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 10000);
  try {
    return await fetch(url, { headers: headers(key, host), signal: ctl.signal });
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
  const host = getHost();
  if (!key) {
    return res.status(500).json({
      error:
        'Server missing RapidAPI key. Add VITE_RAPIDAPI_KEY (+ VITE_RAPIDAPI_CRICKET_HOST) in Vercel Dashboard → Settings → Environment Variables, then redeploy.',
    });
  }

  const url = new URL(req.url, 'http://localhost');
  let subpath = url.pathname.replace(/^\/api\/cricket/, '') || '/live';
  if (!subpath.startsWith('/')) subpath = `/${subpath}`;
  // legacy compat
  if (subpath === '/cricScore' || subpath === '/cricScore/') subpath = '/live';
  if (subpath === '/match_info' || subpath === '/match_info/') subpath = '/detail';
  const params = new URLSearchParams(url.searchParams);

  try {
    // ---- LIST: live (fallback recent) ----
    if (subpath === '/live' || subpath === '/') {
      let upstream = await fetchUpstream(`https://${host}/matches/v1/live`, key, host);
      let body = await upstream.text();
      // empty live → try recent so filters/favs still have something to show
      try {
        const parsed = JSON.parse(body);
        const hasAny = JSON.stringify(parsed).includes('matchId');
        if (upstream.ok && !hasAny) {
          const r2 = await fetchUpstream(`https://${host}/matches/v1/recent`, key, host);
          if (r2.ok) {
            upstream = r2;
            body = await r2.text();
          }
        }
      } catch { /* keep live body */ }
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=30');
      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
      return res.status(upstream.status).send(body);
    }

    // ---- DETAIL: scorecard + commentary combined ----
    if (subpath === '/detail') {
      const id = params.get('id') || params.get('matchId');
      if (!id) return res.status(400).json({ error: 'Missing ?id= matchId' });
      const rawId = String(id).replace(/^cr-/, '');
      const [scard, comm] = await Promise.all([
        fetchUpstream(`https://${host}/mcenter/v1/${rawId}/hscard`, key, host),
        fetchUpstream(`https://${host}/mcenter/v1/${rawId}/hcomm`, key, host),
      ]);
      const scardJson = await scard.json().catch(() => null);
      const commJson = await comm.json().catch(() => null);
      if (!scard.ok && !comm.ok) {
        const status = scard.status !== 200 ? scard.status : comm.status;
        return res.status(status).json({ error: `Cricket detail error ${status}` });
      }
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
      return res.status(200).json({ scorecard: scardJson, commentary: commJson });
    }

    return res.status(404).json({ error: `Unknown cricket route ${subpath}. Use /api/cricket/live or /api/cricket/detail?id=` });
  } catch (e) {
    return res.status(502).json({ error: `Cricket upstream unreachable: ${e.message}` });
  }
}
