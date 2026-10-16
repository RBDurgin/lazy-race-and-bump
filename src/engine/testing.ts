// Helpers for engine tests: build a game, then place pawns and hand out a card.
import { createGame } from './game'
import type { Card, Color, GameState, PawnPos } from './types'

export interface Scenario {
  players?: Color[]
  /** Pawn positions by id; unlisted pawns stay in Start. */
  at?: Record<string, PawnPos>
  /** The card the first player holds (phase `move`). Omit for phase `draw`. */
  card?: Card
  drawPile?: Card[]
  seed?: number
}

export function scenario({
  players = ['red', 'blue'],
  at = {},
  card,
  drawPile,
  seed = 1,
}: Scenario): GameState {
  const state = createGame({ players, seed })
  for (const id of Object.keys(at)) {
    if (!state.pawns.some((p) => p.id === id)) throw new Error(`No pawn ${id} in this game`)
  }
  return {
    ...state,
    pawns: state.pawns.map((p) => (at[p.id] ? { ...p, pos: at[p.id] } : p)),
    drawPile: drawPile ?? state.drawPile,
    card: card ?? null,
    phase: card ? 'move' : 'draw',
  }
}

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}
