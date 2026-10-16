import { samePos, startExit, track, walk } from './board'
import { currentColor, pawnById, pawnsOf } from './state'
import type { Card, Color, GameState, Move, PawnPos } from './types'

interface CardRule {
  leaveStart?: boolean
  forward?: number
  backward?: number
  swap?: boolean
  bump?: boolean
}

export const CARD_RULES: Readonly<Record<Card, CardRule>> = {
  '1': { leaveStart: true, forward: 1 },
  '2': { leaveStart: true, forward: 2 },
  '3': { forward: 3 },
  '4': { backward: 4 },
  '5': { forward: 5 },
  '8': { forward: 8 },
  '10': { forward: 10, backward: 1 },
  '11': { forward: 11, swap: true },
  'Bump!': { bump: true },
}

/** A color may end a move anywhere except on its own pawn. Home holds any number of pawns. */
function canLand(state: GameState, color: Color, pos: PawnPos): boolean {
  return pos.kind === 'home' || !state.pawns.some((p) => p.color === color && samePos(p.pos, pos))
}

/** Every legal move for the current player holding `card`. Empty means they must pass. */
export function getLegalMoves(state: GameState, card: Card): Move[] {
  const color = currentColor(state)
  const rule = CARD_RULES[card]
  const mine = pawnsOf(state, color)
  const targets = state.pawns.filter((p) => p.color !== color && p.pos.kind === 'track')
  // Pawns in Start are interchangeable, so only offer moves for the first one.
  const inStart = mine.find((p) => p.pos.kind === 'start')
  const moves: Move[] = []

  if (inStart && rule.leaveStart && canLand(state, color, track(startExit(color)))) {
    moves.push({ kind: 'leaveStart', pawn: inStart.id })
  }
  if (inStart && rule.bump) {
    for (const t of targets) moves.push({ kind: 'bump', pawn: inStart.id, target: t.id })
  }
  for (const pawn of mine) {
    if (rule.forward) {
      const to = walk(color, pawn.pos, rule.forward)
      if (to && canLand(state, color, to)) {
        moves.push({ kind: 'forward', pawn: pawn.id, steps: rule.forward })
      }
    }
    if (rule.backward) {
      const to = walk(color, pawn.pos, -rule.backward)
      if (to && canLand(state, color, to)) {
        moves.push({ kind: 'backward', pawn: pawn.id, steps: rule.backward })
      }
    }
    if (rule.swap && pawn.pos.kind === 'track') {
      for (const t of targets) moves.push({ kind: 'swap', pawn: pawn.id, target: t.id })
    }
  }
  return moves
}

/** Where the moving pawn lands, before any slide. Assumes the move is legal. */
export function destinationOf(state: GameState, move: Move): PawnPos {
  const pawn = pawnById(state, move.pawn)
  switch (move.kind) {
    case 'leaveStart':
      return track(startExit(pawn.color))
    case 'swap':
    case 'bump':
      return pawnById(state, move.target).pos
    case 'forward':
    case 'backward': {
      const to = walk(pawn.color, pawn.pos, move.kind === 'forward' ? move.steps : -move.steps)
      if (!to) throw new Error(`Impossible move: ${moveKey(move)}`)
      return to
    }
  }
}

/** A stable identity for comparing moves. */
export function moveKey(move: Move): string {
  switch (move.kind) {
    case 'leaveStart':
      return `leaveStart:${move.pawn}`
    case 'forward':
    case 'backward':
      return `${move.kind}:${move.pawn}:${move.steps}`
    case 'swap':
    case 'bump':
      return `${move.kind}:${move.pawn}:${move.target}`
  }
}
