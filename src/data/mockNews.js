// Editorial fallback stories — same shape as live GNews articles.

export const CATEGORIES = [
  { id: 'all', label: 'For you' },
  { id: 'world', label: 'World' },
  { id: 'technology', label: 'Tech' },
  { id: 'business', label: 'Business' },
  { id: 'science', label: 'Science' },
  { id: 'entertainment', label: 'Culture' },
  { id: 'sports', label: 'Sports' },
]

export const categoryLabel = (cat) => {
  const found = CATEGORIES.find((c) => c.id === cat)
  return found ? found.label : cat || 'Briefing'
}

const img = (seed) => `https://picsum.photos/seed/${seed}/900/560`

export const MOCK_NEWS = [
  {
    id: 'm1',
    category: 'world',
    title: 'A cleaner future is closer than you think.',
    summary:
      'The energy transition is picking up speed as offshore wind and grid-scale storage reach cost parity across major markets.',
    source: 'Flash Edit',
    publishedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    readTime: '4 min read',
    image: img('cleanenergy'),
  },
  {
    id: 'm2',
    category: 'technology',
    title: 'The next era of AI is getting personal.',
    summary:
      'On-device neural accelerators are bringing fast transcription, private reasoning, and instant summaries directly to everyday laptops and phones.',
    source: 'ChipWire',
    publishedAt: new Date(Date.now() - 1000 * 60 * 24).toISOString(),
    readTime: '3 min read',
    image: img('aichip'),
  },
  {
    id: 'm3',
    category: 'sports',
    title: 'All eyes on the weekend grid.',
    summary:
      'Fresh aerodynamic upgrades and shifting weather forecasts set up a razor-thin fight for pole position and championship points.',
    source: 'Formula 1',
    publishedAt: new Date(Date.now() - 1000 * 60 * 48).toISOString(),
    readTime: '5 min read',
    image: img('racing'),
  },
  {
    id: 'm4',
    category: 'business',
    title: 'Small-cap stocks lead the latest rebound as rate expectations shift.',
    summary:
      'Softer inflation readings pushed investors back into domestic growth equities, while bond desks keep an eye on next week’s payroll print.',
    source: 'Market Desk',
    publishedAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    readTime: '3 min read',
    image: img('market'),
  },
  {
    id: 'm5',
    category: 'science',
    title: 'Deep-sea submersibles capture rare bioluminescent signals at 1,200 metres.',
    summary:
      'Marine researchers recorded structured light pulses from previously undocumented deep-ocean cephalopods during an autonomous survey.',
    source: 'Orbit Daily',
    publishedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    readTime: '4 min read',
    image: img('ocean'),
  },
  {
    id: 'm6',
    category: 'entertainment',
    title: 'Why small independent studios are winning the year in interactive storytelling.',
    summary:
      'Lean teams are outperforming bloated releases by focusing on tactile craft, tight pacing, and word-of-mouth discovery.',
    source: 'Culture Desk',
    publishedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    readTime: '3 min read',
    image: img('indiegame'),
  },
]
