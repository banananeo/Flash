// Vercel serverless full-article extraction.
// Why server-side: publisher pages block cross-origin browser fetches (CORS),
// so the browser can never scrape them directly. The client calls:
//   GET /api/article?url=<encoded publisher URL>
// Response: { title, byline, image, paragraphs[], url }
// Failures (paywall/403/timeout/SSRF-block) return 4xx/502 JSON — the client
// then falls back to summary + "Open original" link, never a blank modal.
import { extractArticle, assertPublicHttpUrl as assertPublicUrl } from './_extract.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const raw = req.query?.url;
  if (!raw || typeof raw !== 'string') {
    return res.status(400).json({ error: 'Missing ?url=' });
  }

  let target;
  try {
    target = assertPublicUrl(raw);
  } catch (e) {
    return res.status(e.status || 400).json({ error: e.message });
  }

  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 12000);
    let upstream;
    try {
      upstream = await fetch(target, {
        signal: ctl.signal,
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
      });
    } finally {
      clearTimeout(t);
    }
    if (upstream.status === 401 || upstream.status === 403) {
      return res.status(402).json({ error: 'PAYWALLED: publisher blocks readers — open the original instead.' });
    }
    if (!upstream.ok) {
      return res.status(502).json({ error: `Publisher returned ${upstream.status}` });
    }
    const html = await upstream.text();
    if (!/^\s*</.test(html) || html.length < 2000) {
      return res.status(502).json({ error: 'Publisher returned an unreadable page.' });
    }
    const article = extractArticle(html, upstream.url || target);
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=300');
    return res.status(200).json(article);
  } catch (e) {
    if (e?.code === 'PAYWALL_OR_EMPTY' || /PAYWALL_OR_EMPTY/.test(e?.message || '')) {
      return res.status(402).json({ error: 'PAYWALLED_OR_JS: full text needs the original page — open it instead.' });
    }
    if (e?.name === 'AbortError') {
      return res.status(504).json({ error: 'Publisher timed out — open the original instead.' });
    }
    return res.status(502).json({ error: `Extraction failed: ${e.message}` });
  }
}
