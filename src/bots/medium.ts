import { applyMove } from '../engine/apply'
import { SAFETY_LENGTH, safetyEntry, slideAt, startExit, walk, wrap } from '../engine/board'
import { DECK_COUNTS, buildDeck } from '../engine/deck'
import { NAP_DIE_SIDES, nappedMove } from '../engine/lazy'
import { CARD_RULES, getLegalMoves } from '../engine/moves'
import type { Card, Color, GameState, Move, Pawn } from '../engine/types'
import type { Bot } from './types'

/** Steps-to-Home a pawn in Start counts as. Leaving Start (42 steps out) is worth 8 steps. */
export const START_DISTANCE = 50
/** Bonus for each pawn out of reach in its safety zone or Home. */
const SAFE_BONUS = 2
/** Penalty for each pawn asleep on a couch: it sits out a turn. */
const COUCH_PENALTY = 3

/** Steps a pawn still needs to get Home, counting Start as `START_DISTANCE`. */
export function distanceHome(pawn: Pawn): number {
  switch (pawn.pos.kind) {
    case 'start':
      return START_DISTANCE
    case 'track':
      return wrap(safetyEntry(pawn.color) - pawn.pos.square) + SAFETY_LENGTH + 1
    case 'safety':
      return SAFETY_LENGTH - pawn.pos.index
    case 'home':
      return 0
  }
}

// The chance that one random draw lets a pawn move a given number of steps (negative = back).
const DECK_SIZE = buildDeck().length
const REACH: { steps: number; chance: number }[] = (Object.keys(CARD_RULES) as Card[]).flatMap(
  (card) => {
    const { forward, backward } = CARD_RULES[card]
    const chance = DECK_COUNTS[card] / DECK_SIZE
    return [
      ...(forward ? [{ steps: forward, chance }] : []),
      ...(backward ? [{ steps: -backward, chance }] : []),
    ]
  },
)
const LEAVE_START_CHANCE = (Object.keys(CARD_RULES) as Card[])
  .filter((card) => CARD_RULES[card].leaveStart)
  .reduce((sum, card) => sum + DECK_COUNTS[card] / DECK_SIZE, 0)

/** Whether an opponent ending a move on `square` bumps whoever is on any of `targets`. */
function hits(square: number, mover: Color, targets: number[]): boolean {
  if (targets.includes(square)) return true
  const slide = slideAt(square)
  return !!slide && slide.color !== mover && targets.some((t) => t > slide.start && t <= slide.end)
}

/**
 * Roughly how likely `pawn` is to be bumped on the opponents' next turns: the summed chance of
 * each opponent pawn drawing a card that lands on it (or next to it, if it's asleep).
 */
export function danger(state: GameState, pawn: Pawn): number {
  if (pawn.pos.kind !== 'track') return 0
  const sq = pawn.pos.square
  const targets = pawn.id in state.asleep ? [wrap(sq - 1), sq, wrap(sq + 1)] : [sq]
  let chance = 0
  for (const opp of state.pawns) {
    if (opp.color === pawn.color) continue
    if (opp.pos.kind === 'start') {
      if (hits(startExit(opp.color), opp.color, targets)) chance += LEAVE_START_CHANCE
      continue
    }
    for (const { steps, chance: c } of REACH) {
      const to = walk(opp.color, opp.pos, steps)
      if (to?.kind === 'track' && hits(to.square, opp.color, targets)) chance += c
    }
  }
  return Math.min(chance, 1)
}

/** How good a position is for `color`: higher is better. */
export function evaluate(state: GameState, color: Color): number {
  let score = 0
  for (const pawn of state.pawns) {
    const distance = distanceHome(pawn)
    if (pawn.color !== color) {
      score += distance
      continue
    }
    score -= distance
    if (pawn.pos.kind === 'safety' || pawn.pos.kind === 'home') score += SAFE_BONUS
    // A bump would cost the steps this pawn has made since leaving Start.
    score -= danger(state, pawn) * (START_DISTANCE - distance)
    if (pawn.id in state.asleep) score -= COUCH_PENALTY
  }
  return score
}

/** The expected value of a move, averaging over the chance that the pawn naps. */
export function scoreMove(state: GameState, move: Move): number {
  const color = state.players[state.current]
  const full = evaluate(applyMove(state, move).state, color)
  if (!state.settings.naps || (move.kind !== 'forward' && move.kind !== 'backward')) return full
  const napped = nappedMove(state, move)
  const nap = evaluate(napped ? applyMove(state, napped).state : state, color)
  return (full * (NAP_DIE_SIDES - 1) + nap) / NAP_DIE_SIDES
}

/**
 * Medium: plays each legal move on a copy of the board and keeps the one that leaves the best
 * position. It likes progress, bumps and safety, and avoids couches and squares opponents can
 * reach. Ties go to the first move listed.
 *
 * Tuning note: only about 38% of draws offer a real choice, so luck decides a lot. Medium beats
 * Easy about 70% of the time head to head, and nudging the weights here barely changes that.
 */
export const mediumBot: Bot = (state, card) => {
  const moves = getLegalMoves(state, card)
  if (moves.length === 0) throw new Error('mediumBot called with no legal moves')
  let best = moves[0]
  let bestScore = -Infinity
  for (const move of moves) {
    const score = scoreMove(state, move)
    if (score > bestScore) [best, bestScore] = [move, score]
  }
  return best
}
