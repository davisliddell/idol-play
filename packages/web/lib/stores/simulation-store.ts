import { create } from 'zustand'

interface SimulationState {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  episodes: any[]
  currentEpisodeIndex: number
  isPlaying: boolean
  playbackSpeed: number // milliseconds between episodes

  // Actions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setEpisodes: (episodes: any[]) => void
  setCurrentEpisode: (index: number) => void
  play: () => void
  pause: () => void
  nextEpisode: () => void
  previousEpisode: () => void
  jumpToEpisode: (index: number) => void
  setPlaybackSpeed: (speed: number) => void
  reset: () => void
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  episodes: [],
  currentEpisodeIndex: 1, // Start at episode 1 (episode 0 is metadata)
  isPlaying: false,
  playbackSpeed: 2000, // 2 seconds per episode by default

  setEpisodes: (episodes) => set({ episodes, currentEpisodeIndex: 1 }),

  setCurrentEpisode: (index) => set({ currentEpisodeIndex: index }),

  play: () => set({ isPlaying: true }),

  pause: () => set({ isPlaying: false }),

  nextEpisode: () => {
    const { currentEpisodeIndex, episodes } = get()
    if (currentEpisodeIndex < episodes.length - 1) {
      set({ currentEpisodeIndex: currentEpisodeIndex + 1 })
    } else {
      set({ isPlaying: false }) // Stop at the end
    }
  },

  previousEpisode: () => {
    const { currentEpisodeIndex } = get()
    if (currentEpisodeIndex > 1) {
      set({ currentEpisodeIndex: currentEpisodeIndex - 1 })
    }
  },

  jumpToEpisode: (index) => {
    const { episodes } = get()
    if (index >= 1 && index < episodes.length) {
      set({ currentEpisodeIndex: index, isPlaying: false })
    }
  },

  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  reset: () => set({
    episodes: [],
    currentEpisodeIndex: 1,
    isPlaying: false,
    playbackSpeed: 2000
  }),
}))
