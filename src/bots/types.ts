import type { Card, GameState, Move } from '../engine/types'

/** Picks one of the current player's legal moves. Only called when at least one exists. */
export type Bot = (state: GameState, card: Card) => Move
