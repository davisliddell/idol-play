'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSimulationStore } from '@/lib/stores/simulation-store'
import PlaybackControls from '@/components/PlaybackControls'
import EpisodeViewer from '@/components/EpisodeViewer'

export default function SimulatePage() {
  const router = useRouter()
  const { setEpisodes, reset } = useSimulationStore()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load simulation data from sessionStorage
    const stored = sessionStorage.getItem('simulation-result')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        const episodes = data.episodes || []
        setEpisodes(episodes)
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to parse simulation data:', error)
        router.push('/')
      }
    } else {
      // No result found, redirect to home
      router.push('/')
    }

    // Cleanup on unmount
    return () => {
      reset()
    }
  }, [router, setEpisodes, reset])

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
        </div>

        {/* Playback Controls */}
        <div className="mb-8">
          <PlaybackControls />
        </div>

        {/* Episode Content */}
        <div className="mb-8">
          <EpisodeViewer />
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
