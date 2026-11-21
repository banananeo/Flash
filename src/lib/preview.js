export async function fetchMatchPreview(match) {
  const params = new URLSearchParams({
    sport: String(match?.sport || ''),
    homeId: String(match?.teamA?.id || ''),
    awayId: String(match?.teamB?.id || ''),
    homeName: String(match?.teamA?.name || 'Home'),
    awayName: String(match?.teamB?.name || 'Away'),
    date: String(match?.time || match?.dateISO || ''),
  })
  if (match?.leagueSlug) params.set('league', String(match.leagueSlug))
  if (match?.seriesId) params.set('series', String(match.seriesId))
  if (match?.format) params.set('format', String(match.format))

  let response
  try {
    response = await fetch(`/api/preview?${params}`)
  } catch (error) {
    if (error instanceof TypeError) throw new Error('Match context unavailable — check your connection')
    throw error
  }
  if (!response.ok) throw new Error(`Match context error ${response.status}`)

  const data = await response.json()
  return {
    form: {
      home: Array.isArray(data?.form?.home) ? data.form.home : [],
      away: Array.isArray(data?.form?.away) ? data.form.away : [],
    },
    headToHead: Array.isArray(data?.headToHead) ? data.headToHead : [],
    standings: data?.standings || null,
  }
}
