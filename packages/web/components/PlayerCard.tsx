interface PlayerCardProps {
  name: string
  tribe: string
  isImmune?: boolean
  hasIdol?: boolean
  isEliminated?: boolean
  compact?: boolean
}

const TRIBE_COLORS: Record<string, string> = {
  // Pre-swap tribes
  'Dakal': 'bg-red-600 border-red-500',
  'Sele': 'bg-blue-600 border-blue-500',
  // Post-swap tribes
  'Yara': 'bg-green-600 border-green-500',
  // Merged tribe
  'Koru': 'bg-purple-600 border-purple-500',
  'merged': 'bg-purple-600 border-purple-500',
  // Default
  'default': 'bg-gray-600 border-gray-500',
}

export default function PlayerCard({
  name,
  tribe,
  isImmune = false,
  hasIdol = false,
  isEliminated = false,
  compact = false
}: PlayerCardProps) {
  const tribeColor = TRIBE_COLORS[tribe] || TRIBE_COLORS['default']

  if (compact) {
    return (
      <div className={`relative rounded-lg p-2 border-2 ${tribeColor} ${isEliminated ? 'opacity-40 grayscale' : ''}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-white font-semibold text-sm truncate">{name}</span>
          <div className="flex items-center gap-1">
            {isImmune && <span className="text-yellow-400 text-lg">🛡️</span>}
            {hasIdol && <span className="text-yellow-400 text-lg">🗿</span>}
          </div>
        </div>
        {isEliminated && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
            <span className="text-2xl">❌</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`relative rounded-lg p-4 border-2 ${tribeColor} ${isEliminated ? 'opacity-40 grayscale' : ''} transition-all duration-300`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-white font-bold text-lg">{name}</h3>
          <p className="text-gray-200 text-sm">{tribe}</p>
        </div>
        <div className="flex gap-1">
          {isImmune && (
            <div className="relative group">
              <span className="text-2xl">🛡️</span>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Immune
              </div>
            </div>
          )}
          {hasIdol && (
            <div className="relative group">
              <span className="text-2xl">🗿</span>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Has Idol
              </div>
            </div>
          )}
        </div>
      </div>

      {isEliminated && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 rounded-lg">
          <div className="text-center">
            <div className="text-4xl mb-2">❌</div>
            <div className="text-white font-bold">VOTED OUT</div>
          </div>
        </div>
      )}
    </div>
  )
}
