// Shared API security & validation helpers.
// Leading `_` = helper module, not counted as a Vercel serverless function.

function normalizeOrigin(origin = '') {
  try {
    const u = new URL(origin);
    return `${u.protocol}//${u.host}`.toLowerCase();
  } catch {
    return '';
  }
}

function isAllowedOrigin(req, origin) {
  if (!origin) return false;
  const norm = normalizeOrigin(origin);
  if (!norm) return false;
  try {
    const u = new URL(norm);
    const reqHost = String(req?.headers?.['x-forwarded-host'] || req?.headers?.host || '').toLowerCase();
    if (reqHost && u.host.toLowerCase() === reqHost) return true;
    // Allow local dev origins
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true;
  } catch {
    return false;
  }
  return false;
}

/**
 * Applies security headers, same-origin CORS policy, and GET/OPTIONS method enforcement.
 * Returns `true` if the request was already terminated (OPTIONS or 405), `false` to continue.
 */
export function applyApiSecurity(req, res, { allowCrossOrigin = false } = {}) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const origin = req?.headers?.origin || '';
  if (allowCrossOrigin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (isAllowedOrigin(req, origin)) {
    res.setHeader('Access-Control-Allow-Origin', normalizeOrigin(origin));
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Cache-Control', 'no-store');
    res.status(405).json({ error: 'Method not allowed' });
    return true;
  }
  return false;
}

export function isSafeSlug(val, maxLen = 64) {
  const s = String(val || '').trim();
  if (!s || s.length > maxLen) return false;
  if (s.includes('..') || s.includes('/') || s.includes('\\')) return false;
  return /^[a-z0-9._-]+$/i.test(s);
}

export function isNumericId(val, maxLen = 24) {
  const s = String(val || '').trim();
  return s.length > 0 && s.length <= maxLen && /^\d+$/.test(s);
}

export function clampText(val, maxLen = 120) {
  return String(val || '').trim().slice(0, maxLen);
}

export function sendApiError(res, status, message) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  return res.status(status).json({ error: message });
}
