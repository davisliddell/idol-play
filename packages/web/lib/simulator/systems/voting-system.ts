import { Player, GamePhase } from '../models/player'
import { Tribe } from '../models/tribe'
import { MergedTribe } from '../models/merged-tribe'
import { GAME_CONFIG } from '../config/game-constants'

export interface VotingResult {
  eliminated: Player
  votes: Map<Player, Player> // who voted for whom
  idolsPlayed: Map<Player, Player> // who played idol for whom
  hadRevote: boolean
  hadFiremaking: boolean
  hadRocks: boolean
}

/**
 * VotingSystem - Handles all tribal council mechanics
 *
 * Responsibilities:
 * - Orchestrates the voting process for both pre-merge and merged tribes
 * - Coordinates target selection, vote casting, and vote counting
 * - Handles idol plays, revotes, and tie-breaking mechanisms
 *
 * Note: This system delegates to tribe methods for now, but provides
 * a clean interface for the game engine to conduct tribal councils.
 */
export class VotingSystem {
  /**
   * Conducts a complete tribal council for a pre-merge/post-swap tribe
   *
   * @param tribe The tribe conducting tribal council
   * @param phase Current game phase
   * @returns VotingResult with elimination details
   */
  conductTribalCouncil(tribe: Tribe, phase: GamePhase): VotingResult {
    // Get eligible members (all current tribe members)
    const eligibleMembers = tribe.members

    // Step 1: Select targets (alliances decide who to vote for)
    tribe.targets(phase, eligibleMembers)

    // Step 2: Cast votes (each player votes for their biggest threat)
    tribe.timeToVote(phase)

    // Step 3: Read votes and determine elimination
    // Note: illReadTheVotes modifies the tribe (removes eliminated player)
    // We need to capture who was eliminated before they're removed
    const membersBefore = [...tribe.members]
    tribe.illReadTheVotes(phase)
    const membersAfter = tribe.members

    // Find who was eliminated
    const eliminated = membersBefore.find(p => !membersAfter.includes(p))
    if (!eliminated) {
      throw new Error('No player was eliminated from tribal council')
    }

    // TODO: Capture vote details, idol plays, etc. from the voting process
    // For now, return minimal result
    return {
      eliminated,
      votes: new Map(),
      idolsPlayed: new Map(),
      hadRevote: false,
      hadFiremaking: false,
      hadRocks: false,
    }
  }

  /**
   * Conducts tribal council for merged tribe
   *
   * @param tribe The merged tribe conducting tribal council
   * @param phase Current game phase (Early or Late Post-Merge)
   * @returns VotingResult with elimination details
   */
  conductMergedTribalCouncil(tribe: MergedTribe, phase: GamePhase): VotingResult {
    // Get eligible members
    const eligibleMembers = tribe.members

    // Step 1: Select targets (voting blocs decide who to vote for)
    tribe.targets(phase, eligibleMembers)

    // Step 2: Cast votes (each bloc votes for their biggest threat)
    tribe.timeToVote(phase)

    // Step 3: Read votes and determine elimination
    const membersBefore = [...tribe.members]
    tribe.illReadTheVotes(phase)
    const membersAfter = tribe.members

    // Find who was eliminated
    const eliminated = membersBefore.find(p => !membersAfter.includes(p))
    if (!eliminated) {
      throw new Error('No player was eliminated from merged tribal council')
    }

    // TODO: Capture vote details, idol plays, etc.
    return {
      eliminated,
      votes: new Map(),
      idolsPlayed: new Map(),
      hadRevote: false,
      hadFiremaking: false,
      hadRocks: false,
    }
  }

  /**
   * Helper to shuffle an array (used for random selection)
   */
  private shuffle<T>(array: T[]): T[] {
    return array.sort(() => Math.random() - GAME_CONFIG.voting.shuffleThreshold)
  }
}
