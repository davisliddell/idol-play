import type { Bond } from './bond'
import type { Alliance } from './alliance'
import { GameHelpers, GAME_CONFIG } from '../config/game-constants'

export type GamePhase = 'Pre-Swap' | 'Post-Swap' | 'Early Post-Merge' | 'Late Post-Merge'

export class Player {
  // Core attributes
  readonly firstName: string
  readonly lastName: string
  challengeSkill: number
  strategicLevel: number
  visibility: number
  socialLevel: number
  articulation: number

  // Transient state
  numIdols: number = 0
  tribe: string = ''
  isImmune: boolean = false
  numBonds: number = 0
  bondList: Bond[] | null = null
  vote: Player | null = null
  allianceList: Alliance[] | null = null
  originalTribe: string = 'Dakal'
  private allianceLoyalty: Map<Alliance, number> = new Map()

  constructor(
    firstName: string,
    lastName: string = '',
    challengeSkill: number = 0,
    strategicLevel: number = 0,
    visibility: number = 0,
    socialLevel: number = 0,
    articulation: number = 0,
    hasIdol: boolean = false,
    tribe: string = '',
    numBonds: number = 0
  ) {
    this.firstName = firstName
    this.lastName = lastName
    this.challengeSkill = challengeSkill
    this.strategicLevel = strategicLevel
    this.visibility = visibility
    this.socialLevel = socialLevel
    this.articulation = articulation
    this.tribe = tribe
    this.numBonds = numBonds
    this.numIdols = hasIdol ? 1 : 0
    this.allianceList = []
    this.bondList = []
  }

  // Idol management
  findIdol(): void {
    this.numIdols++
  }

  useIdol(): void {
    this.numIdols--
  }

  // Threat level calculations for different game phases
  /**
   * Calculates threat level based on current game phase
   * Uses configuration from GAME_CONFIG.threatLevels
   *
   * Pre-game phases: Weak players are threats (liability)
   * Post-merge phases: Strong players are threats (jury threats)
   */
  threatLevel(phase: GamePhase): number {
    return GameHelpers.calculateThreatLevel(
      phase,
      this.challengeSkill,
      this.strategicLevel,
      this.visibility,
      this.socialLevel
    )
  }

  // Bond management
  clearBonds(): void {
    this.bondList = null
    this.numBonds = 0
  }

  /**
   * Adds a bond to the bond list of a player
   * @param b The bond you would like to add to a player's bond list
   */
  addBond(b: Bond): void {
    if (this.bondList === null) {
      this.bondList = []
    }
    this.bondList.push(b)
  }

  /**
   * A method that indexes through the bond list for a player to find a bond
   * with the player passed into the method. If the player has no bond with the
   * player passed in, it will return null
   * @param p A player that you want to find the bond of for the player
   * @return The bond of the corresponding player if there is one, or null if there is not
   */
  bondWith(p: Player): Bond | null {
    if (!this.bondList) return null

    for (const b of this.bondList) {
      if (b.member2 === p || b.member1 === p) {
        return b
      }
    }
    return null
  }

  hasBond(p: Player): boolean {
    if (!this.bondList) return false

    for (const b of this.bondList) {
      if (b.member1 === p || b.member2 === p) {
        return true
      }
    }
    return false
  }

  // Alliance management
  addAlliance(a: Alliance): void {
    if (this.allianceList === null) {
      this.allianceList = []
    }
    this.allianceList.push(a)
    // Initialize loyalty score
    this.allianceLoyalty.set(a, GAME_CONFIG.alliances.loyalty.initial)
  }

  removeAlliance(a: Alliance): void {
    if (this.allianceList) {
      const index = this.allianceList.indexOf(a)
      if (index > -1) {
        this.allianceList.splice(index, 1)
      }
    }
    this.allianceLoyalty.delete(a)
  }

  /**
   * Adjust loyalty score for an alliance
   */
  adjustLoyalty(alliance: Alliance, delta: number): void {
    const current = this.allianceLoyalty.get(alliance) || 0
    this.allianceLoyalty.set(alliance, Math.max(0, Math.min(100, current + delta)))
  }

  /**
   * Get loyalty score for an alliance
   */
  loyaltyFor(alliance: Alliance): number {
    return this.allianceLoyalty.get(alliance) || 0
  }

  // Target finding logic
  /**
   * Finds the biggest threat from a list of players based on bond strength and threat level
   * @param pList List of players to evaluate
   * @param phase Current game phase
   * @return The player considered the biggest threat
   */
  findBiggestThreat(pList: Player[], phase: GamePhase): Player {
    let target: Player = new Player('Error')
    let min = 100000

    try {
      for (const other of pList) {
        if (this !== other) {
          const threatValue = this.theirThreatLevel(other, phase)
          if (threatValue < min) {
            min = threatValue
            target = other
          }
        }
      }
    } catch (e) {
      console.error(`Error finding biggest threat for ${this.firstName}:`, e)
      console.error('Player list:', pList)
    }

    return target
  }

  /**
   * Calculates the threat level of another player relative to this player
   * Takes into account bond strength and the other player's threat level
   * @param other The other player to evaluate
   * @param phase Current game phase
   * @return A value representing the threat (lower = bigger threat)
   */
  theirThreatLevel(other: Player, phase: GamePhase): number {
    const bond = this.bondWith(other)
    if (!bond) {
      throw new Error(`No bond found between ${this.firstName} and ${other.firstName}`)
    }

    // Lower value = bigger threat (strong bond mitigates their threat)
    return bond.strength - other.threatLevel(phase)
  }

  /**
   * Determines if player should defect from their alliance's vote
   * @param alliance The alliance the player belongs to
   * @param consensusTarget Who the alliance is voting for
   * @param phase Current game phase
   * @param allianceSize Size of the alliance
   * @param tribeSize Size of the tribe
   * @return Whether the player should defect
   */
  shouldDefect(
    alliance: Alliance | null,
    consensusTarget: Player | null,
    phase: GamePhase,
    allianceSize: number,
    tribeSize: number
  ): boolean {
    if (!GAME_CONFIG.voting.defection.enabled || !consensusTarget || !alliance) {
      return false
    }

    let defectionChance = GAME_CONFIG.voting.defection.baseChance

    // Strategic bonus: smart players more likely to defect when beneficial
    if (this.strategicLevel > 3) {
      defectionChance += GAME_CONFIG.voting.defection.strategicBonus * (this.strategicLevel - 3)
    }

    // Bond bonus: if player has negative bond with target, less likely to vote for them
    const bondWithTarget = this.bondWith(consensusTarget)
    if (bondWithTarget && bondWithTarget.strength < -2) {
      defectionChance +=
        GAME_CONFIG.voting.defection.negativeBondBonus * Math.abs(bondWithTarget.strength + 2)
    }

    // Minority bonus: if in minority, more likely to defect
    if (allianceSize < tribeSize / 2) {
      defectionChance += GAME_CONFIG.voting.defection.minorityBonus
    }

    return Math.random() < defectionChance
  }

  // String representation
  toString(): string {
    return (
      `Name: ${this.firstName} ${this.lastName}\n` +
      `Challenge Skill: ${this.challengeSkill}\n` +
      `Strategic Level: ${this.strategicLevel}\n` +
      `Visibility: ${this.visibility}\n` +
      `Social Level: ${this.socialLevel}\n` +
      `Articulation: ${this.articulation}\n` +
      `Tribe: ${this.tribe || 'No Tribe'}`
    )
  }
}
