import { Player } from './models/player'
import type { Tribe } from './models/tribe'

// Event types
export enum EventType {
  SWAP = 'SWAP',
  MERGE = 'MERGE',
  IDOL_FOUND = 'IDOL_FOUND',
  INDIVIDUAL_CHALLENGE = 'INDIVIDUAL_CHALLENGE',
  TRIBE_CHALLENGE = 'TRIBE_CHALLENGE',
  TRIBAL_COUNCIL = 'TRIBAL_COUNCIL',
  TRIBAL_REVOTE = 'TRIBAL_REVOTE',
  ROCKS = 'ROCKS',
  FIREMAKING = 'FIREMAKING',
  FINAL_TRIBAL = 'FINAL_TRIBAL',
  FINAL_TIEBREAKER = 'FINAL_TIEBREAKER',
  WINNER_DECLARED = 'WINNER_DECLARED',
}

// Information types
enum TypesOfInformation {
  TRIBE_HISTORY = 'TRIBE_HISTORY',
}

// Base Event class
class Event {
  constructor(public eventType: EventType, public eventNumber: number) {}
}

// Voting Event class with vote ordering logic
type VotePair = { voter: string; votedFor: string }

class Voting extends Event {
  voteList: Record<string, string>
  playerVotedFor: string[]
  votesToRead: string[]
  voteDetails: VotePair[]

  constructor(listOfVotes: Map<Player, Player>, eventType: EventType, eventNumber: number) {
    super(eventType, eventNumber)

    this.voteList = {}
    const numberOfVotes = new Map<Player, number>()
    const idolPairs: VotePair[] = []
    const nonIdolPairs: VotePair[] = []

    // Count votes and organize them
    for (const [voter, votedFor] of listOfVotes.entries()) {
      const pair: VotePair = { voter: voter.firstName, votedFor: votedFor.firstName }

      // Only count votes for non-immune players at tribal council
      if (
        eventType === EventType.TRIBAL_COUNCIL ||
        eventType === EventType.TRIBAL_REVOTE
      ) {
        if (!votedFor.isImmune) {
          numberOfVotes.set(votedFor, 1 + (numberOfVotes.get(votedFor) || 0))
          nonIdolPairs.push(pair)
        } else {
          idolPairs.push(pair)
        }
      } else {
        // For Final Tribal and other events, add all votes
        numberOfVotes.set(votedFor, 1 + (numberOfVotes.get(votedFor) || 0))
        nonIdolPairs.push(pair)
      }

      this.voteList[voter.firstName] = votedFor.firstName
    }

    // Find who got the most votes
    const listPlayersVotedOut: Player[] = []
    let maxVotes = Number.MIN_SAFE_INTEGER

    for (const [player, votes] of numberOfVotes.entries()) {
      if (votes > maxVotes) {
        listPlayersVotedOut.length = 0
        listPlayersVotedOut.push(player)
        maxVotes = votes
      } else if (votes === maxVotes) {
        listPlayersVotedOut.push(player)
      }
    }

    this.playerVotedFor = listPlayersVotedOut.map(p => p.firstName)

    // Arrange votes for dramatic reveal: save the winner's deciding votes for last
    if (listPlayersVotedOut.length === 1) {
      let runnerUpVotes = 0
      for (const [, votes] of numberOfVotes.entries()) {
        if (votes < maxVotes && votes > runnerUpVotes) {
          runnerUpVotes = votes
        }
      }

      let timesToGrab = maxVotes - runnerUpVotes
      const lastSection: VotePair[] = []
      const maxName = listPlayersVotedOut[0].firstName

      while (timesToGrab > 0) {
        const index = nonIdolPairs.findIndex(p => p.votedFor === maxName)
        if (index > -1) {
          lastSection.push(nonIdolPairs.splice(index, 1)[0])
        }
        timesToGrab--
      }

      // Shuffle the non-decisive votes
      nonIdolPairs.sort(() => Math.random() - 0.5)

      // Append the deciding votes at the end
      for (const pair of lastSection) {
        nonIdolPairs.push(pair)
      }
    } else if (listPlayersVotedOut.length > 1) {
      // Tie: shuffle all votes, then move one tied player's vote to the very end
      // so the last card revealed is the one that confirms the tie
      nonIdolPairs.sort(() => Math.random() - 0.5)

      const tiedNames = new Set(listPlayersVotedOut.map(p => p.firstName))
      const lastTiedIndex = nonIdolPairs.reduce(
        (found, pair, i) => (tiedNames.has(pair.votedFor) ? i : found),
        -1
      )

      if (lastTiedIndex > -1) {
        nonIdolPairs.push(nonIdolPairs.splice(lastTiedIndex, 1)[0])
      }
    }

    idolPairs.push(...nonIdolPairs)
    this.votesToRead = idolPairs.map(p => p.votedFor)
    this.voteDetails = idolPairs
  }

  isTie(): boolean {
    // Treat as "not resolved" if there's a true tie (>1) OR if all votes were nullified (0)
    return this.playerVotedFor.length !== 1
  }
}

// Specific event classes
class IdolFound extends Event {
  playerFound: string

  constructor(player: Player, eventNumber: number) {
    super(EventType.IDOL_FOUND, eventNumber)
    this.playerFound = `${player.firstName}|${player.lastName}`
  }
}

class IndividualChallengeEvent extends Event {
  winner: string

  constructor(winner: Player, eventNumber: number) {
    super(EventType.INDIVIDUAL_CHALLENGE, eventNumber)
    this.winner = `${winner.firstName}|${winner.lastName}`
  }
}

class TribeChallengeEvent extends Event {
  tribeWinner: string

  constructor(winner: Tribe, eventNumber: number) {
    super(EventType.TRIBE_CHALLENGE, eventNumber)
    this.tribeWinner = winner.name
  }
}

class TribalCouncil extends Voting {
  idolsPlayed: Record<string, string>

  constructor(
    listOfVotes: Map<Player, Player>,
    idolsPlayed: Map<Player, Player> | null,
    eventNumber: number
  ) {
    super(listOfVotes, EventType.TRIBAL_COUNCIL, eventNumber)

    this.idolsPlayed = {}
    if (idolsPlayed) {
      for (const [player, target] of idolsPlayed.entries()) {
        this.idolsPlayed[`${player.firstName}|${player.lastName}`] =
          `${target.firstName}|${target.lastName}`
      }
    }
  }
}

class TribalRevote extends Voting {
  constructor(listOfVotes: Map<Player, Player>, eventNumber: number) {
    super(listOfVotes, EventType.TRIBAL_REVOTE, eventNumber)
  }
}

class Rocks extends Event {
  playerVotedOut: string[]

  constructor(votedOut: Player, eventNumber: number) {
    super(EventType.ROCKS, eventNumber)
    this.playerVotedOut = [`${votedOut.firstName}|${votedOut.lastName}`]
  }
}

class Firemaking extends Event {
  winner: string
  loser: string

  constructor(winner: Player, loser: Player, eventNumber: number) {
    super(EventType.FIREMAKING, eventNumber)
    this.winner = `${winner.firstName}|${winner.lastName}`
    this.loser = `${loser.firstName}|${loser.lastName}`
  }
}

class FinalTribalCouncil extends Voting {
  constructor(listOfVotes: Map<Player, Player>, eventNumber: number) {
    super(listOfVotes, EventType.FINAL_TRIBAL, eventNumber)
  }
}

class FinalTieBreaker extends Event {
  playerVotedFor: string
  playerThatVoted: string

  constructor(playerVotedFor: Player, playerThatVoted: Player, eventNumber: number) {
    super(EventType.FINAL_TIEBREAKER, eventNumber)
    this.playerVotedFor = `${playerVotedFor.firstName}|${playerVotedFor.lastName}`
    this.playerThatVoted = `${playerThatVoted.firstName}|${playerThatVoted.lastName}`
  }
}

class Merge extends Event {
  constructor(eventNumber: number) {
    super(EventType.MERGE, eventNumber)
  }
}

class Swap extends Event {
  constructor(eventNumber: number) {
    super(EventType.SWAP, eventNumber)
  }
}

// Episode class
class Episode {
  eventsInEpisode: Event[] = []
  // Plain object (not a Map): a Map serializes to {} through JSON.stringify,
  // which silently dropped the tribe rosters from every saved simulation.
  currentTribes: Record<string, string[]> = {}
  currentAlliances: { tribeName: string; alliances: { members: string[]; strength: number }[] }[] = []

  constructor(public episode: number) {}

  addEvent(event: Event): void {
    this.eventsInEpisode.push(event)
  }

  addPlayersTribe(player: Player): void {
    const tribe = player.tribe
    const name = `${player.firstName}|${player.lastName}`
    if (!this.currentTribes[tribe]) {
      this.currentTribes[tribe] = []
    }
    // The finale logs its roster more than once into a single episode; dedupe so
    // a player never shows up twice on the tribe view.
    if (!this.currentTribes[tribe].includes(name)) {
      this.currentTribes[tribe].push(name)
    }
  }

  addTribeAlliances(
    tribeName: string,
    alliances: { members: string[]; strength: number }[]
  ): void {
    const existing = this.currentAlliances.find(ta => ta.tribeName === tribeName)
    if (existing) {
      existing.alliances = alliances
    } else {
      this.currentAlliances.push({ tribeName, alliances })
    }
  }
}

// Information classes
class Information {}

class TribeHistory extends Information {
  playerMap: Map<string, string[]> = new Map()

  addTribeHistory(player: Player, tribe: Tribe): void {
    const playerName = `${player.firstName}|${player.lastName}`

    if (!this.playerMap.has(playerName)) {
      this.playerMap.set(playerName, [])
    }

    this.playerMap.get(playerName)?.push(tribe.name)
  }
}

class InformationEpisode extends Episode {
  gameInformation: Map<TypesOfInformation, Information> = new Map()

  constructor() {
    super(0)
  }

  containsInformation(informationType: TypesOfInformation): boolean {
    return this.gameInformation.has(informationType)
  }

  getInformation(informationType: TypesOfInformation): Information | undefined {
    return this.gameInformation.get(informationType)
  }

  addInformation(informationType: TypesOfInformation, information: Information): void {
    if (this.gameInformation.has(informationType)) {
      throw new Error('Cannot add duplicate information types.')
    }
    this.gameInformation.set(informationType, information)
  }
}

// Main Report class (singleton pattern with static methods)
export class Report {
  private static episodeList: Episode[] = []
  private static currentEpisode = 1
  private static eventNumber = 0

  static addIdolFound(playerFound: Player): void {
    this.putEventInEpisode(new IdolFound(playerFound, this.eventNumber))
    this.eventNumber++
  }

  static addTribalChallenge(winner: Tribe): void {
    this.putEventInEpisode(new TribeChallengeEvent(winner, this.eventNumber))
    this.eventNumber++
  }

  static addIndividualChallenge(winner: Player): void {
    this.putEventInEpisode(new IndividualChallengeEvent(winner, this.eventNumber))
    this.eventNumber++
  }

  static addTribalCouncil(
    listOfVotes: Map<Player, Player>,
    idolsPlayed: Map<Player, Player> | null
  ): void {
    this.putVotingEventInEpisode(new TribalCouncil(listOfVotes, idolsPlayed, this.eventNumber))
  }

  static addTribalRevote(listOfVotes: Map<Player, Player>): void {
    this.putVotingEventInEpisode(new TribalRevote(listOfVotes, this.eventNumber))
  }

  static addRocks(playerVotedOut: Player): void {
    this.putEventInEpisode(new Rocks(playerVotedOut, this.eventNumber))
    this.currentEpisode++
    this.eventNumber = 0
  }

  static addFiremaking(winner: Player, loser: Player): void {
    this.putEventInEpisode(new Firemaking(winner, loser, this.eventNumber))
    this.eventNumber++
  }

  static addFinalTribal(listOfVotes: Map<Player, Player>): void {
    this.putVotingEventInEpisode(new FinalTribalCouncil(listOfVotes, this.eventNumber))
  }

  static addFinalTieBreaker(playerThatVoted: Player, soleSurvivor: Player): void {
    this.putEventInEpisode(new FinalTieBreaker(soleSurvivor, playerThatVoted, this.eventNumber))
  }

  static addMerge(): void {
    this.putEventInEpisode(new Merge(this.eventNumber))
    this.eventNumber++
  }

  static addSwap(): void {
    this.putEventInEpisode(new Swap(this.eventNumber))
    this.eventNumber++
  }

  static addTribeAlliances(
    tribeName: string,
    alliances: { members: string[]; strength: number }[]
  ): void {
    if (this.episodeList.length > this.currentEpisode) {
      this.episodeList[this.currentEpisode].addTribeAlliances(tribeName, alliances)
    }
  }

  static addPlayerCurrentTribe(player: Player): void {
    if (this.episodeList.length === 0) {
      this.episodeList.push(new InformationEpisode())
    }

    if (this.episodeList.length <= this.currentEpisode) {
      this.episodeList.push(new Episode(this.currentEpisode))
    }

    this.episodeList[this.currentEpisode].addPlayersTribe(player)
  }

  /**
   * Replace the current episode's tribe snapshot with a fresh roster. Used on a
   * swap/merge so the transition episode shows the NEW tribe configuration
   * instead of the pre-transition one (the per-council snapshot otherwise lands
   * a full episode later).
   */
  static recordCurrentTribes(players: Player[]): void {
    if (this.episodeList.length === 0) {
      this.episodeList.push(new InformationEpisode())
    }

    if (this.episodeList.length <= this.currentEpisode) {
      this.episodeList.push(new Episode(this.currentEpisode))
    }

    const episode = this.episodeList[this.currentEpisode]
    episode.currentTribes = {}
    for (const player of players) {
      episode.addPlayersTribe(player)
    }
  }

  /**
   * Replace the current episode's alliance snapshot. Paired with
   * recordCurrentTribes on a swap/merge so the transition episode shows the
   * alliances of the NEW tribes rather than the pre-transition ones.
   */
  static recordCurrentAlliances(
    data: { tribeName: string; alliances: { members: string[]; strength: number }[] }[]
  ): void {
    if (this.episodeList.length === 0) {
      this.episodeList.push(new InformationEpisode())
    }

    if (this.episodeList.length <= this.currentEpisode) {
      this.episodeList.push(new Episode(this.currentEpisode))
    }

    this.episodeList[this.currentEpisode].currentAlliances = data
  }

  static addPlayersTribeHistory(player: Player, tribe: Tribe): void {
    if (this.episodeList.length === 0) {
      this.episodeList.push(new InformationEpisode())
    }

    const infoEpisode = this.episodeList[0] as InformationEpisode

    if (!infoEpisode.containsInformation(TypesOfInformation.TRIBE_HISTORY)) {
      infoEpisode.addInformation(TypesOfInformation.TRIBE_HISTORY, new TribeHistory())
    }

    const tribeHistory = infoEpisode.getInformation(
      TypesOfInformation.TRIBE_HISTORY
    ) as TribeHistory
    tribeHistory.addTribeHistory(player, tribe)
  }

  static getAllEpisodesJSON(): string {
    return JSON.stringify(this.episodeList)
  }

  static getJSONEpisode(episodeNumber: number): string {
    if (episodeNumber < 0 || episodeNumber >= this.episodeList.length) {
      throw new Error('The episode you requested does not exist.')
    }
    return JSON.stringify(this.episodeList[episodeNumber])
  }

  static clear(): void {
    this.episodeList = []
    this.currentEpisode = 1
    this.eventNumber = 0
  }

  private static putVotingEventInEpisode(voteToAdd: Voting): void {
    this.putEventInEpisode(voteToAdd)

    if (voteToAdd.isTie()) {
      this.eventNumber++
    } else {
      this.currentEpisode++
      this.eventNumber = 0
    }
  }

  private static putEventInEpisode(eventToAdd: Event): void {
    if (this.episodeList.length === 0) {
      this.episodeList.push(new InformationEpisode())
    }

    if (this.episodeList.length <= this.currentEpisode) {
      this.episodeList.push(new Episode(this.currentEpisode))
    }

    this.episodeList[this.currentEpisode].addEvent(eventToAdd)
  }
}
