import { Player } from './player'
import { Bond } from './bond'
import type { Tribe } from './tribe'
import { GAME_CONFIG, GameHelpers } from '../config/game-constants'

export class Alliance {
  readonly members: Player[]
  readonly strength: number
  target: Player | null = null
  targets: Player[] | null = null
  name: string = ''

  constructor(members: Player[], strength: number) {
    this.members = members
    this.strength = strength
  }

  /**
   * A method that acts as a helper method for the initialAlliances method to find the similarities in the two lists
   * @param lst1 The first list
   * @param lst2 The second list
   * @return The similarities between the two lists
   */
  private static intersection(lst1: Player[], lst2: Player[]): Player[] {
    const lst3: Player[] = []
    for (const p of lst1) {
      if (lst2.includes(p)) {
        lst3.push(p)
      }
    }
    return lst3
  }

  /**
   * Get all friends of a player with at least minimum bond strength
   */
  private static friendsWithStrength(
    player: Player,
    bonds: Bond[],
    minStrength: number
  ): Player[] {
    const friends: Player[] = []
    for (const bond of bonds) {
      if (bond.member1 === player && bond.strength >= minStrength) {
        friends.push(bond.member2)
      } else if (bond.member2 === player && bond.strength >= minStrength) {
        friends.push(bond.member1)
      }
    }
    return friends
  }

  /**
   * Calculate alliance compatibility for a player based on bonds and optional diversity
   */
  private static calculateAllianceCompatibility(
    player: Player,
    allianceMembers: Player[]
  ): number {
    let bondTotal = 0
    let bondCount = 0

    // Calculate average bond strength with alliance members
    for (const member of allianceMembers) {
      const bond = player.bondWith(member)
      if (bond) {
        bondTotal += bond.strength
        bondCount++
      }
    }

    const avgBondStrength = bondCount > 0 ? bondTotal / bondCount : 0

    // If strategic factors are disabled, return just bond strength
    if (!GAME_CONFIG.alliances.strategicFactors.enabled) {
      return avgBondStrength
    }

    // Calculate diversity bonus (higher variance = more diverse = higher bonus)
    const diversityBonus = Alliance.calculateDiversityBonus(player, allianceMembers)
    const diversityWeight = GAME_CONFIG.alliances.strategicFactors.diversityWeight

    return avgBondStrength * (1 - diversityWeight) + diversityBonus * diversityWeight
  }

  /**
   * Calculate diversity bonus when adding a player to an alliance
   * Higher variance in attributes = more diverse = higher bonus
   */
  private static calculateDiversityBonus(player: Player, allianceMembers: Player[]): number {
    if (allianceMembers.length === 0) return 0

    const weights = GAME_CONFIG.alliances.strategicFactors.attributeWeights

    // Calculate variance for each attribute
    const challengeVals = [...allianceMembers.map(p => p.challengeSkill), player.challengeSkill]
    const strategicVals = [...allianceMembers.map(p => p.strategicLevel), player.strategicLevel]
    const socialVals = [...allianceMembers.map(p => p.socialLevel), player.socialLevel]

    const challengeVariance = Alliance.calculateVariance(challengeVals)
    const strategicVariance = Alliance.calculateVariance(strategicVals)
    const socialVariance = Alliance.calculateVariance(socialVals)

    // Normalize to 0-5 scale and weight
    const maxVariance = 2.5 // theoretical max variance for 1-5 scale
    return (
      (challengeVariance / maxVariance) * weights.challengeSkill * 5 +
      (strategicVariance / maxVariance) * weights.strategicLevel * 5 +
      (socialVariance / maxVariance) * weights.socialLevel * 5
    )
  }

  /**
   * Calculate variance of a set of values
   */
  private static calculateVariance(values: number[]): number {
    if (values.length === 0) return 0
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length
  }

  /**
   * Check if alliance distribution is valid (correct count, no empty alliances)
   */
  private static isValidAllianceDistribution(allianceLists: Player[][], numAlliances: number): boolean {
    if (allianceLists.length < numAlliances) return false
    for (const list of allianceLists) {
      if (list.length === 0) return false
    }
    return true
  }

  /**
   * Forms initial alliances for a new tribe based on bond networks
   *
   * ALGORITHM (Multi-Alliance):
   * 1. Calculate optimal number of alliances based on tribe size
   * 2. Find top N pairs of players with most mutual friends (where N = numAlliances)
   * 3. Create alliance seeds from these pairs + their mutual friends
   * 4. Distribute remaining players to most compatible alliance
   * 5. Assign strengths based on alliance size ranking
   *
   * FALLBACK (Legacy 2-Alliance):
   * - If multi-alliance disabled, uses original algorithm
   * - Find single pair with most mutual friends
   * - Create majority alliance (pair + mutual friends)
   * - Create minority alliance (everyone else)
   *
   * @param tribe The tribe to create initial alliances for
   */
  static initialAlliances(tribe: Tribe): void {
    const tribeMembers = tribe.members
    const numAlliances = GameHelpers.calculateNumAlliances(tribeMembers.length)

    let numTries = 0
    let allianceLists: Player[][] = []

    do {
      if (numTries > 0) {
        allianceLists = []
        tribe.clearBonds()
        for (const p of tribeMembers) {
          p.clearBonds()
        }
        tribe.initialBonding(Bond.initialBonding(tribeMembers))
      }

      // Find top N pairs with most mutual friends
      const pairScores: { pair: [Player, Player]; mutualFriends: Player[]; score: number }[] = []

      for (let i = 0; i < tribeMembers.length - 1; i++) {
        const player1 = tribeMembers[i]
        const player1Friends = Alliance.friendsWithStrength(player1, tribe.bonds, 1)

        for (let j = i + 1; j < tribeMembers.length; j++) {
          const player2 = tribeMembers[j]
          const player2Friends = Alliance.friendsWithStrength(player2, tribe.bonds, 1)

          const mutualFriends = Alliance.intersection(player1Friends, player2Friends)
          pairScores.push({
            pair: [player1, player2],
            mutualFriends,
            score: mutualFriends.length,
          })
        }
      }

      // Sort by score (descending)
      pairScores.sort((a, b) => b.score - a.score)

      // Create alliance seeds: scan all pairs in score order, pick the first
      // numAlliances non-overlapping ones. Mutual friends are NOT added here —
      // they land in the right alliance naturally via the compatibility phase.
      const usedPlayers = new Set<Player>()
      allianceLists = []

      for (let i = 0; i < pairScores.length && allianceLists.length < numAlliances; i++) {
        const { pair } = pairScores[i]

        if (!usedPlayers.has(pair[0]) && !usedPlayers.has(pair[1])) {
          usedPlayers.add(pair[0])
          usedPlayers.add(pair[1])
          allianceLists.push([pair[0], pair[1]])
        }
      }

      // Distribute remaining players based on compatibility
      const remainingPlayers = tribeMembers.filter(p => !usedPlayers.has(p))

      for (const player of remainingPlayers) {
        let bestAlliance = 0
        let bestCompatibility = Number.MIN_SAFE_INTEGER

        for (let i = 0; i < allianceLists.length; i++) {
          const compatibility = Alliance.calculateAllianceCompatibility(
            player,
            allianceLists[i]
          )

          if (compatibility > bestCompatibility) {
            bestCompatibility = compatibility
            bestAlliance = i
          }
        }

        allianceLists[bestAlliance].push(player)
      }

      numTries++
    } while (!Alliance.isValidAllianceDistribution(allianceLists, numAlliances) && numTries < 10)

    // Sort alliances by size (largest first) to assign strengths
    allianceLists.sort((a, b) => b.length - a.length)

    // Create Alliance objects with appropriate strengths
    for (let i = 0; i < allianceLists.length; i++) {
      const strength = GameHelpers.getAllianceStrength(i, allianceLists.length)
      const alliance = new Alliance(allianceLists[i], strength)
      tribe.addAlliance(alliance)

      // Add alliance to each member
      for (const player of allianceLists[i]) {
        player.addAlliance(alliance)
      }
    }
  }

  /**
   * Reforms alliances after the previous structure has broken down
   *
   * ALGORITHM (Multi-Alliance):
   * 1. Calculate optimal number of alliances based on current tribe size
   * 2. Find top N players with most bonds (where N = numAlliances)
   * 3. Create alliance seeds from these players + their bond partners
   * 4. Distribute remaining players to most compatible alliance
   * 5. Assign strengths based on alliance size ranking
   * 6. If no valid split found, adjust bond strength threshold and retry
   *
   * BOND STRENGTH ITERATION:
   * - Starts at strength >= threshold (initially 0, so any positive bond)
   * - If no valid split: threshold++, retry (require stronger bonds)
   * - After threshold>5: threshold=-1, allow negative bonds (desperation mode)
   *
   * @param tribe The tribe needing alliance reformation
   */
  static anotherAlliances(tribe: Tribe): void {
    const tribeMembers = tribe.members
    const numAlliances = GameHelpers.calculateNumAlliances(tribeMembers.length)

    let threshold = 0
    let allianceLists: Player[][] = []

    while (!Alliance.isValidAllianceDistribution(allianceLists, numAlliances)) {
      if (threshold !== 0) {
        allianceLists = []
      }

      // Find players with most bonds at or above threshold
      const playerBondCounts: { player: Player; friends: Player[]; count: number }[] = []

      for (const member of tribeMembers) {
        const friends = Alliance.friendsWithStrength(member, tribe.bonds, threshold)
        playerBondCounts.push({
          player: member,
          friends,
          count: friends.length,
        })
      }

      // Sort by bond count (descending)
      playerBondCounts.sort((a, b) => b.count - a.count)

      // Create alliance seeds from top N players
      const usedPlayers = new Set<Player>()
      allianceLists = []

      for (let i = 0; i < numAlliances && i < playerBondCounts.length; i++) {
        const { player, friends } = playerBondCounts[i]

        // Skip if player already assigned or has all players as friends (invalid)
        if (usedPlayers.has(player) || friends.length >= tribeMembers.length) {
          continue
        }

        const allianceMembers: Player[] = [player]
        usedPlayers.add(player)

        // Add friends who aren't already assigned
        for (const friend of friends) {
          if (!usedPlayers.has(friend)) {
            allianceMembers.push(friend)
            usedPlayers.add(friend)
          }
        }

        allianceLists.push(allianceMembers)
      }

      // Distribute remaining players based on compatibility
      const remainingPlayers = tribeMembers.filter(p => !usedPlayers.has(p))

      for (const player of remainingPlayers) {
        let bestAlliance = 0
        let bestCompatibility = Number.MIN_SAFE_INTEGER

        for (let i = 0; i < allianceLists.length; i++) {
          if (allianceLists[i].length > 0) {
            const compatibility = Alliance.calculateAllianceCompatibility(
              player,
              allianceLists[i]
            )

            if (compatibility > bestCompatibility) {
              bestCompatibility = compatibility
              bestAlliance = i
            }
          }
        }

        allianceLists[bestAlliance].push(player)
      }

      // Adjust threshold for next iteration if needed
      if (threshold >= 0) {
        threshold++
      } else {
        threshold--
      }

      if (threshold > GAME_CONFIG.bonds.strengthRange.max) {
        threshold = -1
      }

      // Prevent infinite loop
      if (threshold < -5) break
    }

    // Sort alliances by size (largest first) to assign strengths
    allianceLists.sort((a, b) => b.length - a.length)

    // Create Alliance objects with appropriate strengths
    for (let i = 0; i < allianceLists.length; i++) {
      const strength = GameHelpers.getAllianceStrength(i, allianceLists.length)
      const alliance = new Alliance(allianceLists[i], strength)
      tribe.addAlliance(alliance)

      // Add alliance to each member
      for (const player of allianceLists[i]) {
        player.addAlliance(alliance)
      }
    }
  }

  /**
   * Creates alliances based on former tribe membership after a swap/merge
   * @param tribe The tribe to create former tribe alliances for
   */
  static formerTribes(tribe: Tribe): void {
    const tribeMembers = tribe.members
    const tribes: string[] = []

    for (let i = 0; i < tribeMembers.length; i++) {
      if (tribes.includes(tribeMembers[i].originalTribe)) {
        continue
      }

      tribes.push(tribeMembers[i].originalTribe)
      const allies: Player[] = [tribeMembers[i]]

      for (let j = i + 1; j < tribeMembers.length; j++) {
        if (
          tribeMembers[j].originalTribe === tribeMembers[i].originalTribe &&
          !allies.includes(tribeMembers[j])
        ) {
          allies.push(tribeMembers[j])
        }
      }

      const formerTribe = new Alliance(allies, 3)
      tribe.addAlliance(formerTribe)

      for (const a of allies) {
        a.addAlliance(formerTribe)
      }
    }
  }

  remMember(p: Player): void {
    const index = this.members.indexOf(p)
    if (index > -1) {
      this.members.splice(index, 1)
    }
  }

  addMember(p: Player): void {
    this.members.push(p)
  }

  toString(): string {
    return `Alliance{ members=${this.members}, strength=${this.strength} }`
  }
}
