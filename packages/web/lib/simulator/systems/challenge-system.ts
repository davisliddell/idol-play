import { Player } from '../models/player'
import { Tribe } from '../models/tribe'
import { Report } from '../report'

/**
 * ChallengeSystem - Handles all challenge mechanics
 */
export class ChallengeSystem {
  constructor() {}

  /**
   * Two tribe immunity challenge
   */
  twoTribeImmunity(tribe1: Tribe, tribe2: Tribe): Tribe {
    const tribe1Total = tribe1.challengePhysical
    const tribe2Total = tribe2.challengePhysical
    const totalTotal = tribe1Total + tribe2Total
    const num = Math.random()

    let winner: Tribe

    if (num <= tribe1Total / totalTotal) {
      tribe1.isImmune = true
      winner = tribe1
      console.log('Tribe 1 wins immunity!')
    } else {
      tribe2.isImmune = true
      winner = tribe2
      console.log('Tribe 2 wins immunity!')
    }

    Report.addTribalChallenge(winner)
    return winner
  }

  /**
   * Three tribe immunity challenge
   * Two tribes win immunity, one loses
   */
  threeTribeImmunity(tribe1: Tribe, tribe2: Tribe, tribe3: Tribe): Tribe {
    const tribe1Total = tribe1.challengePhysical
    const tribe2Total = tribe2.challengePhysical
    const tribe3Total = tribe3.challengePhysical
    const totalTotal = tribe1Total + tribe2Total + tribe3Total
    const num = Math.random()

    let loser: Tribe

    if (num <= tribe1Total / totalTotal) {
      tribe2.isImmune = true
      tribe3.isImmune = true
      loser = tribe1
      console.log('Tribe 1 loses!')
    } else if (num >= 1 - tribe3Total / totalTotal) {
      tribe1.isImmune = true
      tribe2.isImmune = true
      loser = tribe3
      console.log('Tribe 3 loses!')
    } else {
      tribe1.isImmune = true
      tribe3.isImmune = true
      loser = tribe2
      console.log('Tribe 2 loses!')
    }

    // Winner is tribes array minus loser
    const winners = [tribe1, tribe2, tribe3].filter(t => t !== loser)
    Report.addTribalChallenge(winners[0])

    return loser
  }

  /**
   * Individual immunity challenge
   */
  individualImmunity(tribe: Tribe): Player {
    let low = 0
    let high = 0
    const membs = tribe.members
    const total = tribe.challengePhysical
    const num = Math.random()
    let winner = membs[0]

    for (const memb of membs) {
      high += memb.challengeSkill / total
      if (num >= low && num <= high) {
        winner = memb
        console.log(`${memb.firstName} wins immunity!`)
        break
      }
      low = high
    }

    Report.addIndividualChallenge(winner)
    return winner
  }

  /**
   * Fire-making challenge between two players
   */
  firemakingChallenge(p1: Player, p2: Player): Player {
    const challenge1 = p1.challengeSkill
    const challenge2 = p2.challengeSkill
    const challengeTotal = challenge1 + challenge2
    const num = Math.random()

    const winner = num <= challenge1 / challengeTotal ? p1 : p2
    const loser = winner === p1 ? p2 : p1

    Report.addFiremaking(winner, loser)

    return winner
  }
}
