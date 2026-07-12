// Single source of truth for tribe colors so every view (cast panel, tribe
// cards, player chips) reads the same hue for the same tribe.
//
// Tailwind needs literal class strings to include them in the build, so each
// variant is spelled out rather than constructed from a hue name.

export interface TribeColor {
  /** Solid dot / chip accent (CastPanel). */
  dot: string
  /** Solid card background + border (PlayerCard). */
  card: string
  /** Muted panel background (TribeDisplay). */
  panelBg: string
  /** Heading text color (TribeDisplay). */
  text: string
  /** Border color (TribeDisplay). */
  border: string
}

const RED: TribeColor = { dot: 'bg-red-500', card: 'bg-red-600 border-red-500', panelBg: 'bg-red-900', text: 'text-red-400', border: 'border-red-500' }
const BLUE: TribeColor = { dot: 'bg-blue-500', card: 'bg-blue-600 border-blue-500', panelBg: 'bg-blue-900', text: 'text-blue-400', border: 'border-blue-500' }
const GREEN: TribeColor = { dot: 'bg-green-500', card: 'bg-green-600 border-green-500', panelBg: 'bg-green-900', text: 'text-green-400', border: 'border-green-500' }
const GOLD: TribeColor = { dot: 'bg-amber-500', card: 'bg-amber-600 border-amber-500', panelBg: 'bg-amber-900', text: 'text-amber-400', border: 'border-amber-500' }
const GRAY: TribeColor = { dot: 'bg-gray-500', card: 'bg-gray-600 border-gray-500', panelBg: 'bg-gray-900', text: 'text-gray-400', border: 'border-gray-500' }

const TRIBE_COLORS: Record<string, TribeColor> = {
  Dakal: RED,
  Sele: BLUE,
  Yara: GREEN,
  Koru: GOLD,
  merged: GOLD,
}

/** Canonical color set for a tribe name, falling back to neutral gray. */
export function tribeColor(name: string): TribeColor {
  return TRIBE_COLORS[name] ?? GRAY
}
