# Idol Play - Survivor Simulator

A comprehensive Survivor game simulation platform built with Next.js 15, TypeScript, and Tailwind CSS. This project ports a complex Java-based simulation engine to a modern TypeScript monorepo with a rich web interface.

## Project Status

### ✅ Completed Core Components

#### Backend / Simulation Engine (100% Complete)
- ✅ **Player Model** - Complete player class with threat level calculations, bond management, and target finding
- ✅ **Bond Model** - Relationship strength system between players with fluctuation mechanics
- ✅ **Alliance Model** - Complex alliance formation algorithms for tribal gameplay
- ✅ **VotingBloc Model** - Post-merge voting bloc generation using compatibility algorithms
- ✅ **Tribe Model** - 682-line class handling tribal councils, voting, idols, and eliminations
- ✅ **MergedTribe Model** - Post-merge gameplay extending Tribe with jury management and FTC
- ✅ **Challenge System** - Probabilistic challenge simulations (tribal, individual, fire-making)
- ✅ **Report System** - Comprehensive episode tracking with event logging and vote ordering
- ✅ **Game Orchestration** - Complete game flow (preSwap → postSwap → merge)
- ✅ **DataParser** - JSON parsing and validation for player input
- ✅ **API Routes** - REST endpoints for running simulations

### 🚧 In Progress / TODO

#### Frontend Components
- ⏳ Player entry form (20 players with 7 attributes each)
- ⏳ Simulation viewer with episode playback
- ⏳ Results dashboard
- ⏳ Multiple simulation results page
- ⏳ React component library
- ⏳ State management (Zustand)
- ⏳ Tailwind styling and animations

## Quick Start

### Installation

```bash
cd idol-play
pnpm install
```

### Development

```bash
# Start the development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

The app will be available at `http://localhost:3000`.

### Running a Simulation via API

```bash
# Test the health endpoint
curl http://localhost:3000/api/health

# Run a simulation
curl -X POST http://localhost:3000/api/simulate \
  -H "Content-Type: application/json" \
  -d @sample-players.json
```

## Project Structure

```
idol-play/
├── package.json                 # Workspace root
├── packages/
│   └── web/                     # Next.js app
│       ├── app/                 # Next.js App Router
│       │   ├── page.tsx         # Home page
│       │   ├── layout.tsx       # Root layout
│       │   ├── globals.css      # Global styles
│       │   └── api/             # API routes
│       │       ├── simulate/    # Single simulation endpoint
│       │       ├── simulate-multiple/  # Multiple simulations
│       │       └── health/      # Health check
│       ├── lib/
│       │   └── simulator/       # Simulation engine (TypeScript port)
│       │       ├── models/      # Core game models
│       │       │   ├── player.ts
│       │       │   ├── bond.ts
│       │       │   ├── alliance.ts
│       │       │   ├── voting-bloc.ts
│       │       │   ├── tribe.ts
│       │       │   └── merged-tribe.ts
│       │       ├── challenge.ts # Challenge system
│       │       ├── report.ts    # Episode reporting
│       │       ├── game.ts      # Game orchestration
│       │       └── data-parser.ts  # JSON parsing
│       ├── components/          # React components
│       ├── tailwind.config.ts   # Tailwind configuration
│       ├── tsconfig.json        # TypeScript config
│       └── package.json         # Package dependencies
└── README.md
```

## Game Simulation Overview

### Phases

1. **Pre-Swap (20 → 15 players)**
   - 2 tribes (Dakal, Sele)
   - Tribal immunity challenges
   - Initial bond formation and alliances
   - Tribal councils with voting

2. **Post-Swap (15 → 13 players)**
   - 3 tribes (Dakal, Sele, Yara)
   - Former tribe alliances form
   - Three-tribe immunity challenges
   - Tribal councils continue

3. **Merge (13 → 3 players)**
   - Individual immunity challenges
   - Voting blocs replace alliances
   - Jury formation
   - Final 4 fire-making challenge
   - Final Tribal Council

### Key Features

- **Bond System**: Dynamic relationships between players that fluctuate over time
- **Alliance Formation**: Complex algorithms find common bonds to form alliances
- **Voting Blocs**: Post-merge gameplay uses compatibility-based voting groups
- **Threat Levels**: Phase-specific threat calculations (Pre-Swap, Post-Swap, Early/Late Post-Merge)
- **Idol Gameplay**: Hidden immunity idols with strategic play mechanics
- **Tie-Breaking**: Revotes, rock draws, and fire-making challenges
- **Episode Reporting**: Detailed JSON output of all game events

### Player Attributes

Each player has 7 attributes (scale 1-5):
- **firstName** / **lastName**: Player identification
- **challengeSkill**: Physical challenge ability
- **strategicLevel**: Strategic gameplay skill
- **visibility**: How much of a target they are
- **socialLevel**: Social bonding ability
- **articulation**: Final Tribal Council eloquence

## API Documentation

### POST /api/simulate

Run a single simulation with 20 players.

**Request:**
```json
{
  "players": [
    {
      "firstName": "John",
      "lastName": "Doe",
      "challengeSkill": 3,
      "strategicLevel": 4,
      "visibility": 3,
      "socialLevel": 4,
      "articulation": 3
    },
    // ... 19 more players
  ]
}
```

**Response:**
```json
{
  "success": true,
  "episodes": [/* episode data */]
}
```

### POST /api/simulate-multiple

Run multiple simulations for statistical analysis.

**Request:**
```json
{
  "players": [/* 20 players */],
  "count": 10
}
```

**Response:**
```json{
  "success": true,
  "statistics": {
    "totalSimulations": 10,
    "winCounts": {/* player: wins */},
    "averagePlacements": {/* player: avg placement */}
  },
  "results": [/* first 5 full results */]
}
```

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-15T...",
  "service": "Idol Play Simulator API"
}
```

## Algorithm Preservation

All algorithms from the original Java implementation have been preserved:

- **Threat Level Formulas**: Exact weighted calculations for each game phase
- **Bond Formation**: Social level-based probability mechanics
- **Alliance Logic**: Intersection-based friend group detection
- **Voting Bloc Generation**: Priority queue-based player separation
- **Challenge Probabilities**: Skill-based probabilistic outcomes
- **Idol Play**: Strategic level-based decision making
- **FTC Voting**: Bond strength + strategic + social + articulation formula

## Development Roadmap

### Phase 1: Core Simulation (✅ Complete)
- [x] Port all Java models to TypeScript
- [x] Implement game orchestration
- [x] Create API routes
- [x] Test simulation engine

### Phase 2: Basic Frontend (In Progress)
- [ ] Player entry form component
- [ ] Simple simulation runner
- [ ] Results display
- [ ] Mobile responsive design

### Phase 3: Advanced Features
- [ ] Episode-by-episode playback
- [ ] Animated vote reveals
- [ ] Alliance visualization
- [ ] Multiple simulation statistics
- [ ] Export results (JSON/CSV)
- [ ] Save/load player rosters

### Phase 4: Polish
- [ ] Survivor-themed styling
- [ ] Animations (Framer Motion)
- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Deployment to Vercel

## Sample Players JSON

See `packages/web/lib/simulator/sample-players.json` for example player data (ported from the original Java project).

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **pnpm** - Fast, efficient package manager
- **Zustand** - Lightweight state management (planned)

## Contributing

This is a port and enhancement of an existing Java project. The simulation algorithms are preserved exactly as designed.

## License

Private project for educational and entertainment purposes.

## Original Java Implementation

This TypeScript implementation ports ~7,000 lines of Java code from the original Spring Boot backend while maintaining algorithm accuracy and adding a modern web interface.
