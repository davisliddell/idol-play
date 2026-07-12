import { NextRequest, NextResponse } from 'next/server'
import { getSimulation, getSimulationSummary } from '@/lib/db/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const includeEpisodes = request.nextUrl.searchParams.get('includeEpisodes') === 'true'

    if (includeEpisodes) {
      const simulation = await getSimulation(id)

      if (!simulation) {
        return NextResponse.json(
          { error: 'Simulation not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(simulation)
    } else {
      const summary = await getSimulationSummary(id)

      if (!summary) {
        return NextResponse.json(
          { error: 'Simulation not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(summary)
    }
  } catch (error: unknown) {
    console.error('Failed to fetch simulation:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to fetch simulation', message },
      { status: 500 }
    )
  }
}
