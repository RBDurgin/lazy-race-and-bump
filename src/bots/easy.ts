import { getLegalMoves } from '../engine/moves'
import { nextInt } from '../engine/rng'
import type { GameState } from '../engine/types'
import type { Bot } from './types'

/**
 * A seed for the bot's choice that depends only on the game state, so the same game always
 * plays out the same way. The draw pile shrinks every turn, so the seed changes every turn.
 */
function choiceSeed(state: GameState): number {
  return (
    state.rng ^
    Math.imul(state.turn + 1, 0x9e3779b1) ^
    Math.imul(state.drawPile.length + 1, 0x85ebca6b)
  )
}

/** Easy: a random legal move. */
export const easyBot: Bot = (state, card) => {
  const moves = getLegalMoves(state, card)
  if (moves.length === 0) throw new Error('easyBot called with no legal moves')
  return moves[nextInt(choiceSeed(state), moves.length)[0]]
}
