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
export async function fetchJson(url, { timeoutMs = 6500, retries = 1 } = {}) {
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

const IST_TZ = 'Asia/Kolkata';

function formatIstDateISO(d) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function readScoreText(raw) {
  if (raw == null) return '';
  if (typeof raw === 'object') {
    const val = raw.displayValue ?? raw.value ?? raw.score ?? '';
    return val === '' || val == null ? '' : String(val).trim();
  }
  return String(raw).trim();
}

function formatCricketDateAndTime(isoDate) {
  if (!isoDate) return { dateISO: '', dateLabel: '', kickoffLabel: '' };
  try {
    const d = new Date(isoDate);
    if (!Number.isFinite(d.getTime())) return { dateISO: '', dateLabel: '', kickoffLabel: '' };
    const dateISO = formatIstDateISO(d);
    const todayIso = formatIstDateISO(new Date());
    const timeStr = `${d
      .toLocaleTimeString('en-IN', {
        timeZone: IST_TZ,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      .replace(/\b(am|pm)\b/i, (m) => m.toUpperCase())} IST`;
    const wk = d.toLocaleDateString('en-GB', { timeZone: IST_TZ, weekday: 'short' });
    const day = d.toLocaleDateString('en-GB', { timeZone: IST_TZ, day: '2-digit' });
    const mon = d.toLocaleDateString('en-GB', { timeZone: IST_TZ, month: 'short' });
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
      id: String(c.id || c.team?.id || ''),
      name,
      short,
      score: parsed.score || emptyLabel,
      fullScore: parsed.fullScore || emptyLabel,
      overs: parsed.overs,
      logo: c.logo || '',
    };
  };

  const { dateISO, dateLabel, kickoffLabel } = formatCricketDateAndTime(ev.date);
  const displayNeed =
    status === 'scheduled' && kickoffLabel && (!need || /starts at|\b(gmt|utc|est|edt|pst|local)\b/i.test(need))
      ? `Starts ${kickoffLabel}`
      : need;

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
    meta: { need: displayNeed, crr: '', lastWicket: '' },
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
      fetchJson(espnHeaderUrl(d), { timeoutMs: idx === 0 ? 6500 : 5500, retries: idx === 0 ? 1 : 0 }),
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

  // Extract Playing XI lineups for both teams from summary.rosters
  const buildCricketSide = (compEntry, rosterFallback, fallbackColor) => {
    const tid = String(compEntry?.id || compEntry?.team?.id || rosterFallback?.team?.id || '');
    const rosterObj =
      rosters.find((r) => tid && String(r?.team?.id || '') === tid) || rosterFallback || null;
    const rawList = Array.isArray(rosterObj?.roster) ? rosterObj.roster : [];
    const mapPlayer = (p) => {
      const ath = p?.athlete || {};
      const posAbbr = String(ath?.position?.abbreviation || p?.position?.abbreviation || '').toUpperCase();
      const posName = String(ath?.position?.name || p?.position?.name || '');
      const isKeeper = Boolean(p?.keeper || posAbbr === 'WK' || /wicket\s*keeper/i.test(posName));
      const isCaptain = Boolean(p?.captain);
      const styles = Array.isArray(ath.style)
        ? ath.style.map((s) => s?.shortDescription || '').filter(Boolean)
        : [];
      const role =
        posAbbr && posAbbr !== 'UKN'
          ? posAbbr
          : styles.slice(0, 2).join(' · ');
      return {
        id: String(ath.id || ''),
        name: ath.displayName || ath.fullName || ath.name || 'Player',
        shortName: ath.shortName || ath.lastName || ath.displayName || 'Player',
        role,
        isCaptain,
        isKeeper,
        starter: p?.starter !== false && !p?.sub && !p?.didNotPlay,
      };
    };
    const mapped = rawList.map(mapPlayer);
    const starters = mapped.filter((p) => p.starter);
    const subs = mapped.filter((p) => !p.starter);
    const players = starters.length ? starters : mapped;
    const rawColor = compEntry?.team?.color || rosterObj?.team?.color || '';
    return {
      teamName:
        compEntry?.team?.displayName ||
        compEntry?.team?.name ||
        rosterObj?.team?.displayName ||
        rosterObj?.team?.name ||
        'Team',
      teamShort:
        compEntry?.team?.abbreviation ||
        rosterObj?.team?.abbreviation ||
        shortOf(compEntry?.team?.displayName || rosterObj?.team?.displayName),
      color: rawColor ? `#${String(rawColor).replace(/^#/, '')}` : fallbackColor,
      players,
      subs: starters.length ? subs : [],
    };
  };

  const lineups = {
    home: buildCricketSide(competitors[0], rosters[0], '#0D9488'),
    away: buildCricketSide(competitors[1], rosters[1], '#3B82F6'),
  };

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
    lineups,
    commentary,
  };
}

function formatDateRange(targetDate) {
  const target = new Date(targetDate);
  if (!Number.isFinite(target.getTime())) return '';
  const end = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate()) - 86400000);
  const start = new Date(end.getTime() - 365 * 86400000);
  const format = (date) => `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
  return `${format(start)}-${format(end)}`;
}

function extractCricketEvents(payload, depth = 0) {
  if (!payload || typeof payload !== 'object' || depth > 5) return [];
  if (Array.isArray(payload.events)) return payload.events;
  if (Array.isArray(payload.matches)) return payload.matches;
  if (Array.isArray(payload.competitions)) {
    const events = payload.competitions.flatMap((competition) => Array.isArray(competition?.events) ? competition.events : []);
    if (events.length) return events;
  }
  const children = Array.isArray(payload.sports) ? payload.sports : Array.isArray(payload.children) ? payload.children : [];
  for (const child of children) {
    const found = extractCricketEvents(child, depth + 1);
    if (found.length) return found;
  }
  const leagues = Array.isArray(payload.leagues) ? payload.leagues : [];
  if (leagues.length) return leagues.flatMap((league) => Array.isArray(league?.events) ? league.events : []);
  return [];
}

function cricketCompetitors(event) {
  const competition = event?.competitions?.[0] || event?.competition || {};
  const competitors = Array.isArray(event?.competitors)
    ? event.competitors
    : Array.isArray(competition?.competitors)
      ? competition.competitors
      : [];
  return { competition, competitors };
}

function cricketEventFormat(event, competition) {
  return normalizeFormat(event?.eventType || event?.class?.eventType || event?.class?.generalClassCard || competition?.class?.eventType || '');
}

function cricketEventForm(event, teamId, teamName, targetDate, targetFormat) {
  const { competition, competitors } = cricketCompetitors(event);
  const own = competitors.find((entry) =>
    (teamId && String(entry?.id || entry?.team?.id || '') === String(teamId)) ||
    String(entry?.team?.displayName || entry?.displayName || entry?.team?.name || entry?.name || '').toLowerCase() === String(teamName || '').toLowerCase(),
  );
  const opponent = competitors.find((entry) => entry !== own);
  const date = event?.date || competition?.date || '';
  const targetMs = Date.parse(targetDate);
  const eventMs = Date.parse(date);
  const state = String(event?.status?.type?.state || competition?.status?.type?.state || '').toLowerCase();
  const format = cricketEventFormat(event, competition);
  if (!own || !opponent || state !== 'post' || !Number.isFinite(eventMs) || eventMs >= targetMs) return null;
  if (targetFormat && normalizeFormat(targetFormat) !== format) return null;

  const ownName = own?.team?.displayName || own?.team?.name || own?.displayName || own?.name || 'Team';
  const opponentName = opponent?.team?.displayName || opponent?.team?.name || opponent?.displayName || opponent?.name || 'Opponent';
  const winner = competitors.find((entry) => entry?.winner === true);
  const statusText = String(competition?.status?.type?.detail || competition?.status?.summary || event?.status?.summary || '').toLowerCase();
  const result = winner
    ? winner === own ? 'W' : 'L'
    : /no result|abandoned|cancelled|canceled/.test(statusText)
      ? 'N/R'
      : 'D';
  const historicalHome = competitors.find((entry) => entry?.homeAway === 'home') || competitors[0];
  const historicalAway = competitors.find((entry) => entry?.homeAway === 'away') || competitors.find((entry) => entry !== historicalHome);

  const ownScoreText = readScoreText(own?.score);
  const opponentScoreText = readScoreText(opponent?.score);
  const histHomeScore = readScoreText(historicalHome?.score);
  const histAwayScore = readScoreText(historicalAway?.score);

  return {
    id: String(event?.id || ''),
    date: new Date(eventMs).toISOString(),
    opponentId: String(opponent?.id || opponent?.team?.id || ''),
    opponent: opponentName,
    score: `${ownScoreText || '–'}–${opponentScoreText || '–'}`,
    result,
    homeName: historicalHome?.team?.displayName || historicalHome?.displayName || historicalHome?.name || '',
    awayName: historicalAway?.team?.displayName || historicalAway?.displayName || historicalAway?.name || '',
    homeScore: histHomeScore,
    awayScore: histAwayScore,
    teamName: ownName,
    format,
  };
}

function cricketStandingsEntries(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 7) return [];
  if (!Array.isArray(value)) {
    if (Array.isArray(value.entries) && value.entries.length) return value.entries;
    if (value.standings && Array.isArray(value.standings.entries)) return value.standings.entries;
    for (const child of Object.values(value)) {
      const found = cricketStandingsEntries(child, depth + 1);
      if (found.length) return found;
    }
  }
  return [];
}

function normalizeCricketStanding(entry) {
  const stats = Array.isArray(entry?.stats) ? entry.stats : [];
  const stat = (names) => {
    const found = stats.find((item) => names.includes(String(item?.name || '').toLowerCase()));
    return found?.displayValue ?? found?.value ?? '';
  };
  const rank = stat(['rank', 'position', 'playoffseed']);
  const points = stat(['points', 'overallpoints']);
  const played = stat(['matches', 'played', 'gamesplayed']);
  const wins = stat(['wins', 'overallwins']);
  const losses = stat(['losses', 'overalllosses']);
  if (!rank && !points && !played) return null;
  return {
    rank: rank ? String(rank) : '',
    points: points ? String(points) : '',
    played: played ? String(played) : '',
    record: wins !== '' && losses !== '' ? `${wins}-${losses}` : '',
  };
}

export async function fetchEspnCricketPreview({
  seriesId,
  homeId,
  awayId,
  homeName = 'Team A',
  awayName = 'Team B',
  date = '',
  format = '',
}) {
  const series = String(seriesId || '').trim();
  const homeTeamId = String(homeId || '').trim();
  const awayTeamId = String(awayId || '').trim();
  const dates = formatDateRange(date);
  if (
    !series ||
    series.length > 48 ||
    series.includes('..') ||
    !/^[a-z0-9._-]+$/i.test(series) ||
    !dates
  ) {
    return { form: { home: [], away: [] }, headToHead: [], standings: null };
  }

  const root = `https://site.api.espn.com/apis/site/v2/sports/cricket/${encodeURIComponent(series)}`;
  const [historyResult, standingsResult] = await Promise.allSettled([
    fetchJson(`${root}/scoreboard?dates=${encodeURIComponent(dates)}`, { timeoutMs: 6500, retries: 0 }),
    fetchJson(`${root}/standings`, { timeoutMs: 6000, retries: 0 }),
  ]);

  let history = historyResult.status === 'fulfilled'
    ? extractCricketEvents(historyResult.value)
    : [];
  if (history.length < 10) {
    try {
      const globalHistory = await fetchJson(`${ESPN_HEADER_URL}&dates=${encodeURIComponent(dates)}`, {
        timeoutMs: 7000,
        retries: 0,
      });
      const combined = new Map(history.map((event) => [String(event?.id || ''), event]));
      for (const event of extractCricketEvents(globalHistory)) {
        const id = String(event?.id || '');
        if (id) combined.set(id, event);
      }
      history = [...combined.values()];
    } catch { /* partial preview is still useful without history */ }
  }
  const pastMatches = history
    .map((event) => cricketEventForm(event, homeTeamId, homeName, date, format))
    .filter(Boolean);
  const homeForm = pastMatches
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 5)
    .map(({ date: resultDate, opponent, score, result }) => ({ date: resultDate, opponent, score, result }));

  const awayMatches = history
    .map((event) => cricketEventForm(event, awayTeamId, awayName, date, format))
    .filter(Boolean);
  const awayForm = awayMatches
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 5)
    .map(({ date: resultDate, opponent, score, result }) => ({ date: resultDate, opponent, score, result }));

  const headToHead = pastMatches
    .filter((event) => event.opponentId === awayTeamId || event.opponent.toLowerCase() === awayName.toLowerCase())
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 5)
    .map(({ date: resultDate, homeName: eventHome, awayName: eventAway, homeScore, awayScore }) => ({
      date: resultDate,
      home: eventHome || homeName,
      away: eventAway || awayName,
      score: `${homeScore || '–'}–${awayScore || '–'}`,
    }));

  let standings = null;
  if (standingsResult.status === 'fulfilled') {
    const entries = cricketStandingsEntries(standingsResult.value);
    const findEntry = (teamId, name) => entries.find((entry) =>
      (teamId && String(entry?.team?.id || entry?.id || '') === teamId) ||
      String(entry?.team?.displayName || entry?.team?.name || '').toLowerCase() === name.toLowerCase(),
    );
    standings = {
      competition: standingsResult.value?.name || standingsResult.value?.header?.name || '',
      home: normalizeCricketStanding(findEntry(homeTeamId, homeName)),
      away: normalizeCricketStanding(findEntry(awayTeamId, awayName)),
    };
    if (!standings.home && !standings.away) standings = null;
  }

  return { form: { home: homeForm, away: awayForm }, headToHead, standings };
}
