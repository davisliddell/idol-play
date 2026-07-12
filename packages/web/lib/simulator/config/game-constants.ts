/**
 * Game Configuration Constants
 * All magic numbers and hardcoded values extracted here for easy tuning
 */

export const GAME_CONFIG = {
  // Player count thresholds
  players: {
    initial: 20,
    preSwapEnd: 15,
    postSwapEnd: 13,
    mergeStart: 13,
    earlyMergeEnd: 8,
    finalFour: 4,
    finalThree: 3,
  },

  // Tribe configuration
  tribes: {
    preSwap: {
      count: 2,
      names: ['Dakal', 'Sele'],
    },
    postSwap: {
      count: 3,
      names: ['Dakal', 'Sele', 'Yara'],
      distribution: [5, 5, 5], // Players per tribe
    },
    merge: {
      name: 'Koru',
    },
  },

  // Threat level weights by phase
  threatLevels: {
    preSwap: {
      challengeSkill: 0.5,
      socialLevel: 0.4,
      visibility: 0.1,
      inverted: true, // Lower skill = higher threat
    },
    postSwap: {
      socialLevel: 0.6,
      challengeSkill: 0.2,
      visibility: 0.2,
      invertedSocial: true,
      invertedChallenge: true,
    },
    earlyPostMerge: {
      challengeSkill: 0.4,
      visibility: 0.4,
      strategicLevel: 0.1,
      socialLevel: 0.1,
    },
    latePostMerge: {
      strategicLevel: 0.4,
      challengeSkill: 0.2,
      socialLevel: 0.4, // Note: socialLevel counted twice in original
    },
  },

  // Bond mechanics
  bonds: {
    initialStrength: {
      positive: 1,
      negative: -1,
    },
    strengthRange: {
      min: -5,
      max: 5,
    },
    formation: {
      model: 'social-threshold' as 'social-threshold' | 'legacy',
      socialThreshold: {
        baseDifficulty: 1.3, // Multiplier for combined social levels
      },
      legacy: {
        randomRange: 13, // Math.random() * 13 (original behavior)
      },
    },
    fluctuation: {
      enabled: true,
      model: 'logistic' as 'logistic' | 'linear',
      logistic: {
        midpoint: 0, // Inflection point of the curve
        steepness: 1.5, // How quickly it transitions
        baseChance: 0.74,
        maxVariance: 0.2, // Maximum deviation from linear at extremes
      },
      linear: {
        baseChance: 0.74,
        strengthMultiplier: 0.032,
      },
    },
    eventModifiers: {
      enabled: true,
      votedTogether: 1,
      betrayed: -2,
      idolPlayedFor: 3,
      idolPlayedAgainst: -1,
      wonChallengeTogether: 0.5,
      lostChallengeTogether: -0.5,
    },
    neutralStrength: 2.5, // Default bond strength when no bond exists
  },

  // Alliance mechanics
  alliances: {
    initialStrength: {
      majority: 5,
      minority: 3,
    },
    membershipThreshold: 2 / 3, // 2/3 of alliance must have negative bonds to remove
    inviteThreshold: 2 / 3, // 2/3 of alliance must have strong bonds to invite
    strongBondThreshold: 3, // Bond strength > 3 to be considered strong
    multiAlliance: {
      enabled: true,
      thresholds: [
        { minSize: 11, numAlliances: 4 },
        { minSize: 8, numAlliances: 3 },
        { minSize: 5, numAlliances: 2 },
        { minSize: 0, numAlliances: 2 },
      ],
      strengthDistribution: {
        dominant: 5,
        challenger: 4,
        wildcard: 3,
      },
    },
    strategicFactors: {
      enabled: true,
      diversityWeight: 0.15,
      attributeWeights: {
        challengeSkill: 0.4,
        strategicLevel: 0.3,
        socialLevel: 0.3,
      },
    },
    loyalty: {
      enabled: true,
      initial: 50,
      voteWith: 5,
      voteAgainst: -10,
      removalThreshold: 20,
      inviteThreshold: 70,
    },
  },

  // Voting mechanics
  voting: {
    targetSelection: {
      selectionThreshold: 0.75, // Random >= 0.75 to select target
      majorityThreshold: 2 / 3, // Alliance size >= 2/3 of tribe = majority
      minimumTargets: 1,
      maximumTargets: 2, // Majority alliances pick 2 targets
    },
    shuffleThreshold: 0.5, // For Math.random() - 0.5 shuffling
    revote: {
      compatibilityThreshold: 4,
      maxFlips: 2,
    },
    defection: {
      enabled: true,
      baseChance: 0.05, // 5% base defection rate
      strategicBonus: 0.10, // +10% per strategic level above 3
      negativeBondBonus: 0.05, // +5% per bond strength below -2 with target
      minorityBonus: 0.15, // +15% if in minority position
    },
    splitVote: {
      enabled: true,
      minimumAllianceSize: 6,
      requiresMultipleTargets: true,
      distribution: 'proportional' as 'proportional' | 'even',
    },
    blocReformation: {
      enabled: true,
      afterBetrayal: true,
      everyNCouncils: 3,
      whenBelowSize: 2,
    },
  },

  // Voting bloc mechanics
  votingBlocs: {
    merge: {
      earlyPhase: {
        minBlocs: 2,
        maxBlocs: 4, // rand(3) + 2
        maxPerBloc: 7,
      },
      latePhase: {
        minBlocs: 2,
        maxBlocs: 2, // rand(1) + 2
        maxPerBloc: 5,
      },
    },
  },

  // Idol mechanics
  idols: {
    discovery: {
      baseChance: 0.6, // 60% chance someone looks for idol
      // Probability weighted by strategic level
    },
    play: {
      self: {
        baseChance: 0.3,
        strategicBonusPerLevel: 0.1, // Per strategic level point above 1
      },
      other: {
        baseChance: 0.0,
        strategicBonusPerLevel: 0.05,
        bondStrengthRequired: 4, // Must have bond strength >= 4
        mergedBondStrengthRequired: 5, // Higher requirement post-merge
      },
    },
  },

  // Challenge mechanics (probability-based on skill)
  challenges: {
    // All challenges use weighted random based on aggregate skill
    // Winner probability = tribeTotalSkill / overallTotalSkill
  },

  // Fire-making challenge
  fireMaking: {
    finalFour: {
      immunityGiveupThreshold: 4, // Strategic level >= 4 to give up immunity
      // Checks if immunity winner is in top 2 threats
    },
  },

  // Final Tribal Council
  finalTribalCouncil: {
    voting: {
      bondWeight: 1, // bond.strength * juror.socialLevel
      strategyWeight: 1, // juror.strategic * finalist.strategic
      articulationWeight: 1, // finalist.articulation
      // totalScore = bondWeight*bond*social + strategyWeight*strat*strat + articWeight*artic
    },
  },

  // Attribute ranges
  attributes: {
    min: 1,
    max: 5,
    names: [
      'challengeSkill',
      'strategicLevel',
      'visibility',
      'socialLevel',
      'articulation',
    ] as const,
  },

  // Sentinel values for initialization
  sentinel: {
    impossibleLow: -100000,
    impossibleHigh: 100000,
    impossibleHighAlt: 10000000,
  },
} as const

// Type-safe phase names
export type GamePhase = 'Pre-Swap' | 'Post-Swap' | 'Early Post-Merge' | 'Late Post-Merge'

// Type-safe tribe names
export type TribeName = 'Dakal' | 'Sele' | 'Yara' | 'Koru'

// Helper functions for common calculations
export const GameHelpers = {
  /**
   * Calculate threat level for a player based on phase
   */
  calculateThreatLevel(
    phase: GamePhase,
    challengeSkill: number,
    strategicLevel: number,
    visibility: number,
    socialLevel: number
  ): number {
    const config = GAME_CONFIG.threatLevels

    switch (phase) {
      case 'Pre-Swap':
        return (
          config.preSwap.challengeSkill * (6 - challengeSkill) +
          config.preSwap.socialLevel * (6 - socialLevel) +
          config.preSwap.visibility * visibility
        )
      case 'Post-Swap':
        return (
          config.postSwap.socialLevel * (6 - socialLevel) +
          config.postSwap.challengeSkill * (6 - challengeSkill) +
          config.postSwap.visibility * visibility
        )
      case 'Early Post-Merge':
        return (
          config.earlyPostMerge.challengeSkill * challengeSkill +
          config.earlyPostMerge.visibility * visibility +
          config.earlyPostMerge.strategicLevel * strategicLevel +
          config.earlyPostMerge.socialLevel * socialLevel
        )
      case 'Late Post-Merge':
        return (
          config.latePostMerge.strategicLevel * strategicLevel +
          config.latePostMerge.challengeSkill * challengeSkill +
          config.latePostMerge.socialLevel * socialLevel +
          config.latePostMerge.socialLevel * socialLevel // Intentional duplicate
        )
    }
  },

  /**
   * Calculate bond fluctuation probability
   */
  calculateBondFluctuationChance(currentStrength: number): number {
    const config = GAME_CONFIG.bonds.fluctuation

    if (config.model === 'linear') {
      return (
        currentStrength * config.linear.strengthMultiplier +
        config.linear.baseChance
      )
    } else {
      // logistic model
      const { midpoint, steepness, baseChance, maxVariance } = config.logistic
      // Logistic curve: baseChance + maxVariance * (2 / (1 + e^(-steepness * (x - midpoint))) - 1)
      const logisticValue = 2 / (1 + Math.exp(-steepness * (currentStrength - midpoint))) - 1
      return baseChance + maxVariance * logisticValue
    }
  },

  /**
   * Calculate idol play chance for self-protection
   */
  calculateSelfIdolPlayChance(strategicLevel: number): number {
    return (
      GAME_CONFIG.idols.play.self.baseChance +
      GAME_CONFIG.idols.play.self.strategicBonusPerLevel * (strategicLevel - 1)
    )
  },

  /**
   * Calculate idol play chance for protecting another
   */
  calculateOtherIdolPlayChance(strategicLevel: number): number {
    return (
      GAME_CONFIG.idols.play.other.baseChance +
      GAME_CONFIG.idols.play.other.strategicBonusPerLevel * (strategicLevel - 1)
    )
  },

  /**
   * Check if alliance is majority
   */
  isMajorityAlliance(allianceSize: number, tribeSize: number): boolean {
    return allianceSize >= tribeSize * GAME_CONFIG.voting.targetSelection.majorityThreshold
  },

  /**
   * Determine game phase based on player count
   */
  determinePhase(playerCount: number): GamePhase {
    if (playerCount > GAME_CONFIG.players.preSwapEnd) {
      return 'Pre-Swap'
    } else if (playerCount > GAME_CONFIG.players.postSwapEnd) {
      return 'Post-Swap'
    } else if (playerCount > GAME_CONFIG.players.earlyMergeEnd) {
      return 'Early Post-Merge'
    } else {
      return 'Late Post-Merge'
    }
  },

  /**
   * Calculate optimal number of alliances based on tribe size
   */
  calculateNumAlliances(tribeSize: number): number {
    if (!GAME_CONFIG.alliances.multiAlliance.enabled) {
      return 2
    }

    const thresholds = GAME_CONFIG.alliances.multiAlliance.thresholds
    for (const threshold of thresholds) {
      if (tribeSize >= threshold.minSize) {
        return threshold.numAlliances
      }
    }
    return 2
  },

  /**
   * Get alliance strength based on rank and total number of alliances
   */
  getAllianceStrength(rank: number, totalAlliances: number): number {
    const dist = GAME_CONFIG.alliances.multiAlliance.strengthDistribution
    if (rank === 0) return dist.dominant
    if (rank === 1 && totalAlliances >= 3) return dist.challenger
    return dist.wildcard
  },
}
