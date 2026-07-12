import { Player } from '../models/player'
import { Tribe } from '../models/tribe'

/**
 * Type-safe game events for the event-driven architecture
 */

export interface IdolFoundEvent {
  type: 'IDOL_FOUND'
  player: Player
  tribe: string
  timestamp: number
}

export interface TribalChallengeEvent {
  type: 'TRIBAL_CHALLENGE'
  winner: Tribe
  loser: Tribe | Tribe[]
  timestamp: number
}

export interface IndividualChallengeEvent {
  type: 'INDIVIDUAL_CHALLENGE'
  winner: Player
  timestamp: number
}

export interface TribalCouncilEvent {
  type: 'TRIBAL_COUNCIL'
  votes: Map<Player, Player>
  idolsPlayed: Map<Player, Player> | null
  losingTribe: string
  timestamp: number
}

export interface TribalRevoteEvent {
  type: 'TRIBAL_REVOTE'
  votes: Map<Player, Player>
  tiedPlayers: Player[]
  timestamp: number
}

export interface RocksEvent {
  type: 'ROCKS'
  eliminated: Player
  tiedPlayers: Player[]
  timestamp: number
}

export interface FiremakingEvent {
  type: 'FIREMAKING'
  winner: Player
  loser: Player
  beingTaken?: Player
  timestamp: number
}

export interface PlayerEliminatedEvent {
  type: 'PLAYER_ELIMINATED'
  player: Player
  method: 'vote' | 'rocks' | 'firemaking'
  votes?: Map<Player, Player>
  timestamp: number
}

export interface SwapEvent {
  type: 'SWAP'
  newTribes: Tribe[]
  timestamp: number
}

export interface MergeEvent {
  type: 'MERGE'
  mergedTribe: Tribe
  timestamp: number
}

export interface FinalTribalCouncilEvent {
  type: 'FINAL_TRIBAL'
  finalists: Player[]
  jury: Player[]
  votes: Map<Player, Player>
  timestamp: number
}

export interface FinalTieBreakerEvent {
  type: 'FINAL_TIEBREAKER'
  voter: Player
  winner: Player
  timestamp: number
}

export interface WinnerDeclaredEvent {
  type: 'WINNER_DECLARED'
  winner: Player
  finalists: Player[]
  voteCount: number
  timestamp: number
}

export interface AllianceFormedEvent {
  type: 'ALLIANCE_FORMED'
  members: Player[]
  tribe: string
  timestamp: number
}

export interface VotingBlocFormedEvent {
  type: 'VOTING_BLOC_FORMED'
  members: Player[]
  timestamp: number
}

export interface PlayerTribeChangeEvent {
  type: 'PLAYER_TRIBE_CHANGE'
  player: Player
  fromTribe: string | null
  toTribe: string
  timestamp: number
}

// Union type of all possible events
export type GameEvent =
  | IdolFoundEvent
  | TribalChallengeEvent
  | IndividualChallengeEvent
  | TribalCouncilEvent
  | TribalRevoteEvent
  | RocksEvent
  | FiremakingEvent
  | PlayerEliminatedEvent
  | SwapEvent
  | MergeEvent
  | FinalTribalCouncilEvent
  | FinalTieBreakerEvent
  | WinnerDeclaredEvent
  | AllianceFormedEvent
  | VotingBlocFormedEvent
  | PlayerTribeChangeEvent

// Event listener type
export type GameEventListener<T extends GameEvent = GameEvent> = (event: T) => void

/**
 * Event-driven game event emitter
 * Allows decoupling of game logic from reporting/UI/analytics
 */
export class GameEventEmitter {
  private listeners: Map<string, GameEventListener[]> = new Map()

  /**
   * Subscribe to a specific event type
   */
  on<T extends GameEvent>(
    eventType: T['type'],
    listener: GameEventListener<T>
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, [])
    }

    this.listeners.get(eventType)!.push(listener as GameEventListener)

    // Return unsubscribe function
    return () => this.off(eventType, listener)
  }

  /**
   * Unsubscribe from an event type
   */
  off<T extends GameEvent>(eventType: T['type'], listener: GameEventListener<T>): void {
    const eventListeners = this.listeners.get(eventType)
    if (eventListeners) {
      const index = eventListeners.indexOf(listener as GameEventListener)
      if (index > -1) {
        eventListeners.splice(index, 1)
      }
    }
  }

  /**
   * Emit an event to all subscribers
   */
  emit<T extends GameEvent>(event: T): void {
    const eventListeners = this.listeners.get(event.type)
    if (eventListeners) {
      for (const listener of eventListeners) {
        listener(event)
      }
    }

    // Also emit to wildcard listeners
    const wildcardListeners = this.listeners.get('*')
    if (wildcardListeners) {
      for (const listener of wildcardListeners) {
        listener(event)
      }
    }
  }

  /**
   * Subscribe to all events
   */
  onAny(listener: GameEventListener): () => void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.on('*' as any, listener)
  }

  /**
   * Clear all listeners
   */
  clear(): void {
    this.listeners.clear()
  }

  /**
   * Get all event types that have listeners
   */
  getEventTypes(): string[] {
    return Array.from(this.listeners.keys())
  }

  /**
   * Get listener count for an event type
   */
  listenerCount(eventType: string): number {
    return this.listeners.get(eventType)?.length || 0
  }
}

/**
 * Helper functions to create events with timestamps
 */
export const EventFactory = {
  idolFound(player: Player, tribe: string): IdolFoundEvent {
    return {
      type: 'IDOL_FOUND',
      player,
      tribe,
      timestamp: Date.now(),
    }
  },

  tribalChallenge(winner: Tribe, loser: Tribe | Tribe[]): TribalChallengeEvent {
    return {
      type: 'TRIBAL_CHALLENGE',
      winner,
      loser,
      timestamp: Date.now(),
    }
  },

  individualChallenge(winner: Player): IndividualChallengeEvent {
    return {
      type: 'INDIVIDUAL_CHALLENGE',
      winner,
      timestamp: Date.now(),
    }
  },

  tribalCouncil(
    votes: Map<Player, Player>,
    idolsPlayed: Map<Player, Player> | null,
    losingTribe: string
  ): TribalCouncilEvent {
    return {
      type: 'TRIBAL_COUNCIL',
      votes,
      idolsPlayed,
      losingTribe,
      timestamp: Date.now(),
    }
  },

  tribalRevote(votes: Map<Player, Player>, tiedPlayers: Player[]): TribalRevoteEvent {
    return {
      type: 'TRIBAL_REVOTE',
      votes,
      tiedPlayers,
      timestamp: Date.now(),
    }
  },

  rocks(eliminated: Player, tiedPlayers: Player[]): RocksEvent {
    return {
      type: 'ROCKS',
      eliminated,
      tiedPlayers,
      timestamp: Date.now(),
    }
  },

  firemaking(winner: Player, loser: Player, beingTaken?: Player): FiremakingEvent {
    return {
      type: 'FIREMAKING',
      winner,
      loser,
      beingTaken,
      timestamp: Date.now(),
    }
  },

  playerEliminated(
    player: Player,
    method: 'vote' | 'rocks' | 'firemaking',
    votes?: Map<Player, Player>
  ): PlayerEliminatedEvent {
    return {
      type: 'PLAYER_ELIMINATED',
      player,
      method,
      votes,
      timestamp: Date.now(),
    }
  },

  swap(newTribes: Tribe[]): SwapEvent {
    return {
      type: 'SWAP',
      newTribes,
      timestamp: Date.now(),
    }
  },

  merge(mergedTribe: Tribe): MergeEvent {
    return {
      type: 'MERGE',
      mergedTribe,
      timestamp: Date.now(),
    }
  },

  finalTribalCouncil(
    finalists: Player[],
    jury: Player[],
    votes: Map<Player, Player>
  ): FinalTribalCouncilEvent {
    return {
      type: 'FINAL_TRIBAL',
      finalists,
      jury,
      votes,
      timestamp: Date.now(),
    }
  },

  finalTieBreaker(voter: Player, winner: Player): FinalTieBreakerEvent {
    return {
      type: 'FINAL_TIEBREAKER',
      voter,
      winner,
      timestamp: Date.now(),
    }
  },

  winnerDeclared(
    winner: Player,
    finalists: Player[],
    voteCount: number
  ): WinnerDeclaredEvent {
    return {
      type: 'WINNER_DECLARED',
      winner,
      finalists,
      voteCount,
      timestamp: Date.now(),
    }
  },

  allianceFormed(members: Player[], tribe: string): AllianceFormedEvent {
    return {
      type: 'ALLIANCE_FORMED',
      members,
      tribe,
      timestamp: Date.now(),
    }
  },

  votingBlocFormed(members: Player[]): VotingBlocFormedEvent {
    return {
      type: 'VOTING_BLOC_FORMED',
      members,
      timestamp: Date.now(),
    }
  },

  playerTribeChange(
    player: Player,
    fromTribe: string | null,
    toTribe: string
  ): PlayerTribeChangeEvent {
    return {
      type: 'PLAYER_TRIBE_CHANGE',
      player,
      fromTribe,
      toTribe,
      timestamp: Date.now(),
    }
  },
}
