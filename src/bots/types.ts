import type { Card, GameState, Move } from '../engine/types'

/** Picks one of the current player's legal moves. Only called when at least one exists. */
export interface Bot {
  (state: GameState, card: Card): Move
  /** Whether to snooze instead of playing the held card. Bots without it never snooze. */
  snooze?: (state: GameState) => boolean
}
