'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { downloadJSON, downloadCSV } from '@/lib/export'

interface WinnerStats {
  player: string
  wins: number
  percentage: string
}

interface SimulationResults {
  statistics: {
    winCounts: Record<string, number>
    totalSimulations: number
  }
  results?: Array<{
    episodes?: Array<{
      eventsInEpisode?: Array<{
        eventType: string
        winner?: string
        voteCount?: number
      }>
    }>
  }>
}

export default function MultipleResultsPage() {
  const router = useRouter()
  const [results, setResults] = useState<SimulationResults | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('multiple-results')
    if (stored) {
      setResults(JSON.parse(stored))
    } else {
      router.push('/')
    }
  }, [router])

  if (!results) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading results...</p>
        </div>
      </main>
    )
  }

  const { statistics, results: sims } = results
  const winCounts = statistics.winCounts || {}
  const totalSims = statistics.totalSimulations || 0

  // Sort winners by win count
  const sortedWinners: WinnerStats[] = Object.entries(winCounts)
    .map(([player, count]) => ({
      player: player.replace('|', ' '),
      wins: count as number,
      percentage: ((count / totalSims) * 100).toFixed(1),
    }))
    .sort((a, b) => b.wins - a.wins)

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
            Multiple Simulation Results
          </h1>
          <p className="text-2xl text-gray-300">{totalSims} Simulations Complete</p>
        </div>

        {/* Top Winner */}
        {sortedWinners.length > 0 && (
          <div className="bg-gradient-to-br from-yellow-900 to-orange-900 rounded-lg p-8 border border-yellow-700 mb-8 text-center">
            <div className="text-6xl mb-4">👑</div>
            <h2 className="text-3xl font-bold mb-2">{sortedWinners[0].player}</h2>
            <p className="text-xl text-gray-200">
              Most Likely Winner: {sortedWinners[0].wins} wins ({sortedWinners[0].percentage}%)
            </p>
          </div>
        )}

        {/* Win Rates Table */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <h2 className="text-2xl font-bold mb-6">Win Rates</h2>
          <div className="space-y-3">
            {sortedWinners.map((winner, index) => (
              <div key={index} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-orange-400">#{index + 1}</span>
                    <span className="text-lg font-semibold">{winner.player}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-green-400">{winner.wins} wins</div>
                    <div className="text-sm text-gray-400">{winner.percentage}%</div>
                  </div>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-red-600 h-full transition-all duration-500"
                    style={{ width: `${winner.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sample Results */}
        {sims && sims.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
            <h2 className="text-2xl font-bold mb-4">Sample Simulations</h2>
            <p className="text-gray-400 mb-4">Showing first {Math.min(5, sims.length)} results</p>
            <div className="space-y-3">
              {sims.slice(0, 5).map((sim, i: number) => {
                const episode = sim.episodes?.[1] || sim.episodes?.[0]
                const events = episode?.eventsInEpisode || []
                const winner = events.find((e) => e.eventType === 'WINNER_DECLARED')

                return (
                  <div key={i} className="bg-gray-700 rounded p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Simulation {i + 1}</span>
                      {winner && winner.winner && (
                        <span className="text-orange-400 font-semibold">
                          Winner: {winner.winner.replace('|', ' ')} ({winner.voteCount} votes)
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-4 justify-center pb-8">
          <button
            onClick={() =>
              downloadCSV('win-rates.csv', [
                ['Rank', 'Player', 'Wins', 'Win %'],
                ...sortedWinners.map((w, i) => [i + 1, w.player, w.wins, w.percentage]),
              ])
            }
            className="bg-green-700 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            ⬇ Export CSV
          </button>
          <button
            onClick={() => downloadJSON('simulation-results.json', results)}
            className="bg-green-700 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            ⬇ Export JSON
          </button>
          <button
            onClick={() => router.push('/create')}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            New Cast
          </button>
          <button
            onClick={() => router.push('/')}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            Home
          </button>
        </div>
      </div>
    </main>
  )
}
