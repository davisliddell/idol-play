import { Player } from './player'
import { Bond } from './bond'

export class VotingBloc {
  members: Player[]

  constructor() {
    this.members = []
  }

  /**
   * Generates voting blocs for post-merge gameplay
   * The algorithm separates players with weak bonds into different blocs,
   * then assigns remaining players to their most compatible bloc
   * @param listCopy List of players to organize into blocs
   * @param numBlocs Number of voting blocs to create
   * @param maxPerBloc Maximum number of players per bloc
   * @return List of voting blocs
   */
  static generateVotingBlocs(
    listCopy: Player[],
    numBlocs: number,
    maxPerBloc: number
  ): VotingBloc[] {
    if (listCopy === null) {
      throw new Error('Inputted player list was null. Cannot be null.')
    }
    if (numBlocs < 2 || numBlocs > listCopy.length) {
      throw new Error(
        'Invalid number of voting blocs. Must be between 2 and the size of the player list (inclusive).'
      )
    }
    if (maxPerBloc * numBlocs < listCopy.length) {
      throw new Error(
        'Invalid numBlocks or maxPerBlock. The product of these two values must be greater than or equal to player list size.'
      )
    }

    // Make a copy of the player list so we don't modify the original list that might still be in use
    const list: Player[] = [...listCopy]

    // Create a priority queue of bonds so we can easily get the bond with the weakest strength
    // We'll use an array and sort it, then poll from the beginning (weakest bonds first)
    const bondList: Bond[] = []
    for (const player of list) {
      for (const other of list) {
        if (
          player !== other &&
          !bondList.find((b) => b === player.bondWith(other)) &&
          !bondList.find((b) => b === other.bondWith(player))
        ) {
          const bond = player.bondWith(other)
          if (bond) {
            bondList.push(bond)
          }
        }
      }
    }

    // Sort by strength (ascending - weakest first)
    bondList.sort((a, b) => a.compareTo(b))

    const listVotingBloc: VotingBloc[] = []

    // Initialize the ArrayList. The idea is to put the people who like each other the least in different groups.
    let i = 0
    let bondIndex = 0
    let currentBond = bondList[bondIndex++]

    while (i < numBlocs) {
      if (!currentBond) break

      if (list.includes(currentBond.member1)) {
        listVotingBloc.push(new VotingBloc())
        listVotingBloc[i].members.push(currentBond.member1)
        const index = list.indexOf(currentBond.member1)
        list.splice(index, 1)
        i++
      } else if (list.includes(currentBond.member2)) {
        listVotingBloc.push(new VotingBloc())
        listVotingBloc[i].members.push(currentBond.member2)
        const index = list.indexOf(currentBond.member2)
        list.splice(index, 1)
        i++
      }
      currentBond = bondList[bondIndex++]
    }

    if (!currentBond) {
      throw new Error('Not enough bonds to initialize voting blocs')
    }

    // An odd number of voting blocks breaks the above system. This fixes that.
    if (numBlocs % 2 === 1) {
      if (list.includes(currentBond.member1)) {
        const currentPlayer = currentBond.member1

        let currentVB = listVotingBloc[0]
        let maxCompatibility = VotingBloc.compatibility(currentPlayer, currentVB)

        for (let j = 1; j < listVotingBloc.length - 1; j++) {
          const compat = VotingBloc.compatibility(currentPlayer, listVotingBloc[j])
          if (maxCompatibility < compat) {
            currentVB = listVotingBloc[j]
            maxCompatibility = compat
          }
        }

        currentVB.members.push(currentPlayer)
        const index = list.indexOf(currentPlayer)
        list.splice(index, 1)
      } else if (list.includes(currentBond.member2)) {
        const currentPlayer = currentBond.member2

        let currentVB = listVotingBloc[0]
        let maxCompatibility = VotingBloc.compatibility(currentPlayer, currentVB)

        for (let j = 1; j < listVotingBloc.length - 1; j++) {
          const compat = VotingBloc.compatibility(currentPlayer, listVotingBloc[j])
          if (maxCompatibility < compat) {
            currentVB = listVotingBloc[j]
            maxCompatibility = compat
          }
        }

        currentVB.members.push(currentPlayer)
        const index = list.indexOf(currentPlayer)
        list.splice(index, 1)
      }
    }

    // Assign remaining players to most compatible voting bloc
    for (const player of list) {
      let mostCompatible: VotingBloc | null = null
      let compatibility = Number.MIN_SAFE_INTEGER

      for (const votingBloc of listVotingBloc) {
        const currentCompatibility = VotingBloc.compatibility(player, votingBloc)
        if (
          !votingBloc.members.includes(player) &&
          votingBloc.members.length < maxPerBloc &&
          currentCompatibility > compatibility
        ) {
          mostCompatible = votingBloc
          compatibility = currentCompatibility
        }
      }

      if (!mostCompatible) {
        throw new Error('Could not find a compatible voting bloc for player')
      }

      mostCompatible.members.push(player)
    }

    return listVotingBloc
  }

  /**
   * Gets the compatibility of a player with a voting bloc.
   * The higher the return value, the more compatible the player is
   * with the voting block. The return value is calculated by averaging
   * the bond strengths of the player with the people in the bloc.
   *
   * @param player The player to calculate compatibility for
   * @param votingBloc The voting block to calculate compatibility with
   * @return A value that represents how compatible a player is with a voting bloc
   */
  static compatibility(player: Player, votingBloc: VotingBloc): number {
    let total = 0
    const bondList = player.bondList

    if (!bondList) return 0

    for (const bond of bondList) {
      if (bond.member1 === player) {
        if (votingBloc.members.includes(bond.member2)) {
          total += bond.strength
        }
      } else if (votingBloc.members.includes(bond.member1)) {
        total += bond.strength
      }
    }

    return Math.floor(total / votingBloc.members.length)
  }

  toString(): string {
    let ret = 'Members:'
    for (const p of this.members) {
      ret += ' ' + p.firstName
    }
    return ret
  }
}
