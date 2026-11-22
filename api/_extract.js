// Shared article-text extraction & hardened SSRF-safe HTML fetcher
// (used by api/article.js on Vercel and the Vite dev middleware in vite.config.js).
// Input: raw HTML + page URL. Output: { title, byline, paragraphs[], image, url }
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { parse } from 'node-html-parser';

const MAX_PARAS = 40;
const MAX_CHARS = 9000;
const MAX_HTML_BYTES = 1_500_000; // 1.5 MB cap prevents OOM DoS
const MAX_REDIRECTS = 4;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

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

function resolveSafePublicImage(raw, pageUrl) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const u = new URL(raw.trim(), pageUrl);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (u.username || u.password) return null;
    if (isBlockedHostname(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function extractJsonLdArticleBody(html) {
  const scripts =
    String(html || '').match(/<script\s[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const s of scripts.slice(0, 10)) {
    const body = s.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '').trim();
    if (body.length > 250_000) continue;
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
  const safeHtml = String(html || '').slice(0, MAX_HTML_BYTES);
  const root = parse(safeHtml, {
    comment: false,
    blockTextElements: { script: false, style: false, noscript: false },
  });

  const title =
    metaContent(root, 'meta[property="og:title"]', 'meta[name="twitter:title"]') ||
    cleanText(root.querySelector('h1')?.text) ||
    cleanText(root.querySelector('title')?.text) ||
    'Untitled';

  const byline =
    metaContent(root, 'meta[name="author"]', 'meta[property="article:author"]') ||
    cleanText(root.querySelector('[rel="author"]')?.text) ||
    null;

  const rawImage =
    metaContent(root, 'meta[property="og:image"]', 'meta[name="twitter:image"]') || null;
  const image = resolveSafePublicImage(rawImage, pageUrl);

  // Prefer semantic containers, fall back to all <p>.
  const scopes = [
    'article',
    '[itemprop="articleBody"]',
    'main',
    '[role="main"]',
    '.article-body',
    '.story-content',
    '.post-content',
    '.entry-content',
  ];
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
    if (t.length < 55) continue;
    if (JUNK_RE.test(t.slice(0, 140))) continue;
    let el = n.parentNode;
    let nested = false;
    for (let d = 0; d < 4 && el; d++, el = el.parentNode) {
      const tag = String(el.tagName || '').toLowerCase();
      if (['nav', 'footer', 'aside', 'form', 'header'].includes(tag)) {
        nested = true;
        break;
      }
    }
    if (nested) continue;
    paragraphs.push(t);
    chars += t.length;
    if (paragraphs.length >= MAX_PARAS || chars >= MAX_CHARS) break;
  }

  // Fallback to JSON-LD articleBody when DOM <p> tags yield fewer than 3 paragraphs
  if (paragraphs.length < 3) {
    const ldBody = extractJsonLdArticleBody(safeHtml);
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

  return {
    title: title.slice(0, 200),
    byline: byline ? byline.slice(0, 120) : null,
    image,
    paragraphs,
    url: pageUrl,
  };
}

// ---------- Hardened SSRF Protection (Hostname + IPv4/IPv6 + DNS + Redirect hops) ----------

function isPrivateIpv4(ip) {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8 (RFC1918)
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT / Tailscale / cloud)
  if (a === 127) return true; // 127.0.0.0/8 (Loopback)
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 (Link-local & Cloud Metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 (RFC1918)
  if (a === 192 && b === 0 && (parts[2] === 0 || parts[2] === 2)) return true; // IETF / TEST-NET-1
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 (RFC1918)
  if (a === 198 && (b === 18 || b === 19)) return true; // Benchmark
  if (a === 198 && b === 51 && parts[2] === 100) return true; // TEST-NET-2
  if (a === 203 && b === 0 && parts[2] === 113) return true; // TEST-NET-3
  if (a >= 224) return true; // Multicast & Reserved (224.0.0.0/4+)
  return false;
}

function expandIpv6ToWords(rawIp) {
  let ip = String(rawIp || '').trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!ip || ip.includes('%')) return null; // Reject zone indices (%eth0)

  // Convert trailing dotted-quad IPv4 (e.g. ::ffff:127.0.0.1 or 64:ff9b::10.0.0.1) into 2 hex words
  const lastColon = ip.lastIndexOf(':');
  if (lastColon !== -1 && ip.slice(lastColon + 1).includes('.')) {
    const v4Part = ip.slice(lastColon + 1);
    const nums = v4Part.split('.').map((n) => Number(n));
    if (nums.length !== 4 || nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
      return null;
    }
    const wHi = ((nums[0] << 8) | nums[1]).toString(16);
    const wLo = ((nums[2] << 8) | nums[3]).toString(16);
    ip = `${ip.slice(0, lastColon + 1)}${wHi}:${wLo}`;
  }

  const dblParts = ip.split('::');
  if (dblParts.length > 2) return null;

  const parseSide = (side) => {
    if (!side) return [];
    const tokens = side.split(':');
    const out = [];
    for (const tok of tokens) {
      if (!/^[0-9a-f]{1,4}$/.test(tok)) return null;
      out.push(parseInt(tok, 16));
    }
    return out;
  };

  if (dblParts.length === 1) {
    const words = parseSide(dblParts[0]);
    return words && words.length === 8 ? words : null;
  }

  const left = parseSide(dblParts[0]);
  const right = parseSide(dblParts[1]);
  if (!left || !right || left.length + right.length >= 8) return null;
  const zeros = new Array(8 - left.length - right.length).fill(0);
  return [...left, ...zeros, ...right];
}

function wordsToIpv4(wHi, wLo) {
  return `${(wHi >> 8) & 255}.${wHi & 255}.${(wLo >> 8) & 255}.${wLo & 255}`;
}

export function isPrivateIp(rawIp) {
  const ip = String(rawIp || '').trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (ip.includes('%')) return true;
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) {
    const w = expandIpv6ToWords(ip);
    if (!w) return true;
    const isFirst5Zero = w[0] === 0 && w[1] === 0 && w[2] === 0 && w[3] === 0 && w[4] === 0;
    // Unspecified (::) or Loopback (::1) or IPv4-compatible (::x.y.z.w)
    if (isFirst5Zero && w[5] === 0) {
      if (w[6] === 0 && (w[7] === 0 || w[7] === 1)) return true;
      return isPrivateIpv4(wordsToIpv4(w[6], w[7]));
    }
    // IPv4-mapped IPv6 (::ffff:0:0/96) or SIIT IPv4-translated (::ffff:0:0:0/96)
    if (isFirst5Zero && w[5] === 0xffff) {
      return isPrivateIpv4(wordsToIpv4(w[6], w[7]));
    }
    if (w[0] === 0 && w[1] === 0 && w[2] === 0 && w[3] === 0 && w[4] === 0xffff && w[5] === 0) {
      return isPrivateIpv4(wordsToIpv4(w[6], w[7]));
    }
    // NAT64 well-known prefix (64:ff9b::/96 or 64:ff9b:1::/48)
    if (w[0] === 0x0064 && w[1] === 0xff9b) {
      return isPrivateIpv4(wordsToIpv4(w[6], w[7]));
    }
    // 6to4 (2002::/16) embeds IPv4 in w[1], w[2]
    if (w[0] === 0x2002) {
      return isPrivateIpv4(wordsToIpv4(w[1], w[2]));
    }
    // Teredo (2001:0000::/32), Documentation (2001:0db8::/32), Benchmarking (2001:0002::/48)
    if (w[0] === 0x2001 && (w[1] === 0x0000 || w[1] === 0x0db8 || w[1] === 0x0002)) {
      return true;
    }
    // Discard-Only Address Block (0100::/64)
    if (w[0] === 0x0100 && w[1] === 0 && w[2] === 0 && w[3] === 0) return true;
    // Unique local (fc00::/7), link-local (fe80::/10), deprecated site-local (fec0::/10), multicast (ff00::/8)
    if ((w[0] & 0xfe00) === 0xfc00) return true; // fc00::/7
    if ((w[0] & 0xffc0) === 0xfe80) return true; // fe80::/10
    if ((w[0] & 0xffc0) === 0xfec0) return true; // fec0::/10
    if ((w[0] & 0xff00) === 0xff00) return true; // ff00::/8
    return false;
  }
  return true;
}

function isBlockedHostname(rawHost) {
  const host = String(rawHost || '').trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!host || host.length > 253) return true;
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === 'metadata.google.internal' ||
    host === 'metadata.goog' ||
    host.endsWith('.internal') ||
    host.endsWith('.local') ||
    host.endsWith('.arpa') ||
    host.endsWith('.home') ||
    host.endsWith('.corp') ||
    host.endsWith('.lan')
  ) {
    return true;
  }
  if (isIP(host)) return isPrivateIp(host);
  // Reject numeric-only / octal / hex obfuscated IPv4 forms (e.g. 2130706433, 0x7f000001, 0177.0.0.1)
  if (/^(0x[0-9a-f]+|\d+)$/i.test(host)) return true;
  if (/^[0-9a-fx.]+$/i.test(host) && host.includes('.')) return true;
  // Require at least one dot for public DNS hostnames
  if (!host.includes('.')) return true;
  return false;
}

export function assertPublicHttpUrl(raw) {
  if (typeof raw !== 'string' || !raw.trim() || raw.length > 2048) {
    throw Object.assign(new Error('BAD_URL'), { status: 400 });
  }
  let u;
  try {
    u = new URL(raw.trim());
  } catch {
    throw Object.assign(new Error('BAD_URL'), { status: 400 });
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw Object.assign(new Error('BAD_URL: http(s) only'), { status: 400 });
  }
  if (u.username || u.password) {
    throw Object.assign(new Error('BLOCKED_URL'), { status: 400 });
  }
  if (u.port && u.port !== '80' && u.port !== '443') {
    throw Object.assign(new Error('BLOCKED_PORT'), { status: 400 });
  }
  if (isBlockedHostname(u.hostname)) {
    throw Object.assign(new Error('BLOCKED_HOST'), { status: 400 });
  }
  return u.toString();
}

export async function assertPublicDns(urlStr) {
  const safeUrl = assertPublicHttpUrl(urlStr);
  const { hostname } = new URL(safeUrl);
  const bare = hostname.replace(/^\[|\]$/g, '');
  if (isIP(bare)) {
    if (isPrivateIp(bare)) throw Object.assign(new Error('BLOCKED_HOST'), { status: 400 });
    return safeUrl;
  }
  let records;
  try {
    records = await lookup(bare, { all: true, verbatim: true });
  } catch {
    throw Object.assign(new Error('UNRESOLVED_HOST'), { status: 502 });
  }
  if (!Array.isArray(records) || !records.length) {
    throw Object.assign(new Error('UNRESOLVED_HOST'), { status: 502 });
  }
  for (const rec of records) {
    if (isPrivateIp(rec.address)) {
      throw Object.assign(new Error('BLOCKED_HOST'), { status: 400 });
    }
  }
  return safeUrl;
}

async function readTextLimited(res, maxBytes = MAX_HTML_BYTES) {
  const lenHeader = Number(res.headers.get('content-length') || 0);
  if (Number.isFinite(lenHeader) && lenHeader > maxBytes * 2) {
    throw Object.assign(new Error('PAGE_TOO_LARGE'), { status: 413 });
  }
  if (!res.body?.getReader) {
    const text = await res.text();
    return text.slice(0, maxBytes);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let total = 0;
  let out = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        const remaining = maxBytes - (total - value.byteLength);
        if (remaining > 0) {
          out += decoder.decode(value.subarray(0, remaining), { stream: false });
        }
        await reader.cancel().catch(() => {});
        break;
      }
      out += decoder.decode(value, { stream: true });
    }
    out += decoder.decode();
  } finally {
    try {
      reader.releaseLock();
    } catch { /* ignore */ }
  }
  return out;
}

/**
 * Fetches public HTML with hop-by-hop redirect SSRF validation, DNS private-IP checking,
 * Content-Type validation, and a strict byte cap.
 */
export async function fetchSafePublicHtml(rawUrl, { timeoutMs = 8000 } = {}) {
  let currentUrl = await assertPublicDns(rawUrl);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetch(currentUrl, {
        signal: ctl.signal,
        redirect: 'manual',
        headers: {
          'User-Agent': BROWSER_UA,
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
          'Accept-Language': 'en-IN,en;q=0.9',
        },
      });

      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const loc = res.headers.get('location');
        try { await res.body?.cancel(); } catch { /* ignore */ }
        if (!loc || hop === MAX_REDIRECTS) {
          throw Object.assign(new Error('TOO_MANY_REDIRECTS'), { status: 502 });
        }
        const nextResolved = new URL(loc, currentUrl).toString();
        currentUrl = await assertPublicDns(nextResolved);
        continue;
      }

      if (res.status === 401 || res.status === 403) {
        try { await res.body?.cancel(); } catch { /* ignore */ }
        throw Object.assign(new Error('PAYWALLED'), { status: 402 });
      }
      if (!res.ok) {
        try { await res.body?.cancel(); } catch { /* ignore */ }
        throw Object.assign(new Error(`Publisher returned ${res.status}`), { status: 502 });
      }

      const contentType = String(res.headers.get('content-type') || '').toLowerCase();
      if (contentType && !contentType.includes('text/html') && !contentType.includes('xhtml') && !contentType.includes('text/plain')) {
        try { await res.body?.cancel(); } catch { /* ignore */ }
        throw Object.assign(new Error('UNREADABLE_CONTENT_TYPE'), { status: 502 });
      }

      const html = await readTextLimited(res, MAX_HTML_BYTES);
      return { html, finalUrl: currentUrl };
    }
    throw Object.assign(new Error('TOO_MANY_REDIRECTS'), { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
