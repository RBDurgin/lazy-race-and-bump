import { describe, expect, it } from 'vitest'
import { HOME, START, safety, track } from '../engine/board'
import { raceTurns } from './race'

describe('raceTurns', () => {
  it('is zero at Home and grows with distance', () => {
    expect(raceTurns('red', HOME, HOME)).toBe(0)
    const start = raceTurns('red', START, START)
    const one = raceTurns('red', HOME, START)
    expect(one).toBeGreaterThan(0)
    expect(start).toBeGreaterThan(one)
  })

  it('values a pawn on its Start exit for the backward-4 shortcut', () => {
    // Square 3 is 42 steps from Home but a `4` puts it 6 steps away, so it beats square 20.
    expect(raceTurns('red', HOME, track(3))).toBeLessThan(raceTurns('red', HOME, track(20)) + 3)
    expect(raceTurns('red', HOME, track(3))).toBeLessThan(raceTurns('red', HOME, START))
  })

  it('knows Home needs an exact count: one step out still takes several turns', () => {
    // Only a `1` finishes (6 cards in 40), though a `4` or `10` can back up for another try.
    expect(raceTurns('red', HOME, safety(2))).toBeGreaterThan(5)
  })

  it('is the same for every color, rotated onto its own side', () => {
    expect(raceTurns('blue', track(13), track(30))).toBeCloseTo(
      raceTurns('red', track(3), track(20)),
    )
    expect(raceTurns('green', START, safety(1))).toBeCloseTo(raceTurns('red', START, safety(1)))
  })

  it('doesn’t care which pawn is which', () => {
    expect(raceTurns('red', track(7), safety(0))).toBeCloseTo(raceTurns('red', safety(0), track(7)))
  })
})
