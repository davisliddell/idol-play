// Client-side export helpers: trigger downloads and format simulation data
// as JSON or CSV for the results/viewer pages.

/** Trigger a browser download of arbitrary text content. */
export function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Download an object as pretty-printed JSON. */
export function downloadJSON(filename: string, data: unknown): void {
  downloadFile(filename, JSON.stringify(data, null, 2), 'application/json')
}

// Escape a single CSV cell per RFC 4180 (quote if it contains a comma,
// quote, or newline; double up embedded quotes).
function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Serialize a 2D array of rows to a CSV string. */
export function toCSV(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}

/** Download a 2D array of rows as a CSV file. */
export function downloadCSV(filename: string, rows: (string | number)[][]): void {
  downloadFile(filename, toCSV(rows), 'text/csv;charset=utf-8')
}

// --- Simulation-specific formatting ---

interface GameEvent {
  eventType: string
  [key: string]: unknown
}

interface Episode {
  episode?: number
  eventsInEpisode?: GameEvent[]
}

// Player names are stored as "First|Last" internally; display with a space.
function displayName(raw: unknown): string {
  return String(raw ?? '').replace('|', ' ')
}

/**
 * Build an episode-by-episode summary (the "boot order") suitable for CSV
 * export. Columns: episode, phase, immunity winner, idols found, eliminated.
 * Mirrors the elimination logic used by the EpisodeViewer.
 */
export function episodeSummaryRows(episodes: Episode[]): (string | number)[][] {
  const rows: (string | number)[][] = [
    ['Episode', 'Phase', 'Immunity Winner', 'Idols Found', 'Eliminated'],
  ]

  episodes.forEach((ep, i) => {
    // Episode 0 is metadata only.
    if (i === 0) return
    const events = ep.eventsInEpisode || []
    const find = (type: string) => events.find((e) => e.eventType === type)

    let phase = ''
    if (find('MERGE')) phase = 'Merge'
    else if (find('SWAP')) phase = 'Swap'
    else if (find('FINAL_TRIBAL')) phase = 'Finale'

    const tribeWin = find('TRIBE_CHALLENGE')?.tribeWinner
    const indivWin = find('INDIVIDUAL_CHALLENGE')?.winner
    const immunity = displayName(tribeWin ?? indivWin)

    const idols = events
      .filter((e) => e.eventType === 'IDOL_FOUND')
      .map((e) => displayName(e.playerFound))
      .join('; ')

    let eliminated = ''
    const rocks = find('ROCKS')
    const fire = find('FIREMAKING')
    const council = find('TRIBAL_COUNCIL')
    const revote = find('TRIBAL_REVOTE')
    if (rocks && Array.isArray(rocks.playerVotedOut) && rocks.playerVotedOut.length) {
      eliminated = displayName(rocks.playerVotedOut[0])
    } else if (fire) {
      eliminated = displayName(fire.loser)
    } else if (revote && Array.isArray(revote.playerVotedFor) && revote.playerVotedFor.length === 1) {
      eliminated = displayName(revote.playerVotedFor[0])
    } else if (council && Array.isArray(council.playerVotedFor) && council.playerVotedFor.length === 1) {
      eliminated = displayName(council.playerVotedFor[0])
    }

    rows.push([ep.episode ?? i, phase, immunity, idols, eliminated])
  })

  return rows
}

/**
 * Determine the winner of a simulation from its final tribal council votes.
 * Returns the display name, or null if no final tribal is present.
 */
export function findWinner(episodes: Episode[]): string | null {
  for (let i = episodes.length - 1; i >= 0; i--) {
    const finalTribal = (episodes[i].eventsInEpisode || []).find(
      (e) => e.eventType === 'FINAL_TRIBAL'
    )
    const votes = finalTribal?.votesToRead
    if (Array.isArray(votes) && votes.length) {
      const counts: Record<string, number> = {}
      for (const v of votes as string[]) counts[v] = (counts[v] || 0) + 1
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
      return top ? displayName(top[0]) : null
    }
  }
  return null
}
