// Headless smoke test: many all-random-bot games must all finish without breaking invariants.
import { describe, expect, it } from 'vitest'
import { PAWNS_PER_PLAYER, samePos } from './board'
import { createGame, drawCard, legalMoves, passTurn, playMove } from './game'
import { nextInt } from './rng'
import { COLORS, type Color, type GameState, type Pawn } from './types'

const GAMES = 1000
const MAX_TURNS = 2000

// Checked after every action, so these are plain throws rather than (slower) expect() calls.
function checkInvariants(state: GameState) {
  if (state.pawns.length !== state.players.length * PAWNS_PER_PLAYER) {
    throw new Error('Pawn count changed')
  }
  const cards = state.drawPile.length + state.discardPile.length + (state.card ? 1 : 0)
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
}

/** Plays one game with uniformly random moves. Returns the finished state. */
function playRandomGame(seed: number, players: Color[]): GameState {
  let state = createGame({ players, seed })
  let pick = seed ^ 0x5bd1e995
  while (state.phase !== 'over') {
    if (state.turn > MAX_TURNS) throw new Error(`Game ${seed} ran past ${MAX_TURNS} turns`)
    state = drawCard(state).state
    const moves = legalMoves(state)
    if (moves.length === 0) {
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

describe('random-bot simulation', () => {
  it(`finishes ${GAMES} games with 2–4 players`, { timeout: 60_000 }, () => {
    for (let seed = 1; seed <= GAMES; seed++) {
      const players = COLORS.slice(0, 2 + (seed % 3))
      const end = playRandomGame(seed, [...players])
      expect(end.winner).not.toBeNull()
      expect(
        end.pawns.filter((p) => p.color === end.winner).every((p) => p.pos.kind === 'home'),
      ).toBe(true)
    }
  })

  it('replays identically from the same seed', () => {
    expect(playRandomGame(42, ['red', 'yellow'])).toEqual(playRandomGame(42, ['red', 'yellow']))
  })
})
