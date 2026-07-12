import { promises as fs } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const dataDir = path.join(process.cwd(), 'data', 'simulations')

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(dataDir, { recursive: true })
  } catch {
    // Directory already exists
  }
}

export interface SimulationSummary {
  id: string
  createdAt: number
  winner: string
  totalEpisodes: number
}

interface Episode {
  eventsInEpisode?: Array<{
    eventType: string
    playerVotedFor?: string[]
    [key: string]: unknown
  }>
  [key: string]: unknown
}

export interface SimulationData extends SimulationSummary {
  episodes: Episode[]
}

export async function saveSimulation(episodes: Episode[]): Promise<SimulationSummary> {
  await ensureDataDir()

  const id = uuidv4()
  const createdAt = Date.now()

  // Extract winner from final episode events
  let winner = 'Unknown'
  for (const episode of episodes) {
    const events = episode.eventsInEpisode || []
    const finalTribal = events.find((e) => e.eventType === 'FINAL_TRIBAL')
    if (finalTribal && finalTribal.playerVotedFor && finalTribal.playerVotedFor.length > 0) {
      winner = finalTribal.playerVotedFor[0].replace('|', ' ')
      break
    }
  }

  const data: SimulationData = {
    id,
    createdAt,
    winner,
    totalEpisodes: episodes.length,
    episodes,
  }

  const filePath = path.join(dataDir, `${id}.json`)
  await fs.writeFile(filePath, JSON.stringify(data, null, 2))

  return {
    id,
    createdAt,
    winner,
    totalEpisodes: episodes.length,
  }
}

export async function getSimulation(id: string): Promise<SimulationData | null> {
  try {
    const filePath = path.join(dataDir, `${id}.json`)
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

export async function getSimulationSummary(id: string): Promise<SimulationSummary | null> {
  const simulation = await getSimulation(id)
  if (!simulation) return null

  return {
    id: simulation.id,
    createdAt: simulation.createdAt,
    winner: simulation.winner,
    totalEpisodes: simulation.totalEpisodes,
  }
}

export async function getEpisode(simulationId: string, episodeNumber: number): Promise<Episode | null> {
  const simulation = await getSimulation(simulationId)
  if (!simulation) return null

  if (episodeNumber < 0 || episodeNumber >= simulation.episodes.length) {
    return null
  }

  return simulation.episodes[episodeNumber]
}

export async function getRecentSimulations(limit: number = 10): Promise<SimulationSummary[]> {
  await ensureDataDir()

  try {
    const files = await fs.readdir(dataDir)
    const jsonFiles = files.filter(f => f.endsWith('.json'))

    const simulations: SimulationData[] = []
    for (const file of jsonFiles) {
      try {
        const content = await fs.readFile(path.join(dataDir, file), 'utf-8')
        simulations.push(JSON.parse(content))
      } catch {
        // Skip invalid files
      }
    }

    simulations.sort((a, b) => b.createdAt - a.createdAt)

    return simulations.slice(0, limit).map(s => ({
      id: s.id,
      createdAt: s.createdAt,
      winner: s.winner,
      totalEpisodes: s.totalEpisodes,
    }))
  } catch {
    return []
  }
}
