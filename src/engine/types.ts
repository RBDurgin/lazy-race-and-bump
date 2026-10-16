/** Colors in clockwise seating order. A color's index is also the board side it owns. */
export const COLORS = ['red', 'blue', 'yellow', 'green'] as const
export type Color = (typeof COLORS)[number]

export type Card = '1' | '2' | '3' | '4' | '5' | '8' | '10' | '11' | 'Bump!'

export type PawnPos =
  | { kind: 'start' }
  /** A main-track square, 0–39, numbered clockwise. */
  | { kind: 'track'; square: number }
  /** A square in the owner's safety zone, 0 (nearest the track) to 2. */
  | { kind: 'safety'; index: number }
  | { kind: 'home' }

export interface Pawn {
  /** `${color}-${n}`, e.g. `red-0`. */
  id: string
  color: Color
  pos: PawnPos
}

export type Move =
  | { kind: 'leaveStart'; pawn: string }
  | { kind: 'forward'; pawn: string; steps: number }
  | { kind: 'backward'; pawn: string; steps: number }
  | { kind: 'swap'; pawn: string; target: string }
  | { kind: 'bump'; pawn: string; target: string }

/** Lazy-mechanic toggles. They arrive in Phase 3; with all off the engine plays the base game. */
export interface Settings {
  naps: boolean
  couches: boolean
  snooze: boolean
}

/** `draw`: the current player must draw. `move`: they hold `card` and must move or pass. */
export type Phase = 'draw' | 'move' | 'over'

export interface GameState {
  settings: Settings
  /** Turn order (clockwise). */
  players: Color[]
  /** Index into `players` of whoever is taking a turn. */
  current: number
  pawns: Pawn[]
  drawPile: Card[]
  discardPile: Card[]
  /** The card drawn this turn, while `phase` is `move`. */
  card: Card | null
  phase: Phase
  winner: Color | null
  /** Seeded RNG state; see rng.ts. */
  rng: number
  /** Completed turns. A `2` and its extra draw count as one turn. */
  turn: number
}

export type GameEvent =
  | { type: 'reshuffle' }
  | { type: 'draw'; color: Color; card: Card }
  | { type: 'move'; pawn: string; from: PawnPos; to: PawnPos }
  | { type: 'swap'; pawn: string; target: string }
  | { type: 'slide'; pawn: string; from: PawnPos; to: PawnPos }
  | { type: 'bump'; pawn: string; by: string }
  | { type: 'home'; pawn: string }
  | { type: 'pass'; color: Color; card: Card }
  | { type: 'win'; color: Color }

export interface Result {
  state: GameState
  events: GameEvent[]
}
