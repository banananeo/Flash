// Vercel serverless route: GET /api/cricket/live
// Passthrough to CricketData.org currentMatches; key injected server-side.
// (Single-file api/cricket.js could not serve subpaths on Vercel —
// each file routes exactly, so /live and /detail are separate files.)
import { UPSTREAM, getKey, missingKeyMessage, setCors, fetchUpstream } from '../_cricket.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = getKey();
  if (!key) {
    return res.status(500).json({ error: missingKeyMessage() });
  }

  const url = new URL(req.url, 'http://localhost');
  const offset = url.searchParams.get('offset') || '0';

  try {
    const upstream = await fetchUpstream(
      `${UPSTREAM}/currentMatches?apikey=${encodeURIComponent(key)}&offset=${encodeURIComponent(offset)}`
    );
    const body = await upstream.text();
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=30');
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    return res.status(upstream.status).send(body);
  } catch (e) {
    return res.status(502).json({ error: `Cricket upstream unreachable: ${e.message}` });
  }
}
