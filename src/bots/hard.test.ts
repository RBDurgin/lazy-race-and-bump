import { describe, expect, it } from 'vitest'
import { HOME, safety, track } from '../engine/board'
import { createGame, drawCard, legalMoves, passTurn, playMove, snoozeTurn } from '../engine/game'
import { moveKey } from '../engine/moves'
import { scenario } from '../engine/testing'
import { cardOdds, hardBot } from './hard'
import { DECK_ODDS } from './medium'

const LAZY = { naps: true, couches: true, snooze: true }

describe('cardOdds', () => {
  it('counts the cards left in the draw pile, not their order', () => {
    const state = scenario({ drawPile: ['5', 'Bump!', '5', '1'] })
    expect(cardOdds(state)).toMatchObject({ '5': 0.5, 'Bump!': 0.25, '1': 0.25, '2': 0 })
  })

  it('uses the discards when the pile is about to be reshuffled', () => {
    const state = { ...scenario({ drawPile: [] }), discardPile: ['8', '8'] as const }
    expect(cardOdds({ ...state, discardPile: [...state.discardPile] })['8']).toBe(1)
  })

  it('falls back to a full deck', () => {
    expect(cardOdds({ ...scenario({ drawPile: [] }), discardPile: [] })).toEqual(DECK_ODDS)
  })
})

describe('hardBot', () => {
  it('bumps an opponent rather than just moving forward', () => {
    const state = scenario({
      card: '3',
      at: { 'red-0': track(10), 'red-1': track(30), 'blue-0': track(33) },
    })
    expect(hardBot(state, '3')).toEqual({ kind: 'forward', pawn: 'red-1', steps: 3 })
  })

  it('backs out of the Start exit to take the shortcut Home', () => {
    const state = scenario({ card: '4', at: { 'red-0': track(20), 'red-1': track(3) } })
    expect(hardBot(state, '4')).toEqual({ kind: 'backward', pawn: 'red-1', steps: 4 })
  })

  it('snoozes rather than back a pawn out of its safety zone', () => {
    // The only move is 4 back, out of safety and onto the track in front of blue.
    const at = { 'red-0': safety(2), 'red-1': HOME, 'blue-0': track(39) }
    const state = scenario({ card: '4', at, settings: LAZY })
    expect(hardBot.snooze!(state)).toBe(true)
    // Not without the snooze rule, and not once it's used.
    expect(hardBot.snooze!(scenario({ card: '4', at }))).toBe(false)
    expect(hardBot.snooze!({ ...state, snoozed: ['red'] })).toBe(false)
  })

  it('plays an ordinary good card', () => {
    const state = scenario({ card: '5', at: { 'red-0': track(10) }, settings: LAZY })
    expect(hardBot.snooze!(state)).toBe(false)
  })

  it('always picks a legal move, and plays the same game twice from a seed', () => {
    const play = (seed: number) => {
      let state = createGame({ players: ['red', 'blue', 'yellow', 'green'], seed, settings: LAZY })
      while (state.phase !== 'over') {
        state = drawCard(state).state
        if (hardBot.snooze!(state)) {
          state = snoozeTurn(state).state
          continue
        }
        const moves = legalMoves(state)
        if (moves.length === 0) {
          state = passTurn(state).state
          continue
        }
        const pick = hardBot(state, state.card!)
        expect(moves.map(moveKey)).toContain(moveKey(pick))
        state = playMove(state, pick).state
      }
      return state
    }
    for (let seed = 1; seed <= 20; seed++) expect(play(seed)).toEqual(play(seed))
  })
})
