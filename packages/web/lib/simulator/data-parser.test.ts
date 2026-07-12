import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DataParser, PlayerJSON } from './data-parser'

const validPlayer: PlayerJSON = {
  firstName: 'Mary',
  lastName: 'Sue',
  challengeSkill: 5,
  strategicLevel: 4,
  visibility: 3,
  socialLevel: 2,
  articulation: 1,
}

describe('DataParser.parsePlayerArray', () => {
  it('builds Player instances preserving attributes', () => {
    const [player] = DataParser.parsePlayerArray([validPlayer])
    expect(player.firstName).toBe('Mary')
    expect(player.lastName).toBe('Sue')
    expect(player.challengeSkill).toBe(5)
    expect(player.articulation).toBe(1)
  })
})

describe('DataParser.parseJsonString', () => {
  // parseJsonString logs errors before rethrowing; silence the noise.
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
  afterEach(() => vi.restoreAllMocks())

  it('parses a valid JSON array', () => {
    const players = DataParser.parseJsonString(JSON.stringify([validPlayer]))
    expect(players).toHaveLength(1)
    expect(players[0].firstName).toBe('Mary')
  })

  it('throws when a player is missing required fields', () => {
    const bad = [{ firstName: 'No', lastName: 'Skills' }]
    expect(() => DataParser.parseJsonString(JSON.stringify(bad))).toThrow(/missing required fields/)
  })

  it('throws when attributes are out of the 1-5 range', () => {
    const bad = [{ ...validPlayer, challengeSkill: 9 }]
    expect(() => DataParser.parseJsonString(JSON.stringify(bad))).toThrow(/between 1 and 5/)
  })

  it('throws when the payload is not an array', () => {
    expect(() => DataParser.parseJsonString(JSON.stringify(validPlayer))).toThrow(/must be an array/)
  })
})

describe('DataParser.validatePlayerCount', () => {
  it('accepts the exact expected count', () => {
    const players = DataParser.parsePlayerArray(Array(20).fill(validPlayer))
    expect(() => DataParser.validatePlayerCount(players, 20)).not.toThrow()
  })

  it('rejects the wrong count', () => {
    const players = DataParser.parsePlayerArray([validPlayer])
    expect(() => DataParser.validatePlayerCount(players, 20)).toThrow(/Expected 20 players/)
  })
})
