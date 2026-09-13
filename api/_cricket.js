// Shared helpers for the CricketData.org (CricAPI) serverless routes.
// Leading `_` = not routed by Vercel (same convention as api/_extract.js).
// Routes: /api/cricket/live (api/cricket/live.js) + /api/cricket/detail (api/cricket/detail.js).
// Key is injected server-side so it never ships to the browser.

export const UPSTREAM = 'https://api.cricapi.com/v1';

export function getKey() {
  return (
    process.env.VITE_CRICKETDATA_KEY ||
    process.env.CRICKETDATA_KEY ||
    process.env.VITE_CRICKETDATA_API_KEY ||
    process.env.CRICAPI_KEY ||
    ''
  );
}

export function missingKeyMessage() {
  return 'Server missing CricketData key. Add VITE_CRICKETDATA_KEY in Vercel Dashboard → Settings → Environment Variables, then redeploy.';
}

export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export async function fetchUpstream(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 10000);
  try {
    return await fetch(url, { signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}
