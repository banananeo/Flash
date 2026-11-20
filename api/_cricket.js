// Shared helpers + normalizers for ESPN Cricket public JSON APIs.
// Leading `_` = not routed by Vercel (same convention as api/_extract.js).
// Routes: /api/cricket/live (api/cricket/live.js), /api/cricket/detail (api/cricket/detail.js),
// /api/widget-scores (api/widget-scores.js), and Vite dev middleware (vite.config.js).
// Unauthenticated public JSON feeds (same ESPN API backend referenced in python-espncricinfo)
// — no API key required, no 100 req/day quota.

export const ESPN_HEADER_URL =
  'https://site.web.api.espn.com/apis/v2/scoreboard/header?sport=cricket';

export const espnHeaderUrl = (date) => {
  const s = String(date || '').trim().replace(/-/g, '');
  if (!/^\d{8}$/.test(s)) return ESPN_HEADER_URL;
  return `${ESPN_HEADER_URL}&dates=${encodeURIComponent(s)}`;
};

export const espnSummaryUrl = (seriesId, matchId) =>
  `https://site.api.espn.com/apis/site/v2/sports/cricket/${encodeURIComponent(seriesId)}/summary?event=${encodeURIComponent(matchId)}`;

export const espnPlayByPlayUrl = (seriesId, matchId, period = 1, page = 1) =>
  `https://site.api.espn.com/apis/site/v2/sports/cricket/${encodeURIComponent(seriesId)}/playbyplay?event=${encodeURIComponent(matchId)}&period=${encodeURIComponent(period)}&page=${encodeURIComponent(page)}`;

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0',
  Accept: 'application/json',
};

export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Mirrors python-espncricinfo/_core.py retry policy for ESPN's intermittent 503s.
export async function fetchJson(url, { timeoutMs = 10000, retries = 1 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctl.signal, headers: FETCH_HEADERS });
      if (res.ok) return await res.json();
      if ([500, 502, 503, 504].includes(res.status) && attempt < retries) {
        await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
        continue;
      }
      const err = new Error(`ESPN upstream returned ${res.status}`);
      err.status = res.status === 404 ? 404 : 502;
      throw err;
    } catch (e) {
      lastErr = e;
      if (e?.status && e.status < 500) throw e;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr || new Error('ESPN upstream unreachable');
}

const shortOf = (name) => String(name || '???').slice(0, 3).toUpperCase();

function stripHtml(text) {
  return String(text || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeFormat(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/women'?s?\s*t20/i.test(s)) return 'WT20';
  if (/women'?s?\s*odi/i.test(s)) return 'WODI';
  if (/women'?s?\s*test/i.test(s)) return 'WTEST';
  if (/first[- ]class/i.test(s)) return 'FC';
  return s.toUpperCase();
}

function parseScoreString(rawScore) {
  const full = String(rawScore || '').trim();
  if (!full) return { score: '', overs: '', fullScore: '' };
  const ovMatch = full.match(/\(([^)]*)\)\s*$/);
  const overs = ovMatch ? ovMatch[1].trim() : '';
  const compact = full.replace(/\s*\([^)]*\)\s*$/, '').trim();
  return { score: compact || full, overs, fullScore: full };
}

function formatCricketDateAndTime(isoDate) {
  if (!isoDate) return { dateISO: '', dateLabel: '', kickoffLabel: '' };
  try {
    const d = new Date(isoDate);
    if (!Number.isFinite(d.getTime())) return { dateISO: '', dateLabel: '', kickoffLabel: '' };
    const dateISO = d.toISOString().slice(0, 10);
    const todayIso = new Date().toISOString().slice(0, 10);
    const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    const wk = d.toLocaleDateString('en-GB', { weekday: 'short' });
    const day = String(d.getDate()).padStart(2, '0');
    const mon = d.toLocaleDateString('en-GB', { month: 'short' });
    const dateLabel = dateISO === todayIso ? 'Today' : `${wk} ${day} ${mon}`;
    return {
      dateISO,
      dateLabel,
      kickoffLabel: dateISO === todayIso ? timeStr : `${dateLabel} · ${timeStr}`,
    };
  } catch {
    return { dateISO: '', dateLabel: '', kickoffLabel: '' };
  }
}

function getNextCricketDates(baseDateStr = '', daysAhead = 3) {
  let start = new Date();
  if (/^\d{8}$/.test(baseDateStr)) {
    const y = Number(baseDateStr.slice(0, 4));
    const m = Number(baseDateStr.slice(4, 6)) - 1;
    const d = Number(baseDateStr.slice(6, 8));
    start = new Date(Date.UTC(y, m, d));
  }
  const fmt = (dt) => {
    const yyyy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  };
  const out = [];
  for (let i = 1; i <= daysAhead; i++) {
    out.push(fmt(new Date(start.getTime() + i * 86400000)));
  }
  return out;
}

function normalizeHeaderEvent(ev, league) {
  const seriesId = String(league?.id || '');
  const rawId = String(ev?.id || '');
  if (!rawId) return null;

  const competitors = Array.isArray(ev.competitors) ? ev.competitors : [];
  const c1 = competitors[0] || {};
  const c2 = competitors[1] || {};
  const need =
    ev.fullStatus?.longSummary ||
    ev.fullStatus?.summary ||
    ev.summary ||
    ev.fullStatus?.type?.description ||
    '';

  const rawState = String(ev.status || ev.fullStatus?.type?.state || '').toLowerCase();
  const hasAnyScore = Boolean(String(c1.score || '').trim() || String(c2.score || '').trim());
  let status = 'scheduled';
  if (rawState === 'post') {
    status = 'ft';
  } else if (rawState === 'in') {
    status = !hasAnyScore && /^starts at/i.test(need) ? 'scheduled' : 'live';
  }

  const format = normalizeFormat(ev.eventType || ev.class?.generalClassCard || '');
  const leagueName = league?.name || 'Cricket';

  const mapTeam = (c, fallback) => {
    const name = c.displayName || c.name || fallback;
    const short = c.abbreviation || shortOf(name);
    const parsed = parseScoreString(c.score);
    const emptyLabel = status === 'scheduled' ? 'TBD' : 'Yet to bat';
    return {
      name,
      short,
      score: parsed.score || emptyLabel,
      fullScore: parsed.fullScore || emptyLabel,
      overs: parsed.overs,
      logo: c.logo || '',
    };
  };

  const { dateISO, dateLabel, kickoffLabel } = formatCricketDateAndTime(ev.date);

  return {
    id: seriesId ? `cr-${seriesId}-${rawId}` : `cr-${rawId}`,
    rawId,
    seriesId,
    sport: 'cricket',
    league: `${format ? `${format} • ` : ''}${leagueName}`,
    leagueName,
    format,
    country: '',
    status,
    dateISO,
    dateLabel,
    kickoffLabel,
    hasScores: hasAnyScore,
    teamA: mapTeam(c1, 'Team A'),
    teamB: mapTeam(c2, 'Team B'),
    meta: { need, crr: '', lastWicket: '' },
    recentBalls: [],
    batters: [],
    bowlers: [],
    time: ev.date || undefined,
    venue: ev.location || '',
  };
}

export async function fetchEspnLiveMatches(date = '', options = {}) {
  const cleanDate = String(date || '').trim().replace(/-/g, '');
  const safeDate = /^\d{8}$/.test(cleanDate) ? cleanDate : '';
  const includeUpcoming = options.upcoming !== undefined ? Boolean(options.upcoming) : !safeDate;

  const datesToFetch = [safeDate, ...(includeUpcoming ? getNextCricketDates(safeDate, 3) : [])];
  const settled = await Promise.allSettled(
    datesToFetch.map((d, idx) =>
      fetchJson(espnHeaderUrl(d), { timeoutMs: idx === 0 ? 10000 : 8000, retries: idx === 0 ? 1 : 0 }),
    ),
  );

  const ok = settled.filter((r) => r.status === 'fulfilled');
  if (!ok.length) {
    throw settled[0]?.reason || new Error('ESPN Cricket header unreachable');
  }

  const leagues = ok.flatMap((r) => r.value?.sports?.[0]?.leagues || []);
  const matches = [];
  const seen = new Set();

  for (const league of leagues) {
    for (const ev of league?.events || []) {
      const m = normalizeHeaderEvent(ev, league);
      if (!m || seen.has(m.id)) continue;
      seen.add(m.id);
      matches.push(m);
    }
  }

  const rank = (m) => {
    if (m.status === 'live' && m.hasScores) return 0;
    if (m.status === 'live') return 1;
    if (m.status === 'scheduled') return 2;
    return 3;
  };
  matches.sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r !== 0) return r;
    return String(a.time || '').localeCompare(String(b.time || ''));
  });

  return matches.map(({ hasScores: _ignore, ...rest }) => rest);
}

export function parseMatchIdAndSeries(rawIdInput, rawSeriesInput) {
  let rawId = String(rawIdInput || '').trim().replace(/^cr-/, '');
  let seriesId = String(rawSeriesInput || '').trim();

  const composite = rawId.match(/^(\d+)-(\d+)$/);
  if (composite) {
    if (!seriesId) seriesId = composite[1];
    rawId = composite[2];
  }

  if (!/^\d+$/.test(rawId)) {
    const err = new Error('Invalid or missing ?id= numeric ESPN match id');
    err.status = 400;
    throw err;
  }
  if (seriesId && !/^\d+$/.test(seriesId)) {
    const err = new Error('Invalid ?series= numeric ESPN series id');
    err.status = 400;
    throw err;
  }

  return { matchId: rawId, seriesId };
}

function statsMap(node) {
  const out = {};
  const cats = node?.statistics?.categories || [];
  for (const cat of cats) {
    for (const st of cat?.stats || []) {
      if (st?.name) out[st.name] = st.displayValue ?? st.value ?? '';
    }
  }
  return out;
}

function formatBallBadge(item) {
  const playDesc = String(item?.playType?.description || '');
  const score = item?.scoreValue;
  if (item?.dismissal?.dismissal || /\bout\b|wicket/i.test(playDesc)) return 'W';
  if (/wide/i.test(playDesc)) return score > 1 ? `${score}Wd` : 'Wd';
  if (/no ball/i.test(playDesc)) return score > 1 ? `${score}Nb` : 'Nb';
  if (/leg bye/i.test(playDesc)) return `${score || 1}Lb`;
  if (/\bbye\b/i.test(playDesc)) return `${score || 1}B`;
  return String(score ?? 0);
}

function extractMatchcardDismissals(matchcards) {
  // Map `${inningsNumber}:${playerID}` -> richer dismissal string (e.g. "caught wk", "lbw")
  const map = new Map();
  for (const card of matchcards || []) {
    if (String(card?.headline || '').toLowerCase() !== 'batting') continue;
    const inn = String(card.inningsNumber || '');
    for (const p of card.playerDetails || []) {
      if (p?.playerID && p?.dismissal) {
        map.set(`${inn}:${String(p.playerID)}`, String(p.dismissal));
      }
    }
  }
  return map;
}

async function fetchRecentPlayByPlay(seriesId, matchId, period) {
  try {
    const p1 = await fetchJson(espnPlayByPlayUrl(seriesId, matchId, period, 1), {
      timeoutMs: 8000,
      retries: 0,
    });
    let comm = p1?.commentary || {};
    let items = Array.isArray(comm.items) ? comm.items : [];
    const pageCount = Number(comm.pageCount) || 1;

    if (pageCount > 1) {
      const pLast = await fetchJson(espnPlayByPlayUrl(seriesId, matchId, period, pageCount), {
        timeoutMs: 8000,
        retries: 0,
      });
      items = Array.isArray(pLast?.commentary?.items) ? pLast.commentary.items : items;
    }

    const validBalls = items.filter((it) => it && (it.over || it.shortText || it.text));
    const recentBalls = validBalls.slice(-6).map(formatBallBadge);
    const commentary = validBalls
      .slice(-10)
      .reverse()
      .map((it) => {
        const overVal = it.over?.overs;
        const over = overVal != null ? String(overVal) : '';
        const head = stripHtml(it.shortText || '');
        const body = stripHtml(it.text || '');
        const text = head && body ? `${head} — ${body}` : head || body;
        return { over, text };
      })
      .filter((c) => c.text);

    return { recentBalls, commentary };
  } catch {
    return { recentBalls: [], commentary: [] };
  }
}

export async function fetchEspnMatchDetail(rawIdInput, rawSeriesInput) {
  let { matchId, seriesId } = parseMatchIdAndSeries(rawIdInput, rawSeriesInput);

  // Fallback lookup if caller only passed matchId without seriesId
  if (!seriesId) {
    const list = await fetchEspnLiveMatches();
    const hit = list.find((m) => m.rawId === matchId);
    if (hit?.seriesId) seriesId = hit.seriesId;
  }
  if (!seriesId) {
    const err = new Error('Missing ?series= ESPN series id for this match');
    err.status = 400;
    throw err;
  }

  const summary = await fetchJson(espnSummaryUrl(seriesId, matchId), {
    timeoutMs: 10000,
    retries: 1,
  });

  const comp = summary?.header?.competitions?.[0] || {};
  const competitors = Array.isArray(comp.competitors) ? comp.competitors : [];
  const rosters = Array.isArray(summary?.rosters) ? summary.rosters : [];
  const dismissals = extractMatchcardDismissals(summary?.matchcards);

  const rosterByTeamId = new Map();
  for (const r of rosters) {
    const tid = String(r?.team?.id || '');
    if (tid) rosterByTeamId.set(tid, Array.isArray(r.roster) ? r.roster : []);
  }

  const innings = [];
  for (const c of competitors) {
    const teamId = String(c?.id || c?.team?.id || '');
    const teamName = c?.team?.displayName || c?.team?.name || 'Team';
    const teamShort = c?.team?.abbreviation || shortOf(teamName);

    for (const ls of c?.linescores || []) {
      if (!ls?.isBatting) continue;
      const period = Number(ls.period) || innings.length + 1;
      const gen = statsMap(ls);

      // Batting table from batting team's roster
      const batRoster = rosterByTeamId.get(teamId) || [];
      const batsmen = [];
      for (const p of batRoster) {
        const pLine = (p.linescores || []).find((l) => Number(l.period) === period);
        if (!pLine) continue;
        const inner = (pLine.linescores && pLine.linescores[0]) || pLine;
        const st = statsMap(inner);
        if (st.batted !== '1') continue;
        const pid = String(p.athlete?.id || '');
        const isNotOut = st.notouts === '1' || /not out/i.test(String(st.dismissalCard || ''));
        const richOut = dismissals.get(`${period}:${pid}`);
        batsmen.push({
          order: Number(st.battingPosition) || 99,
          name: p.athlete?.shortName || p.athlete?.displayName || 'Unknown',
          out: isNotOut ? 'not out' : richOut || st.dismissalCard || '',
          runs: Number(st.runs) || 0,
          balls: Number(st.ballsFaced) || 0,
          fours: Number(st.fours) || 0,
          sixes: Number(st.sixes) || 0,
          sr: st.strikeRate || '',
          isNotOut,
        });
      }
      batsmen.sort((a, b) => a.order - b.order);

      // Bowling table from opposing team's roster
      const bowlers = [];
      for (const [otherId, otherRoster] of rosterByTeamId.entries()) {
        if (otherId === teamId) continue;
        for (const p of otherRoster) {
          const pLine = (p.linescores || []).find((l) => Number(l.period) === period);
          if (!pLine) continue;
          const inner = (pLine.linescores && pLine.linescores[0]) || pLine;
          const st = statsMap(inner);
          if (!(Number(st.overs) > 0)) continue;
          bowlers.push({
            order: Number(st.bowlingPosition) || 99,
            name: p.athlete?.shortName || p.athlete?.displayName || 'Unknown',
            overs: String(st.overs || '0'),
            maidens: Number(st.maidens) || 0,
            runs: Number(st.conceded) || 0,
            wickets: Number(st.wickets) || 0,
            econ: st.economyRate || '',
          });
        }
      }
      bowlers.sort((a, b) => a.order - b.order);

      const fowList = Array.isArray(ls.fow) ? ls.fow : [];
      innings.push({
        period,
        teamName,
        teamShort,
        runs: ls.runs ?? 0,
        wickets: ls.wickets ?? 0,
        overs: ls.overs ?? 0,
        runRate: gen.runRate && gen.runRate !== '-' ? String(gen.runRate) : '',
        batsmen: batsmen.map(({ order: _o, ...b }) => b),
        bowlers: bowlers.map(({ order: _o, ...b }) => b),
        _lastFow: fowList.length ? fowList[fowList.length - 1] : null,
      });
    }
  }

  innings.sort((a, b) => a.period - b.period);

  const activePeriod = Number(comp?.status?.period) || (innings.length ? innings[innings.length - 1].period : 1);
  const currentInn = innings.find((i) => i.period === activePeriod) || innings[innings.length - 1] || null;
  const isLive = String(comp?.status?.type?.state || '').toLowerCase() === 'in';

  let lastWicket = '';
  if (currentInn?._lastFow) {
    const f = currentInn._lastFow;
    const who = f.athlete?.displayName || f.athlete?.shortName || '';
    const pts = f.runsScored != null ? `${f.runsScored} (${f.ballsFaced ?? 0})` : '';
    const ov = f.wicketOver != null ? `${f.wicketOver} ov` : '';
    lastWicket = [who, pts, ov].filter(Boolean).join(' • ');
  }

  const activeBatters =
    isLive && currentInn
      ? currentInn.batsmen
          .filter((b) => b.isNotOut)
          .slice(0, 2)
          .map(({ name, runs, balls, fours, sixes }) => ({ name, runs, balls, fours: fours ?? 0, sixes: sixes ?? 0 }))
      : [];

  const { recentBalls, commentary } = await fetchRecentPlayByPlay(seriesId, matchId, activePeriod);

  const matchHeader = {
    status: comp?.status?.summary || comp?.status?.type?.description || '',
    name: summary?.header?.name || '',
    description: summary?.header?.description || '',
    matchType: comp?.class?.eventType || comp?.class?.generalClassCard || '',
    venue: summary?.gameInfo?.venue?.fullName || '',
    date: comp?.date || '',
  };

  const cleanInnings = innings.map(({ _lastFow: _f, ...inn }) => inn);

  return {
    provider: 'espn',
    matchHeader,
    meta: {
      crr: currentInn?.runRate || '',
      lastWicket,
      need: matchHeader.status,
    },
    recentBalls,
    batters: activeBatters,
    innings: cleanInnings,
    commentary,
  };
}
