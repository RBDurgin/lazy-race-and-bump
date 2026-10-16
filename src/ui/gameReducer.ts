// Wraps the engine for React: one reducer action per engine step, plus a running event log.
import { createGame, drawCard, legalMoves, passTurn, playMove } from '../engine/game'
import { currentColor } from '../engine/state'
import type { Color, GameEvent, GameState, Move, Result } from '../engine/types'
import type { Bot } from '../bots/types'
import { eventText, moveLabel } from './describe'

export interface GameConfig {
  human: Color
  /** Every color in the game, including the human's. */
  players: Color[]
  seed: number
}

export interface LogEntry {
  id: number
  color: Color | null
  text: string
  tone: 'plain' | 'bump' | 'good'
}

export interface UiState {
  config: GameConfig
  game: GameState
  log: LogEntry[]
}

export type Action = { type: 'draw' } | { type: 'play'; move: Move } | { type: 'pass' }

const LOG_LIMIT = 200

/** A fresh game seed. The UI may use Math.random; the engine never does. */
export function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 31)
}

export function initUi(config: GameConfig): UiState {
  // The human always goes first; createGame seats everyone else clockwise from there.
  const players = [config.human, ...config.players.filter((c) => c !== config.human)]
  return { config, game: createGame({ players, seed: config.seed }), log: [] }
}

function toneOf(e: GameEvent): LogEntry['tone'] {
  if (e.type === 'bump') return 'bump'
  if (e.type === 'home' || e.type === 'win') return 'good'
  return 'plain'
}

function withLog(ui: UiState, result: Result, color: Color, lead?: string): UiState {
  let id = ui.log.at(-1)?.id ?? 0
  const lines: LogEntry[] = []
  if (lead) lines.push({ id: ++id, color, text: lead, tone: 'plain' })
  for (const e of result.events) {
    const text = eventText(e)
    if (text) lines.push({ id: ++id, color, text, tone: toneOf(e) })
  }
  return { ...ui, game: result.state, log: [...ui.log, ...lines].slice(-LOG_LIMIT) }
}

export function uiReducer(ui: UiState, action: Action): UiState {
  const color = currentColor(ui.game)
  switch (action.type) {
    case 'draw':
      return withLog(ui, drawCard(ui.game), color)
    case 'play':
      return withLog(ui, playMove(ui.game, action.move), color, moveLabel(action.move) + '.')
    case 'pass':
      return withLog(ui, passTurn(ui.game), color)
  }
}

/** The next action for a bot-controlled turn, or null if the game is over. */
export function botAction(game: GameState, bot: Bot): Action | null {
  if (game.phase === 'over') return null
  if (game.phase === 'draw') return { type: 'draw' }
  const moves = legalMoves(game)
  return moves.length === 0 ? { type: 'pass' } : { type: 'play', move: bot(game, game.card!) }
}

/** Bots for 2–4 players, spaced around the board: opposite the human with 2 players. */
export function opponentColors(human: Color, count: number, all: readonly Color[]): Color[] {
  const i = all.indexOf(human)
  const clockwise = all.map((_, k) => all[(i + 1 + k) % all.length]).slice(0, -1)
  return count === 1 ? [clockwise[1]] : clockwise.slice(0, count)
}
