import { describe, expect, it } from 'vitest'
import { COUCHES, HOME, START, safety, track } from './board'
import { applyMove } from './apply'
import { drawCard, legalMoves, passTurn, playMove, snoozeTurn } from './game'
import { NAP_DIE_SIDES, canSnooze, napCheck } from './lazy'
import { moveKey } from './moves'
import { nextInt } from './rng'
import { currentColor, pawnById } from './state'
import { scenario, type Scenario } from './testing'
import type { GameState, Move } from './types'

const pos = (s: GameState, id: string) => pawnById(s, id).pos

/** An RNG state whose next nap roll is (or isn't) a nap. */
function rngThatNaps(naps: boolean): number {
  for (let rng = 1; ; rng++) if ((nextInt(rng, NAP_DIE_SIDES)[0] === 0) === naps) return rng
}

function withNap(opts: Scenario, naps = true): GameState {
  return { ...scenario({ ...opts, settings: { naps: true } }), rng: rngThatNaps(naps) }
}

describe('naps', () => {
  const fwd = (steps: number): Move => ({ kind: 'forward', pawn: 'red-0', steps })

  it('moves half the value, rounded down, on a nap', () => {
    const s = withNap({ card: '5', at: { 'red-0': track(10) } })
    const r = playMove(s, fwd(5))
    expect(pos(r.state, 'red-0')).toEqual(track(12))
    expect(r.events[0]).toEqual({ type: 'nap', pawn: 'red-0', steps: 5, moved: 2 })
  })

  it('moves the full value when the die says no nap', () => {
    const s = withNap({ card: '3', at: { 'red-0': track(10) } }, false)
    const r = playMove(s, fwd(3))
    expect(pos(r.state, 'red-0')).toEqual(track(13))
    expect(r.events.some((e) => e.type === 'nap')).toBe(false)
  })

  it('halves backward moves too', () => {
    const s = withNap({ card: '4', at: { 'red-0': track(10) } })
    const r = playMove(s, { kind: 'backward', pawn: 'red-0', steps: 4 })
    expect(pos(r.state, 'red-0')).toEqual(track(8))
  })

  it('does not move at all when napping on a 1', () => {
    const s = withNap({ card: '1', at: { 'red-0': track(10) } })
    const r = playMove(s, fwd(1))
    expect(pos(r.state, 'red-0')).toEqual(track(10))
    expect(r.events[0]).toEqual({ type: 'nap', pawn: 'red-0', steps: 1, moved: 0 })
    expect(currentColor(r.state)).toBe('blue')
  })

  it('stays put when the shorter move would land on its own pawn', () => {
    const s = withNap({ card: '8', at: { 'red-0': track(10), 'red-1': track(14) } })
    const r = playMove(s, fwd(8))
    expect(pos(r.state, 'red-0')).toEqual(track(10))
    expect(r.events[0]).toMatchObject({ type: 'nap', moved: 0 })
  })

  it('still bumps and slides wherever the shorter move lands', () => {
    // Red from 10 meant to go 10, napped to 5: lands on blue's slide start (15).
    const s = withNap({ card: '10', at: { 'red-0': track(10), 'blue-0': track(17) } })
    const r = playMove(s, fwd(10))
    expect(pos(r.state, 'red-0')).toEqual(track(18))
    expect(pos(r.state, 'blue-0')).toEqual(START)
  })

  it('never naps when leaving Start, bumping or swapping', () => {
    const swap: Move = { kind: 'swap', pawn: 'red-0', target: 'blue-0' }
    const s = withNap({ card: '11', at: { 'red-0': track(10), 'blue-0': track(30) } })
    expect(napCheck(s, swap)).toEqual({ move: swap, rng: s.rng, events: [] })
    expect(napCheck(s, { kind: 'leaveStart', pawn: 'red-1' }).events).toEqual([])
    expect(napCheck(s, { kind: 'bump', pawn: 'red-1', target: 'blue-0' }).events).toEqual([])
  })

  it('never rolls when naps are off', () => {
    const s = { ...scenario({ card: '5', at: { 'red-0': track(10) } }), rng: rngThatNaps(true) }
    expect(napCheck(s, fwd(5))).toEqual({ move: fwd(5), rng: s.rng, events: [] })
  })

  it('naps about 1 time in 6', () => {
    let rng = 1
    let naps = 0
    const s = scenario({ at: { 'red-0': track(10) }, settings: { naps: true } })
    for (let i = 0; i < 6000; i++) {
      const check = napCheck({ ...s, rng }, fwd(5))
      rng = check.rng
      if (check.events.length) naps++
    }
    expect(naps).toBeGreaterThan(850)
    expect(naps).toBeLessThan(1150)
  })
})

describe('couches', () => {
  const couches = { couches: true }

  it('puts one couch on each side, after the slide', () => {
    expect(COUCHES).toEqual([9, 19, 29, 39])
  })

  it('puts a pawn that lands on a couch to sleep', () => {
    const s = scenario({ card: '3', at: { 'red-0': track(16) }, settings: couches })
    const r = playMove(s, { kind: 'forward', pawn: 'red-0', steps: 3 })
    expect(r.state.asleep).toEqual({ 'red-0': 0 })
    expect(r.events).toContainEqual({ type: 'sleep', pawn: 'red-0' })
  })

  it('does nothing when couches are off', () => {
    const s = scenario({ card: '3', at: { 'red-0': track(16) } })
    expect(playMove(s, { kind: 'forward', pawn: 'red-0', steps: 3 }).state.asleep).toEqual({})
  })

  it("keeps a sleeping pawn out of its owner's next turn", () => {
    const s = scenario({
      card: '5',
      at: { 'red-0': track(19), 'red-1': track(30) },
      asleep: { 'red-0': -1 },
      settings: couches,
    })
    expect(legalMoves(s).map(moveKey)).toEqual(['forward:red-1:5'])
  })

  it('lets a sleeping pawn move when it is the only legal move, waking it up', () => {
    const s = scenario({
      card: '5',
      at: { 'red-0': track(19) },
      asleep: { 'red-0': -1 },
      settings: couches,
    })
    expect(legalMoves(s).map(moveKey)).toEqual(['forward:red-0:5'])
    const r = playMove(s, { kind: 'forward', pawn: 'red-0', steps: 5 })
    expect(r.state.asleep).toEqual({})
  })

  it('does not hold back a pawn that fell asleep earlier this turn (after a 2)', () => {
    const s = scenario({
      card: '5',
      at: { 'red-0': track(19), 'red-1': track(30) },
      asleep: { 'red-0': 0 },
      settings: couches,
    })
    expect(legalMoves(s)).toHaveLength(2)
  })

  it("wakes up after its owner's next turn, even if it didn't move", () => {
    let s = scenario({
      card: '3',
      at: { 'red-0': track(16), 'red-1': track(30) },
      settings: couches,
    })
    s = playMove(s, { kind: 'forward', pawn: 'red-0', steps: 3 }).state // red-0 falls asleep
    s = passTurn({ ...s, phase: 'move', card: '5' }).state // blue has nothing to move
    expect(s.asleep).toEqual({ 'red-0': 0 }) // red hasn't had a turn yet
    s = { ...s, phase: 'move', card: '5' }
    expect(legalMoves(s).map(moveKey)).toEqual(['forward:red-1:5'])
    const r = playMove(s, { kind: 'forward', pawn: 'red-1', steps: 5 })
    expect(pos(r.state, 'red-0')).toEqual(track(19))
    expect(r.state.asleep).toEqual({})
    expect(r.events).toContainEqual({ type: 'wake', pawn: 'red-0' })
  })

  it('makes a sleeping pawn easy to bump: landing next to it counts', () => {
    const s = scenario({
      card: '3',
      at: { 'blue-0': track(5), 'red-0': track(9) },
      asleep: { 'red-0': -1 },
      settings: couches,
      players: ['blue', 'red'],
    })
    const r = applyMove(s, { kind: 'forward', pawn: 'blue-0', steps: 3 })
    expect(pos(r.state, 'red-0')).toEqual(START)
    expect(r.state.asleep).toEqual({})
    expect(r.events).toContainEqual({ type: 'bump', pawn: 'red-0', by: 'blue-0' })
  })

  it('counts the square after a slide as where the pawn lands', () => {
    // Red lands on blue's slide (15) and slides to 18, next to blue sleeping on its couch (19).
    const s = scenario({
      card: '3',
      at: { 'red-0': track(12), 'blue-0': track(19) },
      asleep: { 'blue-0': -1 },
      settings: couches,
    })
    const r = applyMove(s, { kind: 'forward', pawn: 'red-0', steps: 3 })
    expect(pos(r.state, 'red-0')).toEqual(track(18))
    expect(pos(r.state, 'blue-0')).toEqual(START)
  })

  it('does not bump awake pawns next door, or your own sleepers', () => {
    const s = scenario({
      card: '3',
      at: { 'red-0': track(5), 'red-1': track(9), 'blue-0': track(7) },
      asleep: { 'red-1': -1 },
      settings: couches,
    })
    const r = applyMove(s, { kind: 'forward', pawn: 'red-0', steps: 3 })
    expect(pos(r.state, 'red-1')).toEqual(track(9))
    expect(pos(r.state, 'blue-0')).toEqual(track(7))
  })

  it('wraps around the board when checking neighbors', () => {
    const s = scenario({
      card: '1',
      at: { 'red-0': track(38), 'blue-0': track(0) },
      asleep: { 'blue-0': -1 },
      settings: couches,
    })
    const r = applyMove(s, { kind: 'forward', pawn: 'red-0', steps: 1 })
    expect(pos(r.state, 'blue-0')).toEqual(START)
    expect(r.state.asleep).toEqual({ 'red-0': 0 }) // and red landed on green's couch (39)
  })

  it('does not bump the pawn it swapped with', () => {
    const s = scenario({
      card: '11',
      at: { 'red-0': track(18), 'blue-0': track(19) },
      asleep: { 'blue-0': -1 },
      settings: couches,
    })
    const r = applyMove(s, { kind: 'swap', pawn: 'red-0', target: 'blue-0' })
    expect(pos(r.state, 'blue-0')).toEqual(track(18))
    expect(r.state.asleep).toEqual({ 'blue-0': -1, 'red-0': 0 })
  })
})

describe('snooze', () => {
  const snooze = { snooze: true }

  it('skips the turn and keeps the card for next time', () => {
    const s = scenario({ card: '8', settings: snooze, drawPile: ['3', '5'] })
    expect(canSnooze(s)).toBe(true)
    const r = snoozeTurn(s)
    expect(r.events).toEqual([{ type: 'snooze', color: 'red', card: '8' }])
    expect(r.state).toMatchObject({ card: null, kept: { red: '8' }, snoozed: ['red'], turn: 1 })
    expect(currentColor(r.state)).toBe('blue')
    expect(r.state.discardPile).toEqual([])

    let t = drawCard(r.state).state // blue draws the 3
    t = passTurn(t).state
    const back = drawCard(t)
    expect(back.events).toEqual([{ type: 'draw', color: 'red', card: '8', kept: true }])
    expect(back.state).toMatchObject({ card: '8', kept: {}, drawPile: ['5'] })
  })

  it('works only once per game', () => {
    const s = { ...scenario({ card: '8', settings: snooze }), snoozed: ['red' as const] }
    expect(canSnooze(s)).toBe(false)
    expect(() => snoozeTurn(s)).toThrow(/snooze/)
  })

  it('is not allowed when snooze is off, or before drawing', () => {
    expect(canSnooze(scenario({ card: '8' }))).toBe(false)
    expect(canSnooze(scenario({ settings: snooze }))).toBe(false)
  })

  it('counts as a turn for waking sleepers', () => {
    const s = scenario({
      card: '8',
      at: { 'red-0': track(9) },
      asleep: { 'red-0': -1 },
      settings: { snooze: true, couches: true },
    })
    expect(snoozeTurn(s).state.asleep).toEqual({})
  })

  it('lets a pawn with a kept card reach Home on a later turn', () => {
    const s = scenario({
      card: '1',
      at: { 'red-0': HOME, 'red-1': safety(2) },
      settings: snooze,
    })
    let t = snoozeTurn(s).state
    t = passTurn({ ...t, phase: 'move', card: '5' }).state
    t = drawCard(t).state
    expect(playMove(t, { kind: 'forward', pawn: 'red-1', steps: 1 }).state.winner).toBe('red')
  })
})
