// Shared article-text extraction (used by api/article.js on Vercel
// and by the vite dev middleware in vite.config.js).
// Input: raw HTML + page URL. Output: { title, byline, paragraphs[], image }
// or throws with a short machine-readable message.
import { parse } from 'node-html-parser';

const MAX_PARAS = 40;
const MAX_CHARS = 9000;

const JUNK_RE =
  /cookie|consent|subscribe|newsletter|sign up|sign in|log in|advertisement|sponsored|related articles?|read (more|also)|also read|share (this|on)|follow us|all rights reserved|terms of (use|service)|privacy policy|account subscription benefits|premium stories, editorials|unlimited digital access/i;

function metaContent(root, ...selectors) {
  for (const sel of selectors) {
    const el = root.querySelector(sel);
    const c = el?.getAttribute?.('content');
    if (c && c.trim()) return c.trim();
  }
  return null;
}

function cleanText(t) {
  return (t || '').replace(/\s+/g, ' ').trim();
}

function extractJsonLdArticleBody(html) {
  const scripts = String(html || '').match(/<script\s[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const s of scripts) {
    const body = s.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '').trim();
    try {
      const parsed = JSON.parse(body);
      const items = Array.isArray(parsed) ? parsed : parsed?.['@graph'] ? parsed['@graph'] : [parsed];
      for (const it of items) {
        const ab = it?.articleBody || it?.text;
        if (typeof ab === 'string' && ab.trim().length > 160) {
          return ab.trim();
        }
      }
    } catch { /* ignore */ }
  }
  return '';
}

export function extractArticle(html, pageUrl) {
  const root = parse(html, { comment: false, blockTextElements: { script: false, style: false, noscript: false } });

  const title =
    metaContent(root, 'meta[property="og:title"]', 'meta[name="twitter:title"]') ||
    cleanText(root.querySelector('h1')?.text) ||
    cleanText(root.querySelector('title')?.text) ||
    'Untitled';

  const byline =
    metaContent(root, 'meta[name="author"]', 'meta[property="article:author"]') ||
    cleanText(root.querySelector('[rel="author"]')?.text) ||
    null;

  const image =
    metaContent(root, 'meta[property="og:image"]', 'meta[name="twitter:image"]') || null;

  // Prefer semantic containers, fall back to all <p>.
  const scopes = ['article', '[itemprop="articleBody"]', 'main', '[role="main"]', '.article-body', '.story-content', '.post-content', '.entry-content'];
  let nodes = [];
  for (const sel of scopes) {
    const scope = root.querySelector(sel);
    if (scope) {
      nodes = scope.querySelectorAll('p');
      if (nodes.length >= 2) break;
    }
  }
  if (nodes.length < 2) nodes = root.querySelectorAll('p');

  const paragraphs = [];
  let chars = 0;
  for (const n of nodes) {
    const t = cleanText(n.text);
    if (t.length < 55) continue; // skip captions/nav/bylines
    if (JUNK_RE.test(t.slice(0, 140))) continue;
    // skip paragraphs inside nav/footer/aside/forms
    let el = n.parentNode;
    let nested = false;
    for (let d = 0; d < 4 && el; d++, el = el.parentNode) {
      const tag = String(el.tagName || '').toLowerCase();
      if (['nav', 'footer', 'aside', 'form', 'header'].includes(tag)) { nested = true; break; }
    }
    if (nested) continue;
    paragraphs.push(t);
    chars += t.length;
    if (paragraphs.length >= MAX_PARAS || chars >= MAX_CHARS) break;
  }

  // Fallback to JSON-LD articleBody when DOM <p> tags yield fewer than 3 paragraphs
  if (paragraphs.length < 3) {
    const ldBody = extractJsonLdArticleBody(html);
    if (ldBody) {
      const chunks = ldBody
        .split(/\n{2,}|\r\n\r\n|(?<=[.?!])\s+(?=[A-Z"“])/)
        .map(cleanText)
        .filter((p) => p.length >= 55 && !JUNK_RE.test(p.slice(0, 140)));
      const seen = new Set(paragraphs);
      for (const c of chunks) {
        if (seen.has(c)) continue;
        seen.add(c);
        paragraphs.push(c);
        chars += c.length;
        if (paragraphs.length >= MAX_PARAS || chars >= MAX_CHARS) break;
      }
    }
  }

  // Last-resort fallback to og:description so reader never fails with an empty error
  if (!paragraphs.length) {
    const ogDesc = metaContent(root, 'meta[property="og:description"]', 'meta[name="description"]');
    if (ogDesc && ogDesc.length >= 40) {
      paragraphs.push(cleanText(ogDesc));
    }
  }

  if (!paragraphs.length) {
    const err = new Error('PAYWALL_OR_EMPTY: no readable paragraphs found');
    err.code = 'PAYWALL_OR_EMPTY';
    throw err;
  }

  return { title: title.slice(0, 200), byline, image, paragraphs, url: pageUrl };
}

// Basic SSRF guard shared by api/article.js and the vite dev middleware:
// only public http(s), never loopback / link-local / cloud metadata.
export function assertPublicHttpUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    throw Object.assign(new Error('BAD_URL'), { status: 400 });
  }
  if (!['http:', 'https:'].includes(u.protocol)) {
    throw Object.assign(new Error('BAD_URL: http(s) only'), { status: 400 });
  }
  const host = u.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === 'metadata.google.internal' ||
    host.endsWith('.internal') ||
    host.endsWith('.local') ||
    /^127\./.test(host) ||
    host === '::1' ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^0\.0\.0\.0$/.test(host)
  ) {
    throw Object.assign(new Error('BLOCKED_HOST'), { status: 400 });
  }
  return u.toString();
}
