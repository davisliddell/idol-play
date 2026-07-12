import { Player } from '../models/player'
import { Tribe } from '../models/tribe'
import { GAME_CONFIG, GameHelpers } from '../config/game-constants'
import { Report } from '../report'

/**
 * IdolSystem - Handles idol discovery and strategic play
 * Decoupled from Tribe logic
 */
export class IdolSystem {
  constructor() {}

  /**
   * Simulate idol hunt for a tribe
   * Returns the player who found the idol, or null if none found
   */
  conductIdolHunt(tribe: Tribe): Player | null {
    if (!tribe['isIdolHidden']) {
      return null
    }

    // Shuffle members for randomness
    const members = [...tribe.members].sort(() => Math.random() - 0.5)

    // Base chance someone looks for idol
    const searchChance = Math.random()
    if (searchChance > GAME_CONFIG.idols.discovery.baseChance) {
      return null
    }

    // Weight by strategic level
    let totalStrat = 0
    for (const p of members) {
      totalStrat += p.strategicLevel
    }

    const selectionRandom = Math.random()
    let cursor = 0

    for (const p of members) {
      cursor += p.strategicLevel
      if (cursor / totalStrat >= selectionRandom) {
        p.findIdol()
        tribe.isIdolHidden = false

        Report.addIdolFound(p)

        console.log(`${p.firstName} found an idol!`)
        return p
      }
    }

    return null
  }

  /**
   * Evaluate if players should play idols during tribal council
   * Returns map of who played idol for whom
   */
  evaluateIdolPlays(
    tribe: Tribe,
    targetList: Player[],
    maxVotedPlayer: Player | null,
    tiedPlayers: Player[],
    isMerge: boolean = false
  ): Map<Player, Player> {
    const idolsPlayed = new Map<Player, Player>()
    const members = [...tribe.members].sort(() => Math.random() - 0.5)

    const requiredBondStrength = isMerge
      ? GAME_CONFIG.idols.play.other.mergedBondStrengthRequired
      : GAME_CONFIG.idols.play.other.bondStrengthRequired

    for (const p of members) {
      if (p.numIdols <= 0) continue

      // Play for self if in danger
      const isInDanger =
        (maxVotedPlayer && maxVotedPlayer === p) ||
        (tiedPlayers.length > 1 && tiedPlayers.includes(p))

      if (isInDanger && !p.isImmune) {
        const selfPlayChance = GameHelpers.calculateSelfIdolPlayChance(
          p.strategicLevel
        )
        const random = Math.random()

        if (random <= selfPlayChance) {
          console.log(`${p.firstName} is playing an idol for themselves`)
          p.isImmune = true
          p.useIdol()
          idolsPlayed.set(p, p)
          tribe['isIdolHidden'] = true
          continue
        }
      }

      // Play for close ally if in danger
      if (!p.isImmune) {
        for (const target of targetList) {
          const bond = p.bondWith(target)
          if (!bond || bond.strength < requiredBondStrength) continue

          const targetInDanger =
            (maxVotedPlayer && maxVotedPlayer === target) ||
            (tiedPlayers.length > 1 && tiedPlayers.includes(target))

          if (targetInDanger && !target.isImmune) {
            const otherPlayChance = GameHelpers.calculateOtherIdolPlayChance(
              p.strategicLevel
            )
            const random = Math.random()

            if (random <= otherPlayChance) {
              console.log(
                `${p.firstName} is playing an idol for ${target.firstName}`
              )
              target.isImmune = true
              p.useIdol()
              idolsPlayed.set(p, target)
              tribe['isIdolHidden'] = true
              break
            }
          }
        }
      }
    }

    return idolsPlayed
  }
}
