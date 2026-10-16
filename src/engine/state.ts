import type { Color, GameState, Pawn } from './types'

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
