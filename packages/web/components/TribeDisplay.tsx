import PlayerCard from './PlayerCard'
import { tribeColor } from '@/lib/tribe-colors'

interface TribeDisplayProps {
  tribeName: string
  players: Array<{
    name: string
    isImmune?: boolean
    hasIdol?: boolean
    isEliminated?: boolean
  }>
  isImmune?: boolean
}

export default function TribeDisplay({ tribeName, players, isImmune = false }: TribeDisplayProps) {
  const colors = tribeColor(tribeName)

  return (
    <div className={`${colors.panelBg} rounded-lg p-4 border-2 ${colors.border}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-2xl font-bold ${colors.text}`}>
          {tribeName}
        </h2>
        {isImmune && (
          <div className="flex items-center gap-2 bg-yellow-500 bg-opacity-20 px-3 py-1 rounded-full border border-yellow-500">
            <span className="text-xl">🛡️</span>
            <span className="text-yellow-400 font-bold text-sm">IMMUNE</span>
          </div>
        )}
      </div>

      <div className="text-gray-400 text-sm mb-3">
        {players.length} {players.length === 1 ? 'member' : 'members'}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {players.map((player, index) => (
          <PlayerCard
            key={index}
            name={player.name}
            tribe={tribeName}
            isImmune={player.isImmune}
            hasIdol={player.hasIdol}
            isEliminated={player.isEliminated}
            compact
          />
        ))}
      </div>
    </div>
  )
}
