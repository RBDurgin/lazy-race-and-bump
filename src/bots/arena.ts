// Headless bot-vs-bot games, for benchmarks and tests.
import { createGame, drawCard, legalMoves, passTurn, playMove, snoozeTurn } from '../engine/game'
import { currentColor } from '../engine/state'
import type { Color, GameState, Settings } from '../engine/types'
import type { Bot } from './types'

/** Plays a whole game with a bot for each color (in turn order) and returns the final state. */
export function playBots(
  seed: number,
  bots: Partial<Record<Color, Bot>>,
  settings: Partial<Settings> = {},
): GameState {
  let state = createGame({ players: Object.keys(bots) as Color[], seed, settings })
  while (state.phase !== 'over') {
    state = drawCard(state).state
    const bot = bots[currentColor(state)]!
    if (bot.snooze?.(state)) state = snoozeTurn(state).state
    else if (legalMoves(state).length === 0) state = passTurn(state).state
    else state = playMove(state, bot(state, state.card!)).state
  }
  return state
}
