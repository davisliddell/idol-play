import { NextRequest, NextResponse } from 'next/server'
import { getRecentSimulations } from '@/lib/db/database'

export async function GET(request: NextRequest) {
  try {
    const limitParam = request.nextUrl.searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam) : 10

    const simulations = await getRecentSimulations(limit)

    return NextResponse.json({ simulations })
  } catch (error: unknown) {
    console.error('Failed to fetch recent simulations:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to fetch simulations', message },
      { status: 500 }
    )
  }
}
