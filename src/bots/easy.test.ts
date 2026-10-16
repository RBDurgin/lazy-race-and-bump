import { describe, expect, it } from 'vitest'
import { track } from '../engine/board'
import { createGame, drawCard, legalMoves, passTurn, playMove } from '../engine/game'
import { moveKey } from '../engine/moves'
import { scenario } from '../engine/testing'
import { easyBot } from './easy'

describe('easyBot', () => {
  it('always picks a legal move and finishes games', () => {
    for (let seed = 1; seed <= 50; seed++) {
      let state = createGame({ players: ['red', 'blue', 'green'], seed })
      while (state.phase !== 'over') {
        state = drawCard(state).state
        const moves = legalMoves(state)
        if (moves.length === 0) {
          state = passTurn(state).state
          continue
        }
        const pick = easyBot(state, state.card!)
        expect(moves.map(moveKey)).toContain(moveKey(pick))
        state = playMove(state, pick).state
      }
      expect(state.winner).not.toBeNull()
    }
  })

  it('is deterministic for a given state but varies its picks', () => {
    const picks = new Set<string>()
    for (let seed = 1; seed <= 20; seed++) {
      const state = scenario({
        card: '11',
        seed,
        at: { 'red-0': track(5), 'red-1': track(20), 'blue-0': track(30) },
      })
      expect(easyBot(state, '11')).toEqual(easyBot(state, '11'))
      picks.add(moveKey(easyBot(state, '11')))
    }
    expect(picks.size).toBeGreaterThan(1)
  })
})
