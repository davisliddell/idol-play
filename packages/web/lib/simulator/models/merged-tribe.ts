import { Tribe, setReportModule, setChallengeModule } from './tribe'
import { Player, GamePhase } from './player'
import { VotingBloc } from './voting-bloc'
import { GAME_CONFIG, GameHelpers } from '../config/game-constants'

// Forward declarations - will be set by the game module
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Report: any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Challenge: any

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setMergedTribeReportModule(reportModule: any) {
  Report = reportModule
  setReportModule(reportModule)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setMergedTribeChallengeModule(challengeModule: any) {
  Challenge = challengeModule
  setChallengeModule(challengeModule)
}

export class MergedTribe extends Tribe {
  votingBlocs: VotingBloc[]
  jury: Player[]
  private tribalCouncilCount: number = 0
  private lastBlocReformation: number = 0

  constructor(name: string, members: Player[]) {
    super(name, members)
    this.votingBlocs = []
    this.jury = []
  }

  /**
   * Check if voting blocs should be reformed
   * Triggers:
   * - After betrayal detected (checked in voting)
   * - Every N tribal councils
   * - When any bloc drops below minimum size
   */
  shouldReformVotingBlocs(): boolean {
    if (!GAME_CONFIG.voting.blocReformation.enabled) {
      return false
    }

    // Check if any bloc is too small
    if (GAME_CONFIG.voting.blocReformation.whenBelowSize) {
      for (const bloc of this.votingBlocs) {
        if (bloc.members.length < GAME_CONFIG.voting.blocReformation.whenBelowSize) {
          console.log('Reforming voting blocs: bloc too small')
          return true
        }
      }
    }

    // Check if enough councils have passed
    if (GAME_CONFIG.voting.blocReformation.everyNCouncils) {
      const councilsSinceReform = this.tribalCouncilCount - this.lastBlocReformation
      if (councilsSinceReform >= GAME_CONFIG.voting.blocReformation.everyNCouncils) {
        console.log('Reforming voting blocs: periodic reformation')
        return true
      }
    }

    return false
  }

  /**
   * Reform voting blocs with current players
   */
  reformVotingBlocs(): void {
    const numBlocs =
      this.size > GAME_CONFIG.players.earlyMergeEnd
        ? Math.floor(Math.random() * 3) + 2
        : Math.floor(Math.random() * 1) + 2

    const maxPerBloc = this.size > GAME_CONFIG.players.earlyMergeEnd ? 7 : 5

    const newBlocs = VotingBloc.generateVotingBlocs(this.members, numBlocs, maxPerBloc)
    this.votingBlocs = newBlocs
    this.lastBlocReformation = this.tribalCouncilCount

    console.log(`Reformed into ${numBlocs} voting blocs`)
  }

  /**
   * Detect if someone voted outside their bloc (betrayal)
   * Triggers bloc reformation if betrayal detected
   */
  private detectBlocBetrayal(votesFor: Map<Player, Player>): void {
    let betrayalDetected = false

    for (const bloc of this.votingBlocs) {
      const blocMembers = bloc.members
      const blocVotes = new Map<Player, number>()

      // Count bloc's votes
      for (const member of blocMembers) {
        const vote = votesFor.get(member)
        if (vote) {
          blocVotes.set(vote, (blocVotes.get(vote) || 0) + 1)
        }
      }

      // Find consensus
      let consensusTarget: Player | null = null
      let maxVotes = 0
      for (const [target, count] of blocVotes.entries()) {
        if (count > maxVotes) {
          maxVotes = count
          consensusTarget = target
        }
      }

      // Check if anyone betrayed
      for (const member of blocMembers) {
        const vote = votesFor.get(member)
        if (vote && consensusTarget && vote !== consensusTarget) {
          console.log(
            `Betrayal detected: ${member.firstName} voted outside bloc consensus`
          )
          betrayalDetected = true
        }
      }
    }

    // Reform if betrayal detected
    if (betrayalDetected) {
      this.reformVotingBlocs()
    }
  }

  override targets(stage: GamePhase, members: Player[], attempt: number = 0): void {
    for (const votingBloc of this.votingBlocs) {
      const notIn = members.filter(p => !votingBloc.members.includes(p) && !p.isImmune)

      const threatGetter = (p: Player) => p.threatLevel(stage)

      notIn.sort((p1, p2) => {
        const t1 = threatGetter(p1)
        const t2 = threatGetter(p2)
        if (t1 === t2) return 0
        return t1 > t2 ? 1 : -1
      })

      let selected = false
      let i = notIn.length - 1

      if (GameHelpers.isMajorityAlliance(votingBloc.members.length, this.size) && notIn.length > 1) {
        // Majority voting bloc - select two targets
        const targets: Player[] = []

        while (!selected && i >= 1) {
          const random = Math.random()
          if (random >= GAME_CONFIG.voting.targetSelection.selectionThreshold) {
            selected = true
            targets.push(notIn[i])
          } else {
            i--
          }
        }

        if (!selected) {
          targets.push(notIn[1])
        }

        selected = false
        i = notIn.length - 1

        while (!selected && i >= 0) {
          const random = Math.random()
          if (random >= GAME_CONFIG.voting.targetSelection.selectionThreshold) {
            if (targets[0] !== notIn[i]) {
              targets.push(notIn[i])
              selected = true
            }
          } else {
            i--
          }
        }

        if (!selected) {
          if (targets[0] === notIn[0]) {
            targets.push(notIn[1])
          } else {
            targets.push(notIn[0])
          }
        }

        this.targetList.push(...targets)
      } else {
        // Minority voting bloc - select one target
        while (!selected && i >= 0) {
          const random = Math.random()
          if (random >= GAME_CONFIG.voting.targetSelection.selectionThreshold) {
            selected = true
            this.targetList.push(notIn[i])
          } else {
            i--
          }
        }

        if (notIn.length === 0) {
          // This bloc contains everyone left, so there's no one outside it to
          // target. Reshuffle the blocs and retry — but cap the attempts so a
          // degenerate roster (too few players to split) can't recurse forever.
          const numBlocs = Math.floor(Math.random() * 3) + 2
          const canReform =
            numBlocs >= 2 && numBlocs <= this.members.length && numBlocs * 6 >= this.members.length
          if (attempt < 5 && canReform) {
            this.votingBlocs = VotingBloc.generateVotingBlocs(this.members, numBlocs, 6)
            this.targets(stage, members, attempt + 1)
            return
          }
          // Can't usefully reshuffle; the safety check below backfills targets.
        } else if (!selected) {
          if (notIn.length > 0) {
            this.targetList.push(notIn[0])
          }
        }
      }
    }

    // SAFETY CHECK: Filter targetList to only include current non-immune tribe members
    const currentMembers = this.members
    this.targetList = this.targetList.filter(target => currentMembers.includes(target) && !target.isImmune)

    if (this.targetList.length === 0 && currentMembers.length > 0) {
      console.warn('Warning: targetList is empty after filtering. Adding all non-immune members as potential targets.')
      this.targetList.push(...currentMembers.filter(p => !p.isImmune))
    }
  }

  override timeToVote(phase: GamePhase): void {
    for (const votingBloc of this.votingBlocs) {
      let max: number = GAME_CONFIG.sentinel.impossibleLow
      let total = 0
      let biggestThreat = this.targetList[0]

      for (const target of this.targetList) {
        total = 0
        for (const member of votingBloc.members) {
          total += member.theirThreatLevel(target, phase)
        }

        if (total > max && !votingBloc.members.includes(target)) {
          max = total
          biggestThreat = target
        }
      }

      if (votingBloc.members.includes(biggestThreat)) {
        const notInBloc = this.members.filter(p => !votingBloc.members.includes(p))

        for (const target of notInBloc) {
          total = 0
          for (const member of votingBloc.members) {
            total += member.theirThreatLevel(target, phase)
          }

          if (total > max && !votingBloc.members.includes(target)) {
            max = total
            biggestThreat = target
          }
        }
      }

      for (const member of votingBloc.members) {
        member.vote = biggestThreat
      }
    }

    // SAFETY CHECK: Validate all votes are for current tribe members
    const currentMembers = this.members
    for (const member of currentMembers) {
      const vote = member.vote
      if (vote && !currentMembers.includes(vote)) {
        console.warn(
          `WARNING: ${member.firstName} voted for ${vote.firstName} who is not in the tribe! Reassigning vote.`
        )
        // Reassign to a valid target
        const validTargets = currentMembers.filter(p => p !== member && !p.isImmune)
        if (validTargets.length > 0) {
          member.vote = validTargets[0]
          console.log(`${member.firstName} vote corrected to ${validTargets[0].firstName}`)
        }
      }
    }
  }

  override illReadTheVotes(phase: GamePhase): void {
    const votes = new Map<Player, number>()
    const votesFor = new Map<Player, Player>()

    for (const p of this.members) {
      const vote = p.vote
      if (vote) {
        votes.set(vote, (votes.get(vote) || 0) + 1)
      }
    }

    let max: Player | null = null
    for (const [p, count] of votes.entries()) {
      if (max === null || count > (votes.get(max) || 0)) {
        max = p
      }
    }

    let maxes: Player[] = []
    if (max) {
      const maxVotes = votes.get(max) || 0
      for (const [p, count] of votes.entries()) {
        if (count === maxVotes) {
          maxes.push(p)
        }
      }
    }

    // Handle idols (only if 5+ players remaining)
    const idolsPlayed = new Map<Player, Player>()
    const members = this.members
    members.sort(() => Math.random() - GAME_CONFIG.voting.shuffleThreshold) // Shuffle

    // Build votesFor in shuffled order to match log output
    for (const p of members) {
      const vote = p.vote
      if (vote) {
        votesFor.set(p, vote)
      }
    }

    if (this.size >= 5) {
      for (const p of members) {
        if (p.numIdols > 0) {
          if ((max && max === p) || (maxes.length > 1 && maxes.includes(p))) {
            const random = Math.random()
            const chance = GameHelpers.calculateSelfIdolPlayChance(p.strategicLevel)
            if (random <= chance && !p.isImmune) {
              console.log(`${p.firstName} is playing an idol for themselves`)
              p.isImmune = true
              p.useIdol()
              idolsPlayed.set(p, p)
              this.isIdolHidden = true
            }
          } else if (!p.isImmune) {
            for (const target of this.targetList) {
              if (p.numIdols <= 0) break // one idol can only protect one player
              const bond = p.bondWith(target)
              if (bond && bond.strength >= GAME_CONFIG.idols.play.other.mergedBondStrengthRequired) {
                if ((max && max === target) || (maxes.length > 1 && maxes.includes(target))) {
                  const random = Math.random()
                  const chance = GameHelpers.calculateOtherIdolPlayChance(p.strategicLevel)
                  if (random <= chance && !target.isImmune) {
                    console.log(`${p.firstName} is playing an idol for ${target.firstName}`)
                    target.isImmune = true
                    p.useIdol()
                    idolsPlayed.set(p, target)
                    this.isIdolHidden = true
                  }
                } else {
                  const random = Math.random()
                  const chance = GameHelpers.calculateOtherIdolPlayChance(p.strategicLevel)
                  if (random <= chance && !target.isImmune) {
                    console.log(`${p.firstName} is playing an idol for ${target.firstName}`)
                    target.isImmune = true
                    p.useIdol()
                    idolsPlayed.set(p, target)
                    this.isIdolHidden = true
                  }
                }
              }
            }
          }
        }
      }
    }

    // Set immune players' votes to 0
    const playerSet = new Set(votes.keys())
    for (const p of playerSet) {
      if (p.isImmune) {
        votes.set(p, 0)
      }
    }

    // Track idol plays for bonds
    if (GAME_CONFIG.bonds.eventModifiers.enabled && idolsPlayed.size > 0) {
      this.trackIdolBonds(idolsPlayed, votes)
    }

    if (Report) {
      Report.addTribalCouncil(votesFor, idolsPlayed)
    }

    // Recalculate max after idols
    max = null
    maxes = []
    for (const [p, count] of votes.entries()) {
      if (max === null || count > (votes.get(max) || 0)) {
        max = p
      }
    }

    if (max) {
      const maxVotes = votes.get(max) || 0
      for (const [p, count] of votes.entries()) {
        if (count === maxVotes) {
          maxes.push(p)
        }
      }
    }

    // Print votes
    for (const p of members) {
      const vote = p.vote
      if (vote) {
        if (vote.isImmune) {
          console.log(`Vote: ${p.firstName}-> ${vote.firstName} DOES NOT COUNT`)
        } else {
          console.log(`Vote: ${p.firstName}-> ${vote.firstName}`)
        }
      }
    }

    // Check if all votes are 0 (everyone is immune)
    let zeroVotes = true
    for (const count of votes.values()) {
      if (count !== 0) {
        zeroVotes = false
        break
      }
    }

    // Handle ties
    if (maxes.length > 1) {
      // Who may RECEIVE votes in the revote:
      //  - normal tie: only the tied players
      //  - all votes nullified (idols/immunity): anyone still vulnerable, i.e.
      //    not challenge-immune and not idol-protected (both set isImmune). This
      //    is what prevents an idol-protected player from being revoted onto.
      const eligibleTargets = zeroVotes ? members.filter(p => !p.isImmune) : maxes
      this.targetList = [...eligibleTargets]

      this.timeToRevote(eligibleTargets, phase)

      // In a full revote everyone votes; in a tie only non-tied members vote
      const validVoters = zeroVotes
        ? members
        : members.filter(m => !maxes.includes(m))
      const whoForWho = new Map<Player, Player>()

      for (const p of validVoters) {
        const vote = p.vote
        if (vote) {
          console.log(`Vote: ${vote.firstName}`)
          votes.set(vote, (votes.get(vote) || 0) + 1)
          whoForWho.set(p, vote)
        }
      }

      if (Report) {
        Report.addTribalRevote(whoForWho)
      }

      max = null
      for (const [p, count] of votes.entries()) {
        if (max === null || count > (votes.get(max) || 0)) {
          max = p
        }
      }

      maxes = []
      if (max) {
        const maxVotes = votes.get(max) || 0
        for (const [p, count] of votes.entries()) {
          if (count === maxVotes) {
            maxes.push(p)
          }
        }
      }

      if (maxes.length > 1) {
        const notImmune = members.filter(p => !p.isImmune && !maxes.includes(p))
        notImmune.sort(() => Math.random() - GAME_CONFIG.voting.shuffleThreshold)
        if (notImmune.length > 0) {
          // Tied players are safe; everyone else (non-immune) draws rocks.
          max = notImmune[0]
          if (Report) {
            Report.addRocks(max)
          }
        } else {
          // Deadlock: only tied (or immune) players remain, so no one can draw rocks.
          // Resolve by eliminating one of the tied players at random.
          max = [...maxes].sort(() => Math.random() - GAME_CONFIG.voting.shuffleThreshold)[0]
        }
      }
    }

    if (!max) return

    console.log(`Voted Out: ${max.firstName}`)

    // Increment tribal council count
    this.tribalCouncilCount++

    // Track voting behavior for loyalty adjustment
    if (GAME_CONFIG.alliances.loyalty.enabled) {
      this.trackVotingLoyalty(votesFor)
    }

    // Check for bloc betrayals
    if (GAME_CONFIG.voting.blocReformation.afterBetrayal) {
      this.detectBlocBetrayal(votesFor)
    }

    // Remove from members
    const membersList = this.members
    const maxIndex = membersList.indexOf(max)
    if (maxIndex > -1) {
      membersList.splice(maxIndex, 1)
    }

    // Remove from alliances
    for (const a of this.alliances) {
      const aMembers = a.members
      const aIndex = aMembers.indexOf(max)
      if (aIndex > -1) {
        aMembers.splice(aIndex, 1)
      }
    }

    // Remove from voting blocs
    for (const votingBloc of this.votingBlocs) {
      const vbMembers = votingBloc.members
      const vbIndex = vbMembers.indexOf(max)
      if (vbIndex > -1) {
        vbMembers.splice(vbIndex, 1)
      }
    }

    this.votingBlocs = this.votingBlocs.filter(vb => vb.members.length > 0)

    // Remove from bonds
    for (const bond of this.bonds) {
      if (bond.member2 === max) {
        const bondList = bond.member1.bondList
        if (bondList) {
          const bondIndex = bondList.indexOf(bond)
          if (bondIndex > -1) {
            bondList.splice(bondIndex, 1)
          }
        }
      } else if (bond.member1 === max) {
        const bondList = bond.member2.bondList
        if (bondList) {
          const bondIndex = bondList.indexOf(bond)
          if (bondIndex > -1) {
            bondList.splice(bondIndex, 1)
          }
        }
      }
    }

    const bonds = this.bonds
    for (let i = bonds.length - 1; i >= 0; i--) {
      if (bonds[i].member1 === max || bonds[i].member2 === max) {
        bonds.splice(i, 1)
      }
    }

    // Clear targets
    for (const a of this.alliances) {
      a.targets = []
      a.target = null
    }

    if (max.numIdols > 1) {
      this.idolHidden()
    }

    this.size--
    this.targetList = []

    for (const p of membersList) {
      p.isImmune = false
    }

    // Add to jury
    console.log(`Adding ${max.firstName} to jury. Jury size: ${this.jury.length} → ${this.jury.length + 1}`)
    this.jury.push(max)

    // Check if voting blocs should be reformed for next council
    if (this.shouldReformVotingBlocs()) {
      this.reformVotingBlocs()
    }
  }

  timeToRevote(eligible: Player[], phase: GamePhase): void {
    console.log('REVOTE: ')
    console.log()
    console.log('TARGETS: ')
    for (const p of this.targetList) {
      console.log(p.firstName)
    }
    console.log()

    this.timeToVote(phase)

    let numFlipped = 0
    for (const votingBloc of this.votingBlocs) {
      for (const p of votingBloc.members) {
        if (VotingBloc.compatibility(p, votingBloc) < 4 && this.size % 2 === 0 && numFlipped < 2) {
          const notTargets = this.targetList.filter(target => target !== p.vote)
          if (notTargets.length > 0) {
            p.vote = notTargets[0]
            numFlipped++
          }
        }
      }
    }

    // Guarantee every member's revote lands on an eligible target (`eligible`),
    // never on themselves. timeToVote's bloc logic can otherwise leave a vote on
    // an immune / idol-protected player, or on a non-eligible player entirely.
    for (const p of this.members) {
      const options = eligible.filter(t => t !== p)
      if (options.length === 0) continue
      if (p.vote && options.includes(p.vote)) continue // already valid

      let max: number = GAME_CONFIG.sentinel.impossibleLow
      let selectedVoteIndex = 0
      for (let i = 0; i < options.length; i++) {
        const bond = p.bondWith(options[i])
        if (!bond) continue

        const adjustedThreatScore = bond.strength - options[i].threatLevel(phase)
        if (adjustedThreatScore > max) {
          max = adjustedThreatScore
          selectedVoteIndex = i
        }
      }
      p.vote = options[selectedVoteIndex]
    }
  }

  /**
   * Input a list of jurors and a list of finalists.
   * It will output a HashMap that contains a list of who voted for who.
   * The HashMap's keys will be finalists. The values are ArrayLists of jurors who voted for that finalist.
   *
   * Algorithm: To decide who a juror is going to vote for:
   * 1) For each finalist,
   *    1a) Multiply the juror/finalist's bond strength with the juror's social level.
   *    1b) Multiply the juror's strategic ability with the finalist's strategic ability.
   *    1c) Sum those two values plus the finalist's articulation.
   * 2) The juror will vote for the finalist with the highest sum.
   *
   * @param jurors An ArrayList of jurors.
   * @param finalists An ArrayList of finalists.
   * @return A Map of who voted for who.
   */
  static ftcVotes(jurors: Player[], finalists: Player[]): Map<Player, Player[]> {
    // This Map will store an ArrayList of who voted for who
    // (the keys are the finalists, the values are arrays of jurors who voted for that finalist)
    const listOfVotes = new Map<Player, Player[]>()

    // Initialize the arrays that are inside the Map
    for (const player of finalists) {
      listOfVotes.set(player, [])
    }

    // Main Algorithm:
    // Loop through the jurors
    const whoForWho = new Map<Player, Player>()

    for (const currentJuror of jurors) {
      let maxTotal: number = GAME_CONFIG.sentinel.impossibleLow
      let maxFinalist: Player | null = null

      for (const currentFinalist of finalists) {
        const bond = currentJuror.bondWith(currentFinalist)

        // Calculate the values
        // If no bond exists (player eliminated early), use a neutral bond strength
        const bondStrength = bond ? bond.strength : GAME_CONFIG.bonds.neutralStrength
        const jurorSocial = currentJuror.socialLevel || 0
        const jurorStrategic = currentJuror.strategicLevel || 0
        const finalistStrategic = currentFinalist.strategicLevel || 0
        const finalistArticulation = currentFinalist.articulation || 0

        const socialProduct = bondStrength * jurorSocial
        const strategyProduct = jurorStrategic * finalistStrategic
        const articulation = finalistArticulation
        const totalSum = strategyProduct + socialProduct + articulation

        if (totalSum > maxTotal) {
          maxTotal = totalSum
          maxFinalist = currentFinalist
        }
      }

      if (maxFinalist) {
        whoForWho.set(currentJuror, maxFinalist)
        // The finalist with the highest totalSum will be the juror's vote
        listOfVotes.get(maxFinalist)?.push(currentJuror)
        console.log(`  ${currentJuror.firstName} votes for ${maxFinalist.firstName} (score: ${maxTotal.toFixed(2)})`)
      } else {
        console.log(`  WARNING: ${currentJuror.firstName} did not vote for anyone (no finalist selected)`)
      }
    }

    console.log(`Total votes cast: ${whoForWho.size} out of ${jurors.length} jurors`)

    if (Report) {
      Report.addFinalTribal(whoForWho)
    }

    return listOfVotes
  }

  final4FireMakingChallenge(immWinner: Player): void {
    const members = this.members

    members.sort((p1, p2) => {
      const t1 = p1.threatLevel('Late Post-Merge')
      const t2 = p2.threatLevel('Late Post-Merge')
      if (t1 === t2) return 0
      return t1 > t2 ? 1 : -1
    })

    let immuneWinner = immWinner

    if (
      (members[members.length - 2] === immWinner || members[members.length - 1] === immWinner) &&
      immWinner.strategicLevel >= 4
    ) {
      console.log(
        `${immWinner.firstName} is giving up immunity and giving it to ${members[0].firstName}`
      )
      immuneWinner = members[0]
    }

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

    if (!Challenge) {
      throw new Error('Challenge module not initialized')
    }

    const winner = Challenge.firemakingChallenge(fireMakers[0], fireMakers[1])
    const loser = fireMakers.find(p => p !== winner)

    if (!loser) {
      throw new Error('Could not determine fire-making loser')
    }

    if (Report) {
      Report.addFiremaking(winner, loser)
    }

    console.log(`Winner: ${winner.firstName}`)
    console.log(`Loser: ${loser.firstName}`)

    const loserIndex = members.indexOf(loser)
    if (loserIndex > -1) {
      members.splice(loserIndex, 1)
    }

    this.size--
    this.jury.push(loser)
  }
}
