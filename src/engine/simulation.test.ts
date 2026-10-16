// Headless smoke test: many all-random-bot games must all finish without breaking invariants.
import { describe, expect, it } from 'vitest'
import { PAWNS_PER_PLAYER, samePos } from './board'
import {
  BASE_SETTINGS,
  createGame,
  drawCard,
  legalMoves,
  passTurn,
  playMove,
  snoozeTurn,
} from './game'
import { canSnooze } from './lazy'
import { nextInt } from './rng'
import { COLORS, type Color, type GameState, type Pawn, type Settings } from './types'

const ALL_LAZY: Settings = { naps: true, couches: true, snooze: true }

const GAMES = 1000
const MAX_TURNS = 2000

// Checked after every action, so these are plain throws rather than (slower) expect() calls.
function checkInvariants(state: GameState) {
  if (state.pawns.length !== state.players.length * PAWNS_PER_PLAYER) {
    throw new Error('Pawn count changed')
  }
  const cards =
    state.drawPile.length +
    state.discardPile.length +
    (state.card ? 1 : 0) +
    Object.keys(state.kept).length
  if (cards !== 40) throw new Error(`Deck has ${cards} cards`)
  // No two pawns share a track square, and no color stacks pawns in its own safety zone.
  const clash = (a: Pawn, b: Pawn) =>
    a !== b &&
    samePos(a.pos, b.pos) &&
    (a.pos.kind === 'track' || (a.pos.kind === 'safety' && a.color === b.color))
  for (const a of state.pawns) {
    const b = state.pawns.find((b) => clash(a, b))
    if (b) throw new Error(`${a.id} and ${b.id} share a square`)
  }
  for (const id of Object.keys(state.asleep)) {
    if (state.pawns.find((p) => p.id === id)?.pos.kind !== 'track') {
      throw new Error(`${id} is asleep off the track`)
    }
  }
  if (!state.settings.couches && Object.keys(state.asleep).length) throw new Error('Asleep')
}

/** Plays one game with uniformly random moves (and the odd snooze). Returns the final state. */
function playRandomGame(
  seed: number,
  players: Color[],
  settings: Settings = BASE_SETTINGS,
): GameState {
  let state = createGame({ players, seed, settings })
  let pick = seed ^ 0x5bd1e995
  while (state.phase !== 'over') {
    if (state.turn > MAX_TURNS) throw new Error(`Game ${seed} ran past ${MAX_TURNS} turns`)
    state = drawCard(state).state
    const moves = legalMoves(state)
    let roll: number
    ;[roll, pick] = nextInt(pick, 10)
    if (canSnooze(state) && roll === 0) {
      state = snoozeTurn(state).state
    } else if (moves.length === 0) {
      state = passTurn(state).state
    } else {
      let i: number
      ;[i, pick] = nextInt(pick, moves.length)
      state = playMove(state, moves[i]).state
    }
    checkInvariants(state)
  }
  return state
}

describe.each([
  ['base rules', BASE_SETTINGS],
  ['all lazy rules', ALL_LAZY],
])('random-bot simulation, %s', (_, settings) => {
  it(`finishes ${GAMES} games with 2–4 players, in 30–50 turns each`, { timeout: 60_000 }, () => {
    let turnsPerPlayer = 0
    for (let seed = 1; seed <= GAMES; seed++) {
      const players = COLORS.slice(0, 2 + (seed % 3))
      const end = playRandomGame(seed, [...players], settings)
      expect(end.winner).not.toBeNull()
      expect(
        end.pawns.filter((p) => p.color === end.winner).every((p) => p.pos.kind === 'home'),
      ).toBe(true)
      turnsPerPlayer += end.turn / players.length
    }
    // The length target from docs/PLAN.md. Random play is slow, so real games run shorter.
    const average = turnsPerPlayer / GAMES
    expect(average).toBeGreaterThan(30)
    expect(average).toBeLessThan(50)
  })

  it('replays identically from the same seed', () => {
    const play = () => playRandomGame(42, ['red', 'yellow'], settings)
    expect(play()).toEqual(play())
  })
})
