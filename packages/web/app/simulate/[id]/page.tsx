'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSimulationStore } from '@/lib/stores/simulation-store'
import PlaybackControls from '@/components/PlaybackControls'
import EpisodeViewer from '@/components/EpisodeViewer'
import CastPanel from '@/components/CastPanel'

export default function SimulateByIdPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const { setEpisodes, reset } = useSimulationStore()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      router.push('/')
      return
    }

    // Load simulation data from API
    const loadSimulation = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/simulations/${id}?includeEpisodes=true`)

        if (!response.ok) {
          throw new Error('Simulation not found')
        }

        const data = await response.json()
        setEpisodes(data.episodes || [])
        setIsLoading(false)
      } catch (err: unknown) {
        console.error('Failed to load simulation:', err)
        setError(err instanceof Error ? err.message : 'Failed to load simulation')
        setIsLoading(false)
      }
    }

    loadSimulation()

    // Cleanup on unmount
    return () => {
      reset()
    }
  }, [id, router, setEpisodes, reset])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading simulation...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-3xl font-bold mb-4">Simulation Not Found</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            Back to Home
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
            Simulation Viewer
          </h1>
          <p className="text-xl text-gray-300">
            Watch the season unfold episode by episode
          </p>
          {/* Shareable Link */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="text-sm text-gray-400">Shareable link:</span>
            <code className="bg-gray-800 px-3 py-1 rounded text-sm text-orange-400">
              {typeof window !== 'undefined' && window.location.href}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href)
                alert('Link copied!')
              }}
              className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded transition-colors"
            >
              📋 Copy
            </button>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="mb-8">
          <PlaybackControls />
        </div>

        {/* Cast tracker + Episode Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <aside className="lg:col-span-1 order-first">
            <div className="lg:sticky lg:top-4">
              <CastPanel />
            </div>
          </aside>
          <div className="lg:col-span-2">
            <EpisodeViewer />
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-wrap gap-4 justify-center pb-8 pt-4 border-t border-gray-700">
          <button
            onClick={() => router.push('/create')}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            Create New Cast
          </button>
          <button
            onClick={() => router.push('/')}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            Back to Home
          </button>
        </div>

        {/* Tips */}
        <div className="bg-gray-800 bg-opacity-50 rounded-lg p-4 text-center text-gray-400 text-sm">
          <p className="mb-1">💡 <strong>Tips:</strong></p>
          <p>Use the scrubber to jump to any episode • Adjust playback speed for faster viewing • Pause to read votes carefully</p>
        </div>
      </div>
    </main>
  )
}
