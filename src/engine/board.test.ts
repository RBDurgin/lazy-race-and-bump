import { describe, expect, it } from 'vitest'
import { HOME, SLIDES, START, safety, safetyEntry, slideAt, startExit, track, walk } from './board'

describe('board geometry', () => {
  it('places each color’s landmarks on its own side', () => {
    expect([safetyEntry('red'), startExit('red')]).toEqual([1, 3])
    expect([safetyEntry('blue'), startExit('blue')]).toEqual([11, 13])
    expect([safetyEntry('green'), startExit('green')]).toEqual([31, 33])
  })

  it('has one 4-square slide per side', () => {
    expect(SLIDES.map((s) => [s.color, s.start, s.end])).toEqual([
      ['red', 5, 8],
      ['blue', 15, 18],
      ['yellow', 25, 28],
      ['green', 35, 38],
    ])
    expect(slideAt(15)?.color).toBe('blue')
    expect(slideAt(16)).toBeUndefined()
  })
})

describe('walk', () => {
  it('moves forward around the track and wraps past 39', () => {
    expect(walk('blue', track(13), 5)).toEqual(track(18))
    expect(walk('blue', track(38), 4)).toEqual(track(2))
  })

  it('turns into the safety zone at the safety entry, then Home', () => {
    expect(walk('red', track(38), 3)).toEqual(track(1))
    expect(walk('red', track(38), 5)).toEqual(safety(1))
    expect(walk('red', track(1), 4)).toEqual(HOME)
  })

  it('rejects overshooting Home', () => {
    expect(walk('red', safety(1), 2)).toEqual(HOME)
    expect(walk('red', safety(1), 3)).toBeNull()
    expect(walk('red', HOME, 1)).toBeNull()
  })

  it('moves backward out of the safety zone onto the track', () => {
    expect(walk('red', safety(0), -4)).toEqual(track(38))
    expect(walk('red', safety(2), -1)).toEqual(safety(1))
  })

  it('wraps backward past square 0, giving a shortcut to the safety zone', () => {
    expect(walk('red', track(3), -4)).toEqual(track(39))
    expect(walk('red', track(39), 3)).toEqual(safety(0))
  })

  it("can't move pawns in Start or Home", () => {
    expect(walk('red', START, 1)).toBeNull()
    expect(walk('red', START, -4)).toBeNull()
    expect(walk('red', HOME, -1)).toBeNull()
  })
})
