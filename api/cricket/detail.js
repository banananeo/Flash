// Vercel serverless route: GET /api/cricket/detail?id=<uuid>
// Passthrough to CricketData.org match_info (free tier); key injected server-side.
import { UPSTREAM, getKey, missingKeyMessage, setCors, fetchUpstream } from '../_cricket.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = getKey();
  if (!key) {
    return res.status(500).json({ error: missingKeyMessage() });
  }

  const url = new URL(req.url, 'http://localhost');
  const id = url.searchParams.get('id') || url.searchParams.get('matchId');
  if (!id) return res.status(400).json({ error: 'Missing ?id= match id (uuid)' });
  const rawId = String(id).replace(/^cr-/, '');

  try {
    const upstream = await fetchUpstream(
      `${UPSTREAM}/match_info?apikey=${encodeURIComponent(key)}&id=${encodeURIComponent(rawId)}`
    );
    const body = await upstream.text();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    return res.status(upstream.status).send(body);
  } catch (e) {
    return res.status(502).json({ error: `Cricket upstream unreachable: ${e.message}` });
  }
}
