import { describe, it, expect } from 'vitest'
import { GameEngine } from './game-engine'
import { DataParser } from '../data-parser'
import samplePlayers from '../sample-players.json'

interface GameEvent {
  eventType: string
  [key: string]: unknown
}
interface Episode {
  episode: number
  eventsInEpisode?: GameEvent[]
  currentTribes?: Record<string, string[]>
}

function runOnce(): Episode[] {
  const players = DataParser.parsePlayerArray(samplePlayers)
  const engine = new GameEngine()
  return JSON.parse(engine.runSimulation(players)) as Episode[]
}

describe('GameEngine.runSimulation (integration)', () => {
  it('produces a well-formed episode list', () => {
    const episodes = runOnce()
    expect(Array.isArray(episodes)).toBe(true)
    // Episode 0 is metadata; a full game runs many councils.
    expect(episodes.length).toBeGreaterThan(10)
    expect(episodes[0].episode).toBe(0)
  })

  it('reaches a final tribal council with a winner', () => {
    const episodes = runOnce()
    const finalTribal = episodes
      .flatMap((e) => e.eventsInEpisode || [])
      .find((e) => e.eventType === 'FINAL_TRIBAL')
    expect(finalTribal).toBeDefined()

    const votes = finalTribal?.votesToRead as string[] | undefined
    expect(Array.isArray(votes)).toBe(true)
    expect(votes!.length).toBeGreaterThan(0)
  })

  it('crowns a winner drawn from the original cast', () => {
    const episodes = runOnce()
    const finalTribal = episodes
      .flatMap((e) => e.eventsInEpisode || [])
      .find((e) => e.eventType === 'FINAL_TRIBAL')
    const votes = (finalTribal?.votesToRead as string[]) || []
    const counts: Record<string, number> = {}
    for (const v of votes) counts[v] = (counts[v] || 0) + 1
    const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]

    // votesToRead uses first names; confirm the winner is a real cast member.
    const firstNames = new Set(samplePlayers.map((p) => p.firstName))
    expect(firstNames.has(winner)).toBe(true)
  })

  it('runs repeatedly without leaking global report state', () => {
    // Report is a shared singleton cleared at the start of each run; back-to-back
    // synchronous runs must each yield an independent, non-empty episode list.
    const first = runOnce()
    const second = runOnce()
    expect(first.length).toBeGreaterThan(10)
    expect(second.length).toBeGreaterThan(10)
  })
})
