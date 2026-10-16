// The lazy mechanics: naps, couches and the snooze button. Each is gated by a Settings toggle,
// and with all of them off nothing here changes the game.
import { walk, wrap } from './board'
import { nextInt } from './rng'
import { canLand, currentColor, pawnById } from './state'
import type { Color, GameEvent, GameState, Move, Pawn } from './types'

/** A pawn naps on 1 roll in `NAP_DIE_SIDES`. */
export const NAP_DIE_SIDES = 6

// 💤 Naps

export interface NapCheck {
  /** The move to actually make, or null if the pawn stays put. */
  move: Move | null
  rng: number
  events: GameEvent[]
}

/**
 * Rolls the nap die for a numbered move (forward or backward). On a nap the pawn moves half the
 * steps, rounded down. If that's 0, or would land on the mover's own pawn, it doesn't move at all.
 * Leaving Start, `Bump!` and swaps never nap, and don't use up a roll.
 */
export function napCheck(state: GameState, move: Move): NapCheck {
  if (!state.settings.naps || (move.kind !== 'forward' && move.kind !== 'backward')) {
    return { move, rng: state.rng, events: [] }
  }
  const [roll, rng] = nextInt(state.rng, NAP_DIE_SIDES)
  if (roll !== 0) return { move, rng, events: [] }

  const napped = nappedMove(state, move)
  const moved = napped ? Math.floor(move.steps / 2) : 0
  return {
    move: napped,
    rng,
    events: [{ type: 'nap', pawn: move.pawn, steps: move.steps, moved }],
  }
}

/** What a numbered move becomes if the pawn naps: half the steps, or null if it stays put. */
export function nappedMove(state: GameState, move: Move): Move | null {
  if (move.kind !== 'forward' && move.kind !== 'backward') return move
  const pawn = pawnById(state, move.pawn)
  const steps = Math.floor(move.steps / 2)
  const to = walk(pawn.color, pawn.pos, move.kind === 'forward' ? steps : -steps)
  return steps > 0 && to !== null && canLand(state, pawn.color, to) ? { ...move, steps } : null
}

// 🛋️ Couches

/** True if the pawn is asleep from an earlier turn, so its owner should leave it be. */
export function isDrowsy(state: GameState, pawnId: string): boolean {
  const since = state.asleep[pawnId]
  return since !== undefined && since < state.turn
}

/** Drops moves by drowsy pawns, unless those are the only legal moves. */
export function onlyAwakeMoves(state: GameState, moves: Move[]): Move[] {
  const awake = moves.filter((m) => !isDrowsy(state, m.pawn))
  return awake.length > 0 ? awake : moves
}

/** Other colors' sleeping pawns on the track squares either side of `square`. */
export function sleepersNextTo(
  pawns: readonly Pawn[],
  asleep: GameState['asleep'],
  color: Color,
  square: number,
): Pawn[] {
  const near = [wrap(square - 1), wrap(square + 1)]
  return pawns.filter(
    (p) =>
      p.color !== color && p.id in asleep && p.pos.kind === 'track' && near.includes(p.pos.square),
  )
}

/** At the end of a turn, the current player's pawns that slept through it wake up. */
export function wakeSleepers(state: GameState): {
  asleep: GameState['asleep']
  events: GameEvent[]
} {
  const color = currentColor(state)
  const waking = Object.keys(state.asleep).filter(
    (id) => isDrowsy(state, id) && pawnById(state, id).color === color,
  )
  if (waking.length === 0) return { asleep: state.asleep, events: [] }
  return {
    asleep: withoutKeys(state.asleep, waking),
    events: waking.map((pawn) => ({ type: 'wake', pawn })),
  }
}

export function withoutKeys<T>(record: Record<string, T>, keys: string[]): Record<string, T> {
  if (!keys.some((k) => k in record)) return record
  return Object.fromEntries(Object.entries(record).filter(([k]) => !keys.includes(k)))
}

// ⏰ Snooze

/** Whether the current player may snooze: skip this turn and keep the card they hold. */
export function canSnooze(state: GameState): boolean {
  return (
    state.settings.snooze &&
    state.phase === 'move' &&
    state.card !== null &&
    !state.snoozed.includes(currentColor(state))
  )
}
