// Vercel serverless route: GET /api/f1standings?kind=...
// Passthrough to Jolpica F1 (Ergast-compatible). Single file, query-routed:
// api.jolpi.ca sends no CORS headers, so the browser must stay same-origin.
//   kind=drivers|constructors → /ergast/f1/current/{driver,constructor}standings/
//   kind=schedule             → /ergast/f1/current/ (23-round calendar + sessions)
//   kind=results&round=N|last → /ergast/f1/current/{N}/results/
//   kind=qualifying&round=N|last → /ergast/f1/current/{N}/qualifying/

const UPSTREAM = 'https://api.jolpi.ca/ergast/f1/current';

const ROUND_RE = /^(\d{1,2}|last)$/;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, 'http://localhost');
  const kind = url.searchParams.get('kind') || 'drivers';

  let path = '';
  let cache = 's-maxage=3600, stale-while-revalidate=600';
  if (kind === 'constructors') {
    path = '/constructorstandings/';
  } else if (kind === 'schedule') {
    path = '/';
    cache = 's-maxage=86400, stale-while-revalidate=3600';
  } else if (kind === 'results' || kind === 'qualifying') {
    const round = url.searchParams.get('round') || 'last';
    if (!ROUND_RE.test(round)) return res.status(400).json({ error: 'Bad ?round= — use a number or last' });
    path = `/${round}/${kind}/`;
    cache = 's-maxage=900, stale-while-revalidate=300';
  } else {
    path = '/driverstandings/';
  }

  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 15000);
    let upstream;
    try {
      upstream = await fetch(`${UPSTREAM}${path}`, {
        signal: ctl.signal,
        headers: { Accept: 'application/json' },
      });
    } finally {
      clearTimeout(t);
    }
    const body = await upstream.text();
    res.setHeader('Cache-Control', cache);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    return res.status(upstream.status).send(body);
  } catch (e) {
    return res.status(502).json({ error: `F1 upstream unreachable: ${e.message}` });
  }
}
