'use client'

import { useMemo } from 'react'
import { useSimulationStore } from '@/lib/stores/simulation-store'
import { deriveCast, type CastMember } from '@/lib/cast'
import { tribeColor } from '@/lib/tribe-colors'

function Chip({ member, dot }: { member: CastMember; dot?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-gray-700 rounded-full pl-2 pr-2.5 py-1 text-sm">
      {dot && <span className={`w-2 h-2 rounded-full ${dot}`} />}
      <span className="text-gray-100">{member.name}</span>
      {member.immune && <span title="Has immunity">🛡️</span>}
      {member.hasIdol && <span title="Holds a hidden immunity idol">🗿</span>}
    </span>
  )
}

export default function CastPanel() {
  const { episodes, currentEpisodeIndex } = useSimulationStore()

  const cast = useMemo(
    () => (episodes.length ? deriveCast(episodes, currentEpisodeIndex) : null),
    [episodes, currentEpisodeIndex]
  )

  if (!cast) return null

  const active = cast.members.filter(m => m.state === 'active' || m.state === 'winner')
  const jury = cast.members.filter(m => m.state === 'jury')
  const out = cast.members.filter(m => m.state === 'out')

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold flex items-center gap-2">
          🧭 Who&apos;s Left
          <span className="text-sm font-normal text-gray-400">
            {cast.activeCount} still in{cast.merged ? ` · jury of ${cast.juryCount}` : ''}
          </span>
        </h3>
      </div>

      {/* Still in the game, grouped by tribe */}
      <div className="space-y-3">
        {cast.tribes.map((tribe) => {
          const members = active.filter(m => m.tribe === tribe)
          if (!members.length) return null
          const dot = tribeColor(tribe).dot
          return (
            <div key={tribe}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {cast.merged ? 'Merged' : tribe} · {members.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {members.map(m => (
                  <Chip key={m.first} member={m} dot={dot} />
                ))}
              </div>
            </div>
          )
        })}
        {/* Active players whose tribe couldn't be determined (rare) */}
        {active.some(m => !m.tribe) && (
          <div className="flex flex-wrap gap-1.5">
            {active.filter(m => !m.tribe).map(m => (
              <Chip key={m.first} member={m} />
            ))}
          </div>
        )}
      </div>

      {/* Jury */}
      {jury.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-700">
          <div className="text-xs font-semibold uppercase tracking-wide text-yellow-500/80 mb-1.5">
            ⚖️ Jury · {jury.length}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {jury.map(m => (
              <span
                key={m.first}
                className="inline-flex items-center gap-1 bg-yellow-900/30 border border-yellow-700/40 rounded-full px-2.5 py-1 text-sm text-yellow-200/90"
              >
                {m.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Voted out (pre-jury) */}
      {out.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-700">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
            🔥 Voted Out · {out.length}
          </div>
          <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-gray-500">
            {out
              .sort((a, b) => (a.elimEpisode || 0) - (b.elimEpisode || 0))
              .map(m => (
                <span key={m.first} className="line-through decoration-gray-600">
                  {m.name}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
