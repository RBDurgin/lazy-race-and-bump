import { describe, expect, it } from 'vitest'
import { HOME, safety, track } from './board'
import { destinationOf, getLegalMoves, moveKey } from './moves'
import { scenario } from './testing'
import type { Card, GameState } from './types'

const keys = (state: GameState, card: Card) => getLegalMoves(state, card).map(moveKey).sort()

describe('getLegalMoves', () => {
  it('offers nothing with every pawn in Start and a non-starting card', () => {
    const s = scenario({})
    for (const card of ['3', '4', '5', '8', '10', '11'] as Card[]) expect(keys(s, card)).toEqual([])
  })

  it('lets a 1 or 2 leave Start, offering one move for interchangeable Start pawns', () => {
    const s = scenario({})
    expect(keys(s, '1')).toEqual(['leaveStart:red-0'])
    expect(keys(s, '2')).toEqual(['leaveStart:red-0'])
  })

  it('blocks leaving Start when your own pawn sits on the exit', () => {
    const s = scenario({ at: { 'red-0': track(3) } })
    expect(keys(s, '1')).toEqual(['forward:red-0:1'])
  })

  it('allows leaving Start onto an opponent', () => {
    const s = scenario({ at: { 'blue-0': track(3) } })
    expect(keys(s, '1')).toEqual(['leaveStart:red-0'])
  })

  it("can't end a move on your own pawn", () => {
    const s = scenario({ at: { 'red-0': track(10), 'red-1': track(15) } })
    expect(keys(s, '5')).toEqual(['forward:red-1:5'])
  })

  it('needs an exact count to reach Home', () => {
    const s = scenario({ at: { 'red-0': safety(1), 'red-1': HOME } })
    expect(keys(s, '1')).toEqual(['forward:red-0:1'])
    expect(keys(s, '2')).toEqual(['forward:red-0:2'])
    expect(keys(s, '3')).toEqual([])
    expect(destinationOf(s, { kind: 'forward', pawn: 'red-0', steps: 2 })).toEqual(HOME)
  })

  it('lets several pawns share Home', () => {
    const s = scenario({ at: { 'red-0': safety(2), 'red-1': HOME } })
    expect(keys(s, '1')).toEqual(['forward:red-0:1'])
  })

  it("won't land on your own pawn inside the safety zone", () => {
    const s = scenario({ at: { 'red-0': safety(0), 'red-1': safety(2) } })
    // red-0 would land on red-1; red-1 would overshoot Home.
    expect(keys(s, '2')).toEqual([])
    expect(keys(s, '1')).toEqual(['forward:red-0:1', 'forward:red-1:1'])
  })

  it('moves 4 backward, including out of the safety zone', () => {
    const s = scenario({ at: { 'red-0': safety(0), 'red-1': track(20) } })
    expect(keys(s, '4')).toEqual(['backward:red-0:4', 'backward:red-1:4'])
    expect(destinationOf(s, { kind: 'backward', pawn: 'red-0', steps: 4 })).toEqual(track(38))
  })

  it('offers both options on a 10', () => {
    const s = scenario({ at: { 'red-0': track(20) } })
    expect(keys(s, '10')).toEqual(['backward:red-0:1', 'forward:red-0:10'])
  })

  it('offers 11 forward or a swap with any opponent pawn on the main track', () => {
    const s = scenario({
      players: ['red', 'blue', 'yellow'],
      at: {
        'red-0': track(20),
        'red-1': safety(1),
        'blue-0': track(30),
        'blue-1': safety(0),
        'yellow-0': track(4),
      },
    })
    expect(keys(s, '11')).toEqual(['forward:red-0:11', 'swap:red-0:blue-0', 'swap:red-0:yellow-0'])
  })

  it('offers Bump! onto each opponent pawn on the main track, if you have a pawn in Start', () => {
    const s = scenario({
      at: { 'red-0': track(20), 'blue-0': track(30), 'blue-1': safety(2) },
    })
    expect(keys(s, 'Bump!')).toEqual(['bump:red-1:blue-0'])
    const allOut = scenario({ at: { 'red-0': track(20), 'red-1': track(21), 'blue-0': track(30) } })
    expect(keys(allOut, 'Bump!')).toEqual([])
  })

  it("doesn't move pawns that are Home", () => {
    const s = scenario({ at: { 'red-0': HOME, 'red-1': HOME } })
    expect(keys(s, '4')).toEqual([])
  })
})
