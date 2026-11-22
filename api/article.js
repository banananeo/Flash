// Vercel serverless full-article extraction with hardened SSRF & DoS protection.
// GET /api/article?url=<encoded publisher URL>
import { extractArticle, assertPublicHttpUrl, fetchSafePublicHtml } from './_extract.js';
import { fetchEspnStory } from './_news.js';
import { applyApiSecurity, sendApiError } from './_security.js';

export default async function handler(req, res) {
  if (applyApiSecurity(req, res)) return;

  const urlObj = new URL(req.url, 'http://localhost');
  const raw = urlObj.searchParams.get('url') || '';
  if (!raw) {
    return sendApiError(res, 400, 'Missing ?url=');
  }

  let target;
  try {
    target = assertPublicHttpUrl(raw);
  } catch (e) {
    return sendApiError(res, e.status || 400, e.message === 'BLOCKED_HOST' ? 'Blocked host' : 'Invalid article URL');
  }

  try {
    // JS-rendered sports stories fast path
    const espn = await fetchEspnStory(target).catch(() => null);
    if (espn) {
      res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=300');
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json(espn);
    }

    const { html, finalUrl } = await fetchSafePublicHtml(target, { timeoutMs: 8000 });
    if (!/^\s*</.test(html) || html.length < 1200) {
      return sendApiError(res, 502, 'Publisher returned an unreadable page.');
    }
    const article = extractArticle(html, finalUrl);
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=300');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(article);
  } catch (e) {
    if (e?.status === 402 || e?.code === 'PAYWALL_OR_EMPTY' || /PAYWALL_OR_EMPTY/.test(e?.message || '')) {
      return sendApiError(res, 402, 'PAYWALLED_OR_JS: full text needs the original page — open it instead.');
    }
    if (e?.status === 400) {
      return sendApiError(res, 400, 'Blocked or invalid article URL.');
    }
    if (e?.name === 'AbortError') {
      return sendApiError(res, 504, 'Publisher timed out — open the original instead.');
    }
    return sendApiError(res, e?.status === 413 ? 413 : 502, 'Could not extract article text.');
  }
}
