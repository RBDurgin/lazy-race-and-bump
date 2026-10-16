// Helpers for engine tests: build a game, then place pawns and hand out a card.
import { createGame } from './game'
import type { Card, Color, GameState, PawnPos, Settings } from './types'

export interface Scenario {
  players?: Color[]
  /** Pawn positions by id; unlisted pawns stay in Start. */
  at?: Record<string, PawnPos>
  /** The card the first player holds (phase `move`). Omit for phase `draw`. */
  card?: Card
  drawPile?: Card[]
  seed?: number
  /** Lazy toggles to turn on; all off by default. */
  settings?: Partial<Settings>
  /** Sleeping pawns, by id: the turn each fell asleep on (the game starts on turn 0). */
  asleep?: Record<string, number>
}

export function scenario({
  players = ['red', 'blue'],
  at = {},
  card,
  drawPile,
  seed = 1,
  settings,
  asleep = {},
}: Scenario): GameState {
  const state = createGame({ players, seed, settings })
  for (const id of Object.keys(at)) {
    if (!state.pawns.some((p) => p.id === id)) throw new Error(`No pawn ${id} in this game`)
  }
  return {
    ...state,
    pawns: state.pawns.map((p) => (at[p.id] ? { ...p, pos: at[p.id] } : p)),
    drawPile: drawPile ?? state.drawPile,
    card: card ?? null,
    phase: card ? 'move' : 'draw',
    asleep,
  }
}

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}
