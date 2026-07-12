'use client'

import { useSimulationStore } from '@/lib/stores/simulation-store'

export default function PlaybackControls() {
  const {
    episodes,
    currentEpisodeIndex,
    isPlaying,
    playbackSpeed,
    play,
    pause,
    nextEpisode,
    previousEpisode,
    jumpToEpisode,
    setPlaybackSpeed,
  } = useSimulationStore()

  const totalEpisodes = episodes.length - 1 // Subtract 1 for episode 0 (metadata)
  const currentEpisodeNumber = currentEpisodeIndex

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed)
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      {/* Episode Counter */}
      <div className="text-center mb-4">
        <div className="text-4xl font-bold text-orange-400 mb-2">
          Episode {currentEpisodeNumber}
        </div>
        <div className="text-gray-400">
          of {totalEpisodes} episodes
        </div>
      </div>

      {/* Episode Scrubber */}
      <div className="mb-6">
        <input
          type="range"
          min="1"
          max={totalEpisodes}
          value={currentEpisodeIndex}
          onChange={(e) => jumpToEpisode(parseInt(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-orange-500"
          style={{
            background: `linear-gradient(to right, #f97316 0%, #f97316 ${((currentEpisodeIndex - 1) / (totalEpisodes - 1)) * 100}%, #4b5563 ${((currentEpisodeIndex - 1) / (totalEpisodes - 1)) * 100}%, #4b5563 100%)`,
          }}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Episode 1</span>
          <span>Episode {totalEpisodes}</span>
        </div>
      </div>

      {/* Playback Buttons */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={previousEpisode}
          disabled={currentEpisodeIndex <= 1}
          className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold p-4 rounded-lg transition-colors"
        >
          ⏮️
        </button>

        <button
          onClick={isPlaying ? pause : play}
          className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 py-4 rounded-lg transition-colors text-xl"
        >
          {isPlaying ? '⏸️ Pause' : '▶️ Play'}
        </button>

        <button
          onClick={nextEpisode}
          disabled={currentEpisodeIndex >= totalEpisodes}
          className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold p-4 rounded-lg transition-colors"
        >
          ⏭️
        </button>
      </div>

      {/* Speed Control */}
      <div className="flex items-center justify-center gap-4">
        <span className="text-gray-400 text-sm">Speed:</span>
        <div className="flex gap-2">
          {[
            { label: '0.5x', value: 4000 },
            { label: '1x', value: 2000 },
            { label: '2x', value: 1000 },
            { label: '4x', value: 500 },
          ].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => handleSpeedChange(value)}
              className={`px-3 py-1 rounded transition-colors ${
                playbackSpeed === value
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
