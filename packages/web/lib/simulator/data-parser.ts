import { Player } from './models/player'

export interface PlayerJSON {
  firstName: string
  lastName: string
  challengeSkill: number
  strategicLevel: number
  visibility: number
  socialLevel: number
  articulation: number
}

export class DataParser {
  /**
   * Takes in a JSON string of player data and returns a list of Player objects.
   *
   * Example JSON:
   * [
   *   {
   *     "firstName": "Mary",
   *     "lastName": "Sue",
   *     "challengeSkill": 5,
   *     "strategicLevel": 4,
   *     "visibility": 3,
   *     "socialLevel": 2,
   *     "articulation": 1
   *   },
   *   ...
   * ]
   *
   * @param jsonString The JSON string of player data
   * @return Array of Player objects
   */
  static parseJsonString(jsonString: string): Player[] {
    try {
      const playersData: PlayerJSON[] = JSON.parse(jsonString)

      if (!Array.isArray(playersData)) {
        throw new Error('JSON must be an array of players')
      }

      const listOfPlayers: Player[] = []

      for (const playerData of playersData) {
        // Validate required fields
        if (
          !playerData.firstName ||
          !playerData.lastName ||
          playerData.challengeSkill === undefined ||
          playerData.strategicLevel === undefined ||
          playerData.visibility === undefined ||
          playerData.socialLevel === undefined ||
          playerData.articulation === undefined
        ) {
          throw new Error('Player data is missing required fields')
        }

        // Validate ranges (1-5)
        if (
          playerData.challengeSkill < 1 ||
          playerData.challengeSkill > 5 ||
          playerData.strategicLevel < 1 ||
          playerData.strategicLevel > 5 ||
          playerData.visibility < 1 ||
          playerData.visibility > 5 ||
          playerData.socialLevel < 1 ||
          playerData.socialLevel > 5 ||
          playerData.articulation < 1 ||
          playerData.articulation > 5
        ) {
          throw new Error('Player attributes must be between 1 and 5')
        }

        const player = new Player(
          playerData.firstName,
          playerData.lastName,
          playerData.challengeSkill,
          playerData.strategicLevel,
          playerData.visibility,
          playerData.socialLevel,
          playerData.articulation
        )

        listOfPlayers.push(player)
      }

      return listOfPlayers
    } catch (error) {
      console.error('Error parsing player JSON:', error)
      throw error
    }
  }

  /**
   * Parse an array of PlayerJSON objects directly
   * @param playersData Array of PlayerJSON objects
   * @return Array of Player objects
   */
  static parsePlayerArray(playersData: PlayerJSON[]): Player[] {
    const listOfPlayers: Player[] = []

    for (const playerData of playersData) {
      const player = new Player(
        playerData.firstName,
        playerData.lastName,
        playerData.challengeSkill,
        playerData.strategicLevel,
        playerData.visibility,
        playerData.socialLevel,
        playerData.articulation
      )

      listOfPlayers.push(player)
    }

    return listOfPlayers
  }

  /**
   * Validate that we have exactly the right number of players
   * @param players Array of players
   * @param expectedCount Expected number of players
   */
  static validatePlayerCount(players: Player[], expectedCount: number = 20): void {
    if (players.length !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} players, but got ${players.length}. Please provide exactly ${expectedCount} players.`
      )
    }
  }
}
