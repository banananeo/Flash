import { useState } from 'react'

function StatBar({ stat }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-[14px]">
        <span className="font-display font-bold text-ink">{stat.homeDisplay}</span>
        <span className="text-[13px] font-medium text-muted">{stat.label}</span>
        <span className="font-display font-bold text-ink">{stat.awayDisplay}</span>
      </div>
      <div className="h-[4px] w-full overflow-hidden rounded-full bg-hairline-soft">
        <div
          className="h-full rounded-full bg-ink transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, stat.pct ?? 50))}%` }}
        />
      </div>
    </div>
  )
}

// 06 · Match centre (Football) — Overview | Line-ups | Timeline
export function FootballBoard({ match, detail, loading }) {
  const [tab, setTab] = useState('overview') // overview | lineups | timeline

  const hdr = detail?.header
  const homeName = hdr?.home?.name || match.teamA?.name || 'Home'
  const awayName = hdr?.away?.name || match.teamB?.name || 'Away'
  const homeScore = hdr?.home?.score ?? match.teamA?.score ?? '–'
  const awayScore = hdr?.away?.score ?? match.teamB?.score ?? '–'
  const homeColor = hdr?.home?.color || match.teamA?.color || '#D75043'
  const awayColor = hdr?.away?.color || match.teamB?.color || '#5578D8'
  const status = hdr?.status || match.status
  const isLive = status === 'live'
  const clock = hdr?.clock || match.minute
  const halfLabel = hdr?.halfLabel || match.halfLabel || ''
  const venue = hdr?.venue || match.venue || ''
  const leagueLine = [hdr?.league || match.leagueName, hdr?.round].filter(Boolean).join(' / ')

  const stats = detail?.stats?.length ? detail.stats : match.stats || []
  const events = detail?.events?.length ? detail.events : match.events || []
  const latestMoment = detail?.latestMoment || events[0] || null
  const lineups = detail?.lineups || { home: null, away: null }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'lineups', label: 'Line-ups' },
    { id: 'timeline', label: 'Timeline' },
  ]

  return (
    <div className="flex flex-col">
      {/* Centered Match Centre Header */}
      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
          {leagueLine}
        </p>

        {isLive && (
          <div className="mt-3 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-live px-3 py-1 text-[10px] font-bold uppercase text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              LIVE
            </span>
          </div>
        )}

        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
          <div className="flex min-w-0 flex-col items-center">
            <span
              className="mb-2.5 h-[3px] w-7 rounded-full"
              style={{ backgroundColor: homeColor }}
            />
            <p className="max-w-full break-words text-[14px] font-semibold leading-tight text-ink sm:text-[17px]">{homeName}</p>
          </div>

          <p className="whitespace-nowrap font-display text-[32px] font-bold leading-none tracking-tight text-ink sm:text-[42px]">
            {homeScore} : {awayScore}
          </p>

          <div className="flex min-w-0 flex-col items-center">
            <span
              className="mb-2.5 h-[3px] w-7 rounded-full"
              style={{ backgroundColor: awayColor }}
            />
            <p className="max-w-full break-words text-[14px] font-semibold leading-tight text-ink sm:text-[17px]">{awayName}</p>
          </div>
        </div>

        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
          {[clock, halfLabel].filter(Boolean).join(' · ')}
        </p>
        {venue && (
          <p className="mt-1 text-[12px] font-medium text-muted">{venue}</p>
        )}
      </div>

      {/* Segmented Tabs: Overview | Line-ups | Timeline */}
      <div className="mt-6 grid grid-cols-3 rounded-full bg-sage p-1">
        {tabs.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full py-2 text-[13px] transition-colors ${
                active ? 'bg-white font-semibold text-ink shadow-sm' : 'font-medium text-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {loading && (
        <div className="mt-6 space-y-3">
          <div className="h-5 w-44 animate-pulse rounded bg-sage" />
          <div className="h-12 w-full animate-pulse rounded-[14px] bg-white" />
          <div className="h-12 w-full animate-pulse rounded-[14px] bg-white" />
        </div>
      )}

      {/* TAB 1: Overview */}
      {!loading && tab === 'overview' && (
        <div className="mt-7 space-y-7">
          <div>
            <h3 className="text-[19px] font-semibold text-ink">The match in numbers</h3>
            {stats.length > 0 ? (
              <div className="mt-5 space-y-5">
                {stats.map((s, i) => (
                  <StatBar key={i} stat={s} />
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-[16px] bg-white p-4 text-[13px] text-muted">
                Live match statistics will appear once play is underway.
              </p>
            )}
          </div>

          {latestMoment && (
            <div>
              <h3 className="text-[19px] font-semibold text-ink">Latest moment</h3>
              <div className="mt-3 flex items-center gap-3.5 rounded-[16px] bg-white p-4">
                <span className="grid h-11 min-w-11 shrink-0 place-items-center rounded-[12px] bg-pulse px-2 font-display text-[13px] font-bold text-ink">
                  {latestMoment.min || clock || '•'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-ink">
                    {latestMoment.title || latestMoment.text}
                  </p>
                  {latestMoment.subtitle && (
                    <p className="mt-0.5 line-clamp-2 text-[12px] font-medium text-muted">
                      {latestMoment.subtitle}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Line-ups */}
      {!loading && tab === 'lineups' && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[lineups.home, lineups.away].filter(Boolean).map((side, idx) => (
            <div key={idx} className="rounded-[16px] bg-white p-4">
              <div className="flex items-center justify-between gap-2 border-b border-hairline pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-1 rounded-full"
                    style={{ backgroundColor: side.color }}
                  />
                  <span className="text-[14px] font-semibold text-ink">{side.teamName}</span>
                </div>
                {side.formation && (
                  <span className="rounded-full bg-sage px-2.5 py-0.5 text-[11px] font-bold text-ink">
                    {side.formation}
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-2">
                {(side.starters || []).map((p, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-[13px]">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="w-5 text-right font-display text-[12px] font-bold text-muted">
                        {p.jersey || '–'}
                      </span>
                      <span className="truncate font-medium text-ink">{p.name}</span>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold uppercase text-muted">
                      {p.pos}
                    </span>
                  </div>
                ))}
              </div>

              {side.subs?.length > 0 && (
                <div className="mt-4 border-t border-hairline pt-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                    Substitutes
                  </p>
                  <div className="space-y-1.5">
                    {side.subs.slice(0, 9).map((p, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 text-[12px] text-muted">
                        <span className="truncate">
                          {p.jersey ? `${p.jersey} · ` : ''}{p.name}
                        </span>
                        <span className="shrink-0 text-[10px] font-semibold">{p.pos}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {!lineups.home && !lineups.away && (
            <p className="col-span-full rounded-[16px] bg-white p-5 text-center text-[13px] text-muted">
              Starting line-ups are published shortly before kick-off.
            </p>
          )}
        </div>
      )}

      {/* TAB 3: Timeline */}
      {!loading && tab === 'timeline' && (
        <div className="mt-6 space-y-2.5">
          {events.length > 0 ? (
            events.map((ev, i) => (
              <div key={i} className="flex items-start gap-3.5 rounded-[16px] bg-white p-4">
                <span
                  className={`grid h-9 min-w-10 shrink-0 place-items-center rounded-[10px] px-2 font-display text-[12px] font-bold ${
                    ev.kind === 'goal' ? 'bg-pulse text-ink' : 'bg-sage text-ink'
                  }`}
                >
                  {ev.min || '•'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-ink">{ev.title || ev.text}</p>
                  {ev.subtitle && (
                    <p className="mt-0.5 text-[12px] text-muted">{ev.subtitle}</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-[16px] bg-white p-5 text-center text-[13px] text-muted">
              No key events recorded yet.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// Editorial Cricket Match Centre — Scorecard | Commentary
export function CricketBoard({ match, detail, loading }) {
  const [tab, setTab] = useState('scorecard') // scorecard | commentary
  const d = detail || {}
  const innings = d.innings || []
  const commentary = d.commentary || []
  const crr = d.meta?.crr || match.meta?.crr || ''
  const lastWicket = d.meta?.lastWicket || match.meta?.lastWicket || ''
  const recentBalls = d.recentBalls?.length ? d.recentBalls : match.recentBalls || []
  const statusText = d.matchHeader?.status || match.meta?.need || ''
  const venue = d.matchHeader?.venue || match.venue || ''
  const isLive = match.status === 'live'

  return (
    <div className="flex flex-col">
      {/* Match summary */}
      <div className="rounded-[22px] border border-hairline bg-white p-5 text-ink shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
            {match.league || match.leagueName}
          </span>
          {isLive && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-live px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              LIVE
            </span>
          )}
        </div>

        <div className="mt-5 flex items-baseline justify-between gap-3">
          <span className="min-w-0 flex-1 break-words text-[16px] font-semibold leading-tight text-ink sm:text-[18px]">{match.teamA?.name}</span>
          <div className="text-right">
            <p className="whitespace-nowrap font-display text-[28px] font-bold leading-none text-ink sm:text-[30px]">{match.teamA?.score}</p>
            {match.teamA?.overs && <p className="mt-1 text-[11px] text-muted">{match.teamA.overs}</p>}
          </div>
        </div>

        <div className="my-3.5 h-px bg-hairline" />

        <div className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 flex-1 break-words text-[16px] font-semibold leading-tight text-ink sm:text-[18px]">{match.teamB?.name}</span>
          <div className="text-right">
            <p className="whitespace-nowrap font-display text-[28px] font-bold leading-none text-ink sm:text-[30px]">{match.teamB?.score}</p>
            {match.teamB?.overs && <p className="mt-1 text-[11px] text-muted">{match.teamB.overs}</p>}
          </div>
        </div>

        {statusText && <p className="mt-4 text-[12px] font-semibold text-brand-strong">{statusText}</p>}
        {venue && <p className="mt-1 text-[11px] text-muted">{venue}</p>}
      </div>

      {/* Segmented Tabs: Scorecard | Commentary */}
      <div className="mt-5 grid grid-cols-2 rounded-full bg-sage p-1">
        {[
          { id: 'scorecard', label: 'Scorecard' },
          { id: 'commentary', label: 'Commentary' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full py-2 text-[13px] transition-colors ${
              tab === t.id ? 'bg-white font-semibold text-ink shadow-sm' : 'font-medium text-muted hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="mt-5 space-y-3">
          <div className="h-16 animate-pulse rounded-[16px] bg-white" />
          <div className="h-44 animate-pulse rounded-[16px] bg-white" />
        </div>
      )}

      {!loading && tab === 'scorecard' && (
        <div className="mt-5 space-y-4">
          {(crr || lastWicket) && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[16px] bg-sage-tint p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Run rate</p>
                <p className="mt-1 font-display text-[24px] font-bold text-ink">{crr || '—'}</p>
              </div>
              <div className="rounded-[16px] bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Last wicket</p>
                <p className="mt-1 text-[13px] font-semibold leading-snug text-ink">{lastWicket || '—'}</p>
              </div>
            </div>
          )}

          {recentBalls.length > 0 && (
            <div className="rounded-[16px] bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Recent balls</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {recentBalls.map((b, i) => (
                  <span
                    key={i}
                    className={`grid h-9 min-w-9 place-items-center rounded-[10px] px-2 font-display text-[13px] font-bold ${
                      b === 'W'
                        ? 'bg-live text-white'
                        : b === '6' || b === '4'
                          ? 'bg-pulse text-ink'
                          : 'bg-sage text-ink'
                    }`}
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>
          )}

          {innings.map((inn, i) => (
            <div key={i} className="rounded-[16px] bg-white p-4">
              <div className="flex items-baseline justify-between gap-2 border-b border-hairline pb-3">
                <span className="text-[15px] font-semibold text-ink">
                  {inn.teamName || inn.teamShort || `Innings ${i + 1}`}
                </span>
                <span className="font-display text-[15px] font-bold text-ink">
                  {inn.runs}/{inn.wickets} <span className="font-sans text-[12px] font-medium text-muted">({inn.overs} ov)</span>
                </span>
              </div>

              {!!inn.batsmen?.length && (
                <div className="mt-3">
                  <div className="grid grid-cols-[1fr_30px_30px_26px_26px] gap-1 text-[10px] font-bold uppercase tracking-[0.06em] text-muted">
                    <span>Batter</span>
                    <span className="text-right">R</span>
                    <span className="text-right">B</span>
                    <span className="text-right">4s</span>
                    <span className="text-right">6s</span>
                  </div>
                  <div className="mt-2 divide-y divide-hairline/70">
                    {inn.batsmen.slice(0, 11).map((b, j) => (
                      <div key={j} className="grid grid-cols-[1fr_30px_30px_26px_26px] items-center gap-1 py-2 text-[13px]">
                        <div className="min-w-0 pr-2">
                          <p className="truncate font-semibold text-ink">
                            {b.name}{b.isNotOut ? ' *' : ''}
                          </p>
                          {b.out && <p className="truncate text-[11px] text-muted">{b.out}</p>}
                        </div>
                        <span className="text-right font-display font-bold text-ink">{b.runs}</span>
                        <span className="text-right text-muted">{b.balls}</span>
                        <span className="text-right text-muted">{b.fours ?? 0}</span>
                        <span className="text-right text-muted">{b.sixes ?? 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!!inn.bowlers?.length && (
                <div className="mt-4 border-t border-hairline pt-3">
                  <div className="grid grid-cols-[1fr_34px_26px_30px_26px] gap-1 text-[10px] font-bold uppercase tracking-[0.06em] text-muted">
                    <span>Bowler</span>
                    <span className="text-right">O</span>
                    <span className="text-right">M</span>
                    <span className="text-right">R</span>
                    <span className="text-right">W</span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {inn.bowlers.slice(0, 8).map((b, j) => (
                      <div key={j} className="grid grid-cols-[1fr_34px_26px_30px_26px] items-center gap-1 text-[13px]">
                        <span className="truncate font-medium text-ink">{b.name}</span>
                        <span className="text-right text-muted">{b.overs}</span>
                        <span className="text-right text-muted">{b.maidens ?? 0}</span>
                        <span className="text-right text-muted">{b.runs}</span>
                        <span className="text-right font-display font-bold text-ink">{b.wickets}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {!innings.length && (
            <p className="rounded-[16px] bg-white p-5 text-center text-[13px] text-muted">
              Full scorecard will appear once play starts.
            </p>
          )}
        </div>
      )}

      {!loading && tab === 'commentary' && (
        <div className="mt-5 space-y-2.5">
          {commentary.length > 0 ? (
            commentary.map((c, i) => (
              <div key={i} className="flex items-start gap-3 rounded-[16px] bg-white p-4">
                {c.over && (
                  <span className="grid h-8 min-w-11 shrink-0 place-items-center rounded-[10px] bg-sage px-2 font-display text-[12px] font-bold text-ink">
                    {c.over}
                  </span>
                )}
                <p className="text-[13px] leading-relaxed text-ink">{c.text}</p>
              </div>
            ))
          ) : (
            <p className="rounded-[16px] bg-white p-5 text-center text-[13px] text-muted">
              Ball-by-ball commentary unavailable for this fixture.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
