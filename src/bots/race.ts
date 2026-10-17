// The solo race table: how many turns one player needs, on average, to get both pawns Home if
// nobody else were on the board. Hard uses it instead of counting steps, because steps undersell
// some squares: a pawn on its Start exit is 42 steps out, but a `4` takes it 6 steps from Home.
import {
  SAFETY_LENGTH,
  START,
  TRACK_LENGTH,
  sideStart,
  slideAt,
  startExit,
  track,
  walk,
  wrap,
} from '../engine/board'
import { DECK_COUNTS, buildDeck } from '../engine/deck'
import { CARD_RULES } from '../engine/moves'
import type { Card, Color, PawnPos } from '../engine/types'

// The table is worked out for red. Every side is laid out the same way, so another color's
// positions are rotated onto red's side first.
const RED: Color = 'red'

// Position codes: 0 = Start, 1–40 = track squares 0–39, then the safety squares, then Home.
const SAFETY_BASE = 1 + TRACK_LENGTH
const HOME_CODE = SAFETY_BASE + SAFETY_LENGTH
const CODES = HOME_CODE + 1

function encode(pos: PawnPos): number {
  switch (pos.kind) {
    case 'start':
      return 0
    case 'track':
      return 1 + pos.square
    case 'safety':
      return SAFETY_BASE + pos.index
    case 'home':
      return HOME_CODE
  }
}

function decode(code: number): PawnPos {
  if (code === 0) return START
  if (code < SAFETY_BASE) return track(code - 1)
  if (code < HOME_CODE) return { kind: 'safety', index: code - SAFETY_BASE }
  return { kind: 'home' }
}

/** `pos` for a `color` pawn, as the matching code for a red pawn. */
export function redCode(color: Color, pos: PawnPos): number {
  return pos.kind === 'track' ? 1 + wrap(pos.square - sideStart(color)) : encode(pos)
}

/** Where pawn `a` can get to with `card`, with the other pawn on `b`: [a', b'] pairs. */
function soloMoves(a: number, b: number, card: Card): [number, number][] {
  const rule = CARD_RULES[card]
  const out: [number, number][] = []
  const land = (to: number) => {
    if (to === b && to !== HOME_CODE) return
    let end = to
    let other = b
    const slide = to >= 1 && to < SAFETY_BASE ? slideAt(to - 1) : undefined
    if (slide && slide.color !== RED) {
      end = 1 + slide.end
      // Sliding over your own pawn sends it back to Start.
      if (b > to && b <= end) other = 0
    }
    out.push([end, other])
  }
  if (a === 0) {
    if (rule.leaveStart) land(encode(track(startExit(RED))))
    return out
  }
  if (a === HOME_CODE) return out
  for (const steps of [rule.forward, rule.backward && -rule.backward]) {
    if (!steps) continue
    const to = walk(RED, decode(a), steps)
    if (to) land(encode(to))
  }
  return out
}

const DECK_SIZE = buildDeck().length
const ODDS = (Object.keys(DECK_COUNTS) as Card[]).map((card) => ({
  card,
  chance: DECK_COUNTS[card] / DECK_SIZE,
  // A `2` brings an extra draw, so it doesn't use up a turn.
  cost: card === '2' ? 0 : 1,
}))

const key = (a: number, b: number) => a * CODES + b

/**
 * Value iteration over every pair of red positions: the expected turns to get both pawns Home,
 * picking the best move for each card. Bumps, swaps, naps and couches are left out; Hard handles
 * opponents itself.
 */
function solve(): Float64Array {
  const turns = new Float64Array(CODES * CODES)
  const options = ODDS.map(({ card }) => {
    const table: number[][] = []
    for (let a = 0; a < CODES; a++) {
      for (let b = 0; b < CODES; b++) {
        table[key(a, b)] = [
          ...soloMoves(a, b, card).map(([x, y]) => key(x, y)),
          ...soloMoves(b, a, card).map(([y, x]) => key(x, y)),
        ]
      }
    }
    return table
  })
  for (let sweep = 0; sweep < 500; sweep++) {
    let change = 0
    for (let s = 0; s < CODES * CODES; s++) {
      if (s === key(HOME_CODE, HOME_CODE)) continue
      let value = 0
      ODDS.forEach(({ chance, cost }, i) => {
        // A legal move must be made. With none, the player stays put.
        let best = options[i][s].length === 0 ? turns[s] : Infinity
        for (const next of options[i][s]) best = Math.min(best, turns[next])
        value += chance * (cost + best)
      })
      change = Math.max(change, Math.abs(value - turns[s]))
      turns[s] = value
    }
    if (change < 1e-6) break
  }
  return turns
}

let table: Float64Array | null = null

/** Expected turns for a color to get both pawns Home from `a` and `b`, alone on the board. */
export function raceTurns(color: Color, a: PawnPos, b: PawnPos): number {
  table ??= solve()
  return table[key(redCode(color, a), redCode(color, b))]
}
