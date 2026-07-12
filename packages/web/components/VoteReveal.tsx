'use client'

import { useState, useEffect } from 'react'

interface VoteRevealProps {
  votes: string[] // Array of names in the order they should be revealed
  voteDetails?: { voter: string; votedFor: string }[] // Optional voter info in same order
  idolsPlayed?: Record<string, string> // player|LastName -> playedFor|LastName
  onComplete?: () => void
  autoPlay?: boolean
  speed?: number // ms between reveals
}

export default function VoteReveal({
  votes,
  voteDetails,
  idolsPlayed,
  onComplete,
  autoPlay = true,
  speed = 1000
}: VoteRevealProps) {
  const [revealedCount, setRevealedCount] = useState(0)
  const [isRevealing, setIsRevealing] = useState(autoPlay)

  useEffect(() => {
    if (!isRevealing || revealedCount >= votes.length) {
      if (revealedCount >= votes.length && onComplete) {
        onComplete()
      }
      return
    }

    const timer = setTimeout(() => {
      setRevealedCount(prev => prev + 1)
    }, speed)

    return () => clearTimeout(timer)
  }, [isRevealing, revealedCount, votes.length, speed, onComplete])

  const toggleReveal = () => {
    if (revealedCount >= votes.length) {
      setRevealedCount(0)
      setIsRevealing(true)
    } else {
      setIsRevealing(!isRevealing)
    }
  }

  const skipToEnd = () => {
    setRevealedCount(votes.length)
    setIsRevealing(false)
  }

  // Players who had an idol played for them (matched by first name)
  const nullifiedPlayers = new Set(
    Object.values(idolsPlayed ?? {}).map(name => name.split('|')[0])
  )
  const isNullified = (name: string) => nullifiedPlayers.has(name)

  // Only count votes that aren't nullified
  const voteCounts: Record<string, number> = {}
  votes.slice(0, revealedCount).forEach(vote => {
    if (!isNullified(vote)) {
      voteCounts[vote] = (voteCounts[vote] || 0) + 1
    }
  })

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold">📜 Vote Reveal</h3>
        <div className="flex gap-2">
          <button
            onClick={toggleReveal}
            className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded transition-colors"
          >
            {revealedCount >= votes.length ? '🔄 Replay' : isRevealing ? '⏸️ Pause' : '▶️ Play'}
          </button>
          {revealedCount < votes.length && (
            <button
              onClick={skipToEnd}
              className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded transition-colors"
            >
              ⏭️ Skip
            </button>
          )}
        </div>
      </div>

      {/* Idol Play Banner */}
      {idolsPlayed && Object.keys(idolsPlayed).length > 0 ? (
        <div className="mb-4 bg-purple-900 bg-opacity-60 border border-purple-500 rounded-lg p-3 space-y-1">
          {Object.entries(idolsPlayed).map(([player, playedFor], i) => {
            const playerName = player.replace('|', ' ')
            const playedForName = playedFor.replace('|', ' ')
            const isSelf = player === playedFor
            return (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span>🗿</span>
                <span className="text-purple-300 font-semibold">{playerName}</span>
                <span className="text-gray-300">
                  played a Hidden Immunity Idol{isSelf ? '' : ` for ${playedForName}`} — votes against {isSelf ? 'them' : playedForName} do not count
                </span>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Vote Count Display */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-4">
          {Object.entries(voteCounts).sort((a, b) => b[1] - a[1]).map(([player, count]) => (
            <div key={player} className="bg-gray-700 rounded-lg px-4 py-2">
              <div className="text-orange-400 font-bold text-lg">{player}</div>
              <div className="text-gray-300 text-sm">{count} {count === 1 ? 'vote' : 'votes'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Vote Parchments */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {votes.map((vote, index) => {
          const revealed = index < revealedCount
          const nullified = revealed && isNullified(vote)
          return (
            <div
              key={index}
              className={`relative aspect-[3/4] rounded-lg transition-all duration-500 ${
                revealed
                  ? nullified
                    ? 'bg-gray-300 border-2 border-gray-400 scale-100 opacity-80'
                    : 'bg-amber-100 border-2 border-amber-600 scale-100 opacity-100'
                  : 'bg-gray-700 border-2 border-gray-600 scale-95 opacity-40'
              }`}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                {revealed ? (
                  <div className="text-center">
                    <div className={`font-bold text-lg break-words leading-tight ${nullified ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                      {vote}
                    </div>
                    {voteDetails?.[index] && (
                      <div className={`mt-1 text-xs break-words leading-tight ${nullified ? 'text-gray-400' : 'text-gray-600'}`}>
                        — {voteDetails[index].voter}
                      </div>
                    )}
                    {nullified && (
                      <div className="mt-2 text-red-500 text-xs font-bold uppercase tracking-wide">Does not count</div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 text-4xl">?</div>
                )}
              </div>
              {/* Nullified overlay X */}
              {nullified && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-red-400 text-5xl font-black opacity-30 select-none">✕</span>
                </div>
              )}
              {revealed && (
                <div className={`absolute top-1 right-1 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center ${nullified ? 'bg-gray-500' : 'bg-orange-600'}`}>
                  {index + 1}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Progress */}
      <div className="mt-4 text-center text-gray-400 text-sm">
        {revealedCount} / {votes.length} votes revealed
      </div>
    </div>
  )
}
