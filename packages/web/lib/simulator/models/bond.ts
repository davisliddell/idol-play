import { Player } from './player'
import { GAME_CONFIG } from '../config/game-constants'

export class Bond {
  strength: number
  readonly member1: Player
  readonly member2: Player
  readonly members: Player[]

  constructor(strength: number, member1: Player, member2: Player) {
    this.strength = strength
    this.member1 = member1
    this.member2 = member2
    this.members = [member1, member2]
  }

  /**
   * Creates initial bonds between all players in a list
   * Bond strength is determined by the social levels of both players
   * Higher combined social level = higher chance of positive bond
   *
   * Models:
   * - 'social-threshold': Uses configurable difficulty threshold (default)
   * - 'legacy': Uses original magic number 13
   *
   * @param playerList List of players to create bonds between
   * @return List of all bonds created
   */
  static initialBonding(playerList: Player[]): Bond[] {
    const bondList: Bond[] = []
    const config = GAME_CONFIG.bonds.formation

    for (let i = 0; i < playerList.length; i++) {
      for (let j = 0; j < playerList.length - i - 1; j++) {
        const p1 = playerList[i]
        const p2 = playerList[i + j + 1]
        const combinedSocial = p1.socialLevel + p2.socialLevel

        // Calculate threshold based on model
        let threshold: number
        if (config.model === 'social-threshold') {
          // New model: threshold scales with max attribute values
          threshold = config.socialThreshold.baseDifficulty * (GAME_CONFIG.attributes.max * 2)
        } else {
          // Legacy model: fixed random range
          threshold = config.legacy.randomRange
        }

        const roll = Math.random() * threshold

        let b: Bond
        if (roll > combinedSocial) {
          // Negative bond
          b = new Bond(GAME_CONFIG.bonds.initialStrength.negative, p1, p2)
        } else {
          // Positive bond
          b = new Bond(GAME_CONFIG.bonds.initialStrength.positive, p1, p2)
        }

        bondList.push(b)
        p1.addBond(b)
        p2.addBond(b)
      }
    }

    return bondList
  }

  /**
   * Fluctuates the bond strength over time
   *
   * Models:
   * - 'logistic': Non-linear fluctuation (extreme bonds are stickier)
   * - 'linear': Original linear model (constant volatility)
   *
   * Extreme bonds (-5, +5) are more stable (sticky)
   * Moderate bonds (0, ±2) fluctuate more easily
   */
  fluctuate(): void {
    if (!GAME_CONFIG.bonds.fluctuation.enabled) return

    const config = GAME_CONFIG.bonds.fluctuation
    let incChance: number

    if (config.model === 'logistic') {
      // Logistic model: volatility varies based on current strength
      // Extreme values are stickier (less volatile)
      const { midpoint, steepness, baseChance, maxVariance } = config.logistic

      // Logistic function: 1 / (1 + e^(-steepness * (x - midpoint)))
      // Maps strength to a volatility multiplier
      const normalizedStrength = this.strength - midpoint
      const volatility = 1 / (1 + Math.exp(-steepness * normalizedStrength))

      // At extremes, reduce variance; at midpoint, increase variance
      const distanceFromMidpoint = Math.abs(this.strength - midpoint)
      const varianceAdjustment = maxVariance * (1 - distanceFromMidpoint / 5)

      incChance = baseChance + volatility * varianceAdjustment
    } else {
      // Linear model (legacy)
      incChance = this.strength * config.linear.strengthMultiplier + config.linear.baseChance
    }

    const roll = Math.random()

    if (roll <= incChance) {
      if (this.strength < GAME_CONFIG.bonds.strengthRange.max) {
        this.strength += 1
      }
    } else {
      if (this.strength > GAME_CONFIG.bonds.strengthRange.min) {
        this.strength -= 1
      }
    }
  }

  /**
   * Apply a modifier to bond strength based on game events
   * @param delta Change in strength
   * @param reason Description of why the change occurred
   */
  applyModifier(delta: number, reason?: string): void {
    if (!GAME_CONFIG.bonds.eventModifiers.enabled) return

    const oldStrength = this.strength
    this.strength = Math.max(
      GAME_CONFIG.bonds.strengthRange.min,
      Math.min(GAME_CONFIG.bonds.strengthRange.max, this.strength + delta)
    )

    if (reason && oldStrength !== this.strength) {
      console.log(
        `Bond ${this.member1.firstName}-${this.member2.firstName}: ${oldStrength} → ${this.strength} (${reason})`
      )
    }
  }

  /**
   * Compare bonds by strength (for sorting)
   * @param other Bond to compare to
   * @return Difference in strength
   */
  compareTo(other: Bond): number {
    return this.strength - other.strength
  }

  toString(): string {
    return `Bond: ${this.member1.firstName} ${this.member2.firstName} Strength: ${this.strength}`
  }
}
