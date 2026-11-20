// ESPN Cricket public JSON → normalized Match shape.
// Same-origin proxy: /api/cricket/live[?date=YYYYMMDD] + /api/cricket/detail?id=<matchId>&series=<seriesId>
// Backed by ESPN's unauthenticated JSON APIs (no API key / no 100 req/day quota).

async function readJSON(res, what = 'Cricket') {
  try {
    return await res.json();
  } catch {
    throw new Error(`${what} sent a bad response — showing preview`);
  }
}

function friendlyCricketError(e) {
  if (e instanceof TypeError || /failed to fetch|networkerror|load failed|network request failed/i.test(e?.message || '')) {
    return new Error('Network blocked — check connection / ad-blocker / VPN');
  }
  return e;
}

export async function fetchCricketLive(dateStr = '') {
  const cleanDate = String(dateStr || '').replace(/-/g, '');
  const cacheKey = `live-cache-cricket-v2-${cleanDate || 'today'}`;
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
    if (
      cached &&
      cached.provider === 'espn' &&
      Date.now() - cached.ts < 60 * 1000 &&
      cached.matches?.length
    ) {
      return { matches: cached.matches, cached: true };
    }
  } catch { /* ignore */ }

  const qs = cleanDate ? `?date=${encodeURIComponent(cleanDate)}` : '';
  let res;
  try {
    res = await fetch(`/api/cricket/live${qs}`);
    if (res.status === 404) throw new Error('Cricket API route not found');
  } catch (e) {
    throw friendlyCricketError(e);
  }
  if (res.status === 429) throw new Error('Cricket rate limit hit');
  if (!res.ok) {
    let msg = `Cricket error ${res.status}`;
    try {
      const err = await res.clone().json();
      if (err?.error) msg = String(err.error).slice(0, 160);
    } catch { /* keep default */ }
    throw new Error(msg);
  }

  const data = await readJSON(res);
  const rawList = Array.isArray(data) ? data : Array.isArray(data?.matches) ? data.matches : [];
  const matches = rawList.filter((m) => m && m.id && m.teamA && m.teamB);

  if (matches.length) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ provider: 'espn', ts: Date.now(), matches }));
    } catch { /* ignore */ }
  }
  return { matches, cached: false };
}

export function normalizeDetail(data) {
  const d = data || {};
  return {
    matchHeader: {
      status: d.matchHeader?.status || '',
      name: d.matchHeader?.name || '',
      description: d.matchHeader?.description || '',
      matchType: d.matchHeader?.matchType || '',
      venue: d.matchHeader?.venue || '',
      date: d.matchHeader?.date || '',
    },
    meta: {
      crr: d.meta?.crr || '',
      lastWicket: d.meta?.lastWicket || '',
      need: d.meta?.need || d.matchHeader?.status || '',
    },
    recentBalls: Array.isArray(d.recentBalls) ? d.recentBalls : [],
    batters: Array.isArray(d.batters) ? d.batters : [],
    innings: Array.isArray(d.innings) ? d.innings : [],
    commentary: Array.isArray(d.commentary) ? d.commentary : [],
    score: Array.isArray(d.score) ? d.score : [],
  };
}

// Full scoreboard: normalized { matchHeader, meta, recentBalls[], batters[], innings[], commentary[] }
export async function fetchCricketDetail(matchId, seriesId) {
  const rawId = String(matchId || '').replace(/^cr-/, '');
  const params = new URLSearchParams({ id: rawId });
  if (seriesId) params.set('series', String(seriesId));

  let res;
  try {
    res = await fetch(`/api/cricket/detail?${params}`);
    if (res.status === 404) throw new Error('Scoreboard not found');
  } catch (e) {
    throw friendlyCricketError(e);
  }
  if (!res.ok) throw new Error(`Scoreboard error ${res.status}`);
  const data = await readJSON(res, 'Scoreboard');
  return normalizeDetail(data);
}
