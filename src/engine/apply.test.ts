import { describe, expect, it } from 'vitest'
import { HOME, START, safety, track } from './board'
import { applyMove } from './apply'
import { pawnById } from './state'
import { deepFreeze, scenario } from './testing'
import type { GameState } from './types'

const pos = (s: GameState, id: string) => pawnById(s, id).pos

describe('applyMove', () => {
  it('moves the pawn and reports it', () => {
    const s = scenario({ at: { 'red-0': track(10) } })
    const r = applyMove(s, { kind: 'forward', pawn: 'red-0', steps: 3 })
    expect(pos(r.state, 'red-0')).toEqual(track(13))
    expect(r.events).toEqual([{ type: 'move', pawn: 'red-0', from: track(10), to: track(13) }])
  })

  it('bumps an opponent it lands on back to Start', () => {
    const s = scenario({ at: { 'red-0': track(10), 'blue-0': track(13) } })
    const r = applyMove(s, { kind: 'forward', pawn: 'red-0', steps: 3 })
    expect(pos(r.state, 'blue-0')).toEqual(START)
    expect(r.events[1]).toEqual({ type: 'bump', pawn: 'blue-0', by: 'red-0' })
  })

  it('bumps an opponent sitting on the Start exit', () => {
    const s = scenario({ at: { 'blue-0': track(3) } })
    const r = applyMove(s, { kind: 'leaveStart', pawn: 'red-0' })
    expect(pos(r.state, 'red-0')).toEqual(track(3))
    expect(pos(r.state, 'blue-0')).toEqual(START)
  })

  it('jumps over pawns it passes without bumping them', () => {
    const s = scenario({ at: { 'red-0': track(10), 'blue-0': track(11) } })
    const r = applyMove(s, { kind: 'forward', pawn: 'red-0', steps: 3 })
    expect(pos(r.state, 'blue-0')).toEqual(track(11))
  })

  describe('slides', () => {
    it("slides to the end of another color's slide, bumping everyone on it", () => {
      const s = scenario({
        at: {
          'red-0': track(12),
          'red-1': track(17),
          'blue-0': track(16),
          'blue-1': track(18),
        },
      })
      const r = applyMove(s, { kind: 'forward', pawn: 'red-0', steps: 3 })
      expect(pos(r.state, 'red-0')).toEqual(track(18))
      expect(pos(r.state, 'red-1')).toEqual(START)
      expect(pos(r.state, 'blue-0')).toEqual(START)
      expect(pos(r.state, 'blue-1')).toEqual(START)
      expect(r.events.map((e) => e.type)).toEqual(['move', 'slide', 'bump', 'bump', 'bump'])
    })

    it('bumps an opponent on the slide start, then slides', () => {
      const s = scenario({ at: { 'red-0': track(12), 'blue-0': track(15) } })
      const r = applyMove(s, { kind: 'forward', pawn: 'red-0', steps: 3 })
      expect(pos(r.state, 'red-0')).toEqual(track(18))
      expect(pos(r.state, 'blue-0')).toEqual(START)
    })

    it("doesn't slide on your own color's slide", () => {
      const s = scenario({ at: { 'blue-0': track(13) }, players: ['blue', 'red'] })
      const r = applyMove(s, { kind: 'forward', pawn: 'blue-0', steps: 2 })
      expect(pos(r.state, 'blue-0')).toEqual(track(15))
      expect(r.events.map((e) => e.type)).toEqual(['move'])
    })

    it('slides after a backward move too', () => {
      const s = scenario({ at: { 'red-0': track(19) } })
      const r = applyMove(s, { kind: 'backward', pawn: 'red-0', steps: 4 })
      expect(pos(r.state, 'red-0')).toEqual(track(18))
    })

    it('only slides when landing exactly on the slide start', () => {
      const s = scenario({ at: { 'red-0': track(12) } })
      const r = applyMove(s, { kind: 'forward', pawn: 'red-0', steps: 4 })
      expect(pos(r.state, 'red-0')).toEqual(track(16))
    })
  })

  describe('11 swap', () => {
    it('trades places with the opponent without bumping it', () => {
      const s = scenario({ at: { 'red-0': track(20), 'blue-0': track(30) } })
      const r = applyMove(s, { kind: 'swap', pawn: 'red-0', target: 'blue-0' })
      expect(pos(r.state, 'red-0')).toEqual(track(30))
      expect(pos(r.state, 'blue-0')).toEqual(track(20))
      expect(r.events).toEqual([{ type: 'swap', pawn: 'red-0', target: 'blue-0' }])
    })

    it('slides when the swap lands on a slide start', () => {
      const s = scenario({ at: { 'red-0': track(20), 'blue-0': track(25), 'blue-1': track(27) } })
      const r = applyMove(s, { kind: 'swap', pawn: 'red-0', target: 'blue-0' })
      expect(pos(r.state, 'red-0')).toEqual(track(28))
      expect(pos(r.state, 'blue-0')).toEqual(track(20))
      expect(pos(r.state, 'blue-1')).toEqual(START)
    })
  })

  describe('Bump!', () => {
    it('moves a pawn from Start onto the target and sends the target to Start', () => {
      const s = scenario({ at: { 'blue-0': track(30) } })
      const r = applyMove(s, { kind: 'bump', pawn: 'red-0', target: 'blue-0' })
      expect(pos(r.state, 'red-0')).toEqual(track(30))
      expect(pos(r.state, 'blue-0')).toEqual(START)
      expect(r.events).toEqual([
        { type: 'move', pawn: 'red-0', from: START, to: track(30) },
        { type: 'bump', pawn: 'blue-0', by: 'red-0' },
      ])
    })

    it('slides when the target is on a slide start', () => {
      const s = scenario({ at: { 'blue-0': track(35) } })
      const r = applyMove(s, { kind: 'bump', pawn: 'red-0', target: 'blue-0' })
      expect(pos(r.state, 'red-0')).toEqual(track(38))
    })
  })

  describe('safety zone and Home', () => {
    it('moves backward out of the safety zone onto the track, bumping there', () => {
      const s = scenario({ at: { 'red-0': safety(1), 'blue-0': track(39) } })
      const r = applyMove(s, { kind: 'backward', pawn: 'red-0', steps: 4 })
      expect(pos(r.state, 'red-0')).toEqual(track(39))
      expect(pos(r.state, 'blue-0')).toEqual(START)
    })

    it('moves backward within the safety zone', () => {
      const s = scenario({ at: { 'red-0': safety(2) } })
      const r = applyMove(s, { kind: 'backward', pawn: 'red-0', steps: 1 })
      expect(pos(r.state, 'red-0')).toEqual(safety(1))
    })

    it('reports reaching Home', () => {
      const s = scenario({ at: { 'red-0': track(38) } })
      const r = applyMove(s, { kind: 'forward', pawn: 'red-0', steps: 7 })
      expect(pos(r.state, 'red-0')).toEqual(HOME)
      expect(r.events.at(-1)).toEqual({ type: 'home', pawn: 'red-0' })
    })
  })

  it('never mutates the input state', () => {
    const s = deepFreeze(scenario({ at: { 'red-0': track(12), 'blue-0': track(16) } }))
    const before = structuredClone(s)
    applyMove(s, { kind: 'forward', pawn: 'red-0', steps: 3 })
    expect(s).toEqual(before)
  })
})
