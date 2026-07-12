import { describe, it, expect } from 'vitest'
import { toCSV, episodeSummaryRows, findWinner } from './export'

describe('toCSV', () => {
  it('joins rows with CRLF and cells with commas', () => {
    expect(toCSV([['a', 'b'], [1, 2]])).toBe('a,b\r\n1,2')
  })

  it('quotes cells containing commas, quotes, or newlines', () => {
    expect(toCSV([['plain', 'a,b', 'say "hi"']])).toBe('plain,"a,b","say ""hi"""')
  })
})

// A minimal but representative episode list: metadata episode, a tribal boot,
// a rocks tiebreaker, a fire-making finale, and a final tribal.
const episodes = [
  { episode: 0, eventsInEpisode: [] },
  {
    episode: 1,
    eventsInEpisode: [
      { eventType: 'IDOL_FOUND', playerFound: 'Sandra|Diaz-Twine' },
      { eventType: 'TRIBE_CHALLENGE', tribeWinner: 'Sele' },
      { eventType: 'TRIBAL_COUNCIL', playerVotedFor: ['Tony|Vlachos'] },
    ],
  },
  {
    episode: 2,
    eventsInEpisode: [
      { eventType: 'SWAP' },
      { eventType: 'TRIBAL_COUNCIL', playerVotedFor: ['Tony', 'Yul'] },
      { eventType: 'ROCKS', playerVotedOut: ['Boston Rob|Mariano'] },
    ],
  },
  {
    episode: 3,
    eventsInEpisode: [
      { eventType: 'MERGE' },
      { eventType: 'INDIVIDUAL_CHALLENGE', winner: 'Kim|Spradlin' },
      { eventType: 'TRIBAL_COUNCIL', playerVotedFor: ['Wendell|Holland'] },
    ],
  },
  {
    episode: 4,
    eventsInEpisode: [
      { eventType: 'INDIVIDUAL_CHALLENGE', winner: 'Kim|Spradlin' },
      { eventType: 'FIREMAKING', winner: 'Ethan|Zohn', loser: 'Parvati|Shallow' },
      { eventType: 'FINAL_TRIBAL', votesToRead: ['Tony', 'Tony', 'Kim'] },
    ],
  },
]

describe('episodeSummaryRows', () => {
  const rows = episodeSummaryRows(episodes)

  it('emits a header and one row per non-metadata episode', () => {
    expect(rows[0]).toEqual(['Episode', 'Phase', 'Immunity Winner', 'Idols Found', 'Eliminated'])
    expect(rows).toHaveLength(5) // header + 4 episodes
  })

  it('derives immunity, idols, and the tribal-council boot', () => {
    expect(rows[1]).toEqual([1, '', 'Sele', 'Sandra Diaz-Twine', 'Tony Vlachos'])
  })

  it('resolves a rocks tiebreaker as the elimination', () => {
    expect(rows[2]).toEqual([2, 'Swap', '', '', 'Boston Rob Mariano'])
  })

  it('labels the merge episode and its individual-immunity winner', () => {
    expect(rows[3]).toEqual([3, 'Merge', 'Kim Spradlin', '', 'Wendell Holland'])
  })

  it('treats the fire-making loser as the finale elimination', () => {
    expect(rows[4]).toEqual([4, 'Finale', 'Kim Spradlin', '', 'Parvati Shallow'])
  })
})

describe('findWinner', () => {
  it('picks the player with the most jury votes', () => {
    expect(findWinner(episodes)).toBe('Tony')
  })

  it('returns null without a final tribal', () => {
    expect(findWinner([{ episode: 0, eventsInEpisode: [] }])).toBeNull()
  })
})
