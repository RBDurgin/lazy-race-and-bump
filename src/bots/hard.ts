import { applyMove } from '../engine/apply'
import { START } from '../engine/board'
import { NAP_DIE_SIDES, canSnooze, nappedMove } from '../engine/lazy'
import { getLegalMoves } from '../engine/moves'
import { pawnsOf } from '../engine/state'
import type { Card, Color, GameState, Move, Pawn } from '../engine/types'
import { DECK_ODDS, danger } from './medium'
import { raceTurns } from './race'
import type { Bot } from './types'

// Weights, in turns. Bot-vs-bot runs show the win rate barely moves when these change.
/** How much the other trailing opponents count, next to the leading one. */
const TRAILING_WEIGHT = 0.25
/** Turns a pawn asleep on a couch costs: it sits out a turn unless it's the only one to move. */
const COUCH_TURNS = 0.5
/** How much worse than standing still the best move must be before Hard snoozes. */
const SNOOZE_MARGIN = 1

/**
 * The chance of each card being the next one drawn, from the cards not yet seen. This is card
 * counting, not peeking: the draw pile's contents (never its order) follow from the full deck
 * minus the public discard pile and held cards. An empty pile means the discards get reshuffled.
 */
export function cardOdds(state: GameState): Record<Card, number> {
  const pool = state.drawPile.length > 0 ? state.drawPile : state.discardPile
  if (pool.length === 0) return DECK_ODDS
  const odds = Object.fromEntries(Object.keys(DECK_ODDS).map((c) => [c, 0])) as Record<Card, number>
  for (const card of pool) odds[card] += 1 / pool.length
  return odds
}

/**
 * Expected turns for `color` to finish (see race.ts), plus what its pawns on the track may lose
 * to a bump on the opponents' next draws.
 */
export function turnsLeft(state: GameState, color: Color, odds: Record<Card, number>): number {
  const [a, b] = pawnsOf(state, color)
  const base = raceTurns(color, a.pos, b.pos)
  // Any opponent with a pawn in Start can aim a `Bump!` at any pawn on the track.
  const bumpers = state.players.filter(
    (c) => c !== color && pawnsOf(state, c).some((p) => p.pos.kind === 'start'),
  ).length
  const threat = (pawn: Pawn, other: Pawn) => {
    if (pawn.pos.kind !== 'track') return 0
    const bumped = raceTurns(color, START, other.pos) - base
    const chance = Math.min(1, danger(state, pawn, odds) + bumpers * odds['Bump!'])
    return chance * bumped + (pawn.id in state.asleep ? COUCH_TURNS : 0)
  }
  return base + threat(a, b) + threat(b, a)
}

/**
 * How good a position is for `color`: how many turns ahead of the opponents it is. The leading
 * opponent matters most, since only one player wins.
 */
export function evaluateHard(state: GameState, color: Color, odds: Record<Card, number>): number {
  const mine = turnsLeft(state, color, odds)
  const theirs = state.players.filter((c) => c !== color).map((c) => turnsLeft(state, c, odds))
  const leader = Math.min(...theirs)
  const trailing = theirs.reduce((sum, t) => sum + t, 0) - leader
  return leader + TRAILING_WEIGHT * trailing - mine
}

/** Hard's pick for `card`, and how good the position it leaves is. */
function rank(state: GameState, card: Card): { move: Move; score: number } {
  const moves = getLegalMoves(state, card)
  if (moves.length === 0) throw new Error('hardBot called with no legal moves')
  const color = state.players[state.current]
  const odds = cardOdds(state)
  const value = (move: Move | null) =>
    evaluateHard(move ? applyMove(state, move).state : state, color, odds)
  let best = moves[0]
  let bestScore = -Infinity
  for (const move of moves) {
    let score = value(move)
    if (state.settings.naps && (move.kind === 'forward' || move.kind === 'backward')) {
      score = (score * (NAP_DIE_SIDES - 1) + value(nappedMove(state, move))) / NAP_DIE_SIDES
    }
    if (score > bestScore) [best, bestScore] = [move, score]
  }
  return { move: best, score: bestScore }
}

/**
 * Hard: like Medium it tries every legal move and keeps the best position, but it judges positions
 * by the solo race table (turns to finish, not steps), counts cards to know what opponents are
 * likely to draw, prices in the `Bump!` threat, and cares most about the leading opponent. It's
 * also the only bot that snoozes: when every move would leave it worse off than standing still.
 */
export const hardBot: Bot = (state, card) => rank(state, card).move

hardBot.snooze = (state) => {
  if (!canSnooze(state) || getLegalMoves(state, state.card!).length === 0) return false
  const color = state.players[state.current]
  const stay = evaluateHard(state, color, cardOdds(state))
  return stay - rank(state, state.card!).score > SNOOZE_MARGIN
}
