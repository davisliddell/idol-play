import PlayerCard from './PlayerCard'

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

const TRIBE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Dakal': { bg: 'bg-red-900', text: 'text-red-400', border: 'border-red-500' },
  'Sele': { bg: 'bg-blue-900', text: 'text-blue-400', border: 'border-blue-500' },
  'Yara': { bg: 'bg-green-900', text: 'text-green-400', border: 'border-green-500' },
  'Koru': { bg: 'bg-purple-900', text: 'text-purple-400', border: 'border-purple-500' },
  'merged': { bg: 'bg-purple-900', text: 'text-purple-400', border: 'border-purple-500' },
  'default': { bg: 'bg-gray-900', text: 'text-gray-400', border: 'border-gray-500' },
}

export default function TribeDisplay({ tribeName, players, isImmune = false }: TribeDisplayProps) {
  const colors = TRIBE_COLORS[tribeName] || TRIBE_COLORS['default']

  return (
    <div className={`${colors.bg} rounded-lg p-4 border-2 ${colors.border}`}>
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
