// Derives the cumulative state of the whole cast "as of" a given episode, so the
// viewer can show a persistent roster: who's on what tribe, who's out, who's on
// the jury, who holds an idol. Players are keyed by first name (the elimination
// events only carry first names; the sample casts have unique first names).

export interface CastMember {
  first: string // first-name key
  name: string // best-effort display name ("First Last")
  tribe: string | null
  state: 'active' | 'jury' | 'out' | 'winner'
  elimEpisode?: number
  hasIdol: boolean
  immune: boolean
}

export interface CastState {
  members: CastMember[]
  tribes: string[] // tribe names present among active members, in a stable order
  merged: boolean
  activeCount: number
  juryCount: number
}

interface Ev {
  eventType: string
  playerVotedFor?: string[]
  playerVotedOut?: string[]
  winner?: string
  loser?: string
  votesToRead?: string[]
  voteList?: Record<string, string>
  idolsPlayed?: Record<string, string>
  playerFound?: string | { firstName?: string; lastName?: string }
}
interface Episode {
  eventsInEpisode?: Ev[]
  currentTribes?: Record<string, string[]>
}

const firstOf = (s: string) => (s || '').split('|')[0]
const findEv = (evs: Ev[], t: string) => evs.find(e => e.eventType === t)

// The player actually voted out at a council (accounting for revote/rocks).
function councilBoot(evs: Ev[]): string | undefined {
  const rocks = findEv(evs, 'ROCKS')
  if (rocks?.playerVotedOut?.length) return firstOf(rocks.playerVotedOut[0])
  const revote = findEv(evs, 'TRIBAL_REVOTE')
  if (revote?.playerVotedFor?.length === 1) return firstOf(revote.playerVotedFor[0])
  const council = findEv(evs, 'TRIBAL_COUNCIL')
  if (council?.playerVotedFor?.length === 1) return firstOf(council.playerVotedFor[0])
  return undefined
}

export function deriveCast(episodes: Episode[], uptoIndex: number): CastState {
  const fullName = new Map<string, string>()
  const tribeByEp: Record<string, string>[] = []
  const allFirst = new Set<string>()
  let mergeIdx = Infinity

  // Pass over ALL episodes: build the full roster, per-episode tribe map, merge point.
  // The roster must include players only ever seen via an elimination (e.g. the
  // first boot never lands in currentTribes, which is recorded post-elimination).
  episodes.forEach((e, i) => {
    const evs = e.eventsInEpisode || []
    const map: Record<string, string> = {}
    for (const [tribe, members] of Object.entries(e.currentTribes || {})) {
      for (const m of members) {
        const f = firstOf(m)
        fullName.set(f, m.replace('|', ' '))
        allFirst.add(f)
        map[f] = tribe
      }
    }
    tribeByEp[i] = map
    if (evs.some(x => x.eventType === 'MERGE')) mergeIdx = Math.min(mergeIdx, i)

    const boot = councilBoot(evs)
    if (boot) allFirst.add(boot)
    const fireLoser = findEv(evs, 'FIREMAKING')?.loser
    if (fireLoser) allFirst.add(firstOf(fireLoser))
    for (const idol of evs.filter(x => x.eventType === 'IDOL_FOUND')) {
      const pf = idol.playerFound
      if (typeof pf === 'string') {
        allFirst.add(firstOf(pf))
        fullName.set(firstOf(pf), pf.replace('|', ' '))
      } else if (pf?.firstName) {
        allFirst.add(pf.firstName)
      }
    }
  })

  // Walk episodes 1..uptoIndex to accumulate eliminations, idols, immunity.
  const elimEpisode = new Map<string, number>()
  const idolsFound = new Map<string, number>()
  let immuneFirst: string | null = null

  for (let i = 1; i <= uptoIndex && i < episodes.length; i++) {
    const evs = episodes[i].eventsInEpisode || []

    for (const ev of evs) {
      if (ev.eventType === 'IDOL_FOUND') {
        const pf = ev.playerFound
        const f =
          typeof pf === 'object' && pf?.firstName ? pf.firstName : firstOf(String(pf || ''))
        if (f) {
          idolsFound.set(f, (idolsFound.get(f) || 0) + 1)
          allFirst.add(f)
        }
      }
      if (ev.eventType === 'TRIBAL_COUNCIL' && ev.idolsPlayed) {
        // an idol played is consumed
        for (const player of Object.keys(ev.idolsPlayed)) {
          const f = firstOf(player)
          idolsFound.set(f, (idolsFound.get(f) || 0) - 1)
        }
      }
    }

    const boot = councilBoot(evs)
    if (boot && !elimEpisode.has(boot)) elimEpisode.set(boot, i)

    const fire = findEv(evs, 'FIREMAKING')
    if (fire?.loser) {
      const f = firstOf(fire.loser)
      if (!elimEpisode.has(f)) elimEpisode.set(f, i)
    }

    // Immunity is per-episode (only the currently viewed one matters).
    if (i === uptoIndex) {
      const indiv = findEv(evs, 'INDIVIDUAL_CHALLENGE')
      if (indiv?.winner) immuneFirst = firstOf(indiv.winner)
    }
  }

  // Infer a tribe for players who never land in a currentTribes snapshot (e.g. the
  // very first boot): everyone at a given pre-merge council shares one tribe, so
  // borrow it from a co-voter whose tribe we do know.
  const knownTribe = (f: string): string | undefined => {
    for (const map of tribeByEp) if (map[f]) return map[f]
    return undefined
  }
  const inferred = new Map<string, string>()
  episodes.forEach(e => {
    const council = (e.eventsInEpisode || []).find(x => x.eventType === 'TRIBAL_COUNCIL')
    const voters = council?.voteList ? Object.keys(council.voteList).map(firstOf) : []
    const tribe = voters.map(knownTribe).find(Boolean)
    if (tribe) for (const v of voters) if (!knownTribe(v)) inferred.set(v, tribe)
  })

  // Tribe label for an active player: use the viewed episode, else the nearest one.
  const tribeAt = (f: string): string | null => {
    for (let d = 0; d < episodes.length; d++) {
      const lo = tribeByEp[uptoIndex - d]?.[f]
      if (lo) return lo
      const hi = tribeByEp[uptoIndex + d]?.[f]
      if (hi) return hi
    }
    return inferred.get(f) ?? null
  }

  // Show the state as of the START of the viewed episode: whoever is voted out
  // *in* this episode stays "still in" until you advance past it — otherwise the
  // roster reads one episode ahead of what you're watching. This holds for the
  // finale too, so the final five reads as five (the winner is revealed in the
  // episode content, not by pre-collapsing the roster).
  const cutoff = uptoIndex - 1

  const merged = mergeIdx <= cutoff
  const members: CastMember[] = [...allFirst].map(f => {
    const elim = elimEpisode.get(f)
    let state: CastMember['state'] = 'active'
    if (elim !== undefined && elim <= cutoff) {
      state = elim >= mergeIdx ? 'jury' : 'out'
    }
    return {
      first: f,
      name: fullName.get(f) || f,
      tribe: state === 'active' ? tribeAt(f) : null,
      state,
      elimEpisode: elim,
      hasIdol: state !== 'out' && state !== 'jury' && (idolsFound.get(f) || 0) > 0,
      immune: state === 'active' && f === immuneFirst,
    }
  })

  // Sort: active first (by tribe, then name), then jury, then out; winner on top.
  const rank = (m: CastMember) =>
    m.state === 'winner' ? 0 : m.state === 'active' ? 1 : m.state === 'jury' ? 2 : 3
  members.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (a.tribe || '').localeCompare(b.tribe || '') ||
      a.name.localeCompare(b.name)
  )

  const activeMembers = members.filter(m => m.state === 'active' || m.state === 'winner')
  const tribes = [...new Set(activeMembers.map(m => m.tribe).filter(Boolean) as string[])]

  return {
    members,
    tribes,
    merged,
    activeCount: activeMembers.length,
    juryCount: members.filter(m => m.state === 'jury').length,
  }
}
