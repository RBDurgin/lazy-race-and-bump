import { describe, expect, it } from 'vitest'
import { nextFloat, nextInt, shuffle } from './rng'

describe('rng', () => {
  it('is deterministic for a seed', () => {
    expect(nextFloat(42)).toEqual(nextFloat(42))
    expect(nextFloat(42)[0]).not.toEqual(nextFloat(43)[0])
  })

  it('produces floats in [0, 1) and ints in [0, n)', () => {
    let state = 7
    for (let i = 0; i < 1000; i++) {
      let f: number, n: number
      ;[f, state] = nextFloat(state)
      ;[n, state] = nextInt(state, 6)
      expect(f).toBeGreaterThanOrEqual(0)
      expect(f).toBeLessThan(1)
      expect(Number.isInteger(n) && n >= 0 && n < 6).toBe(true)
    }
  })

  it('hits every value of nextInt roughly evenly', () => {
    const counts = Array(6).fill(0)
    let state = 1
    for (let i = 0; i < 6000; i++) {
      let n: number
      ;[n, state] = nextInt(state, 6)
      counts[n]++
    }
    for (const c of counts) expect(c).toBeGreaterThan(850)
  })

  it('shuffles into a permutation without mutating the input', () => {
    const input = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    const [out, next] = shuffle(input, 99)
    expect([...out].sort((a, b) => a - b)).toEqual(input)
    expect(out).not.toEqual(input)
    expect(next).not.toBe(99)
    expect(shuffle(input, 99)[0]).toEqual(out)
  })
})
