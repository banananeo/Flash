import { CURATED_RADAR_MOVES, PADDOCK_SPORTS } from './mockPaddock'

export const CATEGORIES = PADDOCK_SPORTS

export const categoryLabel = (cat) => {
  const map = {
    all: 'All Turf',
    paddock: 'Paddock',
    football: 'Football',
    f1: 'Formula 1',
    cricket: 'Cricket',
    sports: 'Sports',
  }
  if (map[cat]) return map[cat]
  const found = CATEGORIES.find((c) => c.id === cat)
  return found ? found.label : cat || 'Paddock'
}

export const MOCK_NEWS = CURATED_RADAR_MOVES

