import { describe, it, expect } from 'vitest'
import { Player } from './player'
import { Bond } from './bond'
import { GameHelpers } from '../config/game-constants'

function makePlayer(first = 'Test', overrides: Partial<Player> = {}): Player {
  const p = new Player(first, 'Player', 3, 3, 3, 3, 3)
  Object.assign(p, overrides)
  return p
}

describe('Player idols', () => {
  it('starts with no idols and tracks find/use', () => {
    const p = makePlayer()
    expect(p.numIdols).toBe(0)
    p.findIdol()
    expect(p.numIdols).toBe(1)
    p.useIdol()
    expect(p.numIdols).toBe(0)
  })

  it('honors the hasIdol constructor flag', () => {
    const p = new Player('Idol', 'Holder', 3, 3, 3, 3, 3, true)
    expect(p.numIdols).toBe(1)
  })
})

describe('Player.threatLevel', () => {
  it('delegates to GameHelpers for the current phase', () => {
    const p = makePlayer('Threat', { challengeSkill: 4, strategicLevel: 2, visibility: 5, socialLevel: 1 })
    expect(p.threatLevel('Pre-Swap')).toBeCloseTo(
      GameHelpers.calculateThreatLevel('Pre-Swap', 4, 2, 5, 1)
    )
  })
})

describe('Player bonds', () => {
  it('finds a bond regardless of member order', () => {
    const a = makePlayer('A')
    const b = makePlayer('B')
    const bond = new Bond(3, a, b)
    a.addBond(bond)
    b.addBond(bond)

    expect(a.bondWith(b)).toBe(bond)
    expect(b.bondWith(a)).toBe(bond)
    expect(a.hasBond(b)).toBe(true)
  })

  it('returns null / false when no bond exists', () => {
    const a = makePlayer('A')
    const c = makePlayer('C')
    expect(a.bondWith(c)).toBeNull()
    expect(a.hasBond(c)).toBe(false)
  })

  it('clears bonds', () => {
    const a = makePlayer('A')
    const b = makePlayer('B')
    a.addBond(new Bond(2, a, b))
    a.clearBonds()
    expect(a.hasBond(b)).toBe(false)
    expect(a.numBonds).toBe(0)
  })
})
