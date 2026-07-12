'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import samplePlayers from '@/lib/simulator/sample-players.json'

export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ id: string; episodes?: unknown[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runSimulation = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ players: samplePlayers }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Simulation failed')
      }

      const data = await response.json()
      // Redirect to simulation viewer with ID
      router.push(`/simulate/${data.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
            Idol Play
          </h1>
          <p className="text-2xl text-gray-300 mb-2">Survivor Simulator</p>
          <p className="text-gray-400">
            Experience a complete Survivor simulation with 20 players, alliances, and dramatic tribal councils
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-tribe-red text-3xl font-bold mb-2">3 Phases</div>
            <div className="text-gray-300">Pre-Swap → Post-Swap → Merge</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-tribe-blue text-3xl font-bold mb-2">20 → 3</div>
            <div className="text-gray-300">Players to Final Tribal Council</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-tribe-merged text-3xl font-bold mb-2">Complex AI</div>
            <div className="text-gray-300">Bonds, Alliances, Voting Blocs</div>
          </div>
        </div>

        {/* Main Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Create Custom Cast */}
          <div className="bg-gradient-to-br from-orange-900 to-red-900 rounded-lg p-8 border border-orange-700">
            <h2 className="text-2xl font-bold mb-3">🎨 Create Your Cast</h2>
            <p className="text-gray-200 mb-6">
              Build a custom season with your own players. Choose their attributes and see who comes out on top!
            </p>
            <a
              href="/create"
              className="inline-block bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200"
            >
              Start Creating
            </a>
          </div>

          {/* Quick Demo */}
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
            <h2 className="text-2xl font-bold mb-3">⚡ Quick Demo</h2>
            <p className="text-gray-300 mb-6">
              Try the simulator with Survivor Legends - 20 winners and iconic players competing for the title.
            </p>
            <button
              onClick={runSimulation}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200"
            >
              {isLoading ? 'Running...' : 'Run Demo'}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-8">
            <h3 className="font-bold mb-2">Error</h3>
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-green-400">✓ Simulation Complete!</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Episode Count</h3>
                <p className="text-gray-300">{result.episodes?.length || 0} episodes</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Raw JSON Output</h3>
                <pre className="bg-gray-900 p-4 rounded overflow-auto max-h-96 text-sm">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Technical Details */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Built with Next.js 15, TypeScript, and Tailwind CSS</p>
          <p className="mt-2">
            Ported from 7,000+ lines of Java • All algorithms preserved • Comprehensive simulation
          </p>
        </div>
      </div>
    </main>
  )
}
