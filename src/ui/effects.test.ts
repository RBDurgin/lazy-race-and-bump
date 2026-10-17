import { describe, expect, it } from 'vitest'
import { applyMove } from '../engine/apply'
import { HOME, START, safety, track } from '../engine/board'
import { drawCard } from '../engine/game'
import { scenario } from '../engine/testing'
import type { GameEvent, GameState, Move } from '../engine/types'
import { effectsFor, walkPath } from './effects'
import { pawnPoint } from './layout'

function play(state: GameState, move: Move, extra: GameEvent[] = []) {
  const r = applyMove(state, move)
  return effectsFor(state, r.state, [...extra, ...r.events])
}

describe('walkPath', () => {
  it('lists the squares between two spots, forward or backward', () => {
    expect(walkPath('red', track(10), track(13))).toEqual([track(11), track(12)])
    expect(walkPath('red', track(13), track(10))).toEqual([track(12), track(11)])
  })

  it('turns into the safety zone and wraps around the track', () => {
    expect(walkPath('red', track(39), safety(1))).toEqual([track(0), track(1), safety(0)])
    expect(walkPath('red', track(1), track(38))).toEqual([track(0), track(39)])
  })

  it('jumps straight out of Start', () => {
    expect(walkPath('red', START, track(3))).toEqual([])
  })
})

describe('effectsFor', () => {
  it('walks the mover square by square', () => {
    const s = scenario({ at: { 'red-0': track(10) } })
    const fx = play(s, { kind: 'forward', pawn: 'red-0', steps: 3 })
    expect(fx.motions).toHaveLength(1)
    const [m] = fx.motions
    expect(m.points).toEqual([10, 11, 12, 13].map((sq) => pawnPoint('red', track(sq))))
    expect(m.offsets).toEqual([0, 1 / 3, 2 / 3, 1])
    expect(m.delay).toBe(0)
    expect(fx.cues).toEqual([{ sound: 'move', delay: 0 }])
    expect(fx.bursts).toEqual([])
  })

  it('keeps long walks short', () => {
    const s = scenario({ at: { 'red-0': track(10) } })
    const fx = play(s, { kind: 'forward', pawn: 'red-0', steps: 11 })
    expect(fx.motions[0].points).toHaveLength(12)
    expect(fx.motions[0].duration).toBeLessThanOrEqual(650)
  })

  it('slides after the walk, with its own sound', () => {
    const s = scenario({ at: { 'red-0': track(12) } })
    const fx = play(s, { kind: 'forward', pawn: 'red-0', steps: 3 })
    const [m] = fx.motions
    expect(m.points.at(-2)).toEqual(pawnPoint('red', track(15)))
    expect(m.points.at(-1)).toEqual(pawnPoint('red', track(18)))
    expect(fx.cues.map((c) => c.sound)).toEqual(['move', 'slide'])
    expect(fx.cues[1].delay).toBeGreaterThan(0)
    expect(fx.cues[1].delay).toBeLessThan(m.duration)
  })

  it('sends a bumped pawn back to Start once the mover arrives, with a burst', () => {
    const s = scenario({ at: { 'red-0': track(10), 'blue-0': track(13) } })
    const fx = play(s, { kind: 'forward', pawn: 'red-0', steps: 3 })
    const mover = fx.motions.find((m) => m.pawn === 'red-0')!
    const victim = fx.motions.find((m) => m.pawn === 'blue-0')!
    expect(victim.delay).toBe(mover.duration)
    expect(victim.points[0]).toEqual(pawnPoint('blue', track(13)))
    // The returning pawn takes the first Start slot; its twin shuffles over to make room.
    expect(victim.points[1]).toEqual(pawnPoint('blue', START, 0))
    const twin = fx.motions.find((m) => m.pawn === 'blue-1')!
    expect(twin.points).toEqual([pawnPoint('blue', START, 0), pawnPoint('blue', START, 1)])
    expect(twin.delay).toBe(mover.duration)
    expect(fx.bursts).toEqual([
      { kind: 'bump', at: pawnPoint('blue', track(13)), delay: mover.duration },
    ])
    expect(fx.cues).toContainEqual({ sound: 'bump', delay: mover.duration })
    expect(fx.end).toBe(mover.duration + 700)
  })

  it('moves both pawns in a swap', () => {
    const s = scenario({ at: { 'red-0': track(10), 'blue-0': track(25) } })
    const fx = play(s, { kind: 'swap', pawn: 'red-0', target: 'blue-0' })
    expect(fx.motions.map((m) => m.pawn).sort()).toEqual(['blue-0', 'red-0'])
    const blue = fx.motions.find((m) => m.pawn === 'blue-0')!
    expect(blue.points).toEqual([pawnPoint('blue', track(25)), pawnPoint('blue', track(10))])
  })

  it('celebrates reaching Home', () => {
    const s = scenario({ at: { 'red-0': safety(1) } })
    const fx = play(s, { kind: 'forward', pawn: 'red-0', steps: 2 })
    expect(fx.bursts.map((b) => b.kind)).toEqual(['home'])
    expect(fx.motions[0].points.at(-1)).toEqual(pawnPoint('red', HOME, 0))
    expect(fx.cues.map((c) => c.sound)).toEqual(['move', 'home'])
  })

  it('nudges a Start neighbor over when its twin leaves', () => {
    // red-1 is listed second in Start, so it sits in slot 1 until red-0 leaves.
    const s = scenario({})
    const fx = play(s, { kind: 'leaveStart', pawn: 'red-1' })
    expect(fx.motions.map((m) => m.pawn)).toEqual(['red-1'])
    const s2 = scenario({})
    const fx2 = play(s2, { kind: 'leaveStart', pawn: 'red-0' })
    const nudge = fx2.motions.find((m) => m.pawn === 'red-1')!
    expect(nudge.points).toEqual([pawnPoint('red', START, 1), pawnPoint('red', START, 0)])
  })

  it('puffs a nap and plays its sound', () => {
    const s = scenario({ at: { 'red-0': track(10) } })
    const nap: GameEvent = { type: 'nap', pawn: 'red-0', steps: 3, moved: 1 }
    const fx = play(s, { kind: 'forward', pawn: 'red-0', steps: 1 }, [nap])
    expect(fx.bursts).toEqual([{ kind: 'nap', at: pawnPoint('red', track(10)), delay: 0 }])
    expect(fx.cues.map((c) => c.sound)).toEqual(['move', 'nap'])
  })

  it('only plays a sound for a draw', () => {
    const s = scenario({})
    const r = drawCard(s)
    expect(effectsFor(s, r.state, r.events)).toEqual({
      motions: [],
      bursts: [],
      cues: [{ sound: 'draw', delay: 0 }],
      end: 0,
    })
  })
})

describe('keyframe offsets', () => {
  it('stay within 0–1 and end on exactly 1, however many squares the walk takes', () => {
    // The Web Animations API throws on an offset even a hair over 1, which crashed the board.
    for (let steps = 1; steps <= 11; steps++) {
      for (const from of [4, 9, 17, 22]) {
        const s = scenario({ at: { 'red-0': track(from) } })
        const move: Move = { kind: 'forward', pawn: 'red-0', steps }
        const { state, events } = applyMove(s, move)
        for (const m of effectsFor(s, state, events).motions) {
          expect(m.offsets.every((o) => o >= 0 && o <= 1)).toBe(true)
          expect(m.offsets.at(-1)).toBe(1)
        }
      }
    }
  })
})
