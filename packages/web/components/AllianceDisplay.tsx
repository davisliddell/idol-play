interface AllianceGroup {
  members: string[]
  strength: number
}

interface AllianceDisplayProps {
  tribeName: string
  alliances: AllianceGroup[]
}

const ALLIANCE_COLORS = [
  { border: 'border-blue-500', bgOpacity: 'bg-blue-900 bg-opacity-30', text: 'text-blue-400', badge: 'bg-blue-600' },
  { border: 'border-purple-500', bgOpacity: 'bg-purple-900 bg-opacity-30', text: 'text-purple-400', badge: 'bg-purple-600' },
  { border: 'border-green-500', bgOpacity: 'bg-green-900 bg-opacity-30', text: 'text-green-400', badge: 'bg-green-600' },
  { border: 'border-yellow-500', bgOpacity: 'bg-yellow-900 bg-opacity-30', text: 'text-yellow-400', badge: 'bg-yellow-600' },
]

export default function AllianceDisplay({ tribeName, alliances }: AllianceDisplayProps) {
  if (alliances.length === 0) return null

  const totalMembers = alliances.reduce((sum, a) => sum + a.members.length, 0)

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
        {tribeName} Alliances
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {alliances.map((alliance, i) => {
          const colors = ALLIANCE_COLORS[i % ALLIANCE_COLORS.length]
          const isMajority = alliance.members.length > totalMembers / 2
          return (
            <div
              key={i}
              className={`rounded-lg p-3 border-2 ${colors.border} ${colors.bgOpacity}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-sm font-bold ${colors.text}`}>
                  Alliance {i + 1}
                </span>
                {isMajority && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge} text-white font-medium`}>
                    Majority
                  </span>
                )}
                <span className="text-xs text-gray-500 ml-auto">
                  {alliance.members.length} members
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {alliance.members.map((member, j) => (
                  <span
                    key={j}
                    className="text-xs bg-gray-700 rounded px-2 py-1 text-gray-200"
                  >
                    {member.replace('|', ' ')}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
