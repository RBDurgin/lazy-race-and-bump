import { COLORS, type Color, type PawnPos } from './types'

export const TRACK_LENGTH = 40
export const SIDE_LENGTH = TRACK_LENGTH / COLORS.length
export const SAFETY_LENGTH = 3
export const SLIDE_LENGTH = 4
export const PAWNS_PER_PLAYER = 2

// Offsets from the first square of each color's side.
const SAFETY_ENTRY_OFFSET = 1
const START_EXIT_OFFSET = 3
const SLIDE_START_OFFSET = 5
const COUCH_OFFSET = 9

export const START: PawnPos = { kind: 'start' }
export const HOME: PawnPos = { kind: 'home' }
export const track = (square: number): PawnPos => ({ kind: 'track', square })
export const safety = (index: number): PawnPos => ({ kind: 'safety', index })

export const wrap = (square: number) => ((square % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH

export function sideStart(color: Color): number {
  return COLORS.indexOf(color) * SIDE_LENGTH
}

/** The square a pawn lands on when it leaves Start. */
export function startExit(color: Color): number {
  return sideStart(color) + START_EXIT_OFFSET
}

/** The last track square before the color's safety zone. */
export function safetyEntry(color: Color): number {
  return sideStart(color) + SAFETY_ENTRY_OFFSET
}

export interface Slide {
  color: Color
  start: number
  end: number
}

export const SLIDES: readonly Slide[] = COLORS.map((color) => {
  const start = sideStart(color) + SLIDE_START_OFFSET
  return { color, start, end: start + SLIDE_LENGTH - 1 }
})

/** The slide that begins on `square`, if any. */
export function slideAt(square: number): Slide | undefined {
  return SLIDES.find((s) => s.start === square)
}

/** One couch square per side. */
export const COUCHES: readonly number[] = COLORS.map((color) => sideStart(color) + COUCH_OFFSET)

export function isCouch(square: number): boolean {
  return COUCHES.includes(square)
}

export function samePos(a: PawnPos, b: PawnPos): boolean {
  switch (a.kind) {
    case 'track':
      return b.kind === 'track' && a.square === b.square
    case 'safety':
      return b.kind === 'safety' && a.index === b.index
    default:
      return a.kind === b.kind
  }
}

/** One step along `color`'s path. Null when there's nowhere to go (Start, or past Home). */
export function stepForward(color: Color, pos: PawnPos): PawnPos | null {
  switch (pos.kind) {
    case 'track':
      return pos.square === safetyEntry(color) ? safety(0) : track(wrap(pos.square + 1))
    case 'safety':
      return pos.index < SAFETY_LENGTH - 1 ? safety(pos.index + 1) : HOME
    default:
      return null
  }
}

/** One step backward. Leaving the safety zone backward returns to the safety entry square. */
export function stepBackward(color: Color, pos: PawnPos): PawnPos | null {
  switch (pos.kind) {
    case 'track':
      return track(wrap(pos.square - 1))
    case 'safety':
      return pos.index > 0 ? safety(pos.index - 1) : track(safetyEntry(color))
    default:
      return null
  }
}

/** Walks `steps` squares (negative = backward). Null if the walk is impossible. */
export function walk(color: Color, pos: PawnPos, steps: number): PawnPos | null {
  const step = steps >= 0 ? stepForward : stepBackward
  let p: PawnPos | null = pos
  for (let i = 0; i < Math.abs(steps) && p; i++) p = step(color, p)
  return p
}
