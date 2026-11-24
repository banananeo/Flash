// Shared helpers + normalizers for ESPN Soccer (Football) public JSON APIs.
// Leading `_` = not routed by Vercel (same convention as api/_cricket.js).
// Unauthenticated public JSON feeds — no API key required, no 100 req/day quota.

export const espnSoccerHeaderUrl = (date, leagueSlug = '', limit = 300) => {
  const base = 'https://site.web.api.espn.com/apis/v2/scoreboard/header?sport=soccer';
  const lg = leagueSlug ? `&league=${encodeURIComponent(leagueSlug)}` : '';
  const dt = date ? `&dates=${encodeURIComponent(date)}` : '';
  const lim = limit ? `&limit=${encodeURIComponent(limit)}` : '';
  return `${base}${lg}${dt}${lim}`;
};

export const espnSoccerAllUrl = (date, limit = 300) => {
  const base = 'https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard';
  const params = [];
  if (date) params.push(`dates=${encodeURIComponent(date)}`);
  if (limit) params.push(`limit=${encodeURIComponent(limit)}`);
  return params.length ? `${base}?${params.join('&')}` : base;
};

export const espnSoccerSummaryUrl = (leagueSlug, eventId) =>
  `https://site.api.espn.com/apis/site/v2/sports/soccer/${encodeURIComponent(leagueSlug)}/summary?event=${encodeURIComponent(eventId)}`;

// Top leagues fetched across the upcoming window when upcoming=1 so users can always
// see the live score OR next upcoming match for any major league or club.
export const CURATED_FOOTBALL_LEAGUES = [
  'eng.1',
  'uefa.champions',
  'esp.1',
  'ita.1',
  'ger.1',
  'fra.1',
  'uefa.europa',
  'ind.1',
  'usa.1',
  'bra.1',
];

const UEFA_EXTENDED_LEAGUES = new Set(['uefa.champions', 'uefa.europa']);
const IST_TZ = 'Asia/Kolkata';

function formatIstDateISO(d) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function todayIstYmd() {
  return formatIstDateISO(new Date()).replace(/-/g, '');
}

function ymdToIso(ymd) {
  if (!/^\d{8}$/.test(ymd)) return '';
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

function shiftYmd(baseDateStr = '', deltaDays = 0) {
  const clean = /^\d{8}$/.test(baseDateStr) ? baseDateStr : todayIstYmd();
  const y = Number(clean.slice(0, 4));
  const m = Number(clean.slice(4, 6)) - 1;
  const d = Number(clean.slice(6, 8));
  const dt = new Date(Date.UTC(y, m, d + deltaDays));
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function computeDateRangeParam(baseDateStr = '', daysAhead = 7) {
  const startYmd = /^\d{8}$/.test(baseDateStr) ? baseDateStr : todayIstYmd();
  const endYmd = shiftYmd(startYmd, daysAhead);
  return `${startYmd}-${endYmd}`;
}

function formatIstTime(d) {
  const t = d
    .toLocaleTimeString('en-IN', {
      timeZone: IST_TZ,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .replace(/\b(am|pm)\b/i, (m) => m.toUpperCase());
  return `${t} IST`;
}

function formatDateAndKickoff(isoDate) {
  if (!isoDate) return { dateISO: '', dateLabel: '', kickoffLabel: 'TBD' };
  try {
    const d = new Date(isoDate);
    if (!Number.isFinite(d.getTime())) return { dateISO: '', dateLabel: '', kickoffLabel: 'TBD' };
    const dateISO = formatIstDateISO(d);
    const todayIso = formatIstDateISO(new Date());
    const timeStr = formatIstTime(d);
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
    return { dateISO: '', dateLabel: '', kickoffLabel: 'TBD' };
  }
}

function readScoreText(raw) {
  if (raw == null) return '';
  if (typeof raw === 'object') {
    const val = raw.displayValue ?? raw.value ?? raw.score ?? '';
    return val === '' || val == null ? '' : String(val).trim();
  }
  return String(raw).trim();
}

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0',
  Accept: 'application/json',
};

const TOP_LEAGUE_PRIORITY = {
  'eng.1': 1,
  'uefa.champions': 2,
  'esp.1': 3,
  'ita.1': 4,
  'ger.1': 5,
  'fra.1': 6,
  'uefa.europa': 7,
  'eng.fa': 8,
  'eng.league_cup': 9,
  'usa.1': 10,
  'fifa.world': 11,
  'fifa.world.u17': 12,
  'uefa.wchampions': 13,
  'bra.1': 14,
  'ind.1': 15,
};

export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export function sanitizeDateParam(raw) {
  const s = String(raw || '').trim().replace(/-/g, '');
  if (!s) return '';
  if (!/^\d{8}$/.test(s)) return '';
  return s;
}

export function sanitizeLeagueParam(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (s.length > 48 || s.includes('..') || !/^[a-z0-9._-]+$/i.test(s)) {
    const err = new Error('Invalid ?league= league slug');
    err.status = 400;
    throw err;
  }
  return s;
}

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
      const err = new Error(`ESPN Soccer upstream returned ${res.status}`);
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
  throw lastErr || new Error('ESPN Soccer upstream unreachable');
}

const shortOf = (name) => String(name || '???').slice(0, 3).toUpperCase();

function computeProgressPct(status, clockStr, period) {
  if (status === 'ft') return 100;
  if (status !== 'live') return 0;
  const s = String(clockStr || '').toUpperCase();
  if (s === 'HT') return 50;
  const m = s.match(/(\d+)/);
  if (m) {
    const mins = Number(m[1]);
    return Math.min(100, Math.max(4, Math.round((mins / 90) * 100)));
  }
  return period >= 2 ? 65 : 25;
}

function formatKickoff(isoDate) {
  if (!isoDate) return 'TBD';
  try {
    const d = new Date(isoDate);
    if (!Number.isFinite(d.getTime())) return 'TBD';
    return formatIstTime(d);
  } catch {
    return 'TBD';
  }
}

function buildScorersMap(payloads) {
  // eventId -> { [teamId]: ["Saka 12'", "Havertz 54'"] }
  const map = new Map();
  const list = Array.isArray(payloads) ? payloads : [payloads];
  for (const allScoreboardJson of list) {
    for (const ev of allScoreboardJson?.events || []) {
      const id = String(ev?.id || '');
      const details = ev?.competitions?.[0]?.details || [];
      if (!id || !details.length || map.has(id)) continue;
      const byTeam = {};
      for (const d of details) {
        if (!d?.scoringPlay) continue;
        const tid = String(d?.team?.id || '');
        const player =
          d?.athletesInvolved?.[0]?.shortName ||
          d?.athletesInvolved?.[0]?.displayName ||
          '';
        const min = d?.clock?.displayValue || '';
        if (!tid || !player) continue;
        const label = `${player}${min ? ` ${min}` : ''}${d.ownGoal ? ' (OG)' : ''}${d.penaltyKick ? ' (P)' : ''}`;
        if (!byTeam[tid]) byTeam[tid] = [];
        byTeam[tid].push(label);
      }
      map.set(id, byTeam);
    }
  }
  return map;
}

function normalizeHeaderEvent(ev, league, scorersMap) {
  const rawId = String(ev?.id || '');
  const leagueSlug = String(league?.slug || '').trim();
  if (!rawId) return null;

  const competitors = Array.isArray(ev.competitors) ? ev.competitors : [];
  const home = competitors.find((c) => c.homeAway === 'home') || competitors[0] || {};
  const away = competitors.find((c) => c.homeAway === 'away') || competitors[1] || {};

  const rawState = String(ev.status || ev.fullStatus?.type?.state || '').toLowerCase();
  const status = rawState === 'in' ? 'live' : rawState === 'post' ? 'ft' : 'scheduled';

  const shortDetail = ev.fullStatus?.type?.shortDetail || ev.summary || '';
  const detailText = ev.fullStatus?.type?.detail || '';
  const clock = String(ev.clock || '').trim();
  let minute = 'NS';
  if (status === 'live') {
    minute = /HT|Halftime/i.test(shortDetail) ? 'HT' : clock || shortDetail || 'LIVE';
  } else if (status === 'ft') {
    minute = /AET|PEN/i.test(shortDetail) ? shortDetail : 'FT';
  } else {
    minute = formatKickoff(ev.date);
  }

  const period = Number(ev.period) || (status === 'live' ? 1 : 0);
  const halfLabel =
    status === 'live'
      ? /HT/i.test(minute)
        ? 'HALF TIME'
        : period >= 2
          ? 'SECOND HALF'
          : 'FIRST HALF'
      : status === 'ft'
        ? 'FULL TIME'
        : 'SCHEDULED';

  const leagueName = league?.name || 'Football';
  const scorersForEvent = scorersMap.get(rawId) || {};
  const scorersA = scorersForEvent[String(home.id || '')] || [];
  const scorersB = scorersForEvent[String(away.id || '')] || [];

  const scoreNum = (val) => {
    if (status === 'scheduled' && (val === '' || val == null)) return null;
    const n = Number(val);
    return Number.isFinite(n) ? n : status === 'scheduled' ? null : 0;
  };

  const { dateISO, dateLabel, kickoffLabel } = formatDateAndKickoff(ev.date);

  return {
    id: leagueSlug ? `fb-${leagueSlug}-${rawId}` : `fb-${rawId}`,
    rawId,
    leagueSlug,
    sport: 'football',
    league: `${leagueName}${ev.group?.name && ev.group.name !== 'Regular Season' ? ` • ${ev.group.name}` : ''}`,
    leagueName,
    country: '',
    status,
    minute,
    dateISO,
    dateLabel,
    kickoffLabel,
    halfLabel,
    statusDetail: detailText || shortDetail,
    progressPct: computeProgressPct(status, minute, period),
    teamA: {
      id: String(home.id || ''),
      name: home.displayName || home.name || 'Home',
      short: home.abbreviation || shortOf(home.displayName || home.name),
      score: scoreNum(home.score),
      logo: home.logo || '',
      color: home.color ? `#${String(home.color).replace(/^#/, '')}` : '#D75043',
      scorers: scorersA,
    },
    teamB: {
      id: String(away.id || ''),
      name: away.displayName || away.name || 'Away',
      short: away.abbreviation || shortOf(away.displayName || away.name),
      score: scoreNum(away.score),
      logo: away.logo || '',
      color: away.color ? `#${String(away.color).replace(/^#/, '')}` : '#5578D8',
      scorers: scorersB,
    },
    events: ev.situation?.lastPlay?.text
      ? [{ min: minute, text: ev.situation.lastPlay.text }]
      : [],
    stats: [],
    venue: ev.location || '',
    time: ev.date || undefined,
  };
}

export async function fetchEspnFootballMatches(rawDate = '', options = {}) {
  const date = sanitizeDateParam(rawDate);
  const leagueFilter = sanitizeLeagueParam(options.league);
  const includeUpcoming = options.upcoming !== undefined ? Boolean(options.upcoming) : !date;

  // ESPN's ?dates=YYYYMMDD filters on US Eastern days (UTC-5/UTC-4), whereas Flash
  // displays IST calendar dates (UTC+5:30). Every IST day D (00:00–23:59 IST) spans
  // ESPN's prevYmd (00:00–10:29 IST, including 20:00 UTC / 1:30 AM IST UCL matches)
  // AND targetYmd (10:30–23:59 IST, including 17:45 UTC / 11:15 PM IST UCL matches).
  const todayYmd = todayIstYmd();
  const todayIso = ymdToIso(todayYmd);
  const targetYmd = date || todayYmd;
  const targetIso = ymdToIso(targetYmd);
  const prevYmd = shiftYmd(targetYmd, -1);
  const needScorers = targetIso <= todayIso;

  const headerTasks = [];
  const scorerTasks = [];

  if (leagueFilter) {
    if (!date) {
      // Full league schedule (e.g. ?league=uefa.champions returns all League Phase / season fixtures).
      headerTasks.push(
        fetchJson(espnSoccerHeaderUrl('', leagueFilter, 200), { timeoutMs: 6500, retries: 1 }),
        fetchJson(espnSoccerHeaderUrl(`${prevYmd}-${shiftYmd(targetYmd, 30)}`, leagueFilter, 200), {
          timeoutMs: 6500,
          retries: 0,
        }),
      );
    } else if (includeUpcoming) {
      headerTasks.push(
        fetchJson(espnSoccerHeaderUrl(`${prevYmd}-${shiftYmd(targetYmd, 30)}`, leagueFilter, 200), {
          timeoutMs: 6500,
          retries: 1,
        }),
      );
    } else {
      headerTasks.push(
        fetchJson(espnSoccerHeaderUrl(`${prevYmd}-${targetYmd}`, leagueFilter, 200), {
          timeoutMs: 6500,
          retries: 1,
        }),
      );
    }
    if (needScorers) {
      scorerTasks.push(
        fetchJson(espnSoccerAllUrl(prevYmd, 300), { timeoutMs: 5500, retries: 0 }),
        fetchJson(espnSoccerAllUrl(targetYmd, 300), { timeoutMs: 5500, retries: 0 }),
      );
    }
  } else {
    // Always fetch both prevYmd and targetYmd with limit=300 (ESPN defaults to 75,
    // silently truncating busy days and dropping late-night European games in IST).
    headerTasks.push(
      fetchJson(espnSoccerHeaderUrl(prevYmd, '', 300), { timeoutMs: 6500, retries: 1 }),
      fetchJson(espnSoccerHeaderUrl(targetYmd, '', 300), { timeoutMs: 6500, retries: 1 }),
    );
    if (needScorers) {
      scorerTasks.push(
        fetchJson(espnSoccerAllUrl(prevYmd, 300), { timeoutMs: 5500, retries: 0 }),
        fetchJson(espnSoccerAllUrl(targetYmd, 300), { timeoutMs: 5500, retries: 0 }),
      );
    }
    if (includeUpcoming) {
      const rangeParam = computeDateRangeParam(targetYmd, 7);
      const uefaRangeParam = computeDateRangeParam(targetYmd, 21);
      headerTasks.push(
        fetchJson(espnSoccerHeaderUrl(rangeParam, '', 200), { timeoutMs: 6000, retries: 0 }),
      );
      for (const slug of CURATED_FOOTBALL_LEAGUES) {
        const slugRange = UEFA_EXTENDED_LEAGUES.has(slug) ? uefaRangeParam : rangeParam;
        headerTasks.push(
          fetchJson(espnSoccerHeaderUrl(slugRange, slug, 200), { timeoutMs: 5500, retries: 0 }),
        );
      }
    }
  }

  const [headerSettled, scorerSettled] = await Promise.all([
    Promise.allSettled(headerTasks),
    Promise.allSettled(scorerTasks),
  ]);

  if (!headerSettled.some((r) => r.status === 'fulfilled')) {
    const firstErr = headerSettled.find((r) => r.status === 'rejected')?.reason;
    throw firstErr || new Error('ESPN Soccer header unreachable');
  }

  const scorersMap = buildScorersMap(
    scorerSettled.filter((r) => r.status === 'fulfilled').map((r) => r.value),
  );
  const leagueGroups = headerSettled.flatMap((r) =>
    r.status === 'fulfilled' ? r.value?.sports?.[0]?.leagues || [] : [],
  );

  const matches = [];
  const seen = new Set();

  for (const league of leagueGroups) {
    for (const ev of league?.events || []) {
      const m = normalizeHeaderEvent(ev, league, scorersMap);
      if (!m || seen.has(m.id)) continue;

      if (leagueFilter && !date) {
        // Explicit full-league query without date: keep the complete schedule.
      } else if (includeUpcoming) {
        // Drop finished matches from prevYmd (yesterday IST) while keeping live midnight-crossing games.
        if (m.dateISO && m.dateISO < targetIso && m.status !== 'live') continue;
      } else {
        // Specific IST date requested: keep only matches on targetIso (plus live games if viewing today).
        const matchesDay = !m.dateISO || m.dateISO === targetIso;
        const liveToday = targetIso === todayIso && m.status === 'live';
        if (!matchesDay && !liveToday) continue;
      }

      seen.add(m.id);
      matches.push(m);
    }
  }

  const statusRank = (s) => (s === 'live' ? 0 : s === 'scheduled' ? 1 : 2);
  const leagueRank = (slug) => TOP_LEAGUE_PRIORITY[slug] ?? 50;

  matches.sort((a, b) => {
    const sr = statusRank(a.status) - statusRank(b.status);
    if (sr !== 0) return sr;
    const lr = leagueRank(a.leagueSlug) - leagueRank(b.leagueSlug);
    if (lr !== 0) return lr;
    return String(a.time || '').localeCompare(String(b.time || ''));
  });

  return matches;
}

export function parseFootballIdAndLeague(rawIdInput, rawLeagueInput) {
  let rawId = String(rawIdInput || '').trim().replace(/^fb-/, '');
  let leagueSlug = String(rawLeagueInput || '').trim();

  // Composite form: "<leagueSlug>-<numericEventId>"
  const comp = rawId.match(/^([a-z0-9._-]+)-(\d+)$/i);
  if (comp) {
    if (!leagueSlug) leagueSlug = comp[1];
    rawId = comp[2];
  }

  if (!/^\d+$/.test(rawId) || rawId.length > 24) {
    const err = new Error('Invalid or missing ?id= numeric match id');
    err.status = 400;
    throw err;
  }
  if (leagueSlug && (leagueSlug.length > 48 || leagueSlug.includes('..') || !/^[a-z0-9._-]+$/i.test(leagueSlug))) {
    const err = new Error('Invalid ?league= league slug');
    err.status = 400;
    throw err;
  }
  return { eventId: rawId, leagueSlug };
}

function statLookup(teamStats) {
  const m = {};
  for (const s of teamStats || []) {
    if (s?.name) m[s.name] = s.displayValue ?? '';
  }
  return m;
}

function buildStatRow(label, hRaw, aRaw, suffix = '') {
  const hNum = parseFloat(String(hRaw || '').replace(/%/g, ''));
  const aNum = parseFloat(String(aRaw || '').replace(/%/g, ''));
  if (!Number.isFinite(hNum) && !Number.isFinite(aNum)) return null;
  const hv = Number.isFinite(hNum) ? hNum : 0;
  const av = Number.isFinite(aNum) ? aNum : 0;
  const total = hv + av;
  const pct = total > 0 ? Math.round((hv / total) * 100) : 50;
  const fmt = (n, raw) =>
    suffix === '%' ? `${Math.round(n)}%` : raw !== '' && raw != null ? String(raw) : String(n);
  return {
    label,
    homeVal: hv,
    awayVal: av,
    homeDisplay: fmt(hv, hRaw),
    awayDisplay: fmt(av, aRaw),
    pct,
  };
}

function parseLineups(rosters) {
  const out = [];
  for (const r of rosters || []) {
    const list = Array.isArray(r.roster) ? r.roster : [];
    const mapPlayer = (p) => ({
      name: p.athlete?.shortName || p.athlete?.displayName || 'Player',
      fullName: p.athlete?.displayName || '',
      jersey: p.jersey || '',
      pos: p.position?.abbreviation || '',
      positionName: p.position?.name || '',
      starter: Boolean(p.starter),
      subbedIn: Boolean(p.subbedIn),
      subbedOut: Boolean(p.subbedOut),
    });
    out.push({
      homeAway: r.homeAway || '',
      teamId: String(r.team?.id || ''),
      teamName: r.team?.displayName || r.team?.name || 'Team',
      short: r.team?.abbreviation || shortOf(r.team?.displayName),
      formation: r.formation || '',
      color: r.team?.color ? `#${String(r.team.color).replace(/^#/, '')}` : '#191C18',
      starters: list.filter((p) => p.starter).map(mapPlayer),
      subs: list.filter((p) => !p.starter).map(mapPlayer),
    });
  }
  const home = out.find((x) => x.homeAway === 'home') || out[0] || null;
  const away = out.find((x) => x.homeAway === 'away') || out[1] || null;
  return { home, away };
}

function eventIcon(typeText) {
  const t = String(typeText || '').toLowerCase();
  if (/goal|penalty.*scored/.test(t)) return 'goal';
  if (/red card/.test(t)) return 'red';
  if (/yellow card/.test(t)) return 'yellow';
  if (/sub/.test(t)) return 'sub';
  return 'note';
}

export async function fetchEspnFootballDetail(rawIdInput, rawLeagueInput) {
  let { eventId, leagueSlug } = parseFootballIdAndLeague(rawIdInput, rawLeagueInput);

  if (!leagueSlug) {
    const list = await fetchEspnFootballMatches();
    const hit = list.find((m) => m.rawId === eventId);
    if (hit?.leagueSlug) leagueSlug = hit.leagueSlug;
  }
  if (!leagueSlug) {
    const err = new Error('Missing ?league= ESPN league slug for this match');
    err.status = 400;
    throw err;
  }

  const summary = await fetchJson(espnSoccerSummaryUrl(leagueSlug, eventId), {
    timeoutMs: 10000,
    retries: 1,
  });

  const comp = summary?.header?.competitions?.[0] || {};
  const competitors = Array.isArray(comp.competitors) ? comp.competitors : [];
  const homeComp = competitors.find((c) => c.homeAway === 'home') || competitors[0] || {};
  const awayComp = competitors.find((c) => c.homeAway === 'away') || competitors[1] || {};
  const homeId = String(homeComp.id || homeComp.team?.id || '');
  const awayId = String(awayComp.id || awayComp.team?.id || '');

  const boxTeams = summary?.boxscore?.teams || [];
  const homeBox =
    boxTeams.find((t) => String(t.team?.id) === homeId) ||
    boxTeams.find((t) => t.homeAway === 'home') ||
    boxTeams[0];
  const awayBox =
    boxTeams.find((t) => String(t.team?.id) === awayId) ||
    boxTeams.find((t) => t.homeAway === 'away') ||
    boxTeams[1];

  const hSt = statLookup(homeBox?.statistics);
  const aSt = statLookup(awayBox?.statistics);

  const stats = [
    buildStatRow('Possession', hSt.possessionPct, aSt.possessionPct, '%'),
    buildStatRow('Shots on target', hSt.shotsOnTarget, aSt.shotsOnTarget),
    buildStatRow('Total shots', hSt.totalShots, aSt.totalShots),
    buildStatRow('Corners', hSt.wonCorners, aSt.wonCorners),
    buildStatRow('Fouls', hSt.foulsCommitted, aSt.foulsCommitted),
  ].filter(Boolean);

  const rawKeyEvents = Array.isArray(summary?.keyEvents) ? summary.keyEvents : [];
  const events = rawKeyEvents
    .map((k) => {
      const min = k.clock?.displayValue || '';
      const type = k.type?.text || '';
      const player = k.participants?.[0]?.athlete?.displayName || '';
      const team = k.team?.displayName || '';
      const kind = eventIcon(type);
      const title =
        kind === 'goal' && player
          ? `Goal. ${player}.`
          : player && type
            ? `${type} — ${player}`
            : k.shortText || k.text || type;
      const subtitle = k.text || [team, min].filter(Boolean).join(' · ');
      return { min, type, kind, player, team, title, subtitle, scoringPlay: Boolean(k.scoringPlay) };
    })
    .filter((e) => e.title);

  const latestScoring = [...events].reverse().find((e) => e.scoringPlay);
  const latestMoment = latestScoring || (events.length ? events[events.length - 1] : null);

  const lineups = parseLineups(summary?.rosters);
  const venueParts = [
    summary?.gameInfo?.venue?.fullName,
    summary?.gameInfo?.venue?.address?.city,
  ].filter(Boolean);

  const rawState = String(comp?.status?.type?.state || '').toLowerCase();
  const status = rawState === 'in' ? 'live' : rawState === 'post' ? 'ft' : 'scheduled';
  const clock = comp?.status?.displayClock || comp?.status?.type?.shortDetail || '';
  const period = Number(comp?.status?.period) || 0;
  const halfLabel =
    status === 'live'
      ? /HT|Halftime/i.test(comp?.status?.type?.shortDetail || '')
        ? 'HALF TIME'
        : period >= 2
          ? 'SECOND HALF'
          : 'FIRST HALF'
      : status === 'ft'
        ? 'FULL TIME'
        : 'SCHEDULED';

  const scheduledIst = comp?.date ? formatDateAndKickoff(comp.date).kickoffLabel : '';

  const header = {
    league: summary?.header?.league?.name || leagueSlug.toUpperCase(),
    round: comp?.notes?.[0]?.headline || summary?.header?.season?.name || '',
    status,
    clock:
      status === 'live'
        ? clock
        : status === 'scheduled' && scheduledIst && scheduledIst !== 'TBD'
          ? scheduledIst
          : comp?.status?.type?.shortDetail || '',
    halfLabel,
    venue: venueParts.join(', '),
    home: {
      name: homeComp.team?.displayName || 'Home',
      short: homeComp.team?.abbreviation || shortOf(homeComp.team?.displayName),
      score: readScoreText(homeComp.score) || (status === 'scheduled' ? null : '0'),
      logo: homeComp.team?.logos?.[0]?.href || '',
      color: homeComp.team?.color ? `#${String(homeComp.team.color).replace(/^#/, '')}` : '#D75043',
    },
    away: {
      name: awayComp.team?.displayName || 'Away',
      short: awayComp.team?.abbreviation || shortOf(awayComp.team?.displayName),
      score: readScoreText(awayComp.score) || (status === 'scheduled' ? null : '0'),
      logo: awayComp.team?.logos?.[0]?.href || '',
      color: awayComp.team?.color ? `#${String(awayComp.team.color).replace(/^#/, '')}` : '#5578D8',
    },
  };

  return {
    provider: 'espn',
    header,
    stats,
    latestMoment,
    lineups,
    events: [...events].reverse(),
  };
}

function extractScheduleEvents(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.events)) return payload.events;
  if (Array.isArray(payload?.schedule?.events)) return payload.schedule.events;
  if (Array.isArray(payload?.team?.events)) return payload.team.events;
  return [];
}

function normalizeFinishedFootballEvent(event, teamId) {
  const competition = event?.competitions?.[0] || event?.competition || {};
  const competitors = Array.isArray(event?.competitors)
    ? event.competitors
    : Array.isArray(competition?.competitors)
      ? competition.competitors
      : [];
  const own = competitors.find((entry) => String(entry?.id || entry?.team?.id || '') === String(teamId));
  const opponent = competitors.find((entry) => entry !== own);
  const state = String(event?.status?.type?.state || competition?.status?.type?.state || '').toLowerCase();
  const date = event?.date || competition?.date || '';
  const ownScoreText = readScoreText(own?.score);
  const opponentScoreText = readScoreText(opponent?.score);
  const ownScore = Number(own?.score?.value ?? ownScoreText);
  const opponentScore = Number(opponent?.score?.value ?? opponentScoreText);
  const dateMs = Date.parse(date);
  if (!own || !opponent || state !== 'post' || !Number.isFinite(dateMs)) return null;

  let result = '';
  if (own.winner === true) result = 'W';
  else if (opponent.winner === true) result = 'L';
  else if (Number.isFinite(ownScore) && Number.isFinite(opponentScore)) {
    result = ownScore === opponentScore ? 'D' : ownScore > opponentScore ? 'W' : 'L';
  }
  if (!result) return null;

  const historicalHome = competitors.find((entry) => entry?.homeAway === 'home') || competitors[0];
  const historicalAway = competitors.find((entry) => entry?.homeAway === 'away') || competitors.find((entry) => entry !== historicalHome);

  return {
    date: new Date(dateMs).toISOString(),
    opponent: opponent?.team?.displayName || opponent?.team?.name || opponent?.displayName || opponent?.name || 'Opponent',
    score: `${ownScoreText || '–'}–${opponentScoreText || '–'}`,
    result,
    opponentId: String(opponent?.id || opponent?.team?.id || ''),
    homeName: historicalHome?.team?.displayName || historicalHome?.displayName || historicalHome?.name || '',
    awayName: historicalAway?.team?.displayName || historicalAway?.displayName || historicalAway?.name || '',
    homeScore: readScoreText(historicalHome?.score),
    awayScore: readScoreText(historicalAway?.score),
  }
}

function findStandingEntries(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 7) return [];
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStandingEntries(item, depth + 1);
      if (found.length) return found;
    }
    return [];
  }
  if (Array.isArray(value.entries) && value.entries.length) return value.entries;
  if (value.standings && Array.isArray(value.standings.entries)) return value.standings.entries;
  for (const child of Object.values(value)) {
    const found = findStandingEntries(child, depth + 1);
    if (found.length) return found;
  }
  return [];
}

function normalizeStandingEntry(entry) {
  const stats = Array.isArray(entry?.stats) ? entry.stats : [];
  const stat = (names) => {
    const found = stats.find((item) => names.includes(String(item?.name || '').toLowerCase()));
    return found?.displayValue ?? found?.value ?? '';
  };
  const rank = stat(['rank', 'position', 'playoffseed']);
  const points = stat(['points', 'overallpoints']);
  const played = stat(['gamesplayed', 'played', 'overallgamesplayed']);
  const wins = stat(['wins', 'overallwins']);
  const draws = stat(['ties', 'draws', 'overalltied']);
  const losses = stat(['losses', 'overalllosses']);
  if (!rank && !points && !played) return null;
  return {
    rank: rank ? String(rank) : '',
    points: points ? String(points) : '',
    played: played ? String(played) : '',
    record: [wins, draws, losses].every((value) => value !== '')
      ? `${wins}-${draws}-${losses}`
      : '',
  };
}

export async function fetchEspnFootballPreview({
  leagueSlug,
  homeId,
  awayId,
  homeName = 'Home',
  awayName = 'Away',
  date = '',
}) {
  const league = String(leagueSlug || '').trim();
  const homeTeamId = String(homeId || '').trim();
  const awayTeamId = String(awayId || '').trim();
  const targetMs = Date.parse(date);
  if (
    !league ||
    league.length > 48 ||
    league.includes('..') ||
    !/^[a-z0-9._-]+$/i.test(league) ||
    !/^\d{1,24}$/.test(homeTeamId) ||
    !/^\d{1,24}$/.test(awayTeamId)
  ) {
    return { form: { home: [], away: [] }, headToHead: [], standings: null };
  }

  const teamScheduleUrl = (id) =>
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${encodeURIComponent(league)}/teams/${encodeURIComponent(id)}/schedule`;
  const standingsUrl = `https://site.api.espn.com/apis/v2/sports/soccer/${encodeURIComponent(league)}/standings`;
  const [homeScheduleResult, awayScheduleResult, standingsResult] = await Promise.allSettled([
    fetchJson(teamScheduleUrl(homeTeamId), { timeoutMs: 6500, retries: 0 }),
    fetchJson(teamScheduleUrl(awayTeamId), { timeoutMs: 6500, retries: 0 }),
    fetchJson(standingsUrl, { timeoutMs: 6500, retries: 0 }),
  ]);

  const scheduleEvents = new Map();
  for (const result of [homeScheduleResult, awayScheduleResult]) {
    if (result.status !== 'fulfilled') continue;
    for (const event of extractScheduleEvents(result.value)) {
      const id = String(event?.id || '');
      if (id) scheduleEvents.set(id, event);
    }
  }

  const beforeTarget = (event) => {
    const parsed = normalizeFinishedFootballEvent(event, homeTeamId);
    return parsed && (!Number.isFinite(targetMs) || Date.parse(parsed.date) < targetMs) ? parsed : null;
  };
  const homeForm = [...scheduleEvents.values()]
    .map((event) => beforeTarget(event))
    .filter(Boolean)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 5)
    .map(({ date: resultDate, opponent, score, result }) => ({ date: resultDate, opponent, score, result }));

  const awayEvents = new Map();
  if (awayScheduleResult.status === 'fulfilled') {
    for (const event of extractScheduleEvents(awayScheduleResult.value)) {
      const id = String(event?.id || '');
      if (id) awayEvents.set(id, event);
    }
  }
  const awayForm = [...awayEvents.values()]
    .map((event) => normalizeFinishedFootballEvent(event, awayTeamId))
    .filter((event) => event && (!Number.isFinite(targetMs) || Date.parse(event.date) < targetMs))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 5)
    .map(({ date: resultDate, opponent, score, result }) => ({ date: resultDate, opponent, score, result }));

  const headToHead = [...scheduleEvents.values()]
    .map((event) => normalizeFinishedFootballEvent(event, homeTeamId))
    .filter((event) => event?.opponentId === awayTeamId && (!Number.isFinite(targetMs) || Date.parse(event.date) < targetMs))
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
    const entries = findStandingEntries(standingsResult.value);
    const findEntry = (teamId) => entries.find((entry) => String(entry?.team?.id || entry?.id || '') === teamId);
    standings = {
      competition: standingsResult.value?.name || standingsResult.value?.header?.name || '',
      home: normalizeStandingEntry(findEntry(homeTeamId)),
      away: normalizeStandingEntry(findEntry(awayTeamId)),
    };
    if (!standings.home && !standings.away) standings = null;
  }

  return { form: { home: homeForm, away: awayForm }, headToHead, standings };
}
