import { Player } from '../models/player'
import { Tribe, setReportModule as setTribeReportModule } from '../models/tribe'
import { MergedTribe, setMergedTribeReportModule } from '../models/merged-tribe'
import { Bond } from '../models/bond'
import { Alliance } from '../models/alliance'
import { VotingBloc } from '../models/voting-bloc'
import { GameEventEmitter, EventFactory } from './game-events'
import { Report } from '../report'
import { ChallengeSystem } from '../systems/challenge-system'
import { IdolSystem } from '../systems/idol-system'
import { VotingSystem } from '../systems/voting-system'
import { GAME_CONFIG } from '../config/game-constants'

/**
 * GameEngine - Main orchestrator with dependency injection
 * Clean architecture: Systems handle logic, Engine coordinates, Events decouple
 */
export class GameEngine {
  private eventEmitter: GameEventEmitter
  private challengeSystem: ChallengeSystem
  private idolSystem: IdolSystem
  private votingSystem: VotingSystem

  constructor() {
    // Initialize circular dependencies
    setTribeReportModule(Report)
    setMergedTribeReportModule(Report)

    // Initialize event-driven architecture
    this.eventEmitter = new GameEventEmitter()
    this.challengeSystem = new ChallengeSystem()
    this.idolSystem = new IdolSystem()
    this.votingSystem = new VotingSystem()
  }

  /**
   * Run complete game simulation
   * @param players Array of 20 players
   * @return JSON string of all episodes
   */
  runSimulation(players: Player[]): string {
    Report.clear()

    const twoTribes = this.preSwapPhase(players)
    const mergedPlayers = this.postSwapPhase(twoTribes)
    this.mergePhase(mergedPlayers)

    return Report.getAllEpisodesJSON()
  }

  /**
   * Pre-Swap Phase: 2 tribes, 20 → 15 players
   */
  private preSwapPhase(players: Player[]): Tribe[] {
    const playerList1 = players.slice(0, 10)
    const playerList2 = players.slice(10, 20)

    // Create tribes
    const tribe1 = new Tribe(GAME_CONFIG.tribes.preSwap.names[0], playerList1)
    const tribe2 = new Tribe(GAME_CONFIG.tribes.preSwap.names[1], playerList2)

    // Set player tribes and emit events
    for (const p of playerList1) {
      p.tribe = GAME_CONFIG.tribes.preSwap.names[0]
      p.originalTribe = GAME_CONFIG.tribes.preSwap.names[0]
      Report.addPlayersTribeHistory(p, tribe1)
    }

    for (const p of playerList2) {
      p.tribe = GAME_CONFIG.tribes.preSwap.names[1]
      p.originalTribe = GAME_CONFIG.tribes.preSwap.names[1]
      Report.addPlayersTribeHistory(p, tribe2)
    }

    // Initialize bonds and alliances
    tribe1.initialBonding(Bond.initialBonding(tribe1.members))
    tribe2.initialBonding(Bond.initialBonding(tribe2.members))
    Alliance.initialAlliances(tribe1)
    Alliance.initialAlliances(tribe2)

    let totalPlayers = tribe1.size + tribe2.size

    // Run tribal phase
    while (totalPlayers > GAME_CONFIG.players.preSwapEnd) {
      // Idol hunts using new IdolSystem
      this.idolSystem.conductIdolHunt(tribe1)
      this.idolSystem.conductIdolHunt(tribe2)

      // Challenge using new ChallengeSystem
      const winner = this.challengeSystem.twoTribeImmunity(tribe1, tribe2)
      const loser = winner === tribe1 ? tribe2 : tribe1

      // Adjust alliances for winner
      winner.adjustAlliances()
      for (const b of winner.bonds) {
        b.fluctuate()
      }
      winner.isImmune = false

      // Tribal council for loser
      const result = this.votingSystem.conductTribalCouncil(loser, 'Pre-Swap')
      console.log(`${result.eliminated.firstName} was eliminated`)

      totalPlayers = tribe1.size + tribe2.size

      // Record current tribes after elimination
      for (const player of tribe1.members) {
        Report.addPlayerCurrentTribe(player)
      }
      for (const player of tribe2.members) {
        Report.addPlayerCurrentTribe(player)
      }
      Report.addTribeAlliances(tribe1.name, tribe1.alliances.map(a => ({
        members: a.members.map(p => `${p.firstName}|${p.lastName}`),
        strength: a.strength,
      })))
      Report.addTribeAlliances(tribe2.name, tribe2.alliances.map(a => ({
        members: a.members.map(p => `${p.firstName}|${p.lastName}`),
        strength: a.strength,
      })))

      // Adjust alliances and bonds for loser
      loser.adjustAlliances()
      for (const b of loser.bonds) {
        b.fluctuate()
      }
    }

    return [tribe1, tribe2]
  }

  /**
   * Post-Swap Phase: 3 tribes, 15 → 13 players
   */
  private postSwapPhase(originalTribes: Tribe[]): Player[] {
    const players: Player[] = []
    const bonds: Bond[] = []

    for (const tribe of originalTribes) {
      players.push(...tribe.members)
      bonds.push(...tribe.bonds)
    }

    // Shuffle and redistribute
    players.sort(() => Math.random() - 0.5)

    const tribe1 = new Tribe(
      GAME_CONFIG.tribes.postSwap.names[0],
      players.slice(0, 5)
    )
    const tribe2 = new Tribe(
      GAME_CONFIG.tribes.postSwap.names[1],
      players.slice(5, 10)
    )
    const tribe3 = new Tribe(
      GAME_CONFIG.tribes.postSwap.names[2],
      players.slice(10, 15)
    )

    const tribes = [tribe1, tribe2, tribe3]

    // Set idol status
    tribe1.isIdolHidden = originalTribes[0]['isIdolHidden']
    tribe2.isIdolHidden = originalTribes[1]['isIdolHidden']

    // Form alliances and bonds
    for (const tribe of tribes) {
      Alliance.formerTribes(tribe)
      tribe.newBonds(bonds)
    }

    // Record swap
    Report.addSwap()

    // Update player tribes
    for (let i = 0; i < tribes.length; i++) {
      for (const p of tribes[i].members) {
        p.tribe = GAME_CONFIG.tribes.postSwap.names[i]
        Report.addPlayersTribeHistory(p, tribes[i])
      }
    }

    // Show the new 3 tribes (and their alliances) on the swap episode itself,
    // not one episode later.
    Report.recordCurrentTribes(tribes.flatMap(t => t.members))
    Report.recordCurrentAlliances(tribes.map(t => ({
      tribeName: t.name,
      alliances: t.alliances.map(a => ({
        members: a.members.map(p => `${p.firstName}|${p.lastName}`),
        strength: a.strength,
      })),
    })))

    let totalPlayers = tribes.reduce((sum, t) => sum + t.size, 0)

    // Run three-tribe phase
    while (totalPlayers > GAME_CONFIG.players.postSwapEnd) {
      // Idol hunts
      for (const tribe of tribes) {
        this.idolSystem.conductIdolHunt(tribe)
      }

      // Challenge
      const loser = this.challengeSystem.threeTribeImmunity(tribe1, tribe2, tribe3)
      const winners = tribes.filter(t => t !== loser)

      // Adjust winner alliances
      for (const winner of winners) {
        winner.adjustAlliances()
        for (const b of winner.bonds) {
          b.fluctuate()
        }
      }

      // Tribal council for loser
      const result = this.votingSystem.conductTribalCouncil(loser, 'Post-Swap')
      console.log(`${result.eliminated.firstName} was eliminated`)

      totalPlayers = tribes.reduce((sum, t) => sum + t.size, 0)

      // Record current tribes after elimination
      for (const tribe of tribes) {
        for (const player of tribe.members) {
          Report.addPlayerCurrentTribe(player)
        }
      }
      for (const tribe of tribes) {
        Report.addTribeAlliances(tribe.name, tribe.alliances.map(a => ({
          members: a.members.map(p => `${p.firstName}|${p.lastName}`),
          strength: a.strength,
        })))
      }

      // Adjust loser alliances
      loser.adjustAlliances()
      for (const b of loser.bonds) {
        b.fluctuate()
      }
    }

    // Merge remaining players
    const mergedPlayers: Player[] = []
    for (const tribe of tribes) {
      mergedPlayers.push(...tribe.members)
    }

    return mergedPlayers
  }

  /**
   * Merge Phase: 13 → 3 players, then FTC
   */
  private mergePhase(players: Player[]): void {
    const mergedTribe = new MergedTribe(GAME_CONFIG.tribes.merge.name, players)

    // Record merge
    Report.addMerge()

    // Update player tribes
    for (const p of players) {
      p.tribe = GAME_CONFIG.tribes.merge.name
      Report.addPlayersTribeHistory(p, mergedTribe)
    }

    // Show the merged tribe on the merge episode itself (not one episode later).
    Report.recordCurrentTribes(players)

    // Collect and filter bonds
    const allBonds: Bond[] = []
    for (const p of players) {
      const bondList = p.bondList
      if (bondList) allBonds.push(...bondList)
    }

    const uniqueBonds = Array.from(new Set(allBonds))
    const filteredBonds = uniqueBonds.filter(
      b => players.includes(b.member1) && players.includes(b.member2)
    )

    mergedTribe.newBonds(filteredBonds)
    Alliance.formerTribes(mergedTribe)

    // Show the merged tribe's alliances on the merge episode itself.
    Report.recordCurrentAlliances([{
      tribeName: mergedTribe.name,
      alliances: mergedTribe.alliances.map(a => ({
        members: a.members.map(p => `${p.firstName}|${p.lastName}`),
        strength: a.strength,
      })),
    }])

    // Individual immunity phase
    while (mergedTribe.size > GAME_CONFIG.players.finalFour) {
      this.idolSystem.conductIdolHunt(mergedTribe)

      // Individual immunity using new ChallengeSystem
      const immWinner = this.challengeSystem.individualImmunity(mergedTribe)
      immWinner.isImmune = true

      // Generate voting blocs
      const numBlocs =
        mergedTribe.size > GAME_CONFIG.players.earlyMergeEnd
          ? Math.floor(Math.random() * 3) + 2
          : Math.floor(Math.random() * 1) + 2

      const maxPerBloc =
        mergedTribe.size > GAME_CONFIG.players.earlyMergeEnd ? 7 : 5

      const votingBlocs = VotingBloc.generateVotingBlocs(players, numBlocs, maxPerBloc)
      mergedTribe.votingBlocs = votingBlocs

      // Determine phase and vote
      const phase =
        mergedTribe.size > GAME_CONFIG.players.earlyMergeEnd
          ? 'Early Post-Merge'
          : 'Late Post-Merge'

      const result = this.votingSystem.conductMergedTribalCouncil(mergedTribe, phase)
      console.log(`${result.eliminated.firstName} was eliminated`)

      // Record current tribe after elimination
      for (const player of mergedTribe.members) {
        Report.addPlayerCurrentTribe(player)
      }
      Report.addTribeAlliances(mergedTribe.name, mergedTribe.alliances.map(a => ({
        members: a.members.map(p => `${p.firstName}|${p.lastName}`),
        strength: a.strength,
      })))

      // Fluctuate bonds
      for (const b of mergedTribe.bonds) {
        b.fluctuate()
      }

      immWinner.isImmune = false
    }

    // Final 4 fire-making
    const immWinner = this.challengeSystem.individualImmunity(mergedTribe)
    this.handleFinal4FireMaking(mergedTribe, immWinner)

    // Final Tribal Council
    const finalists = [...mergedTribe.members]
    const jury = mergedTribe.jury
    console.log(`\n=== FINAL TRIBAL COUNCIL ===`)
    console.log(`Finalists (${finalists.length}): ${finalists.map(p => p.firstName).join(', ')}`)
    console.log(`Jury size: ${jury.length}`)
    console.log(`Jury members: ${jury.map(p => p.firstName).join(', ')}`)
    const jVotes = MergedTribe.ftcVotes(jury, finalists)

    let winnerCount = -1
    let winner: Player | null = null

    for (const [p, voters] of jVotes.entries()) {
      if (voters.length > winnerCount) {
        winnerCount = voters.length
        winner = p
      }
    }

    if (winner) {
      console.log(`Winner: ${winner.firstName}`)
    }
  }

  /**
   * Handle Final 4 fire-making challenge
   * Extracted from MergedTribe to use ChallengeSystem
   */
  private handleFinal4FireMaking(mergedTribe: MergedTribe, immWinner: Player): void {
    const members = mergedTribe.members

    // Sort by threat level
    members.sort((p1, p2) => {
      const t1 = p1.threatLevel('Late Post-Merge')
      const t2 = p2.threatLevel('Late Post-Merge')
      if (t1 === t2) return 0
      return t1 > t2 ? 1 : -1
    })

    let immuneWinner = immWinner

    // Check if winner gives up immunity (strategic players who are threats)
    if (
      (members[members.length - 2] === immWinner || members[members.length - 1] === immWinner) &&
      immWinner.strategicLevel >= 4
    ) {
      console.log(
        `${immWinner.firstName} is giving up immunity and giving it to ${members[0].firstName}`
      )
      immuneWinner = members[0]
    }

    // Determine who goes to fire
    let beingTaken: Player | null = null
    const fireMakers: Player[] = []

    for (const p of members) {
      if (p !== immuneWinner && beingTaken === null) {
        beingTaken = p
      } else if (p !== immuneWinner) {
        fireMakers.push(p)
      }
    }

    console.log(`${immuneWinner.firstName} is immune.`)
    if (beingTaken) {
      console.log(`${beingTaken.firstName} is being taken`)
    }
    console.log(
      `${fireMakers[0].firstName} and ${fireMakers[1].firstName} will go to fire`
    )

    // Use ChallengeSystem for fire-making
    const winner = this.challengeSystem.firemakingChallenge(fireMakers[0], fireMakers[1])
    const loser = fireMakers.find(p => p !== winner)

    if (!loser) {
      throw new Error('Could not determine fire-making loser')
    }

    console.log(`Winner: ${winner.firstName}`)
    console.log(`Loser: ${loser.firstName}`)

    // Remove loser from merged tribe
    const loserIndex = members.indexOf(loser)
    if (loserIndex > -1) {
      members.splice(loserIndex, 1)
    }

    // Add loser to jury
    console.log(`Adding fire-making loser ${loser.firstName} to jury`)
    mergedTribe['jury'].push(loser)

    // Emit player eliminated event
    this.eventEmitter.emit(
      EventFactory.playerEliminated(
        loser,
        'firemaking'
      )
    )
  }

  /**
   * Get the event emitter for external subscribers (UI, analytics, etc.)
   */
  getEventEmitter(): GameEventEmitter {
    return this.eventEmitter
  }
}
