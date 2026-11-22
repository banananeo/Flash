// Vercel serverless route: GET /api/f1standings?kind=...
// Single query-routed function serving low-latency F1 standings, results, schedule & telemetry:
//   kind=drivers|constructors     -> Fresh driver / constructor standings
//   kind=schedule                 -> Season calendar + session times
//   kind=results&round=N|last     -> Fresh race classification
//   kind=qualifying&round=N|last  -> Fresh qualifying classification
//   kind=telemetry[&session=...]  -> Live & post-session telemetry

import { fetchF1Telemetry } from './_f1telemetry.js';
import {
  fetchFreshDriverStandings,
  fetchFreshConstructorStandings,
  fetchFreshRaceResults,
  fetchFreshQualifying,
  fetchFreshSchedule,
} from './_f1fresh.js';

const ROUND_RE = /^(\d{1,2}|last)$/;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, 'http://localhost');
  const kind = url.searchParams.get('kind') || 'drivers';
  const force = url.searchParams.has('t') || url.searchParams.get('force') === '1';

  const setCache = (defaultHeader) => {
    res.setHeader('Cache-Control', force ? 'no-store' : defaultHeader);
    res.setHeader('Content-Type', 'application/json');
  };

  try {
    if (kind === 'telemetry') {
      const sessionCode = url.searchParams.get('session') || '';
      const data = await fetchF1Telemetry({ sessionCode, force });
      setCache('s-maxage=30, stale-while-revalidate=60');
      return res.status(200).json(data);
    }

    if (kind === 'schedule') {
      const data = await fetchFreshSchedule({ force });
      if (!data) return res.status(502).json({ error: 'F1 schedule unreachable' });
      setCache('s-maxage=3600, stale-while-revalidate=1800');
      return res.status(200).json(data);
    }

    if (kind === 'constructors') {
      const data = await fetchFreshConstructorStandings({ force });
      setCache('s-maxage=60, stale-while-revalidate=120');
      return res.status(200).json(data);
    }

    if (kind === 'results' || kind === 'qualifying') {
      const round = url.searchParams.get('round') || 'last';
      if (!ROUND_RE.test(round)) {
        return res.status(400).json({ error: 'Bad ?round= — use a number or last' });
      }
      const data =
        kind === 'qualifying'
          ? await fetchFreshQualifying(round, { force })
          : await fetchFreshRaceResults(round, { force });
      setCache('s-maxage=60, stale-while-revalidate=120');
      return res.status(200).json(data);
    }

    const data = await fetchFreshDriverStandings({ force });
    setCache('s-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: `F1 upstream unreachable: ${e?.message || 'Unknown error'}` });
  }
}
