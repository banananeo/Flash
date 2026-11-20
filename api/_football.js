// Shared helpers + normalizers for ESPN Soccer (Football) public JSON APIs.
// Leading `_` = not routed by Vercel (same convention as api/_cricket.js).
// Unauthenticated public JSON feeds — no API key required, no 100 req/day quota.

export const espnSoccerHeaderUrl = (date) => {
  const base = 'https://site.web.api.espn.com/apis/v2/scoreboard/header?sport=soccer';
  return date ? `${base}&dates=${encodeURIComponent(date)}` : base;
};

export const espnSoccerAllUrl = (date) => {
  const base = 'https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard';
  return date ? `${base}?dates=${encodeURIComponent(date)}` : base;
};

export const espnSoccerSummaryUrl = (leagueSlug, eventId) =>
  `https://site.api.espn.com/apis/site/v2/sports/soccer/${encodeURIComponent(leagueSlug)}/summary?event=${encodeURIComponent(eventId)}`;

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
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return 'TBD';
  }
}

function buildScorersMap(allScoreboardJson) {
  // eventId -> { [teamId]: ["Saka 12'", "Havertz 54'"] }
  const map = new Map();
  for (const ev of allScoreboardJson?.events || []) {
    const id = String(ev?.id || '');
    const details = ev?.competitions?.[0]?.details || [];
    if (!id || !details.length) continue;
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

export async function fetchEspnFootballMatches(rawDate = '') {
  const date = sanitizeDateParam(rawDate);
  const [headerRes, allRes] = await Promise.allSettled([
    fetchJson(espnSoccerHeaderUrl(date), { timeoutMs: 10000, retries: 1 }),
    fetchJson(espnSoccerAllUrl(date), { timeoutMs: 8000, retries: 0 }),
  ]);

  if (headerRes.status !== 'fulfilled') {
    throw headerRes.reason || new Error('ESPN Soccer header unreachable');
  }

  const scorersMap = allRes.status === 'fulfilled' ? buildScorersMap(allRes.value) : new Map();
  const leagues = headerRes.value?.sports?.[0]?.leagues || [];
  const matches = [];
  const seen = new Set();

  for (const league of leagues) {
    for (const ev of league?.events || []) {
      const m = normalizeHeaderEvent(ev, league, scorersMap);
      if (!m || seen.has(m.id)) continue;
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

  if (!/^\d+$/.test(rawId)) {
    const err = new Error('Invalid or missing ?id= numeric ESPN match id');
    err.status = 400;
    throw err;
  }
  if (leagueSlug && !/^[a-z0-9._-]+$/i.test(leagueSlug)) {
    const err = new Error('Invalid ?league= ESPN league slug');
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
  const hNum = parseFloat(String(hRaw || '').replace('%', ''));
  const aNum = parseFloat(String(aRaw || '').replace('%', ''));
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
        : comp?.status?.type?.shortDetail || 'SCHEDULED';

  const header = {
    league: summary?.header?.league?.name || leagueSlug.toUpperCase(),
    round: comp?.notes?.[0]?.headline || summary?.header?.season?.name || '',
    status,
    clock: status === 'live' ? clock : comp?.status?.type?.shortDetail || '',
    halfLabel,
    venue: venueParts.join(', '),
    home: {
      name: homeComp.team?.displayName || 'Home',
      short: homeComp.team?.abbreviation || shortOf(homeComp.team?.displayName),
      score: homeComp.score ?? '0',
      logo: homeComp.team?.logos?.[0]?.href || '',
      color: homeComp.team?.color ? `#${String(homeComp.team.color).replace(/^#/, '')}` : '#D75043',
    },
    away: {
      name: awayComp.team?.displayName || 'Away',
      short: awayComp.team?.abbreviation || shortOf(awayComp.team?.displayName),
      score: awayComp.score ?? '0',
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
