'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSimulationStore } from '@/lib/stores/simulation-store'
import TribeDisplay from './TribeDisplay'
import VoteReveal from './VoteReveal'
import AllianceDisplay from './AllianceDisplay'

interface GameEvent {
  eventType: string
  [key: string]: unknown
}

export default function EpisodeViewer() {
  const { episodes, currentEpisodeIndex, isPlaying, playbackSpeed, nextEpisode } = useSimulationStore()

  // Speed of the vote-card reveal, scaled by the playback speed setting
  // (at 1x/2000ms this is ~800ms, matching the original hand-picked value).
  const revealSpeed = Math.max(250, Math.round(playbackSpeed * 0.4))

  // How many vote cards this episode reveals, so playback can wait for them.
  const currentEvents = ((episodes[currentEpisodeIndex]?.eventsInEpisode || []) as GameEvent[])
  const voteCards = ['TRIBAL_COUNCIL', 'TRIBAL_REVOTE', 'FINAL_TRIBAL'].reduce((sum, type) => {
    const vtr = currentEvents.find((e) => e.eventType === type)?.votesToRead
    return sum + (Array.isArray(vtr) ? vtr.length : 0)
  }, 0)

  // Auto-advance when playing. On episodes with a vote reveal, hold long enough
  // for every card to flip (plus a beat to read the result) before advancing —
  // otherwise the tribal council flew by before you could watch the votes.
  useEffect(() => {
    if (!isPlaying) return

    const dwell =
      voteCards > 0
        ? voteCards * revealSpeed + Math.round(playbackSpeed * 0.75)
        : playbackSpeed

    const timer = setTimeout(() => {
      nextEpisode()
    }, dwell)

    return () => clearTimeout(timer)
  }, [isPlaying, currentEpisodeIndex, playbackSpeed, revealSpeed, voteCards, nextEpisode])

  if (episodes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No simulation data loaded
      </div>
    )
  }

  const currentEpisode = episodes[currentEpisodeIndex]
  if (!currentEpisode) {
    return (
      <div className="text-center py-12 text-gray-400">
        Invalid episode
      </div>
    )
  }

  const events = (currentEpisode.eventsInEpisode || []) as GameEvent[]
  const currentTribes = currentEpisode.currentTribes || {}
  const currentAlliances = (currentEpisode.currentAlliances || []) as {
    tribeName: string
    alliances: { members: string[]; strength: number }[]
  }[]

  // Parse tribe data
  const tribes = Object.entries(currentTribes).map(([tribeName, players]) => ({
    name: tribeName,
    players: Array.isArray(players) ? players.map((p: string) => ({
      name: p.replace('|', ' '),
      isImmune: false,
      hasIdol: false,
      isEliminated: false,
    })) : []
  }))

  // Find key events in this episode
  const swapEvent: GameEvent | undefined = events.find((e) => e.eventType === 'SWAP')
  const mergeEvent: GameEvent | undefined = events.find((e) => e.eventType === 'MERGE')
  const idolEvents: GameEvent[] = events.filter((e) => e.eventType === 'IDOL_FOUND')
  const tribalChallengeEvent: GameEvent | undefined = events.find((e) => e.eventType === 'TRIBE_CHALLENGE')
  const individualChallengeEvent: GameEvent | undefined = events.find((e) => e.eventType === 'INDIVIDUAL_CHALLENGE')
  const tribalCouncilEvent: GameEvent | undefined = events.find((e) => e.eventType === 'TRIBAL_COUNCIL')
  const tribalRevoteEvent: GameEvent | undefined = events.find((e) => e.eventType === 'TRIBAL_REVOTE')
  const firemakingEvent: GameEvent | undefined = events.find((e) => e.eventType === 'FIREMAKING')
  const finalTribalEvent: GameEvent | undefined = events.find((e) => e.eventType === 'FINAL_TRIBAL')
  const rocksEvent: GameEvent | undefined = events.find((e) => e.eventType === 'ROCKS')
  let winner = null
  if (finalTribalEvent) {
    // Find who got the most votes from votesToRead (actual jury votes)
    const voteCounts: Record<string, number> = {}
    const votesToRead = (finalTribalEvent.votesToRead as string[]) || []
    votesToRead.forEach((player: string) => {
      voteCounts[player] = (voteCounts[player] || 0) + 1
    })
    const winnerName = Object.entries(voteCounts).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0]
    if (winnerName) {
      winner = {
        name: winnerName.replace('|', ' '),
        votes: voteCounts[winnerName]
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Phase Indicator */}
      {(swapEvent || mergeEvent) ? (
        <motion.div
          key={`phase-${currentEpisodeIndex}`}
          initial={{ opacity: 0, scale: 0.9, y: -12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          className="bg-gradient-to-r from-orange-600 to-red-600 rounded-lg p-6 text-center"
        >
          <motion.div
            className="text-4xl mb-2"
            animate={{ scale: [1, 1.25, 1] }}
            transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.6 }}
          >
            {mergeEvent ? '🔥' : '🔄'}
          </motion.div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {mergeEvent ? 'THE MERGE!' : 'TRIBE SWAP!'}
          </h2>
          <p className="text-gray-100">
            {mergeEvent ? 'Players merge into one tribe' : 'Players are shuffled into new tribes'}
          </p>
        </motion.div>
      ) : null}

      {/* Idols Found */}
      {idolEvents.length > 0 ? (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="text-3xl">🗿</span>
            Hidden Immunity Idol{idolEvents.length > 1 ? 's' : ''} Found
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {idolEvents.map((idol, i: number) => {
              const playerFound = idol.playerFound as { firstName?: string; lastName?: string } | string | undefined
              const playerName = typeof playerFound === 'object' && playerFound?.firstName
                ? `${playerFound.firstName} ${playerFound.lastName || ''}`
                : String(playerFound || 'Unknown').replace('|', ' ')
              return (
                <div key={i} className="bg-gray-700 rounded-lg p-4 flex items-center gap-3">
                  <span className="text-3xl">🗿</span>
                  <div>
                    <div className="text-orange-400 font-bold">{playerName}</div>
                    <div className="text-gray-400 text-sm">Found an idol</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* Tribal Challenge */}
      {tribalChallengeEvent ? (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="text-3xl">💪</span>
            Tribal Immunity Challenge
          </h3>
          <div className="bg-green-900 bg-opacity-50 border-2 border-green-500 rounded-lg p-4">
            <div className="text-center">
              <div className="text-4xl mb-2">🛡️</div>
              <div className="text-2xl font-bold text-green-400 mb-1">
                {String(tribalChallengeEvent.tribeWinner)} Wins Immunity!
              </div>
              <div className="text-gray-300">Safe from Tribal Council</div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Individual Challenge */}
      {individualChallengeEvent ? (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="text-3xl">🏆</span>
            Individual Immunity Challenge
          </h3>
          <div className="bg-blue-900 bg-opacity-50 border-2 border-blue-500 rounded-lg p-4">
            <div className="text-center">
              <div className="text-4xl mb-2">🛡️</div>
              <div className="text-2xl font-bold text-blue-400 mb-1">
                {String(individualChallengeEvent.winner || '').replace('|', ' ')} Wins Immunity!
              </div>
              <div className="text-gray-300">Safe at Tribal Council</div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Current Tribes */}
      {tribes.length > 0 && !finalTribalEvent ? (
        <div>
          <h3 className="text-2xl font-bold mb-4">
            {tribes.length === 1 ? 'Merged Tribe' : 'Current Tribes'}
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {tribes.map((tribe, index) => (
              <TribeDisplay
                key={index}
                tribeName={tribe.name}
                players={tribe.players}
                isImmune={String(tribalChallengeEvent?.tribeWinner || '') === tribe.name}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* Alliance Visualization */}
      {currentAlliances.length > 0 && !finalTribalEvent ? (
        <div>
          <h3 className="text-2xl font-bold mb-4">Current Alliances</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {currentAlliances.map((tribeAlliances, index) => (
              <AllianceDisplay
                key={index}
                tribeName={tribeAlliances.tribeName}
                alliances={tribeAlliances.alliances}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* Tribal Council */}
      {tribalCouncilEvent ? (
        <div>
          <h3 className="text-3xl font-bold mb-4 flex items-center gap-2">
            <span className="text-4xl">🔥</span>
            Tribal Council
          </h3>
          {tribalCouncilEvent.votesToRead && Array.isArray(tribalCouncilEvent.votesToRead) && tribalCouncilEvent.votesToRead.length > 0 ? (
            <VoteReveal
              key={`tribal-${currentEpisodeIndex}`}
              votes={tribalCouncilEvent.votesToRead as string[]}
              voteDetails={tribalCouncilEvent.voteDetails as { voter: string; votedFor: string }[] | undefined}
              idolsPlayed={tribalCouncilEvent.idolsPlayed as Record<string, string> | undefined}
              autoPlay
              speed={revealSpeed}
            />
          ) : null}

          {/* Idols Played */}
          {tribalCouncilEvent.idolsPlayed && typeof tribalCouncilEvent.idolsPlayed === 'object' && Object.keys(tribalCouncilEvent.idolsPlayed as object).length > 0 ? (
            <div className="mt-4 bg-purple-900 bg-opacity-50 border-2 border-purple-500 rounded-lg p-4">
              <h4 className="text-xl font-bold mb-3 flex items-center gap-2">
                <span className="text-2xl">🗿</span>
                Idol{Object.keys(tribalCouncilEvent.idolsPlayed as object).length > 1 ? 's' : ''} Played!
              </h4>
              <div className="space-y-2">
                {Object.entries(tribalCouncilEvent.idolsPlayed as Record<string, string>).map(([player, playedFor], i) => (
                  <div key={i} className="bg-gray-800 rounded p-3 flex items-center gap-3">
                    <span className="text-2xl">🗿</span>
                    <div>
                      <span className="text-purple-400 font-bold">{player.replace('|', ' ')}</span>
                      <span className="text-gray-400"> played an idol for </span>
                      <span className="text-purple-400 font-bold">{playedFor.replace('|', ' ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Eliminated Player */}
          {tribalCouncilEvent.playerVotedFor && String(tribalCouncilEvent.playerVotedFor).length > 0 && !String(tribalCouncilEvent.playerVotedFor).includes(',') ? (
            <div className="mt-4 bg-red-900 bg-opacity-50 border-2 border-red-500 rounded-lg p-6 text-center">
              <div className="text-5xl mb-3">🔥</div>
              <div className="text-3xl font-bold text-red-400 mb-2">
                {Array.isArray(tribalCouncilEvent.playerVotedFor)
                  ? String(tribalCouncilEvent.playerVotedFor[0] || '').replace('|', ' ')
                  : String(tribalCouncilEvent.playerVotedFor || '').replace('|', ' ')}
              </div>
              <div className="text-xl text-gray-300">
                The tribe has spoken
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Revote */}
      {tribalRevoteEvent && tribalRevoteEvent.votesToRead && Array.isArray(tribalRevoteEvent.votesToRead) ? (
        <div>
          <h3 className="text-3xl font-bold mb-4 flex items-center gap-2">
            <span className="text-4xl">🔄</span>
            Revote
          </h3>
          <VoteReveal
            key={`revote-${currentEpisodeIndex}`}
            votes={tribalRevoteEvent.votesToRead as string[]}
            voteDetails={tribalRevoteEvent.voteDetails as { voter: string; votedFor: string }[] | undefined}
            autoPlay
            speed={revealSpeed}
          />
        </div>
      ) : null}

      {/* Rocks */}
      {rocksEvent ? (
        <div className="bg-gray-900 border-2 border-gray-500 rounded-lg p-6 text-center">
          <div className="text-5xl mb-3">🪨</div>
          <h3 className="text-3xl font-bold mb-4">Drawing Rocks!</h3>
          {rocksEvent.playerVotedOut && Array.isArray(rocksEvent.playerVotedOut) && rocksEvent.playerVotedOut.length > 0 ? (
            <div className="text-2xl text-red-400 font-bold">
              {String(rocksEvent.playerVotedOut[0] || '').replace('|', ' ')} drew the wrong rock
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Fire-Making */}
      {firemakingEvent ? (
        <div className="bg-gradient-to-br from-orange-900 to-red-900 rounded-lg p-6 border-2 border-orange-500">
          <h3 className="text-3xl font-bold mb-6 flex items-center justify-center gap-2">
            <span className="text-4xl">🔥</span>
            Fire-Making Challenge
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-green-900 bg-opacity-50 border-2 border-green-500 rounded-lg p-6 text-center">
              <div className="text-4xl mb-2">✅</div>
              <div className="text-sm text-gray-400 mb-1">Winner</div>
              <div className="text-2xl font-bold text-green-400">
                {String(firemakingEvent.winner || '').replace('|', ' ')}
              </div>
              <div className="text-gray-300 mt-2">Advances to Final 3</div>
            </div>
            <div className="bg-red-900 bg-opacity-50 border-2 border-red-500 rounded-lg p-6 text-center">
              <div className="text-4xl mb-2">❌</div>
              <div className="text-sm text-gray-400 mb-1">4th Place</div>
              <div className="text-2xl font-bold text-red-400">
                {String(firemakingEvent.loser || '').replace('|', ' ')}
              </div>
              <div className="text-gray-300 mt-2">Eliminated</div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Final Tribal Council */}
      {finalTribalEvent && finalTribalEvent.votesToRead && Array.isArray(finalTribalEvent.votesToRead) ? (
        <div>
          <h3 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
            <span className="text-5xl">⚖️</span>
            Final Tribal Council
          </h3>
          <p className="text-center text-xl text-gray-300 mb-6">The Jury Votes for a Winner</p>
          <VoteReveal
            key={`final-${currentEpisodeIndex}`}
            votes={finalTribalEvent.votesToRead as string[]}
            voteDetails={finalTribalEvent.voteDetails as { voter: string; votedFor: string }[] | undefined}
            autoPlay
            speed={revealSpeed}
          />
        </div>
      ) : null}

      {/* Winner Announcement - Show after Final Tribal */}
      {winner ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 16, delay: 0.2 }}
          className="bg-gradient-to-br from-yellow-600 to-orange-600 rounded-lg p-8 text-center border-4 border-yellow-400"
        >
          <motion.div
            className="text-6xl mb-4"
            animate={{ rotate: [0, -12, 12, -8, 8, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 1.2, delay: 0.4 }}
          >
            👑
          </motion.div>
          <h2 className="text-5xl font-bold text-white mb-4">
            {winner.name}
          </h2>
          <p className="text-2xl text-white mb-2">
            SOLE SURVIVOR
          </p>
          <p className="text-xl text-yellow-100">
            Won with {winner.votes} jury {winner.votes === 1 ? 'vote' : 'votes'}
          </p>
        </motion.div>
      ) : null}
    </div>
  )
}
