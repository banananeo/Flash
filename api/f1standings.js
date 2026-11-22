// Vercel serverless route: GET /api/f1standings?kind=...
// Single query-routed function serving low-latency F1 standings, results, schedule & telemetry.
import { fetchF1Telemetry } from './_f1telemetry.js';
import {
  fetchFreshDriverStandings,
  fetchFreshConstructorStandings,
  fetchFreshRaceResults,
  fetchFreshQualifying,
  fetchFreshSchedule,
} from './_f1fresh.js';
import { applyApiSecurity, sendApiError } from './_security.js';

const ROUND_RE = /^(\d{1,2}|last)$/;
const SESSION_RE = /^(|FP1|FP2|FP3|SQ|SPR|QUAL|RACE)$/i;

export default async function handler(req, res) {
  if (applyApiSecurity(req, res)) return;

  const url = new URL(req.url, 'http://localhost');
  const kind = url.searchParams.get('kind') || 'drivers';
  const force = url.searchParams.has('t') || url.searchParams.get('force') === '1';

  const setCache = (defaultHeader) => {
    res.setHeader('Cache-Control', force ? 'no-store' : defaultHeader);
    res.setHeader('Content-Type', 'application/json');
  };

  try {
    if (kind === 'telemetry') {
      const sessionCode = (url.searchParams.get('session') || '').trim();
      if (!SESSION_RE.test(sessionCode)) {
        return sendApiError(res, 400, 'Invalid session code');
      }
      const data = await fetchF1Telemetry({ sessionCode, force });
      setCache('s-maxage=30, stale-while-revalidate=60');
      return res.status(200).json(data);
    }

    if (kind === 'schedule') {
      const data = await fetchFreshSchedule({ force });
      if (!data) return sendApiError(res, 502, 'F1 schedule temporarily unavailable.');
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
        return sendApiError(res, 400, 'Invalid round parameter');
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
  } catch {
    return sendApiError(res, 502, 'F1 data temporarily unavailable.');
  }
}
