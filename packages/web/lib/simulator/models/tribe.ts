import { Player, GamePhase } from './player'
import { Bond } from './bond'
import { Alliance } from './alliance'
import { GAME_CONFIG, GameHelpers } from '../config/game-constants'

// Forward declarations - these will be imported properly when we create these modules
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Report: any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Challenge: any

// Temporary placeholders - will be replaced when Report and Challenge are ported
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setReportModule(reportModule: any) {
  Report = reportModule
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setChallengeModule(challengeModule: any) {
  Challenge = challengeModule
}

export class Tribe {
  readonly name: string
  size: number
  members: Player[]
  isImmune: boolean = false
  bonds: Bond[]
  alliances: Alliance[]
  isIdolHidden: boolean = true
  protected targetList: Player[]

  /**
   * Initializes all of the variables including:
   * name-> The name of the tribe in the form of a string.
   * members-> The ArrayList of Players containing all of the tribe members.
   * bonds-> Starts as an empty ArrayList which is filled with the Bond's of all of the members of the tribe later on.
   * alliances-> Starts as an empty ArrayList which is filled with the Alliance's created later on.
   * targetList-> Starts as an empty ArrayList which is filled with the targets of the tribe the first time they
   * go to tribal council
   * @param name Name of the new tribe.
   * @param members All of the members to be added to the tribe.
   */
  constructor(name: string, members: Player[]) {
    this.name = name
    this.size = members.length
    this.members = members
    this.bonds = []
    this.alliances = []
    this.targetList = []
  }

  /**
   * A method which creates initial bonds for all of the members of the tribe from the bondList that was pre-created
   * and passed into the method.
   * @param bondList The ArrayList of Bond's created beforehand.
   */
  initialBonding(bondList: Bond[]): void {
    if (!this.bonds) {
      this.bonds = []
    }

    for (const b of bondList) {
      if (this.members.includes(b.member1) && this.members.includes(b.member2)) {
        this.bonds.push(b)
      }
    }

    for (const p of this.members) {
      for (const b of bondList) {
        if ((b.member1 === p || b.member2 === p) && b.strength > 0) {
          p.numBonds = p.numBonds + 1
        }
      }
    }
  }

  addAlliance(a: Alliance): void {
    this.alliances.push(a)
  }

  get challengePhysical(): number {
    let total = 0
    for (const p of this.members) {
      total += p.challengeSkill
    }
    return total / this.members.length
  }

  clearBonds(): void {
    this.bonds = []
  }

  idolHidden(): void {
    this.isIdolHidden = true
  }

  /**
   * Goes through the Player list for the tribe and checks who is not in the alliance passed in by using the contains
   * method.
   * @param a The Alliance which is checked in the method.
   * @return An ArrayList of Players in the Tribe who are not in the Alliance passed in.
   */
  notInAlliance(a: Alliance): Player[] {
    const allianceMembers = a.members
    const notIn: Player[] = []
    for (const p of this.members) {
      if (!allianceMembers.includes(p)) {
        notIn.push(p)
      }
    }
    return notIn
  }

  /**
   * A method that prints the Alliances of the Tribe as a toString of sorts.
   */
  printAlliances(): void {
    let i = 1
    for (const a of this.alliances) {
      console.log(`${this.name} Alliance #${i}`)
      const allianceMembers = a.members
      for (const p of allianceMembers) {
        console.log(p.firstName)
      }
      console.log()
      i++
    }
  }

  targets(stage: GamePhase, members: Player[]): void {
    // If only one alliance, reform alliances
    if (this.alliances.length === 1) {
      for (const p of members) {
        p.removeAlliance(this.alliances[0])
      }
      this.alliances.splice(0, 1)
      Alliance.anotherAlliances(this)
    }

    // Check if there's a split (an alliance that includes everyone)
    let split = false
    for (const a of this.alliances) {
      if (a.members.length === members.length) {
        split = true
        break
      }
    }

    if (split) {
      this.alliances = []
      Alliance.anotherAlliances(this)
    }

    for (const a of this.alliances) {
      console.log('Alliance:')
      for (const i of a.members) {
        console.log(i.firstName)
      }
      console.log('\n')
    }

    for (const a of this.alliances) {
      const notIn = this.notInAlliance(a).filter(p => !p.isImmune)

      switch (stage) {
        case 'Pre-Swap':
        case 'Post-Swap': {
          // Comparator Code: sort by threat level
          const threatGetter = (p: Player) => p.threatLevel(stage)

          notIn.sort((p1, p2) => {
            const t1 = threatGetter(p1)
            const t2 = threatGetter(p2)
            if (t1 === t2) return 0
            return t1 > t2 ? 1 : -1
          })

          let selected = false
          let i = notIn.length - 1

          if (GameHelpers.isMajorityAlliance(a.members.length, this.size) && notIn.length > 1) {
            // Majority alliance - select two targets
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

            a.targets = targets
            this.targetList.push(...targets)
          } else {
            // Minority alliance - select one target
            while (!selected && i >= 0) {
              const random = Math.random()
              if (random >= GAME_CONFIG.voting.targetSelection.selectionThreshold) {
                selected = true
                a.target = notIn[i]
                this.targetList.push(notIn[i])
              } else {
                i--
              }
            }

            if (!selected) {
              console.log(this.alliances.length)
              a.target = notIn[0]
              this.targetList.push(notIn[0])
            }
          }
          break
        }
      }
    }

    // SAFETY CHECK: Filter targetList to only include current non-immune tribe members
    this.targetList = this.targetList.filter(target => this.members.includes(target) && !target.isImmune)

    if (this.targetList.length === 0 && this.members.length > 0) {
      console.warn('Warning: targetList is empty after filtering. Adding all non-immune members as potential targets.')
      this.targetList.push(...this.members.filter(p => !p.isImmune))
    }
  }

  idolHunt(): void {
    // Shuffle members
    this.members.sort(() => Math.random() - GAME_CONFIG.voting.shuffleThreshold)

    if (this.isIdolHidden) {
      const random = Math.random()
      if (random <= GAME_CONFIG.idols.discovery.baseChance) {
        let totalStrat = 0
        for (const p of this.members) {
          totalStrat += p.strategicLevel
        }

        const magicNumber2 = Math.random()
        let cursor = 0

        for (const p of this.members) {
          cursor += p.strategicLevel
          if (cursor / totalStrat >= magicNumber2) {
            p.findIdol()
            if (Report) {
              Report.addIdolFound(p)
            }
            this.isIdolHidden = false
            return
          }
        }
      }
    }
  }

  /**
   * Adjusts alliance membership based on loyalty scores (if enabled) or bonds (legacy)
   * Removes members with low loyalty and invites outsiders with high loyalty potential
   */
  adjustAlliances(): void {
    const loyaltyEnabled = GAME_CONFIG.alliances.loyalty.enabled

    for (const a of this.alliances) {
      const allianceMembers = a.members

      // Remove members based on loyalty or bonds
      for (let i = allianceMembers.length - 1; i >= 0; i--) {
        const p = allianceMembers[i]

        if (loyaltyEnabled) {
          // Loyalty-based removal
          const loyalty = p.loyaltyFor(a)
          if (loyalty < GAME_CONFIG.alliances.loyalty.removalThreshold) {
            console.log(
              `${p.firstName} removed from alliance (loyalty: ${loyalty})`
            )
            a.remMember(p)
            p.removeAlliance(a)
          }
        } else {
          // Legacy bond-based removal
          let count = 0
          for (const t of allianceMembers) {
            const bond = p.bondWith(t)
            if (p !== t && bond && bond.strength < 0) {
              count++
            }
          }

          if (count / allianceMembers.length > GAME_CONFIG.alliances.membershipThreshold) {
            a.remMember(p)
            p.removeAlliance(a)
          }
        }
      }

      // Invite outsiders based on loyalty or bonds
      const notIn = this.notInAlliance(a)
      const currentMembers = a.members

      for (const p of notIn) {
        if (loyaltyEnabled) {
          // Check if player has high bond strength with alliance members
          let strongBondCount = 0
          for (const member of currentMembers) {
            const bond = p.bondWith(member)
            if (bond && bond.strength > GAME_CONFIG.alliances.strongBondThreshold) {
              strongBondCount++
            }
          }

          // Invite if they have strong bonds with enough members
          if (
            currentMembers.length > 0 &&
            strongBondCount / currentMembers.length > GAME_CONFIG.alliances.inviteThreshold
          ) {
            console.log(`${p.firstName} invited to alliance`)
            a.addMember(p)
            p.addAlliance(a)
          }
        } else {
          // Legacy bond-based invite
          let count = 0
          for (const t of currentMembers) {
            const bond = p.bondWith(t)
            if (bond && bond.strength > GAME_CONFIG.alliances.strongBondThreshold) {
              count++
            }
          }

          if (
            currentMembers.length > 0 &&
            count / currentMembers.length > GAME_CONFIG.alliances.inviteThreshold
          ) {
            a.addMember(p)
            p.addAlliance(a)
          }
        }
      }
    }
  }

  makeAlliance(t: Tribe): Alliance {
    return new Alliance(t.members, 3)
  }

  /**
   * Track voting behavior and adjust loyalty scores and bonds
   * Rewards voting with alliance, penalizes betrayals
   */
  trackVotingLoyalty(votesFor: Map<Player, Player>): void {
    // For each alliance, determine consensus target(s)
    for (const alliance of this.alliances) {
      const allianceMembers = alliance.members
      const allianceVotes = new Map<Player, number>()

      // Count how alliance members voted
      for (const member of allianceMembers) {
        const vote = votesFor.get(member)
        if (vote) {
          allianceVotes.set(vote, (allianceVotes.get(vote) || 0) + 1)
        }
      }

      // Find most voted target by alliance (consensus target)
      let consensusTarget: Player | null = null
      let maxVotes = 0
      for (const [target, count] of allianceVotes.entries()) {
        if (count > maxVotes) {
          maxVotes = count
          consensusTarget = target
        }
      }

      // Adjust loyalty based on voting behavior
      for (const member of allianceMembers) {
        const memberVote = votesFor.get(member)
        if (!memberVote) continue

        if (consensusTarget && memberVote === consensusTarget) {
          // Voted with alliance - increase loyalty
          member.adjustLoyalty(alliance, GAME_CONFIG.alliances.loyalty.voteWith)
        } else {
          // Voted against alliance - decrease loyalty (betrayal)
          member.adjustLoyalty(alliance, GAME_CONFIG.alliances.loyalty.voteAgainst)
          console.log(
            `${member.firstName} betrayed alliance by voting ${memberVote.firstName} (loyalty: ${member.loyaltyFor(alliance)})`
          )
        }
      }
    }

    // Track bonds based on voting together
    if (GAME_CONFIG.bonds.eventModifiers.enabled) {
      this.trackVotingBonds(votesFor)
    }
  }

  /**
   * Adjust bonds based on who voted together or betrayed each other
   */
  protected trackVotingBonds(votesFor: Map<Player, Player>): void {
    const members = this.members

    // Check each pair of members
    for (let i = 0; i < members.length - 1; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const p1 = members[i]
        const p2 = members[j]
        const p1Vote = votesFor.get(p1)
        const p2Vote = votesFor.get(p2)

        if (!p1Vote || !p2Vote) continue

        const bond = p1.bondWith(p2)
        if (!bond) continue

        // Check if they voted the same way
        if (p1Vote === p2Vote) {
          // Voted together - strengthen bond
          bond.applyModifier(
            GAME_CONFIG.bonds.eventModifiers.votedTogether,
            'voted together'
          )
        } else if (p1Vote === p2 || p2Vote === p1) {
          // One voted for the other - betrayal - weaken bond
          bond.applyModifier(
            GAME_CONFIG.bonds.eventModifiers.betrayed,
            'betrayal'
          )
        }
      }
    }
  }

  /**
   * Adjust bonds based on idol plays
   */
  protected trackIdolBonds(
    idolsPlayed: Map<Player, Player>,
    votes: Map<Player, number>
  ): void {
    for (const [player, beneficiary] of idolsPlayed.entries()) {
      const bond = player.bondWith(beneficiary)
      if (!bond) continue

      if (player === beneficiary) {
        // Played idol for themselves - no bond change
        continue
      } else {
        // Played idol for someone else - strengthen bond significantly
        bond.applyModifier(
          GAME_CONFIG.bonds.eventModifiers.idolPlayedFor,
          'idol played for'
        )
      }

      // Weaken bonds with players who voted for the beneficiary
      for (const [target, voteCount] of votes.entries()) {
        if (target === beneficiary && voteCount > 0) {
          // Find who voted for beneficiary and weaken their bond with idol player
          for (const member of this.members) {
            const memberVote = member.vote
            if (memberVote && memberVote === beneficiary) {
              const voterBond = member.bondWith(player)
              if (voterBond) {
                voterBond.applyModifier(
                  GAME_CONFIG.bonds.eventModifiers.idolPlayedAgainst,
                  'idol played against vote'
                )
              }
            }
          }
        }
      }
    }
  }

  timeToVote(phase: GamePhase): void {
    // First, determine alliance consensus targets
    const allianceConsensus = new Map<Alliance, Player>()
    const allianceSplitVotes = new Map<Alliance, [Player, Player]>()

    for (const alliance of this.alliances) {
      const allianceMembers = alliance.members
      const targets = alliance.targets

      // Check if this alliance should split votes
      const shouldSplit =
        GAME_CONFIG.voting.splitVote.enabled &&
        allianceMembers.length >= GAME_CONFIG.voting.splitVote.minimumAllianceSize &&
        targets &&
        targets.length === 2 &&
        GameHelpers.isMajorityAlliance(allianceMembers.length, this.size)

      if (shouldSplit && targets) {
        // Store split vote targets
        allianceSplitVotes.set(alliance, [targets[0], targets[1]])
        console.log(
          `${alliance.name || 'Alliance'} splitting votes: ${targets[0].firstName} and ${targets[1].firstName}`
        )
      } else {
        // Regular consensus voting
        const targetVotes = new Map<Player, number>()

        // Have each alliance member pick their preferred target
        for (const member of allianceMembers) {
          const threat = member.findBiggestThreat(this.targetList, phase)
          targetVotes.set(threat, (targetVotes.get(threat) || 0) + 1)
        }

        // Find consensus target (most popular)
        let consensusTarget: Player | null = null
        let maxVotes = 0
        for (const [target, count] of targetVotes.entries()) {
          if (count > maxVotes) {
            maxVotes = count
            consensusTarget = target
          }
        }

        if (consensusTarget) {
          allianceConsensus.set(alliance, consensusTarget)
        }
      }
    }

    // Now have each player vote, checking for defection and split votes
    for (const alliance of this.alliances) {
      const allianceMembers = alliance.members
      const splitTargets = allianceSplitVotes.get(alliance)

      if (splitTargets) {
        // Split vote: distribute votes among targets
        const [target1, target2] = splitTargets
        const splitPoint = Math.ceil(allianceMembers.length / 2)

        for (let i = 0; i < allianceMembers.length; i++) {
          const member = allianceMembers[i]

          // Check for defection first
          const shouldDefect = member.shouldDefect(
            alliance,
            i < splitPoint ? target1 : target2,
            phase,
            allianceMembers.length,
            this.size
          )

          if (shouldDefect) {
            const personalThreat = member.findBiggestThreat(this.targetList, phase)
            member.vote = personalThreat
            console.log(
              `${member.firstName} defects from split vote (voting ${personalThreat.firstName})`
            )
          } else {
            // Assign split vote
            member.vote = i < splitPoint ? target1 : target2
          }
        }
      } else {
        // Regular voting for this alliance
        const consensusTarget = allianceConsensus.get(alliance) ?? null

        for (const member of allianceMembers) {
          // Check if player should defect
          const shouldDefect = member.shouldDefect(
            alliance,
            consensusTarget,
            phase,
            allianceMembers.length,
            this.size
          )

          if (shouldDefect && consensusTarget) {
            // Defect: vote for personal biggest threat instead
            const personalThreat = member.findBiggestThreat(this.targetList, phase)
            member.vote = personalThreat
            console.log(
              `${member.firstName} defects from alliance consensus (voting ${personalThreat.firstName} instead of ${consensusTarget.firstName})`
            )
          } else {
            // Vote with alliance or personal preference
            member.vote = member.findBiggestThreat(this.targetList, phase)
          }
        }
      }
    }

    // Ensure all players have voted, even if they're not in any alliance
    for (const member of this.members) {
      if (!member.vote) {
        // If target list is empty, vote for another member
        if (this.targetList.length > 0) {
          const threat = member.findBiggestThreat(this.targetList, phase)
          member.vote = threat
          console.log(
            `${member.firstName} votes independently (no alliance): ${threat.firstName}`
          )
        } else {
          // Last resort: vote for someone else in the tribe who is not immune
          const others = this.members.filter(p => p !== member && !p.isImmune)
          if (others.length > 0) {
            member.vote = others[0]
            console.log(
              `${member.firstName} votes independently (fallback): ${others[0].firstName}`
            )
          }
        }
      }
    }

    // SAFETY CHECK: Validate all votes are for current tribe members
    for (const member of this.members) {
      const vote = member.vote
      if (vote && !this.members.includes(vote)) {
        console.warn(
          `WARNING: ${member.firstName} voted for ${vote.firstName} who is not in the tribe! Reassigning vote.`
        )
        // Reassign to a valid target
        const validTargets = this.members.filter(p => p !== member && !p.isImmune)
        if (validTargets.length > 0) {
          member.vote = validTargets[0]
          console.log(`${member.firstName} vote corrected to ${validTargets[0].firstName}`)
        }
      }
    }
  }

  timeToRevote(eligible: Player[], phase: GamePhase): void {
    console.log('REVOTE: ')
    for (const a of this.alliances) {
      const targets = a.targets
      if (targets && targets.length > 1) {
        for (const p of a.members) {
          if (eligible.includes(targets[0])) {
            p.vote = targets[0]
          } else if (eligible.includes(targets[1])) {
            p.vote = targets[1]
          } else {
            let max: number = GAME_CONFIG.sentinel.impossibleLow
            let selectedVoteIndex = 0

            for (let i = 0; i < eligible.length; i++) {
              const bond = p.bondWith(eligible[i])
              if (!bond) continue

              const adjustedThreatScore = bond.strength - eligible[i].threatLevel(phase)

              if (adjustedThreatScore > max) {
                max = adjustedThreatScore
                selectedVoteIndex = i
              }
            }

            p.vote = eligible[selectedVoteIndex]
          }
        }
      }
    }

    // Guarantee every member's revote lands on an eligible target, never on
    // themselves. Members not covered by the alliance logic above (or holding a
    // stale first-round vote) would otherwise vote for an ineligible player.
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

  illReadTheVotes(phase: GamePhase): void {
    const votes = new Map<Player, number>()
    const voteFor = new Map<Player, Player>()

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

    // Handle idols
    const idolsPlayed = new Map<Player, Player>()
    this.members.sort(() => Math.random() - GAME_CONFIG.voting.shuffleThreshold) // Shuffle

    // Build voteFor in shuffled order to match log output
    for (const p of this.members) {
      const vote = p.vote
      if (vote) {
        voteFor.set(p, vote)
      }
    }

    for (const p of this.members) {
      if (p.numIdols > 0) {
        if ((max && max === p) || (maxes.length > 1 && maxes.includes(p))) {
          const random = Math.random()
          const chance = GameHelpers.calculateSelfIdolPlayChance(p.strategicLevel)
          if (random <= chance && !p.isImmune) {
            console.log(`${p.firstName} is playing an idol for themselves`)
            p.isImmune = true
            idolsPlayed.set(p, p)
            p.useIdol()
            this.isIdolHidden = true
          }
        }

        if (!p.isImmune) {
          for (const target of this.targetList) {
            if (p.numIdols <= 0) break // one idol can only protect one player
            const bond = p.bondWith(target)
            if (bond && bond.strength >= GAME_CONFIG.idols.play.other.bondStrengthRequired) {
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

    // Set immune players' votes to 0
    const playerSet = new Set(votes.keys())
    for (const p of playerSet) {
      if (p.isImmune) {
        votes.set(p, 0)
      }
    }

    // Check if all votes were nullified by idol plays
    let zeroVotes = votes.size > 0
    for (const count of votes.values()) {
      if (count !== 0) { zeroVotes = false; break }
    }

    // Track idol plays for bonds
    if (GAME_CONFIG.bonds.eventModifiers.enabled && idolsPlayed.size > 0) {
      this.trackIdolBonds(idolsPlayed, votes)
    }

    if (Report) {
      Report.addTribalCouncil(voteFor, idolsPlayed)
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
    for (const p of this.members) {
      const vote = p.vote
      if (vote) {
        if (vote.isImmune) {
          console.log(`Vote: ${p.firstName}-> ${vote.firstName} DOES NOT COUNT`)
        } else {
          console.log(`Vote: ${p.firstName}-> ${vote.firstName}`)
        }
      }
    }

    // Handle ties
    if (maxes.length > 1 && this.size === 4 && Challenge) {
      const loser = Challenge.firemakingChallenge(maxes[0], maxes[1])
      maxes = maxes.filter(p => p !== loser)
      const winner = maxes[0]
      console.log('FIREMAKING')
      console.log(`Winner: ${winner.firstName}`)
      console.log(`Loser: ${loser.firstName}`)
      if (Report) {
        Report.addFiremaking(winner, loser)
      }
      max = loser
    } else if (maxes.length > 1) {
      // Who may RECEIVE votes in the revote: only the tied players normally, or
      // (when all votes were nullified) anyone still vulnerable — not immune and
      // not idol-protected (both set isImmune).
      const eligibleTargets = zeroVotes ? this.members.filter(p => !p.isImmune) : maxes
      this.targetList = [...eligibleTargets]
      this.timeToRevote(eligibleTargets, phase)

      // In a full revote everyone votes; in a tie only non-tied members vote
      const validVoters = zeroVotes
        ? this.members
        : this.members.filter(m => !maxes.includes(m))
      const whoForWho = new Map<Player, Player>()

      for (const p of validVoters) {
        const vote = p.vote
        if (vote) {
          console.log(`Vote: ${vote.firstName}`)
          whoForWho.set(p, vote)
          votes.set(vote, (votes.get(vote) || 0) + 1)
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
        const eligibleMembers = this.members.filter(m => !maxes.includes(m))
        eligibleMembers.sort(() => Math.random() - GAME_CONFIG.voting.shuffleThreshold)
        if (eligibleMembers.length > 0) {
          // Tied players are safe; everyone else draws rocks.
          max = eligibleMembers[0]
          if (Report) {
            Report.addRocks(max)
          }
        } else {
          // Deadlock: everyone still standing is tied, so no one can draw rocks.
          // Resolve by eliminating one of the tied players at random.
          max = [...maxes].sort(() => Math.random() - GAME_CONFIG.voting.shuffleThreshold)[0]
        }
      }
    }

    if (!max) {
      // Edge case: no valid votes (shouldn't happen with the timeToVote fix, but handle it)
      console.error('ERROR: No valid elimination target found!')
      console.error(`Tribe members: ${this.members.map(p => p.firstName).join(', ')}`)
      console.error(`Votes: ${Array.from(votes.entries()).map(([p, c]) => `${p.firstName}: ${c}`).join(', ')}`)

      // Last resort: eliminate a random non-immune player
      const nonImmune = this.members.filter(p => !p.isImmune)
      if (nonImmune.length > 0) {
        max = nonImmune[0]
        console.log(`Forced elimination (fallback): ${max.firstName}`)
      } else {
        // Everyone is immune (very rare edge case) - remove immunity and try again
        console.log('All players immune - removing immunity and forcing elimination')
        for (const p of this.members) {
          p.isImmune = false
        }
        max = this.members[0]
      }
    }

    console.log(`Voted Out: ${max.firstName}`)

    // Track voting behavior for loyalty adjustment
    if (GAME_CONFIG.alliances.loyalty.enabled) {
      this.trackVotingLoyalty(voteFor)
    }

    const maxIndex = this.members.indexOf(max)
    if (maxIndex > -1) {
      this.members.splice(maxIndex, 1)
    }

    for (const a of this.alliances) {
      const aMembers = a.members
      const aIndex = aMembers.indexOf(max)
      if (aIndex > -1) {
        aMembers.splice(aIndex, 1)
      }
    }

    this.alliances = this.alliances.filter(alliance => alliance.members.length > 0)

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

    this.bonds = this.bonds.filter(
      bond => bond.member1 !== max && bond.member2 !== max
    )

    for (const a of this.alliances) {
      a.targets = []
      a.target = null
    }

    if (max.numIdols > 1) {
      this.idolHidden()
    }

    this.size--
    this.targetList = []

    for (const p of this.members) {
      p.isImmune = false
    }
  }

  newBonds(bList: Bond[]): void {
    for (const b of bList) {
      if (this.members.includes(b.member1) && this.members.includes(b.member2)) {
        this.bonds.push(b)
      }
    }

    for (const p1 of this.members) {
      for (const p2 of this.members) {
        if (!p1.hasBond(p2) && p1 !== p2) {
          const chance = p1.socialLevel + p2.socialLevel
          const random = Math.random() * GAME_CONFIG.bonds.formation.legacy.randomRange

          let bond: Bond
          if (random > chance) {
            bond = new Bond(-1, p1, p2)
          } else {
            bond = new Bond(1, p1, p2)
          }

          this.bonds.push(bond)
          p1.addBond(bond)
          p2.addBond(bond)
        }
      }
    }
  }
}
