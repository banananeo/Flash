// Frontend-first mock — covers ALL news types. Summary-only, no full article.
// Swap with NewsAPI later via useNews hook. Images use picsum for zero-quota dev.

export const CATEGORIES = [
  { id: 'all', label: 'All', color: '#000000', bg: '#000000' },
  { id: 'business', label: 'Business', color: '#000', bg: '#B9FF66' },
  { id: 'technology', label: 'Tech', color: '#000', bg: '#4D7CFE' },
  { id: 'science', label: 'Science', color: '#000', bg: '#00D9A5' },
  { id: 'health', label: 'Health', color: '#000', bg: '#FF6B9D' },
  { id: 'sports', label: 'Sports', color: '#000', bg: '#FF6B35' },
  { id: 'entertainment', label: 'Fun', color: '#000', bg: '#FFDE59' },
]

export const categoryStyle = (cat) => {
  const found = CATEGORIES.find((c) => c.id === cat)
  return found ?? { id: cat, label: cat, bg: '#fff' }
}

const img = (seed) => `https://picsum.photos/seed/${seed}/800/500`

export const MOCK_NEWS = [
  {
    id: 'm1',
    category: 'technology',
    title: 'AI CHIPS JUST GOT 10X FASTER — LAPTOPS WILL FEEL LIKE SUPERCOMPUTERS',
    summary:
      'New neural accelerators hit 45 TOPS on-device. Translation: live transcription, local LLMs and video upscaling with no cloud lag. Expect the first wave in budget laptops by spring.',
    source: 'ChipWire',
    publishedAt: new Date(Date.now() - 1000 * 60 * 24).toISOString(),
    readTime: '1 min',
    image: img('aichip'),
  },
  {
    id: 'm2',
    category: 'business',
    title: 'MARKETS BOUNCE: SMALL CAPS LEAD AS RATE-CUT BETS HEAT UP',
    summary:
      'Investors piled into small-caps after soft inflation data. Analysts say two cuts are now priced in — but warn a hot jobs print could flip the script instantly.',
    source: 'MoneyBlast',
    publishedAt: new Date(Date.now() - 1000 * 60 * 52).toISOString(),
    readTime: '2 min',
    image: img('market'),
  },
  {
    id: 'm3',
    category: 'science',
    title: 'NASA SPOTS “CITY-KILLER” ASTEROID? NO — IT WILL MISS US BY A MILE (LITERALLY FAR)',
    summary:
      'Headlines screamed doom. Reality: a 60m rock passing 4x lunar distance. Scientists get great radar data, we get a light show. Win-win, zero apocalypse.',
    source: 'Orbit Daily',
    publishedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    readTime: '1 min',
    image: img('asteroid'),
  },
  {
    id: 'm4',
    category: 'sports',
    title: 'UNDERDOGS DO IT AGAIN: 94TH-MINUTE SCREAMER STUNS THE LEAGUE',
    summary:
      'Bottom-of-table FC came back from 2-0 down with 15 minutes left. The winner? A 30-yard volley that broke the xG model and the internet.',
    source: 'GoalRush',
    publishedAt: new Date(Date.now() - 1000 * 60 * 130).toISOString(),
    readTime: '2 min',
    image: img('football'),
  },
  {
    id: 'm5',
    category: 'health',
    title: 'WALKING 7K STEPS BEATS 10K? NEW STUDY SAYS CONSISTENCY WINS',
    summary:
      'Researchers tracked 12k adults: brisk 20-min walks cut resting heart rate faster than weekend marathons. Sleep + steps > heroic workouts.',
    source: 'PulseCheck',
    publishedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    readTime: '1 min',
    image: img('walk'),
  },
  {
    id: 'm6',
    category: 'entertainment',
    title: 'INDIE GAME MADE BY 3 FRIENDS SELLS 2M COPIES IN A WEEK',
    summary:
      'No budget, no ads — just a goofy physics co-op game and TikTok clips. Devs say the secret was “make your friends laugh first”.',
    source: 'PopFlash',
    publishedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    readTime: '1 min',
    image: img('indiegame'),
  },
  {
    id: 'm7',
    category: 'technology',
    title: 'BROWSER WAR 3.0: ONE BLOCKS ADS SO HARD SITES BREAK',
    summary:
      'The new privacy mode strips 99% trackers but also kills half the comment sections. Users cheer, publishers panic, memers feast.',
    source: 'ChipWire',
    publishedAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    readTime: '2 min',
    image: img('browser'),
  },
  {
    id: 'm8',
    category: 'business',
    title: 'COFFEE PRICE SPIKE? BLAME FROST + YOUR LATTE HABIT',
    summary:
      'Arabica futures jumped 18% after Brazilian frost. Cafes mull smaller cups, oat-milk surcharges, and the return of office instant coffee. Tragic.',
    source: 'MoneyBlast',
    publishedAt: new Date(Date.now() - 1000 * 60 * 380).toISOString(),
    readTime: '1 min',
    image: img('coffee'),
  },
  {
    id: 'm9',
    category: 'science',
    title: 'DEEP-SEA ROBOT FILMS GLOWING SQUID NOBODY HAS SEEN ALIVE',
    summary:
      'At 1,200m depth, a strawberry squid flashed Morse-like pulses. Biologists think it is private chat — invisible to predators, visible to mates.',
    source: 'Orbit Daily',
    publishedAt: new Date(Date.now() - 1000 * 60 * 450).toISOString(),
    readTime: '2 min',
    image: img('squid'),
  },
]

export const BREAKING_TICKER = [
  'AI CHIPS GO BRRR',
  'UNDERDOGS WIN IN 94TH MIN',
  'COFFEE PRICES +18%',
  'GLOWING SQUID SPOTTED',
  'MARKETS BOUNCE BACK',
  '7K STEPS > 10K?',
]
