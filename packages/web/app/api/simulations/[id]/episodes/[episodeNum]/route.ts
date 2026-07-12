import { NextRequest, NextResponse } from 'next/server'
import { getEpisode } from '@/lib/db/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; episodeNum: string }> }
) {
  try {
    const { id, episodeNum } = await params
    const episodeNumber = parseInt(episodeNum)

    if (isNaN(episodeNumber)) {
      return NextResponse.json(
        { error: 'Invalid episode number' },
        { status: 400 }
      )
    }

    const episode = await getEpisode(id, episodeNumber)

    if (!episode) {
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(episode)
  } catch (error: unknown) {
    console.error('Failed to fetch episode:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to fetch episode', message },
      { status: 500 }
    )
  }
}
