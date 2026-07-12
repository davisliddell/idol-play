'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import samplePlayers from '@/lib/simulator/sample-players.json'

interface PlayerInput {
  firstName: string
  lastName: string
  challengeSkill: number
  strategicLevel: number
  visibility: number
  socialLevel: number
  articulation: number
}

const EMPTY_PLAYER: PlayerInput = {
  firstName: '',
  lastName: '',
  challengeSkill: 3,
  strategicLevel: 3,
  visibility: 3,
  socialLevel: 3,
  articulation: 3,
}

export default function CreatePage() {
  const router = useRouter()
  const [players, setPlayers] = useState<PlayerInput[]>(
    Array(20).fill(null).map(() => ({ ...EMPTY_PLAYER }))
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMultipleModal, setShowMultipleModal] = useState(false)
  const [simulationCount, setSimulationCount] = useState(10)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('survivor-roster')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length === 20) {
          setPlayers(parsed)
        }
      } catch {
        console.error('Failed to load saved roster')
      }
    }
  }, [])

  const updatePlayer = (index: number, field: keyof PlayerInput, value: string | number) => {
    const updated = [...players]
    updated[index] = { ...updated[index], [field]: value }
    setPlayers(updated)
  }

  const loadLegends = () => {
    // sample-players.json ships with the app; import directly rather than
    // fetching (it isn't served as a static asset).
    setPlayers(samplePlayers.map((p) => ({ ...EMPTY_PLAYER, ...p })))
    setError(null)
  }

  const saveRoster = () => {
    localStorage.setItem('survivor-roster', JSON.stringify(players))
    alert('✅ Roster saved!')
  }

  const loadRoster = () => {
    const saved = localStorage.getItem('survivor-roster')
    if (!saved) {
      setError('No saved roster found. Save one first.')
      return
    }
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length === 20) {
        setPlayers(parsed.map((p) => ({ ...EMPTY_PLAYER, ...p })))
        setError(null)
      } else {
        setError('Saved roster is invalid.')
      }
    } catch {
      setError('Failed to load saved roster.')
    }
  }

  const clearRoster = () => {
    if (confirm('Clear all players?')) {
      setPlayers(Array(20).fill(null).map(() => ({ ...EMPTY_PLAYER })))
    }
  }

  const validatePlayers = (): string | null => {
    for (let i = 0; i < players.length; i++) {
      const p = players[i]
      if (!p.firstName.trim()) return `Player ${i + 1}: First name required`
      if (!p.lastName.trim()) return `Player ${i + 1}: Last name required`
      if (p.challengeSkill < 1 || p.challengeSkill > 5) return `Player ${i + 1}: Invalid challenge skill`
      if (p.strategicLevel < 1 || p.strategicLevel > 5) return `Player ${i + 1}: Invalid strategic level`
      if (p.visibility < 1 || p.visibility > 5) return `Player ${i + 1}: Invalid visibility`
      if (p.socialLevel < 1 || p.socialLevel > 5) return `Player ${i + 1}: Invalid social level`
      if (p.articulation < 1 || p.articulation > 5) return `Player ${i + 1}: Invalid articulation`
    }
    return null
  }

  const runSingleSimulation = async () => {
    const validationError = validatePlayers()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Simulation failed')
      }

      const data = await response.json()
      // Navigate to viewer with simulation ID
      router.push(`/simulate/${data.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const runMultipleSimulations = async () => {
    const validationError = validatePlayers()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    setError(null)
    setShowMultipleModal(false)

    try {
      const response = await fetch('/api/simulate-multiple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players, count: simulationCount }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Simulation failed')
      }

      const data = await response.json()
      sessionStorage.setItem('multiple-results', JSON.stringify(data))
      router.push('/results/multiple')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
            Create Your Cast
          </h1>
          <p className="text-gray-400">Enter 20 players to simulate a complete Survivor season</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={loadLegends}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
          >
            Load Legends
          </button>
          <button
            onClick={saveRoster}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
          >
            Save Roster
          </button>
          <button
            onClick={loadRoster}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
          >
            Load Saved
          </button>
          <button
            onClick={clearRoster}
            className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
          >
            Clear All
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Player Entry Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {players.map((player, index) => (
            <div key={index} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-orange-400">Player {index + 1}</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  placeholder="First Name"
                  value={player.firstName}
                  onChange={(e) => updatePlayer(index, 'firstName', e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={player.lastName}
                  onChange={(e) => updatePlayer(index, 'lastName', e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-2">
                <AttributeSlider
                  label="Challenge"
                  value={player.challengeSkill}
                  onChange={(v) => updatePlayer(index, 'challengeSkill', v)}
                />
                <AttributeSlider
                  label="Strategic"
                  value={player.strategicLevel}
                  onChange={(v) => updatePlayer(index, 'strategicLevel', v)}
                />
                <AttributeSlider
                  label="Visibility"
                  value={player.visibility}
                  onChange={(v) => updatePlayer(index, 'visibility', v)}
                />
                <AttributeSlider
                  label="Social"
                  value={player.socialLevel}
                  onChange={(v) => updatePlayer(index, 'socialLevel', v)}
                />
                <AttributeSlider
                  label="Articulation"
                  value={player.articulation}
                  onChange={(v) => updatePlayer(index, 'articulation', v)}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Run Simulation Buttons */}
        <div className="flex flex-wrap gap-4 justify-center pb-12">
          <button
            onClick={runSingleSimulation}
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-bold py-4 px-8 rounded-lg transition-colors text-lg"
          >
            {isLoading ? 'Running...' : '🎬 Run Simulation'}
          </button>
          <button
            onClick={() => setShowMultipleModal(true)}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold py-4 px-8 rounded-lg transition-colors text-lg"
          >
            {isLoading ? 'Running...' : '🔥 Run Multiple Simulations'}
          </button>
        </div>
      </div>

      {/* Multiple Simulations Modal */}
      {showMultipleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
            <h2 className="text-2xl font-bold mb-4">Multiple Simulations</h2>
            <p className="text-gray-300 mb-4">
              Run multiple simulations to see win rates and statistics across different outcomes.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Number of Simulations</label>
              <input
                type="number"
                min="1"
                max="100"
                value={simulationCount}
                onChange={(e) => setSimulationCount(parseInt(e.target.value) || 10)}
                className="bg-gray-700 border border-gray-600 rounded px-4 py-2 w-full text-white focus:outline-none focus:border-orange-500"
              />
              <p className="text-sm text-gray-400 mt-1">Max: 100 simulations</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={runMultipleSimulations}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg transition-colors"
              >
                Run
              </button>
              <button
                onClick={() => setShowMultipleModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function AttributeSlider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-gray-400 w-24">{label}</label>
      <input
        type="range"
        min="1"
        max="5"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-orange-500"
      />
      <span className="text-sm font-bold text-orange-400 w-8 text-center">{value}</span>
    </div>
  )
}
