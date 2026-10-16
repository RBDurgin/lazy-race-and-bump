import { applyMove } from './apply'
import { PAWNS_PER_PLAYER, START } from './board'
import { buildDeck, drawFrom } from './deck'
import { canSnooze, napCheck, wakeSleepers } from './lazy'
import { getLegalMoves, moveKey } from './moves'
import { shuffle } from './rng'
import { currentColor, pawnsOf } from './state'
import {
  COLORS,
  type Color,
  type GameEvent,
  type GameState,
  type Move,
  type Pawn,
  type Phase,
  type Result,
  type Settings,
} from './types'

/** Every lazy mechanic off: the plain base game. */
export const BASE_SETTINGS: Settings = { naps: false, couches: false, snooze: false }

export interface NewGame {
  /** 2–4 distinct colors. The first one goes first; play then passes clockwise. */
  players: Color[]
  seed: number
  settings?: Partial<Settings>
}

export function createGame({ players, seed, settings }: NewGame): GameState {
  if (players.length < 2 || players.length > 4 || new Set(players).size !== players.length) {
    throw new Error(`Need 2–4 distinct colors, got [${players.join(', ')}]`)
  }
  const first = COLORS.indexOf(players[0])
  const order = COLORS.map((_, i) => COLORS[(first + i) % COLORS.length]).filter((c) =>
    players.includes(c),
  )
  const pawns: Pawn[] = order.flatMap((color) =>
    Array.from({ length: PAWNS_PER_PLAYER }, (_, i) => ({
      id: `${color}-${i}`,
      color,
      pos: START,
    })),
  )
  const [drawPile, rng] = shuffle(buildDeck(), seed >>> 0)
  return {
    settings: { ...BASE_SETTINGS, ...settings },
    players: order,
    current: 0,
    pawns,
    drawPile,
    discardPile: [],
    card: null,
    phase: 'draw',
    winner: null,
    rng,
    turn: 0,
    asleep: {},
    snoozed: [],
    kept: {},
  }
}

function assertPhase(state: GameState, phase: Phase) {
  if (state.phase !== phase) throw new Error(`Expected phase '${phase}', got '${state.phase}'`)
}

/** Draws a card, or picks up the card the current player kept with a snooze. */
export function drawCard(state: GameState): Result {
  assertPhase(state, 'draw')
  const color = currentColor(state)
  const keptCard = state.kept[color]
  if (keptCard) {
    const kept = { ...state.kept }
    delete kept[color]
    return {
      state: { ...state, card: keptCard, kept, phase: 'move' },
      events: [{ type: 'draw', color, card: keptCard, kept: true }],
    }
  }
  const { card, drawPile, discardPile, rng, reshuffled } = drawFrom(
    state.drawPile,
    state.discardPile,
    state.rng,
  )
  const events: GameEvent[] = reshuffled ? [{ type: 'reshuffle' }] : []
  events.push({ type: 'draw', color, card })
  return { state: { ...state, card, drawPile, discardPile, rng, phase: 'move' }, events }
}

/** Legal moves for the card the current player is holding. */
export function legalMoves(state: GameState): Move[] {
  return state.phase === 'move' && state.card ? getLegalMoves(state, state.card) : []
}

export function playMove(state: GameState, move: Move): Result {
  assertPhase(state, 'move')
  const key = moveKey(move)
  if (!legalMoves(state).some((m) => moveKey(m) === key)) throw new Error(`Illegal move: ${key}`)
  const nap = napCheck(state, move)
  const napped = { ...state, rng: nap.rng }
  if (!nap.move) return finishCard(napped, nap.events)
  const applied = applyMove(napped, nap.move)
  return finishCard(applied.state, [...nap.events, ...applied.events])
}

/** Forfeits the card. Only allowed when there's no legal move. */
export function passTurn(state: GameState): Result {
  assertPhase(state, 'move')
  if (legalMoves(state).length > 0) throw new Error('Cannot pass while a legal move exists')
  return finishCard(state, [{ type: 'pass', color: currentColor(state), card: state.card! }])
}

/** Skips the turn on purpose, keeping the held card for next turn. Once per game per player. */
export function snoozeTurn(state: GameState): Result {
  assertPhase(state, 'move')
  if (!canSnooze(state)) throw new Error('Cannot snooze now')
  const color = currentColor(state)
  const card = state.card!
  return endTurn(
    {
      ...state,
      card: null,
      kept: { ...state.kept, [color]: card },
      snoozed: [...state.snoozed, color],
    },
    [{ type: 'snooze', color, card }],
  )
}

/** Discards the held card, then checks for a win, a `2`'s extra draw, or the next player. */
function finishCard(state: GameState, events: GameEvent[]): Result {
  const color = currentColor(state)
  const card = state.card!
  const next = { ...state, card: null, discardPile: [...state.discardPile, card] }

  if (pawnsOf(state, color).every((p) => p.pos.kind === 'home')) {
    return {
      state: { ...next, phase: 'over', winner: color, turn: state.turn + 1 },
      events: [...events, { type: 'win', color }],
    }
  }
  if (card === '2') return { state: { ...next, phase: 'draw' }, events }
  return endTurn(next, events)
}

/** Wakes the current player's sleepers and passes play to the next player. */
function endTurn(state: GameState, events: GameEvent[]): Result {
  const woke = wakeSleepers(state)
  return {
    state: {
      ...state,
      asleep: woke.asleep,
      phase: 'draw',
      current: (state.current + 1) % state.players.length,
      turn: state.turn + 1,
    },
    events: [...events, ...woke.events],
  }
}
