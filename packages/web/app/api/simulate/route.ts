import { NextRequest, NextResponse } from 'next/server'
import { GameEngine } from '@/lib/simulator/engine/game-engine'
import { DataParser, PlayerJSON } from '@/lib/simulator/data-parser'
import { saveSimulation } from '@/lib/db/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { players } = body

    if (!players || !Array.isArray(players)) {
      return NextResponse.json(
        { error: 'Invalid request: players array is required' },
        { status: 400 }
      )
    }

    // Validate player count
    DataParser.validatePlayerCount(players, 20)

    // Parse players
    const playerObjects = DataParser.parsePlayerArray(players as PlayerJSON[])

    // Create new GameEngine instance (enables parallel simulations!)
    const gameEngine = new GameEngine()

    // Run simulation
    const result = gameEngine.runSimulation(playerObjects)
    const episodes = JSON.parse(result)

    // Save to database (async)
    const summary = await saveSimulation(episodes)

    return NextResponse.json({
      success: true,
      id: summary.id,
      summary: {
        winner: summary.winner,
        totalEpisodes: summary.totalEpisodes,
        createdAt: summary.createdAt,
      }
    })
  } catch (error: unknown) {
    console.error('Simulation error:', error)
    const message = error instanceof Error ? error.message : 'An unknown error occurred'
    const stack = error instanceof Error ? error.stack : undefined
    return NextResponse.json(
      {
        error: 'Simulation failed',
        message,
        stack: process.env.NODE_ENV === 'development' ? stack : undefined,
      },
      { status: 500 }
    )
  }
}
