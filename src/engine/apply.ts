import { START, isCouch, samePos, slideAt, track } from './board'
import { sleepersNextTo, withoutKeys } from './lazy'
import { destinationOf } from './moves'
import { pawnById } from './state'
import type { GameEvent, GameState, Move, Pawn, PawnPos } from './types'

/**
 * Applies a move the caller has already checked is legal. Returns a new state (the input is
 * never mutated) and the events that happened, in order. Doesn't touch cards or turn order;
 * game.ts handles those. Naps are rolled in game.ts too, so this stays deterministic and the UI
 * can use it to preview a move.
 */
export function applyMove(state: GameState, move: Move): { state: GameState; events: GameEvent[] } {
  const mover = pawnById(state, move.pawn)
  const to = destinationOf(state, move)
  const events: GameEvent[] = []
  let pawns = state.pawns
  // Moving wakes a pawn up (it may fall asleep again below).
  let asleep = withoutKeys(state.asleep, [mover.id])

  const setPos = (id: string, pos: PawnPos) => {
    pawns = pawns.map((p) => (p.id === id ? { ...p, pos } : p))
  }
  const othersAt = (pos: PawnPos): Pawn[] =>
    pawns.filter((p) => p.id !== mover.id && samePos(p.pos, pos))
  const bump = (victim: Pawn) => {
    setPos(victim.id, START)
    asleep = withoutKeys(asleep, [victim.id])
    events.push({ type: 'bump', pawn: victim.id, by: mover.id })
  }

  if (move.kind === 'swap') {
    setPos(move.target, mover.pos)
    setPos(mover.id, to)
    events.push({ type: 'swap', pawn: mover.id, target: move.target })
  } else {
    // Legal moves never land on the mover's own pawn, so anyone here is an opponent.
    const victims = to.kind === 'track' ? othersAt(to) : []
    setPos(mover.id, to)
    events.push({ type: 'move', pawn: mover.id, from: mover.pos, to })
    victims.forEach(bump)
  }

  let end = to
  const slide = to.kind === 'track' ? slideAt(to.square) : undefined
  if (slide && slide.color !== mover.color) {
    end = track(slide.end)
    setPos(mover.id, end)
    events.push({ type: 'slide', pawn: mover.id, from: to, to: end })
    for (let sq = slide.start + 1; sq <= slide.end; sq++) othersAt(track(sq)).forEach(bump)
  }

  if (state.settings.couches && end.kind === 'track') {
    // Sleeping opponents next to where the mover ends up are bumped. A swapped pawn isn't:
    // it just traded places with the mover.
    const swapped = move.kind === 'swap' ? move.target : null
    sleepersNextTo(pawns, asleep, mover.color, end.square)
      .filter((p) => p.id !== swapped)
      .forEach(bump)
    if (isCouch(end.square)) {
      asleep = { ...asleep, [mover.id]: state.turn }
      events.push({ type: 'sleep', pawn: mover.id })
    }
  }

  if (to.kind === 'home') events.push({ type: 'home', pawn: mover.id })
  return { state: { ...state, pawns, asleep }, events }
}
