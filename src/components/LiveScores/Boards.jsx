import { useEffect, useState } from 'react'

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

function playerRole(player) {
  const raw = `${player?.positionName || ''} ${player?.pos || ''}`.trim().toUpperCase()
  if (/GOALKEEPER|GOALIE|\bGK\b/.test(raw) || raw === 'G') return 'goalkeeper'
  if (/DEFENDER|\bDEF\b|\bDF\b|\bCB\b|\bLCB\b|\bRCB\b|\bLB\b|\bRB\b|\bLWB\b|\bRWB\b|\bWB\b|\bSW\b/.test(raw) || raw === 'D') return 'defence'
  if (/MIDFIELDER|\bMID\b|\bMF\b|\bDM\b|\bCDM\b|\bCM\b|\bLCM\b|\bRCM\b|\bAM\b|\bCAM\b|\bLM\b|\bRM\b/.test(raw) || raw === 'M') return 'midfield'
  if (/FORWARD|STRIKER|ATTACKER|WINGER|\bFWD\b|\bFW\b|\bCF\b|\bLW\b|\bRW\b|\bST\b/.test(raw) || raw === 'F') return 'attack'
  return 'unknown'
}

function getFormationRows(side) {
  const starters = [...(side?.starters || [])]
  if (!starters.length) return { keeper: null, rows: [] }

  const formation = String(side?.formation || '')
  const formationLines = formation.split(/[-–]/).map((count) => Number(count.trim()))
  const hasFormation = formationLines.length > 0 && formationLines.every((count) => Number.isInteger(count) && count > 0)
  const goalkeeperIndex = starters.findIndex((player) => playerRole(player) === 'goalkeeper')
  const fallbackKeeperIndex = goalkeeperIndex < 0 && starters.length > 10 ? 0 : goalkeeperIndex
  const [keeper] = fallbackKeeperIndex >= 0 ? starters.splice(fallbackKeeperIndex, 1) : []
  const remaining = [...starters]

  if (hasFormation && formationLines.reduce((sum, count) => sum + count, 0) === 10) {
    const rowsBackToFront = formationLines.map((count, index) => {
      const role = index === 0 ? 'defence' : index === formationLines.length - 1 ? 'attack' : 'midfield'
      const row = []
      const matching = remaining.filter((player) => playerRole(player) === role)
      for (const player of matching.slice(0, count)) {
        row.push(player)
        remaining.splice(remaining.indexOf(player), 1)
      }

      const fallbackOrder = role === 'defence'
        ? ['unknown', 'midfield', 'attack']
        : role === 'attack'
          ? ['unknown', 'midfield', 'defence']
          : ['unknown', 'midfield', 'defence', 'attack']
      for (const fallbackRole of fallbackOrder) {
        for (const player of [...remaining]) {
          if (row.length >= count) break
          if (playerRole(player) !== fallbackRole) continue
          row.push(player)
          remaining.splice(remaining.indexOf(player), 1)
        }
        if (row.length >= count) break
      }
      return row
    })

    if (remaining.length) {
      const middleIndex = Math.max(0, Math.floor((rowsBackToFront.length - 1) / 2))
      rowsBackToFront[middleIndex].push(...remaining)
    }
    return { keeper, rows: rowsBackToFront.reverse().filter((row) => row.length) }
  }

  const rowsBackToFront = [
    remaining.filter((player) => playerRole(player) === 'defence'),
    remaining.filter((player) => playerRole(player) === 'midfield' || playerRole(player) === 'unknown'),
    remaining.filter((player) => playerRole(player) === 'attack'),
  ].filter((row) => row.length)

  return { keeper, rows: rowsBackToFront.reverse() }
}

function shortPlayerLabel(name) {
  const parts = String(name || 'Player').trim().split(/\s+/)
  if (parts.length <= 1) return parts[0] || 'Player'
  return parts[parts.length - 1]
}

function PitchPlayer({ player, accent, isKeeper = false }) {
  const role = playerRole(player)
  const roleLabel = isKeeper ? 'GK' : player?.pos || (role === 'unknown' ? '' : role.slice(0, 3).toUpperCase())
  const fullName = player?.name || 'Player'
  const compactName = shortPlayerLabel(fullName)

  return (
    <div
      className="flex min-w-0 flex-1 flex-col items-center justify-center px-0.5 text-center"
      title={[fullName, roleLabel].filter(Boolean).join(' · ')}
    >
      <span
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 bg-white font-display text-[9px] font-bold shadow-md sm:h-9 sm:w-9 sm:text-[12px]"
        style={{ borderColor: accent, color: accent }}
      >
        {player?.jersey || (isKeeper ? 'GK' : '•')}
      </span>
      <span className="mt-0.5 max-w-full truncate rounded-full bg-slate-950/75 px-1 py-0.5 text-[8px] font-semibold leading-tight text-white shadow-sm sm:mt-1 sm:px-1.5 sm:text-[10px]">
        <span className="sm:hidden">{compactName}</span>
        <span className="hidden sm:inline">{fullName}</span>
      </span>
      {roleLabel && (
        <span className="mt-0.5 hidden text-[8px] font-bold uppercase leading-none text-white/80 sm:inline">
          {roleLabel}
        </span>
      )}
    </div>
  )
}

function LineupPitchCard({ side, teamName, teamColor }) {
  const { keeper, rows } = getFormationRows(side)
  const hasStarters = Boolean(side?.starters?.length)
  const accent = side?.color || teamColor

  return (
    <section className="min-w-0 overflow-hidden rounded-[16px] border border-hairline bg-white p-2 sm:rounded-[18px] sm:p-4">
      <div className="flex min-h-8 items-center justify-between gap-1.5 border-b border-hairline pb-2 sm:min-h-10 sm:gap-2 sm:pb-3">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <span className="h-3.5 w-1 shrink-0 rounded-full sm:h-4" style={{ backgroundColor: accent }} />
          <h3 className="truncate text-[11px] font-semibold text-ink sm:text-[14px]">{side?.teamName || teamName}</h3>
        </div>
        {side?.formation && (
          <span className="shrink-0 rounded-full bg-sage px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-ink sm:px-2.5 sm:py-1 sm:text-[10px]">
            {side.formation}
          </span>
        )}
      </div>

      {hasStarters ? (
        <>
          <div
            role="group"
            aria-label={`${side?.teamName || teamName} players arranged on the pitch${side?.formation ? ` in a ${side.formation} formation` : ''}`}
            className="relative mt-2 flex aspect-[3/4] min-h-[280px] w-full flex-col overflow-hidden rounded-[12px] text-white shadow-inner sm:mt-3 sm:min-h-[390px] sm:rounded-[14px]"
            style={{
              backgroundColor: '#176b4b',
              backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,.035) 0, rgba(255,255,255,.035) 48px, rgba(0,0,0,.035) 48px, rgba(0,0,0,.035) 96px)',
            }}
          >
            {/* Pitch lines */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-1.5 rounded-[8px] border border-white/45 sm:inset-2 sm:rounded-[10px]" />
            <div aria-hidden="true" className="pointer-events-none absolute left-1.5 right-1.5 top-1/2 h-px -translate-y-1/2 bg-white/45 sm:left-2 sm:right-2" />
            <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[25%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/45" />
            <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" />
            <div aria-hidden="true" className="pointer-events-none absolute left-[26%] right-[26%] top-1.5 h-[14%] border-x border-b border-white/40 sm:top-2" />
            <div aria-hidden="true" className="pointer-events-none absolute left-[38%] right-[38%] top-1.5 h-[5%] border-x border-b border-white/40 sm:top-2" />
            <div aria-hidden="true" className="pointer-events-none absolute bottom-1.5 left-[26%] right-[26%] h-[14%] border-x border-t border-white/40 sm:bottom-2" />
            <div aria-hidden="true" className="pointer-events-none absolute bottom-1.5 left-[38%] right-[38%] h-[5%] border-x border-t border-white/40 sm:bottom-2" />

            <div className="relative z-[1] flex h-full flex-1 flex-col justify-around px-1 py-2.5 sm:px-2 sm:py-4">
              {rows.map((row, rowIndex) => (
                <div key={`line-${rowIndex}`} className="flex w-full items-center justify-evenly gap-0.5">
                  {row.map((player, playerIndex) => (
                    <PitchPlayer key={`${player?.name || 'player'}-${playerIndex}`} player={player} accent={accent} />
                  ))}
                </div>
              ))}
              {keeper && (
                <div className="flex w-full items-center justify-center">
                  <PitchPlayer player={keeper} accent={accent} isKeeper />
                </div>
              )}
            </div>
          </div>

          {side?.subs?.length > 0 && (
            <div className="mt-3 sm:mt-4">
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-muted sm:mb-2 sm:text-[10px]">Substitutes</p>
              <div className="flex flex-wrap gap-1 sm:gap-1.5">
                {side.subs.map((player, index) => (
                  <span key={`${player?.name || 'sub'}-${index}`} className="max-w-full truncate rounded-full bg-sage px-2 py-0.5 text-[9px] font-medium text-ink sm:px-2.5 sm:py-1 sm:text-[10px]">
                    {player?.jersey ? `${player.jersey} · ` : ''}{player?.name || 'Player'}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="mt-2 flex min-h-[100px] items-center justify-center rounded-[12px] bg-sage p-3 text-center text-[11px] leading-relaxed text-muted sm:mt-3 sm:min-h-[120px] sm:rounded-[14px] sm:p-5 sm:text-[13px]">
          Starting line-up has not been published yet.
        </p>
      )}
    </section>
  )
}

function CricketLineupCard({ side, fallbackName, fallbackColor }) {
  const players = Array.isArray(side?.players) ? side.players : []
  const subs = Array.isArray(side?.subs) ? side.subs : []
  const accent = side?.color || fallbackColor || '#0D9488'
  const teamName = side?.teamName || fallbackName || 'Team'

  return (
    <section className="min-w-0 overflow-hidden rounded-[16px] border border-hairline bg-white p-2.5 sm:rounded-[18px] sm:p-4">
      <div className="flex min-h-8 items-center justify-between gap-1.5 border-b border-hairline pb-2 sm:min-h-10 sm:gap-2 sm:pb-3">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <span className="h-3.5 w-1 shrink-0 rounded-full sm:h-4" style={{ backgroundColor: accent }} />
          <h3 className="truncate text-[11px] font-semibold text-ink sm:text-[14px]">{teamName}</h3>
        </div>
        {players.length > 0 && (
          <span className="shrink-0 rounded-full bg-sage px-1.5 py-0.5 text-[9px] font-bold text-muted sm:px-2 sm:text-[10px]">
            XI
          </span>
        )}
      </div>

      {players.length > 0 ? (
        <>
          <div className="mt-2 divide-y divide-hairline/70 sm:mt-3">
            {players.map((p, idx) => (
              <div key={p.id || `${p.name}-${idx}`} className="flex items-start gap-1.5 py-1.5 sm:gap-2.5 sm:py-2">
                <span className="w-4 shrink-0 pt-0.5 font-display text-[10px] font-bold text-muted sm:w-5 sm:text-[11px]">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold leading-tight text-ink sm:text-[13px]" title={p.name}>
                    <span className="sm:hidden">{p.shortName || p.name}</span>
                    <span className="hidden sm:inline">{p.name}</span>
                    {p.isCaptain && <span className="ml-1 text-[9px] font-bold text-brand-strong sm:text-[10px]">(c)</span>}
                    {p.isKeeper && <span className="ml-1 text-[9px] font-bold text-muted sm:text-[10px]">(wk)</span>}
                  </p>
                  {p.role && (
                    <p className="mt-0.5 truncate text-[9px] font-medium text-muted sm:text-[10px]">
                      {p.role}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {subs.length > 0 && (
            <div className="mt-3 border-t border-hairline pt-2.5 sm:mt-4 sm:pt-3">
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-muted sm:text-[10px]">Bench</p>
              <div className="flex flex-wrap gap-1">
                {subs.map((p, idx) => (
                  <span key={p.id || `sub-${idx}`} className="max-w-full truncate rounded-full bg-sage px-2 py-0.5 text-[9px] font-medium text-ink sm:text-[10px]">
                    {p.shortName || p.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="mt-2 flex min-h-[100px] items-center justify-center rounded-[12px] bg-sage p-3 text-center text-[11px] leading-relaxed text-muted sm:mt-3 sm:min-h-[120px] sm:rounded-[14px] sm:p-5 sm:text-[13px]">
          Playing XI has not been announced yet.
        </p>
      )}
    </section>
  )
}

function formatPreviewDate(date) {
  if (!date) return ''
  const parsed = new Date(date)
  return Number.isFinite(parsed.getTime())
    ? parsed.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })
    : ''
}

function formatScoreValue(val) {
  if (val == null) return '–'
  if (typeof val === 'object') {
    const inner = val.displayValue ?? val.value ?? val.score ?? ''
    return inner === '' || inner == null ? '–' : String(inner)
  }
  const s = String(val)
  return s.includes('[object Object]') ? '–' : s
}

function ResultPill({ result }) {
  const label = String(result || '–').toUpperCase()
  const color = label === 'W'
    ? 'bg-sage-leader text-brand-strong'
    : label === 'L'
      ? 'bg-rose-100 text-rose-700'
      : 'bg-sage text-muted'
  return <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[9px] font-extrabold ${color}`}>{label}</span>
}

function RecentFormCard({ name, matches }) {
  return (
    <div className="min-w-0 rounded-[14px] bg-white p-3.5">
      <p className="truncate text-[12px] font-semibold text-ink">{name}</p>
      {matches?.length ? (
        <div className="mt-2 space-y-1.5">
          {matches.slice(0, 5).map((item, index) => {
            const scoreStr = formatScoreValue(item.score)
            return (
            <div key={`${item.date}-${index}`} className="flex min-w-0 items-center gap-1.5" title={`${item.result} · ${item.opponent} · ${scoreStr} · ${formatPreviewDate(item.date)}`}>
              <ResultPill result={item.result} />
              <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-ink">{item.opponent}</span>
              <span className="shrink-0 font-display text-[9px] font-bold text-muted">{scoreStr}</span>
            </div>
            )
          })}
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-muted">No recent results available.</p>
      )}
    </div>
  )
}

function StandingCard({ name, standing }) {
  if (!standing) return null
  const facts = [
    standing.rank && { label: 'Position', value: standing.rank },
    standing.points && { label: 'Points', value: standing.points },
    standing.played && { label: 'Played', value: standing.played },
    standing.record && { label: 'Record', value: standing.record },
  ].filter(Boolean)
  if (!facts.length) return null

  return (
    <div className="min-w-0 rounded-[14px] bg-white p-3.5">
      <p className="truncate text-[12px] font-semibold text-ink">{name}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {facts.map((fact) => (
          <span key={fact.label} className="rounded-full bg-sage px-2.5 py-1 text-[10px] font-semibold text-ink">
            <span className="text-muted">{fact.label} </span>{fact.value}
          </span>
        ))}
      </div>
    </div>
  )
}

function MatchPreview({ preview, match, loading, error }) {
  const homeForm = preview?.form?.home || []
  const awayForm = preview?.form?.away || []
  const headToHead = preview?.headToHead || []
  const standings = preview?.standings
  const hasStandings = Boolean(standings?.home || standings?.away)
  const hasContext = homeForm.length || awayForm.length || headToHead.length || hasStandings

  return (
    <div className="mt-6 space-y-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-strong">PRE-MATCH CONTEXT</p>
        <h3 className="mt-1 text-[20px] font-semibold leading-tight text-ink">The matchup, at a glance.</h3>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-[90px] animate-pulse rounded-[16px] bg-sage" />
          <div className="h-[110px] animate-pulse rounded-[16px] bg-sage" />
        </div>
      ) : (
        <>
          {(homeForm.length || awayForm.length) > 0 && (
            <section>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h4 className="text-[14px] font-semibold text-ink">Recent form</h4>
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Latest first</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <RecentFormCard name={match.teamA?.name || 'Home'} matches={homeForm} />
                <RecentFormCard name={match.teamB?.name || 'Away'} matches={awayForm} />
              </div>
            </section>
          )}

          {headToHead.length > 0 && (
            <section>
              <h4 className="mb-2 text-[14px] font-semibold text-ink">Recent head-to-head</h4>
              <div className="overflow-hidden rounded-[14px] border border-hairline bg-white">
                {headToHead.slice(0, 5).map((item, index) => (
                  <div key={`${item.date}-${index}`} className={`flex items-center justify-between gap-3 px-3.5 py-3 ${index ? 'border-t border-hairline' : ''}`}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-ink">{item.home} <span className="font-medium text-muted">vs</span> {item.away}</p>
                      <p className="mt-0.5 text-[10px] font-medium text-muted">{formatPreviewDate(item.date)}</p>
                    </div>
                    <span className="shrink-0 font-display text-[14px] font-bold text-ink">{formatScoreValue(item.score)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {hasStandings && (
            <section>
              <div className="mb-2">
                <h4 className="text-[14px] font-semibold text-ink">Competition position</h4>
                {standings.competition && <p className="mt-0.5 text-[11px] text-muted">{standings.competition}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <StandingCard name={match.teamA?.name || 'Home'} standing={standings.home} />
                <StandingCard name={match.teamB?.name || 'Away'} standing={standings.away} />
              </div>
            </section>
          )}

          {!hasContext && (
            <p className="rounded-[16px] bg-white p-5 text-center text-[13px] leading-relaxed text-muted">
              {error || 'Pre-match data is not available for this fixture yet.'}
            </p>
          )}
        </>
      )}
    </div>
  )
}

// 06 · Match centre (Football) — Preview | Overview | Line-ups | Timeline
export function FootballBoard({ match, detail, loading, preview, previewLoading, previewError }) {
  const isScheduled = match.status === 'scheduled'
  const [tab, setTab] = useState(isScheduled ? 'preview' : 'overview') // preview | overview | lineups | timeline

  useEffect(() => {
    setTab(isScheduled ? 'preview' : 'overview')
  }, [isScheduled, match.id])

  const hdr = detail?.header
  const homeName = hdr?.home?.name || match.teamA?.name || 'Home'
  const awayName = hdr?.away?.name || match.teamB?.name || 'Away'
  const homeScore = hdr?.home?.score ?? match.teamA?.score ?? '–'
  const awayScore = hdr?.away?.score ?? match.teamB?.score ?? '–'
  const homeColor = hdr?.home?.color || match.teamA?.color || '#D75043'
  const awayColor = hdr?.away?.color || match.teamB?.color || '#5578D8'
  const status = hdr?.status || match.status
  const isLive = status === 'live'
  const clock =
    status === 'scheduled'
      ? match.kickoffLabel || hdr?.clock || match.minute
      : hdr?.clock || match.minute
  const halfLabel = hdr?.halfLabel || match.halfLabel || ''
  const venue = hdr?.venue || match.venue || ''
  const leagueLine = [hdr?.league || match.leagueName, hdr?.round].filter(Boolean).join(' / ')

  const stats = detail?.stats?.length ? detail.stats : match.stats || []
  const events = detail?.events?.length ? detail.events : match.events || []
  const latestMoment = detail?.latestMoment || events[0] || null
  const lineups = detail?.lineups || { home: null, away: null }

  const tabs = [
    ...(isScheduled ? [{ id: 'preview', label: 'Preview' }] : []),
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
      <div className={`mt-6 grid ${isScheduled ? 'grid-cols-4' : 'grid-cols-3'} rounded-full bg-sage p-1`}>
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

      {loading && tab !== 'preview' && (
        <div className="mt-6 space-y-3">
          <div className="h-5 w-44 animate-pulse rounded bg-sage" />
          <div className="h-12 w-full animate-pulse rounded-[14px] bg-white" />
          <div className="h-12 w-full animate-pulse rounded-[14px] bg-white" />
        </div>
      )}

      {tab === 'preview' && (
        <MatchPreview preview={preview} match={match} loading={previewLoading} error={previewError} />
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

      {/* TAB 2: Line-ups — side-by-side on BOTH mobile and desktop */}
      {!loading && tab === 'lineups' && (
        <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-4">
          <LineupPitchCard side={lineups.home} teamName={homeName} teamColor={homeColor} />
          <LineupPitchCard side={lineups.away} teamName={awayName} teamColor={awayColor} />
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
export function CricketBoard({ match, detail, loading, preview, previewLoading, previewError }) {
  const isScheduled = match.status === 'scheduled'
  const [tab, setTab] = useState(isScheduled ? 'preview' : 'scorecard') // preview | scorecard | commentary

  useEffect(() => {
    setTab(isScheduled ? 'preview' : 'scorecard')
  }, [isScheduled, match.id])
  const d = detail || {}
  const innings = d.innings || []
  const cricketLineups = d.lineups || { home: null, away: null }
  const commentary = d.commentary || []
  const crr = d.meta?.crr || match.meta?.crr || ''
  const lastWicket = d.meta?.lastWicket || match.meta?.lastWicket || ''
  const recentBalls = d.recentBalls?.length ? d.recentBalls : match.recentBalls || []
  const rawStatusText = d.matchHeader?.status || match.meta?.need || ''
  const statusText =
    match.status === 'scheduled' && match.kickoffLabel && (!rawStatusText || /\b(gmt|utc|est|edt|pst|local)\b/i.test(rawStatusText))
      ? `Starts ${match.kickoffLabel}`
      : rawStatusText
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

      {/* Segmented Tabs: [Preview |] Scorecard | Line-ups | Commentary */}
      <div className={`mt-5 grid ${isScheduled ? 'grid-cols-4' : 'grid-cols-3'} rounded-full bg-sage p-1`}>
        {[
          ...(isScheduled ? [{ id: 'preview', label: 'Preview' }] : []),
          { id: 'scorecard', label: 'Scorecard' },
          { id: 'lineups', label: 'Line-ups' },
          { id: 'commentary', label: 'Commentary' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full py-2 text-[12px] transition-colors sm:text-[13px] ${
              tab === t.id ? 'bg-white font-semibold text-ink shadow-sm' : 'font-medium text-muted hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && tab !== 'preview' && (
        <div className="mt-5 space-y-3">
          <div className="h-16 animate-pulse rounded-[16px] bg-white" />
          <div className="h-44 animate-pulse rounded-[16px] bg-white" />
        </div>
      )}

      {tab === 'preview' && (
        <MatchPreview preview={preview} match={match} loading={previewLoading} error={previewError} />
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

      {!loading && tab === 'lineups' && (
        <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-4">
          <CricketLineupCard
            side={cricketLineups.home}
            fallbackName={match.teamA?.name}
            fallbackColor="#0D9488"
          />
          <CricketLineupCard
            side={cricketLineups.away}
            fallbackName={match.teamB?.name}
            fallbackColor="#3B82F6"
          />
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
