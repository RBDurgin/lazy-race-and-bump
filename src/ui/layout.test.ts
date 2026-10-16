import { describe, expect, it } from 'vitest'
import { SAFETY_LENGTH, TRACK_LENGTH, startExit } from '../engine/board'
import { COLORS } from '../engine/types'
import { BOARD_SIZE, homePoint, safetyPoint, startPoint, trackPoint, type Point } from './layout'

const key = (p: Point) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

describe('board layout', () => {
  const track = Array.from({ length: TRACK_LENGTH }, (_, i) => trackPoint(i))

  it('puts all 40 track squares on distinct cells around the edge', () => {
    expect(new Set(track.map(key)).size).toBe(TRACK_LENGTH)
    for (const p of track) {
      const onEdge = [p.x, p.y].some((v) => v === 0.5 || v === BOARD_SIZE - 0.5)
      expect(onEdge).toBe(true)
    }
  })

  it('runs the track clockwise in adjacent cells', () => {
    for (let i = 0; i < TRACK_LENGTH; i++) {
      expect(dist(track[i], track[(i + 1) % TRACK_LENGTH])).toBeCloseTo(1)
    }
    expect(track[0]).toEqual({ x: 0.5, y: 0.5 })
    expect(track[10]).toEqual({ x: BOARD_SIZE - 0.5, y: 0.5 })
  })

  it('keeps safety zones, Start and Home inside the track without overlapping', () => {
    const inner = COLORS.flatMap((c) => [
      ...Array.from({ length: SAFETY_LENGTH }, (_, i) => safetyPoint(c, i)),
      startPoint(c),
      homePoint(c),
    ])
    expect(new Set(inner.map(key)).size).toBe(inner.length)
    for (const p of inner) {
      expect(Math.min(...track.map((t) => dist(p, t)))).toBeGreaterThanOrEqual(1)
    }
  })

  it('places each Start area next to its exit square and safety zone next to its entry', () => {
    for (const c of COLORS) {
      expect(dist(startPoint(c), trackPoint(startExit(c)))).toBeLessThan(2)
      expect(
        dist(
          safetyPoint(c, 0),
          track.find((_, i) => i === startExit(c) - 2)!,
        ),
      ).toBeCloseTo(1)
    }
  })
})
