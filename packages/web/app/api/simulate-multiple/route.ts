import { NextRequest, NextResponse } from 'next/server'
import { GameEngine } from '@/lib/simulator/engine/game-engine'
import { DataParser, PlayerJSON } from '@/lib/simulator/data-parser'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { players, count = 1 } = body

    if (!players || !Array.isArray(players)) {
      return NextResponse.json(
        { error: 'Invalid request: players array is required' },
        { status: 400 }
      )
    }

    if (count < 1 || count > 100) {
      return NextResponse.json(
        { error: 'Count must be between 1 and 100' },
        { status: 400 }
      )
    }

    // Validate player count
    DataParser.validatePlayerCount(players, 20)

    // Run multiple simulations IN PARALLEL (now possible with instance-based architecture!)
    const simulationPromises = Array.from({ length: count }, async () => {
      // Each simulation gets fresh players and its own GameEngine
      const playerObjects = DataParser.parsePlayerArray(players as PlayerJSON[])
      const gameEngine = new GameEngine()

      const resultJson = gameEngine.runSimulation(playerObjects)
      const episodes = JSON.parse(resultJson)

      // Extract winner from last episode's winner event
      const winner: string | null = null
      // This would need proper episode parsing based on structure

      return {
        episodes,
        winner: winner as string | null,
        placements: {} as Record<string, number>,
      }
    })

    // Execute all simulations in parallel!
    const results = await Promise.all(simulationPromises)

    // Calculate aggregate statistics
    const winCounts: Record<string, number> = {}
    const placementTotals: Record<string, number[]> = {}

    // Parse results to extract winners and placements
    for (const result of results) {
      if (result.winner) {
        winCounts[result.winner] = (winCounts[result.winner] || 0) + 1
      }

      for (const [player, placement] of Object.entries(result.placements)) {
        if (!placementTotals[player]) {
          placementTotals[player] = []
        }
        placementTotals[player].push(placement as number)
      }
    }

    // Calculate averages
    const averagePlacements: Record<string, number> = {}
    for (const [player, placements] of Object.entries(placementTotals)) {
      averagePlacements[player] =
        placements.reduce((a, b) => a + b, 0) / placements.length
    }

    const statistics = {
      totalSimulations: count,
      winCounts,
      averagePlacements,
    }

    return NextResponse.json({
      success: true,
      statistics,
      results: results.slice(0, 5), // Return first 5 full results
    })
  } catch (error: unknown) {
    console.error('Multiple simulation error:', error)
    const message = error instanceof Error ? error.message : 'An unknown error occurred'
    const stack = error instanceof Error ? error.stack : undefined
    return NextResponse.json(
      {
        error: 'Multiple simulation failed',
        message,
        stack: process.env.NODE_ENV === 'development' ? stack : undefined,
      },
      { status: 500 }
    )
  }
}
