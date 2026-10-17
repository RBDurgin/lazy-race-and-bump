// Board geometry in SVG units: the board is an 11×11 grid of 1-unit cells, and the 40 track
// squares run clockwise around its edge. Each color's side is drawn in "local" coordinates as if
// it were the top row (x along the side, y pointing inward), then rotated into place.
import { SIDE_LENGTH, SLIDES, safetyEntry, samePos, sideStart, startExit } from '../engine/board'
import { COLORS, type Color, type GameState, type Pawn, type PawnPos } from '../engine/types'

export const BOARD_SIZE = SIDE_LENGTH + 1

export interface Point {
  x: number
  y: number
}

const sideOf = (color: Color) => COLORS.indexOf(color)

/** Rotates a local point onto `side` (0 = top, then clockwise). */
function place(side: number, x: number, y: number): Point {
  let p = { x, y }
  for (let i = 0; i < side; i++) p = { x: BOARD_SIZE - p.y, y: p.x }
  return p
}

/** Center of a main-track square. */
export function trackPoint(square: number): Point {
  return place(Math.floor(square / SIDE_LENGTH), (square % SIDE_LENGTH) + 0.5, 0.5)
}

const entryX = (color: Color) => safetyEntry(color) - sideStart(color) + 0.5
const exitX = (color: Color) => startExit(color) - sideStart(color) + 0.5

/** Center of a safety-zone square: a column running inward from the safety entry. */
export function safetyPoint(color: Color, index: number): Point {
  return place(sideOf(color), entryX(color), 1.5 + index)
}

export const START_RADIUS = 0.75
export const HOME_RADIUS = 0.7

export function startPoint(color: Color): Point {
  return place(sideOf(color), exitX(color), 2.1)
}

export function homePoint(color: Color): Point {
  return place(sideOf(color), entryX(color), 4.75)
}

/** Where the "Start" and "Home" labels go: just inward of each circle, whatever the side. */
export function startLabelPoint(color: Color): Point {
  return place(sideOf(color), exitX(color), 2.1 + START_RADIUS + 0.4)
}

export function homeLabelPoint(color: Color): Point {
  return place(sideOf(color), entryX(color), 4.75 + HOME_RADIUS + 0.4)
}

/** Where a pawn sits. Pawns sharing Start or Home are spread side by side by `slot`. */
export function pawnPoint(color: Color, pos: PawnPos, slot = 0): Point {
  const spread = (p: Point) => ({ x: p.x + (slot === 0 ? -0.34 : 0.34), y: p.y })
  switch (pos.kind) {
    case 'start':
      return spread(startPoint(color))
    case 'home':
      return spread(homePoint(color))
    case 'track':
      return trackPoint(pos.square)
    case 'safety':
      return safetyPoint(color, pos.index)
  }
}

/** Which of a color's two pawns this is among those sharing Start or Home, for spacing. */
export function slotOf(game: GameState, pawn: Pawn): number {
  if (pawn.pos.kind !== 'start' && pawn.pos.kind !== 'home') return 0
  return game.pawns
    .filter((p) => p.color === pawn.color && samePos(p.pos, pawn.pos))
    .findIndex((p) => p.id === pawn.id)
}

/** Where a pawn is drawn in `game`. */
export function pawnSpot(game: GameState, pawn: Pawn): Point {
  return pawnPoint(pawn.color, pawn.pos, slotOf(game, pawn))
}

export interface SlideShape {
  color: Color
  from: Point
  to: Point
}

export const SLIDE_SHAPES: readonly SlideShape[] = SLIDES.map((s) => ({
  color: s.color,
  from: trackPoint(s.start),
  to: trackPoint(s.end),
}))
