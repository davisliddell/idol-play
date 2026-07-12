import { describe, it, expect } from 'vitest'
import { GameHelpers, GAME_CONFIG } from './game-constants'

describe('GameHelpers.determinePhase', () => {
  it('classifies pre-swap above 15 players', () => {
    expect(GameHelpers.determinePhase(20)).toBe('Pre-Swap')
    expect(GameHelpers.determinePhase(16)).toBe('Pre-Swap')
  })

  it('classifies post-swap for 14-15 players', () => {
    expect(GameHelpers.determinePhase(15)).toBe('Post-Swap')
    expect(GameHelpers.determinePhase(14)).toBe('Post-Swap')
  })

  it('classifies early post-merge for 9-13 players', () => {
    expect(GameHelpers.determinePhase(13)).toBe('Early Post-Merge')
    expect(GameHelpers.determinePhase(9)).toBe('Early Post-Merge')
  })

  it('classifies late post-merge for 8 or fewer players', () => {
    expect(GameHelpers.determinePhase(8)).toBe('Late Post-Merge')
    expect(GameHelpers.determinePhase(3)).toBe('Late Post-Merge')
  })
})

describe('GameHelpers.calculateThreatLevel', () => {
  it('treats weak players as threats pre-swap (inverted skill/social)', () => {
    // 0.5*(6-5) + 0.4*(6-5) + 0.1*5 = 0.5 + 0.4 + 0.5 = 1.4
    expect(GameHelpers.calculateThreatLevel('Pre-Swap', 5, 3, 5, 5)).toBeCloseTo(1.4)
    // A weaker challenge player is a bigger pre-swap threat.
    const strong = GameHelpers.calculateThreatLevel('Pre-Swap', 5, 3, 3, 5)
    const weak = GameHelpers.calculateThreatLevel('Pre-Swap', 1, 3, 3, 5)
    expect(weak).toBeGreaterThan(strong)
  })

  it('counts social level twice in late post-merge', () => {
    // 0.4*1 + 0.2*1 + 0.4*1 + 0.4*1 = 1.4
    expect(GameHelpers.calculateThreatLevel('Late Post-Merge', 1, 1, 1, 1)).toBeCloseTo(1.4)
  })

  it('treats strong players as threats post-merge', () => {
    const strong = GameHelpers.calculateThreatLevel('Early Post-Merge', 5, 5, 5, 5)
    const weak = GameHelpers.calculateThreatLevel('Early Post-Merge', 1, 1, 1, 1)
    expect(strong).toBeGreaterThan(weak)
  })
})

describe('GameHelpers idol play chances', () => {
  it('scales self-protection with strategic level', () => {
    expect(GameHelpers.calculateSelfIdolPlayChance(1)).toBeCloseTo(0.3)
    expect(GameHelpers.calculateSelfIdolPlayChance(5)).toBeCloseTo(0.7)
  })

  it('scales protecting others with strategic level', () => {
    expect(GameHelpers.calculateOtherIdolPlayChance(1)).toBeCloseTo(0.0)
    expect(GameHelpers.calculateOtherIdolPlayChance(5)).toBeCloseTo(0.2)
  })
})

describe('GameHelpers alliance math', () => {
  it('detects majority alliances at the 2/3 threshold', () => {
    expect(GameHelpers.isMajorityAlliance(4, 5)).toBe(true) // 4 >= 3.33
    expect(GameHelpers.isMajorityAlliance(3, 5)).toBe(false) // 3 < 3.33
  })

  it('picks alliance count by tribe size', () => {
    expect(GameHelpers.calculateNumAlliances(11)).toBe(4)
    expect(GameHelpers.calculateNumAlliances(8)).toBe(3)
    expect(GameHelpers.calculateNumAlliances(5)).toBe(2)
    expect(GameHelpers.calculateNumAlliances(4)).toBe(2)
  })

  it('assigns alliance strength by rank', () => {
    const { dominant, challenger, wildcard } = GAME_CONFIG.alliances.multiAlliance.strengthDistribution
    expect(GameHelpers.getAllianceStrength(0, 4)).toBe(dominant)
    expect(GameHelpers.getAllianceStrength(1, 3)).toBe(challenger)
    expect(GameHelpers.getAllianceStrength(1, 2)).toBe(wildcard) // challenger needs >=3 alliances
    expect(GameHelpers.getAllianceStrength(2, 4)).toBe(wildcard)
  })
})

describe('GameHelpers.calculateBondFluctuationChance (logistic)', () => {
  it('returns the base chance at neutral strength', () => {
    // At the midpoint the logistic term is 0, so the result is baseChance.
    expect(GameHelpers.calculateBondFluctuationChance(0)).toBeCloseTo(
      GAME_CONFIG.bonds.fluctuation.logistic.baseChance
    )
  })

  it('is monotonic in strength', () => {
    const low = GameHelpers.calculateBondFluctuationChance(-5)
    const mid = GameHelpers.calculateBondFluctuationChance(0)
    const high = GameHelpers.calculateBondFluctuationChance(5)
    expect(low).toBeLessThan(mid)
    expect(mid).toBeLessThan(high)
  })
})
