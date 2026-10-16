import { samePos } from './board'
import type { Color, GameState, Pawn, PawnPos } from './types'

export function currentColor(state: GameState): Color {
  return state.players[state.current]
}

export function pawnById(state: GameState, id: string): Pawn {
  const pawn = state.pawns.find((p) => p.id === id)
  if (!pawn) throw new Error(`Unknown pawn: ${id}`)
  return pawn
}

export function pawnsOf(state: GameState, color: Color): Pawn[] {
  return state.pawns.filter((p) => p.color === color)
}

/** A color may end a move anywhere except on its own pawn. Home holds any number of pawns. */
export function canLand(state: GameState, color: Color, pos: PawnPos): boolean {
  return pos.kind === 'home' || !state.pawns.some((p) => p.color === color && samePos(p.pos, pos))
}
