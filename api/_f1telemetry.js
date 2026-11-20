// Hybrid 100% Free F1 Live Timing & Telemetry aggregator:
//   1. ESPN F1 Header API (site.web.api.espn.com/apis/v2/scoreboard/header?sport=racing&league=f1)
//      → 100% free & keyless EVEN DURING LIVE SESSIONS (FP1/FP2/FP3/Sprint/Quali/Race),
//        providing live session status, P1–P22 order, lap times, laps completed, team colours, headshots.
//   2. OpenF1 Free Community Tier (api.openf1.org/v1/*)
//      → 100% free & keyless 30 minutes after each session finishes, enriching the session with
//        Sector 1/2/3 best splits (and purple overall-fastest flags), Speed Trap (km/h),
//        Pirelli Tyre Stint strategy (S/M/H/I/W), Track Weather, FIA Race Control feed,
//        and playable Team Radio MP3 clips.
//
// Leading `_` = not counted as a separate Vercel serverless function (routed via api/f1standings.js?kind=telemetry).

const ESPN_F1_HEADER_URL =
  'https://site.web.api.espn.com/apis/v2/scoreboard/header?sport=racing&league=f1';
const OPENF1_BASE = 'https://api.openf1.org/v1';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0',
  Accept: 'application/json',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJsonSafe(url, timeoutMs = 8000, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctl.signal, headers: HEADERS });
      if (res.status === 429 && attempt < retries) {
        await sleep(1100 * (attempt + 1));
        continue;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch {
      if (attempt < retries) await sleep(500);
    } finally {
      clearTimeout(t);
    }
  }
  return null;
}

// In-memory cache so repeated requests or tab switches respect OpenF1's 3 req/sec & 30 req/min limit
const telemetryCache = new Map();
let meetingMetaCache = { ts: 0, openMeeting: null, openSessionList: [] };

export function formatLapDuration(seconds) {
  const s = Number(seconds);
  if (!Number.isFinite(s) || s <= 0) return '';
  const mins = Math.floor(s / 60);
  const rem = s - mins * 60;
  const secStr = rem < 10 ? `0${rem.toFixed(3)}` : rem.toFixed(3);
  return mins > 0 ? `${mins}:${secStr}` : `${rem.toFixed(3)}s`;
}

function formatSectorTime(seconds) {
  const s = Number(seconds);
  if (!Number.isFinite(s) || s <= 0) return '';
  return s.toFixed(3);
}

function shortSessionCode(name = '', abbr = '') {
  const a = String(abbr || '').toUpperCase();
  if (a === 'FP1' || a === 'FP2' || a === 'FP3') return a;
  const n = String(name || '').toLowerCase();
  if (n.includes('practice 1') || n === 'fp1') return 'FP1';
  if (n.includes('practice 2') || n === 'fp2') return 'FP2';
  if (n.includes('practice 3') || n === 'fp3') return 'FP3';
  if (n.includes('sprint qualifying') || n.includes('sprint shootout')) return 'SQ';
  if (n === 'sprint' || n.includes('sprint')) return 'SPR';
  if (n.includes('qual')) return 'QUAL';
  if (n.includes('race')) return 'RACE';
  return a || name.slice(0, 4).toUpperCase();
}

function fullSessionLabel(code, fallback) {
  const map = {
    FP1: 'Practice 1',
    FP2: 'Practice 2',
    FP3: 'Practice 3',
    SQ: 'Sprint Qualifying',
    SPR: 'Sprint',
    QUAL: 'Qualifying',
    RACE: 'Race',
  };
  return map[code] || fallback || code;
}

function normalizeEspnEvent(ev) {
  const abbr = ev?.competitionType?.abbreviation || ev?.competitionTypeAbbreviation || '';
  const text = ev?.competitionType?.text || '';
  const code = shortSessionCode(text, abbr);
  const rawState = String(ev?.status || ev?.fullStatus?.type?.state || 'pre').toLowerCase();
  const status = rawState === 'in' ? 'live' : rawState === 'post' ? 'finished' : 'upcoming';

  const competitors = Array.isArray(ev?.competitors) ? ev.competitors : [];
  const drivers = competitors
    .map((c, idx) => {
      const place = Number(c?.place) || Number(c?.order) || idx + 1;
      const num = String(c?.vehicle?.number || '');
      const fullName = c?.displayName || c?.name || 'Driver';
      const last = c?.lastName || fullName.split(' ').slice(-1)[0] || '';
      const acro = String(last).slice(0, 3).toUpperCase();
      return {
        pos: place,
        num,
        name: fullName,
        acro,
        team: c?.vehicle?.manufacturer || '',
        colour: String(c?.vehicle?.teamColor || '64748B').replace(/^#/, ''),
        headshot: c?.headshot || '',
        flag: c?.logo || '',
        bestLapDisplay: c?.time || '',
        bestLapSec: null,
        gapDisplay: '',
        laps: Number(c?.laps) || Number(c?.status?.period) || 0,
        statusText: c?.status?.displayValue || '',
        s1: '',
        s2: '',
        s3: '',
        purpleS1: false,
        purpleS2: false,
        purpleS3: false,
        topSpeed: null,
        currentCompound: '',
        stints: [],
      };
    })
    .sort((a, b) => a.pos - b.pos);

  return {
    code,
    name: fullSessionLabel(code, text),
    status,
    statusDetail: ev?.fullStatus?.type?.detail || '',
    date: ev?.date || '',
    meetingName: ev?.name || '',
    location: ev?.location || '',
    drivers,
  };
}

export async function fetchF1Telemetry({ sessionCode = '' } = {}) {
  const cacheKey = String(sessionCode || 'auto').toUpperCase();
  const cached = telemetryCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < 45 * 1000) {
    return cached.data;
  }

  // 1) Fetch ESPN F1 header + OpenF1 meeting/sessions (cached 5 min to save OpenF1 quota)
  const needMeetingMeta = Date.now() - meetingMetaCache.ts > 5 * 60 * 1000 || !meetingMetaCache.openSessionList.length;
  const [espnJson, openMeetings, openSessions] = await Promise.all([
    fetchJsonSafe(ESPN_F1_HEADER_URL, 8000, 1),
    needMeetingMeta ? fetchJsonSafe(`${OPENF1_BASE}/meetings?meeting_key=latest`, 7000) : Promise.resolve([meetingMetaCache.openMeeting]),
    needMeetingMeta ? fetchJsonSafe(`${OPENF1_BASE}/sessions?meeting_key=latest`, 7000) : Promise.resolve(meetingMetaCache.openSessionList),
  ]);

  const espnEvents = (espnJson?.sports?.[0]?.leagues?.[0]?.events || []).map(normalizeEspnEvent);
  const openMeeting = Array.isArray(openMeetings) && openMeetings[0] ? openMeetings[0] : meetingMetaCache.openMeeting;
  const openSessionList = Array.isArray(openSessions) && openSessions.length ? openSessions : meetingMetaCache.openSessionList;
  if (openMeeting && openSessionList.length && needMeetingMeta) {
    meetingMetaCache = { ts: Date.now(), openMeeting, openSessionList };
  }

  // Map OpenF1 sessions by short code (FP1, FP2, FP3, QUAL, SPR, SQ, RACE)
  const openByCode = new Map();
  for (const s of openSessionList) {
    const code = shortSessionCode(s.session_name || s.session_type, '');
    openByCode.set(code, s);
  }

  // Merge session list for the weekend selector
  const codesOrder = ['FP1', 'FP2', 'FP3', 'SQ', 'SPR', 'QUAL', 'RACE'];
  const allCodes = new Set([
    ...espnEvents.map((e) => e.code),
    ...openByCode.keys(),
  ]);

  const sessions = [...allCodes]
    .sort((a, b) => {
      const ia = codesOrder.indexOf(a);
      const ib = codesOrder.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    })
    .map((code) => {
      const espnEv = espnEvents.find((e) => e.code === code);
      const openEv = openByCode.get(code);
      const now = Date.now();
      const startMs = openEv?.date_start ? Date.parse(openEv.date_start) : espnEv?.date ? Date.parse(espnEv.date) : NaN;
      const endMs = openEv?.date_end ? Date.parse(openEv.date_end) : NaN;
      let status = espnEv?.status || 'upcoming';
      if (!espnEv && Number.isFinite(startMs)) {
        if (Number.isFinite(endMs) && now > endMs) status = 'finished';
        else if (now >= startMs) status = 'live';
      }
      return {
        code,
        name: espnEv?.name || fullSessionLabel(code, openEv?.session_name),
        status,
        date: espnEv?.date || openEv?.date_start || '',
        sessionKey: openEv?.session_key || null,
        hasEspnDrivers: Boolean(espnEv?.drivers?.length),
      };
    });

  // Choose which session to inspect:
  // explicit sessionCode -> currently live session -> latest finished session with data -> first session
  const requestedCode = String(sessionCode || '').toUpperCase();
  const activeSessionMeta =
    sessions.find((s) => s.code === requestedCode) ||
    sessions.find((s) => s.status === 'live') ||
    [...sessions].reverse().find((s) => s.status === 'finished' || s.hasEspnDrivers) ||
    sessions[0] ||
    null;

  const activeCode = activeSessionMeta?.code || 'FP2';
  const espnActive = espnEvents.find((e) => e.code === activeCode) || null;
  const openActive = openByCode.get(activeCode) || null;
  const targetSessionKey = openActive?.session_key || 'latest';

  // 2) Fetch OpenF1 telemetry streams in two 3-req waves (respects OpenF1's 3 req/sec free rate limit)
  if (needMeetingMeta) await sleep(950);
  const [openDrivers, openLaps, openStints] = await Promise.all([
    fetchJsonSafe(`${OPENF1_BASE}/drivers?session_key=${targetSessionKey}`, 7500),
    fetchJsonSafe(`${OPENF1_BASE}/laps?session_key=${targetSessionKey}`, 8500),
    fetchJsonSafe(`${OPENF1_BASE}/stints?session_key=${targetSessionKey}`, 7500),
  ]);
  await sleep(1000);
  const [openWeather, openRaceControl, openRadio] = await Promise.all([
    fetchJsonSafe(`${OPENF1_BASE}/weather?session_key=${targetSessionKey}`, 7000),
    fetchJsonSafe(`${OPENF1_BASE}/race_control?session_key=${targetSessionKey}`, 7500),
    fetchJsonSafe(`${OPENF1_BASE}/team_radio?session_key=${targetSessionKey}`, 7000),
  ]);

  const driverMetaByNum = new Map();
  for (const d of Array.isArray(openDrivers) ? openDrivers : []) {
    const num = String(d.driver_number || '');
    if (!num) continue;
    driverMetaByNum.set(num, {
      num,
      name: d.full_name || d.broadcast_name || `Driver #${num}`,
      acro: String(d.name_acronym || '').toUpperCase() || '???',
      team: d.team_name || '',
      colour: String(d.team_colour || '64748B').replace(/^#/, ''),
      headshot: d.headshot_url || '',
    });
  }

  // Group stints by driver_number
  const stintsByNum = new Map();
  for (const st of Array.isArray(openStints) ? openStints : []) {
    const num = String(st.driver_number || '');
    if (!num) continue;
    if (!stintsByNum.has(num)) stintsByNum.set(num, []);
    stintsByNum.get(num).push({
      stintNumber: Number(st.stint_number) || 1,
      compound: String(st.compound || 'UNKNOWN').toUpperCase(),
      lapStart: Number(st.lap_start) || 1,
      lapEnd: Number(st.lap_end) || Number(st.lap_start) || 1,
      tyreAge: Number(st.tyre_age_at_start) || 0,
    });
  }
  for (const list of stintsByNum.values()) {
    list.sort((a, b) => a.stintNumber - b.stintNumber);
  }

  // Aggregate laps by driver_number (best lap, best S1/S2/S3, speed trap, lap count)
  const lapStatsByNum = new Map();
  let overallBestS1 = Infinity;
  let overallBestS2 = Infinity;
  let overallBestS3 = Infinity;

  for (const lap of Array.isArray(openLaps) ? openLaps : []) {
    const num = String(lap.driver_number || '');
    if (!num) continue;
    if (!lapStatsByNum.has(num)) {
      lapStatsByNum.set(num, {
        bestLapSec: Infinity,
        bestS1: Infinity,
        bestS2: Infinity,
        bestS3: Infinity,
        topSpeed: 0,
        laps: 0,
      });
    }
    const st = lapStatsByNum.get(num);
    const lapNo = Number(lap.lap_number) || 0;
    if (lapNo > st.laps) st.laps = lapNo;

    const dur = Number(lap.lap_duration);
    if (Number.isFinite(dur) && dur > 20 && dur < st.bestLapSec) {
      st.bestLapSec = dur;
    }
    const s1 = Number(lap.duration_sector_1);
    if (Number.isFinite(s1) && s1 > 5 && s1 < st.bestS1) {
      st.bestS1 = s1;
      if (s1 < overallBestS1) overallBestS1 = s1;
    }
    const s2 = Number(lap.duration_sector_2);
    if (Number.isFinite(s2) && s2 > 5 && s2 < st.bestS2) {
      st.bestS2 = s2;
      if (s2 < overallBestS2) overallBestS2 = s2;
    }
    const s3 = Number(lap.duration_sector_3);
    if (Number.isFinite(s3) && s3 > 5 && s3 < st.bestS3) {
      st.bestS3 = s3;
      if (s3 < overallBestS3) overallBestS3 = s3;
    }
    const spd = Math.max(
      Number(lap.st_speed) || 0,
      Number(lap.i2_speed) || 0,
      Number(lap.i1_speed) || 0,
    );
    if (spd > st.topSpeed) st.topSpeed = Math.round(spd);
  }

  // Merge ESPN driver classification + OpenF1 telemetry
  let drivers = [];
  const hasOpenTelemetry = lapStatsByNum.size > 0;

  if (espnActive?.drivers?.length) {
    drivers = espnActive.drivers.map((ed) => {
      const oMeta = driverMetaByNum.get(ed.num);
      const oLap = lapStatsByNum.get(ed.num);
      const stints = stintsByNum.get(ed.num) || [];
      const lastStint = stints[stints.length - 1];
      const bestLapSec =
        oLap && Number.isFinite(oLap.bestLapSec) ? oLap.bestLapSec : null;

      return {
        ...ed,
        name: ed.name || oMeta?.name || 'Driver',
        acro: oMeta?.acro || ed.acro,
        team: ed.team || oMeta?.team || '',
        colour: oMeta?.colour || ed.colour,
        headshot: ed.headshot || oMeta?.headshot || '',
        bestLapSec,
        bestLapDisplay: ed.bestLapDisplay || (bestLapSec ? formatLapDuration(bestLapSec) : ''),
        laps: Math.max(ed.laps || 0, oLap?.laps || 0),
        s1: oLap && Number.isFinite(oLap.bestS1) ? formatSectorTime(oLap.bestS1) : '',
        s2: oLap && Number.isFinite(oLap.bestS2) ? formatSectorTime(oLap.bestS2) : '',
        s3: oLap && Number.isFinite(oLap.bestS3) ? formatSectorTime(oLap.bestS3) : '',
        purpleS1: Boolean(oLap && Number.isFinite(oLap.bestS1) && Math.abs(oLap.bestS1 - overallBestS1) < 0.0005),
        purpleS2: Boolean(oLap && Number.isFinite(oLap.bestS2) && Math.abs(oLap.bestS2 - overallBestS2) < 0.0005),
        purpleS3: Boolean(oLap && Number.isFinite(oLap.bestS3) && Math.abs(oLap.bestS3 - overallBestS3) < 0.0005),
        topSpeed: oLap?.topSpeed || null,
        currentCompound: lastStint?.compound || '',
        stints,
      };
    });
  } else if (driverMetaByNum.size > 0) {
    // Build leaderboard purely from OpenF1 laps + drivers
    const raw = [];
    for (const [num, meta] of driverMetaByNum.entries()) {
      const oLap = lapStatsByNum.get(num);
      const stints = stintsByNum.get(num) || [];
      const lastStint = stints[stints.length - 1];
      const bestLapSec = oLap && Number.isFinite(oLap.bestLapSec) ? oLap.bestLapSec : null;
      raw.push({
        pos: 99,
        num,
        name: meta.name,
        acro: meta.acro,
        team: meta.team,
        colour: meta.colour,
        headshot: meta.headshot,
        flag: '',
        bestLapSec,
        bestLapDisplay: bestLapSec ? formatLapDuration(bestLapSec) : '',
        gapDisplay: '',
        laps: oLap?.laps || 0,
        statusText: '',
        s1: oLap && Number.isFinite(oLap.bestS1) ? formatSectorTime(oLap.bestS1) : '',
        s2: oLap && Number.isFinite(oLap.bestS2) ? formatSectorTime(oLap.bestS2) : '',
        s3: oLap && Number.isFinite(oLap.bestS3) ? formatSectorTime(oLap.bestS3) : '',
        purpleS1: Boolean(oLap && Number.isFinite(oLap.bestS1) && Math.abs(oLap.bestS1 - overallBestS1) < 0.0005),
        purpleS2: Boolean(oLap && Number.isFinite(oLap.bestS2) && Math.abs(oLap.bestS2 - overallBestS2) < 0.0005),
        purpleS3: Boolean(oLap && Number.isFinite(oLap.bestS3) && Math.abs(oLap.bestS3 - overallBestS3) < 0.0005),
        topSpeed: oLap?.topSpeed || null,
        currentCompound: lastStint?.compound || '',
        stints,
      });
    }
    raw.sort((a, b) => {
      if (a.bestLapSec != null && b.bestLapSec != null) return a.bestLapSec - b.bestLapSec;
      if (a.bestLapSec != null) return -1;
      if (b.bestLapSec != null) return 1;
      return b.laps - a.laps;
    });
    drivers = raw.map((d, i) => ({ ...d, pos: i + 1 }));
  }

  // Compute gaps to P1 when bestLapSec is available
  const leaderBest = drivers.find((d) => d.bestLapSec != null)?.bestLapSec ?? null;
  if (leaderBest != null) {
    drivers = drivers.map((d, idx) => {
      if (idx === 0 || d.bestLapSec == null) return d;
      const diff = d.bestLapSec - leaderBest;
      return {
        ...d,
        gapDisplay: diff > 0 ? `+${diff.toFixed(3)}s` : '',
      };
    });
  }

  // Weather snapshot (latest entry)
  const latestWeather =
    Array.isArray(openWeather) && openWeather.length
      ? openWeather[openWeather.length - 1]
      : null;
  const weather = latestWeather
    ? {
        airTemp: Number(latestWeather.air_temperature)?.toFixed(1) || null,
        trackTemp: Number(latestWeather.track_temperature)?.toFixed(1) || null,
        humidity: Math.round(Number(latestWeather.humidity) || 0),
        windSpeed: Number(latestWeather.wind_speed)?.toFixed(1) || null,
        rainfall: Boolean(Number(latestWeather.rainfall) > 0),
      }
    : null;

  // Race Control messages (newest first, up to 25)
  const raceControl = (Array.isArray(openRaceControl) ? openRaceControl : [])
    .slice(-25)
    .reverse()
    .map((rc, idx) => ({
      id: `rc-${idx}-${rc.date || ''}`,
      date: rc.date || '',
      lap: rc.lap_number || null,
      category: rc.category || 'Track',
      flag: rc.flag || '',
      scope: rc.scope || '',
      message: rc.message || '',
    }))
    .filter((rc) => rc.message);

  // Team Radio clips (newest first, up to 14)
  const teamRadio = (Array.isArray(openRadio) ? openRadio : [])
    .slice(-14)
    .reverse()
    .map((tr, idx) => {
      const num = String(tr.driver_number || '');
      const meta =
        driverMetaByNum.get(num) ||
        drivers.find((d) => d.num === num) ||
        {};
      return {
        id: `tr-${idx}-${num}-${tr.date || ''}`,
        num,
        name: meta.name || `Driver #${num}`,
        acro: meta.acro || `#${num}`,
        team: meta.team || '',
        colour: meta.colour || '0D9488',
        date: tr.date || '',
        url: tr.recording_url || '',
      };
    })
    .filter((tr) => tr.url);

  const meetingName =
    openMeeting?.meeting_name ||
    espnActive?.meetingName ||
    espnEvents[0]?.meetingName ||
    'Grand Prix Weekend';

  const location =
    openMeeting?.location ||
    openActive?.location ||
    espnActive?.location ||
    '';

  const result = {
    meetingName,
    officialName: openMeeting?.meeting_official_name || meetingName,
    location,
    country: openMeeting?.country_name || openActive?.country_name || '',
    sessions,
    activeSession: {
      code: activeCode,
      name: activeSessionMeta?.name || fullSessionLabel(activeCode, ''),
      status: activeSessionMeta?.status || 'finished',
      date: activeSessionMeta?.date || '',
      sessionKey: openActive?.session_key || null,
      hasOpenTelemetry,
      source:
        hasOpenTelemetry && espnActive?.drivers?.length
          ? 'espn+openf1'
          : hasOpenTelemetry
            ? 'openf1'
            : 'espn',
    },
    weather,
    drivers,
    raceControl,
    teamRadio,
  };

  if (drivers.length) {
    telemetryCache.set(cacheKey, { ts: Date.now(), data: result });
    telemetryCache.set(activeCode, { ts: Date.now(), data: result });
  }
  return result;
}
