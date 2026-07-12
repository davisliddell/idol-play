# Architecture Documentation

## Refactored Architecture (Phase 1 + 2)

This document describes the clean, event-driven architecture implemented in Phase 1 and 2 of the refactor.

### Key Improvements

1. **✅ No More Global State** - Instance-based architecture enables parallel simulations
2. **✅ Event-Driven** - Decoupled reporting from game logic
3. **✅ Dependency Injection** - GameEngine coordinates loosely-coupled systems
4. **✅ Configuration Extraction** - All magic numbers in one place
5. **✅ System Separation** - Clear boundaries between concerns

---

## Directory Structure

```
lib/simulator/
├── config/
│   └── game-constants.ts      # All magic numbers and formulas
├── engine/
│   ├── game-engine.ts          # Main orchestrator (DI container)
│   ├── game-events.ts          # Type-safe event definitions
│   └── report-service.ts       # Instance-based episode reporting
├── systems/
│   ├── challenge-system.ts     # Challenge logic (tribal, individual, fire)
│   └── idol-system.ts          # Idol discovery and play logic
├── models/                     # Data models (Player, Tribe, etc.)
└── data-parser.ts             # JSON parsing
```

---

## Core Components

### 1. GameEngine (`engine/game-engine.ts`)

**Purpose:** Main orchestrator that coordinates all systems using dependency injection.

**Key Features:**
- Creates isolated instances for each simulation (enables parallelization)
- Injects dependencies (event emitter, systems) into components
- Coordinates game flow: Pre-Swap → Post-Swap → Merge → FTC

**Usage:**
```typescript
const gameEngine = new GameEngine()
const episodes = gameEngine.runSimulation(players)

// Each instance is independent - safe to run in parallel!
const results = await Promise.all([
  new GameEngine().runSimulation(players1),
  new GameEngine().runSimulation(players2),
  new GameEngine().runSimulation(players3),
])
```

### 2. Event System (`engine/game-events.ts`)

**Purpose:** Type-safe event bus for decoupling game logic from side effects.

**Key Events:**
- `IDOL_FOUND` - Player discovers idol
- `TRIBAL_CHALLENGE` - Tribe wins/loses immunity
- `INDIVIDUAL_CHALLENGE` - Player wins immunity
- `TRIBAL_COUNCIL` - Voting and elimination
- `PLAYER_ELIMINATED` - Player leaves game
- `SWAP` / `MERGE` - Phase transitions
- `WINNER_DECLARED` - Game conclusion

**Benefits:**
- Report generation decoupled from game logic
- Easy to add analytics, UI updates, or logging
- Multiple subscribers per event

**Usage:**
```typescript
const eventEmitter = gameEngine.getEventEmitter()

// Subscribe to events
eventEmitter.on('IDOL_FOUND', (event) => {
  console.log(`${event.player.getFirstName()} found an idol!`)
})

eventEmitter.on('WINNER_DECLARED', (event) => {
  console.log(`Winner: ${event.winner.getFirstName()}`)
})

// Subscribe to all events
eventEmitter.onAny((event) => {
  analytics.track(event)
})
```

### 3. ReportService (`engine/report-service.ts`)

**Purpose:** Instance-based episode reporter that subscribes to game events.

**Key Changes from Original:**
- ❌ No more static methods
- ✅ Instance-based (one per simulation)
- ✅ Automatically subscribes to events
- ✅ No global state collision

**Old Way (Static - PROBLEMATIC):**
```typescript
// Static singleton - can't run parallel simulations!
Report.clear()
Report.addIdolFound(player)
const json = Report.getAllEpisodesJSON()
```

**New Way (Instance - SAFE):**
```typescript
// Each simulation gets its own ReportService
const gameEngine = new GameEngine()
// ReportService created internally, subscribed to events
const episodes = gameEngine.runSimulation(players)
```

### 4. Game Constants (`config/game-constants.ts`)

**Purpose:** Centralized configuration for all game parameters.

**Benefits:**
- Easy balance adjustments
- No more hunting for magic numbers
- Self-documenting formulas
- Type-safe configuration

**Configuration Categories:**
```typescript
GAME_CONFIG = {
  players: { initial: 20, preSwapEnd: 15, mergeStart: 13, ... },
  threatLevels: { preSwap: {...}, postSwap: {...}, ... },
  bonds: { formation: {...}, fluctuation: {...}, ... },
  alliances: { membershipThreshold: 2/3, ... },
  voting: { targetSelection: {...}, ... },
  idols: { discovery: {...}, play: {...}, ... },
  challenges: { ... },
  finalTribalCouncil: { voting: {...}, ... },
}
```

**Helper Functions:**
```typescript
// Clean, reusable calculations
GameHelpers.calculateThreatLevel(phase, challengeSkill, strategic, ...)
GameHelpers.calculateSelfIdolPlayChance(strategicLevel)
GameHelpers.isMajorityAlliance(allianceSize, tribeSize)
GameHelpers.determinePhase(playerCount)
```

### 5. System Architecture

#### ChallengeSystem (`systems/challenge-system.ts`)

**Purpose:** Handles all challenge mechanics

**Responsibilities:**
- Tribal immunity (2 or 3 tribes)
- Individual immunity
- Fire-making challenges
- Emits challenge outcome events

**Decoupled:** No direct Report calls - emits events instead

#### IdolSystem (`systems/idol-system.ts`)

**Purpose:** Manages idol discovery and strategic play

**Responsibilities:**
- Conduct idol hunts (weighted by strategic level)
- Evaluate idol play decisions (self-protection, ally protection)
- Apply configuration-based probabilities
- Emit idol events

**Decoupled:** No tribal logic embedded - pure idol mechanics

---

## Design Patterns

### 1. Dependency Injection
```typescript
class GameEngine {
  private challengeSystem: ChallengeSystem
  private idolSystem: IdolSystem

  constructor() {
    const eventEmitter = new GameEventEmitter()
    this.challengeSystem = new ChallengeSystem(eventEmitter)
    this.idolSystem = new IdolSystem(eventEmitter)
  }
}
```

### 2. Observer Pattern (Events)
```typescript
// Publisher (ChallengeSystem)
this.eventEmitter.emit(EventFactory.individualChallenge(winner))

// Subscriber (ReportService)
this.eventEmitter.on('INDIVIDUAL_CHALLENGE', (event) => {
  this.addIndividualChallenge(event.winner)
})
```

### 3. Factory Pattern (Event Creation)
```typescript
EventFactory.idolFound(player, tribe)
EventFactory.tribalChallenge(winner, loser)
EventFactory.winnerDeclared(winner, finalists, voteCount)
```

### 4. Strategy Pattern (Configuration)
```typescript
// Easy to swap algorithms by changing config
const threatLevel = GameHelpers.calculateThreatLevel(
  phase, // Different formula per phase
  challengeSkill,
  strategicLevel,
  visibility,
  socialLevel
)
```

---

## Migration Guide

### For Future System Extraction

The refactor demonstrates the pattern. To continue:

#### VotingSystem (TODO)
```typescript
class VotingSystem {
  constructor(private eventEmitter: GameEventEmitter) {}

  determineTargets(tribe: Tribe, phase: GamePhase): Player[] {
    // Extract from Tribe.targets()
  }

  conductVote(tribe: Tribe, targets: Player[]): VoteResult {
    // Extract from Tribe.timeToVote()
  }

  readVotes(tribe: Tribe, phase: GamePhase): Player {
    // Extract from Tribe.illReadTheVotes()
    // Emit TRIBAL_COUNCIL event
  }
}
```

#### AllianceSystem (TODO)
```typescript
class AllianceSystem {
  constructor(private eventEmitter: GameEventEmitter) {}

  formInitialAlliances(tribe: Tribe): Alliance[] {
    // Extract from Alliance.initialAlliances()
    // Emit ALLIANCE_FORMED events
  }

  formFormerTribeAlliances(tribe: Tribe): Alliance[] {
    // Extract from Alliance.formerTribes()
  }

  adjustAlliances(tribe: Tribe): void {
    // Extract from Tribe.adjustAlliances()
  }
}
```

### Model Simplification (TODO)

Goal: Models = Data, Systems = Logic

```typescript
// Simplified Player (data-focused)
class Player {
  // Properties
  readonly id: string
  readonly firstName: string
  readonly attributes: PlayerAttributes

  // Minimal computed properties
  getThreatLevel(phase: GamePhase): number {
    return GameHelpers.calculateThreatLevel(phase, this.attributes)
  }

  // NO complex game logic methods
}

// Complex logic moves to systems
class VotingSystem {
  findBiggestThreat(player: Player, candidates: Player[], phase: GamePhase) {
    // Logic extracted from Player.findBiggestThreat()
  }
}
```

---

## Testing Benefits

The new architecture is much easier to test:

```typescript
// Unit test a system in isolation
describe('ChallengeSystem', () => {
  it('should select winner based on skill probability', () => {
    const eventEmitter = new GameEventEmitter()
    const challengeSystem = new ChallengeSystem(eventEmitter)

    const tribe1 = createMockTribe({ avgSkill: 4 })
    const tribe2 = createMockTribe({ avgSkill: 2 })

    // Run challenge 1000 times, verify ~66% win rate for tribe1
  })
})

// Test event emissions
describe('ReportService', () => {
  it('should record idol found events', () => {
    const eventEmitter = new GameEventEmitter()
    const reportService = new ReportService(eventEmitter)

    eventEmitter.emit(EventFactory.idolFound(player, 'Dakal'))

    const episodes = JSON.parse(reportService.getAllEpisodesJSON())
    expect(episodes[1].eventsInEpisode).toContainEqual({
      eventType: 'IDOL_FOUND',
      playerFound: 'John|Doe'
    })
  })
})
```

---

## Performance Improvements

### Parallel Simulations

**Before (Static):**
```typescript
// Had to run sequentially - shared global state
for (let i = 0; i < 10; i++) {
  Report.clear() // Race condition!
  const result = Game.runGame(players)
}
```

**After (Instance):**
```typescript
// Run in parallel - each has own state!
const results = await Promise.all(
  Array.from({ length: 10 }, () =>
    new GameEngine().runSimulation(players)
  )
)
```

### Memory Management

**Before:** Global state never released

**After:** Instances garbage collected after simulation

---

## Configuration Tuning

Want to change game balance? Just edit `game-constants.ts`:

```typescript
// Make idols more likely
GAME_CONFIG.idols.discovery.baseChance = 0.8 // was 0.6

// Change threat calculations
GAME_CONFIG.threatLevels.latePostMerge.strategicLevel = 0.6 // was 0.4

// Adjust alliance membership threshold
GAME_CONFIG.alliances.membershipThreshold = 0.5 // was 2/3
```

No code changes needed - just configuration!

---

## Summary

### What Was Refactored ✅
- Event-driven architecture with type-safe events
- Instance-based ReportService (no global state)
- ChallengeSystem (decoupled from Tribe)
- IdolSystem (decoupled from Tribe)
- GameEngine with dependency injection
- Centralized configuration (game-constants.ts)
- Parallel simulation support

### What Remains (Same Pattern) ⏳
- VotingSystem extraction (can follow ChallengeSystem pattern)
- AllianceSystem extraction (can follow IdolSystem pattern)
- Model simplification (move logic to systems)
- Bond management system
- Immutable state management (optional advanced feature)

### Key Benefits 🎯
1. **Parallel simulations** - Run 100 sims concurrently
2. **Testability** - Isolated, mockable components
3. **Extensibility** - Add analytics, UI, logging via events
4. **Maintainability** - Clear separation of concerns
5. **Tunability** - Balance game in one file
6. **Type Safety** - Catch errors at compile time

The foundation is solid and the pattern is established. Continue extracting systems following the examples provided!
