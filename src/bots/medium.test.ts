import { describe, expect, it } from 'vitest'
import { HOME, START, safety, track } from '../engine/board'
import { createGame, drawCard, legalMoves, passTurn, playMove } from '../engine/game'
import { moveKey } from '../engine/moves'
import { pawnById } from '../engine/state'
import { scenario } from '../engine/testing'
import { danger, distanceHome, mediumBot, START_DISTANCE } from './medium'

const LAZY = { naps: true, couches: true, snooze: true }

describe('distanceHome', () => {
  it('counts the steps left along the pawn’s own path', () => {
    const state = scenario({
      at: { 'red-0': track(3), 'red-1': track(1), 'blue-0': safety(2), 'blue-1': HOME },
    })
    const d = (id: string) => distanceHome(pawnById(state, id))
    expect(d('red-0')).toBe(42) // from the Start exit, per docs/RULES.md
    expect(d('red-1')).toBe(4) // the safety entry: 3 safety squares, then Home
    expect(d('blue-0')).toBe(1)
    expect(d('blue-1')).toBe(0)
    expect(distanceHome({ id: 'x', color: 'red', pos: START })).toBe(START_DISTANCE)
  })
})

describe('danger', () => {
  it('is the chance an opponent draws a card that lands on the pawn', () => {
    // Blue is 1 behind: only a `1` (6 of 40 cards) reaches.
    const state = scenario({ at: { 'red-0': track(23), 'blue-0': track(22), 'blue-1': HOME } })
    expect(danger(state, pawnById(state, 'red-0'))).toBeCloseTo(6 / 40)
  })

  it('widens to the squares either side of a sleeping pawn', () => {
    const state = scenario({
      settings: LAZY,
      at: { 'red-0': track(23), 'blue-0': track(22), 'blue-1': HOME },
      asleep: { 'red-0': 0 },
    })
    // A `1` lands on it and a `2` lands next to it.
    expect(danger(state, pawnById(state, 'red-0'))).toBeCloseTo(12 / 40)
  })

  it('counts slides that sweep over the pawn and pawns leaving Start', () => {
    // Yellow's slide runs 25–28. Blue lands on 25 with a `1` and slides, or on 27 with a `3`.
    const slide = scenario({ at: { 'red-0': track(27), 'blue-0': track(24), 'blue-1': HOME } })
    expect(danger(slide, pawnById(slide, 'red-0'))).toBeCloseTo(10 / 40)
    // Blue's Start exit is 13: any `1` or `2` brings a blue pawn out onto it.
    const exit = scenario({ at: { 'red-0': track(13), 'blue-1': HOME } })
    expect(danger(exit, pawnById(exit, 'red-0'))).toBeCloseTo(12 / 40)
  })

  it('is zero in the safety zone', () => {
    const state = scenario({ at: { 'red-0': safety(0), 'blue-0': track(0) } })
    expect(danger(state, pawnById(state, 'red-0'))).toBe(0)
  })
})

describe('mediumBot', () => {
  it('bumps an opponent rather than just moving forward', () => {
    const state = scenario({
      card: '3',
      at: { 'red-0': track(10), 'red-1': track(30), 'blue-0': track(33) },
    })
    expect(mediumBot(state, '3')).toEqual({ kind: 'forward', pawn: 'red-1', steps: 3 })
  })

  it('aims a Bump! at the opponent closest to Home', () => {
    const state = scenario({ card: 'Bump!', at: { 'blue-0': track(20), 'blue-1': track(5) } })
    expect(mediumBot(state, 'Bump!')).toEqual({ kind: 'bump', pawn: 'red-0', target: 'blue-1' })
  })

  it('backs out of the Start exit to take the shortcut Home', () => {
    const state = scenario({ card: '4', at: { 'red-0': track(20), 'red-1': track(3) } })
    expect(mediumBot(state, '4')).toEqual({ kind: 'backward', pawn: 'red-1', steps: 4 })
  })

  it('stays off couches when they are in play', () => {
    // Red 1 would land on the couch at 9; Red 2 makes the same progress elsewhere.
    const at = { 'red-0': track(6), 'red-1': track(10), 'blue-0': HOME, 'blue-1': HOME }
    const couches = scenario({ card: '3', at, settings: { couches: true } })
    expect(mediumBot(couches, '3').pawn).toBe('red-1')
  })

  it('always picks a legal move, and plays the same game twice from a seed', () => {
    const play = (seed: number) => {
      let state = createGame({ players: ['red', 'blue', 'yellow', 'green'], seed, settings: LAZY })
      while (state.phase !== 'over') {
        state = drawCard(state).state
        const moves = legalMoves(state)
        if (moves.length === 0) {
          state = passTurn(state).state
          continue
        }
        const pick = mediumBot(state, state.card!)
        expect(moves.map(moveKey)).toContain(moveKey(pick))
        state = playMove(state, pick).state
      }
      return state
    }
    for (let seed = 1; seed <= 20; seed++) expect(play(seed)).toEqual(play(seed))
  })
})
