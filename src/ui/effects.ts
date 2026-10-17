// What one engine step looks and sounds like: pawn motions, bursts and sound cues, all timed in
// milliseconds from the moment the new state renders. Pure, so it's tested like the reducer.
import { samePos, stepBackward, stepForward } from '../engine/board'
import { pawnById } from '../engine/state'
import type { Color, GameEvent, GameState, PawnPos } from '../engine/types'
import { pawnPoint, pawnSpot, type Point } from './layout'

export interface Motion {
  pawn: string
  /** Keyframes: where the pawn was drawn, any squares it walks through, where it ends up. */
  points: Point[]
  /** Each keyframe's offset in 0–1, for squares walked at an even pace. */
  offsets: number[]
  delay: number
  duration: number
}

export interface Burst {
  kind: 'bump' | 'home' | 'nap'
  at: Point
  delay: number
}

export type Sound = 'draw' | 'move' | 'slide' | 'bump' | 'nap' | 'home' | 'win' | 'snooze'

export interface Cue {
  sound: Sound
  delay: number
}

export interface Effects {
  motions: Motion[]
  bursts: Burst[]
  cues: Cue[]
  /** When the last motion or burst finishes. Bots wait this long before their next step. */
  end: number
}

/** Burst lengths; these match the animations in index.css. */
export const BURST_MS: Readonly<Record<Burst['kind'], number>> = { bump: 700, home: 900, nap: 1100 }

/** The whole walk stays under this, however far the pawn goes, so bots never wait on it. */
const MAX_WALK_MS = 650
const STEP_MS = 110
/** Legs that aren't a square-by-square walk (leaving Start, a slide, a swap) count as this many steps. */
const JUMP_WEIGHT = 2.5
/** How long a bumped pawn takes to fly back to Start. */
const BUMP_MS = 450
/** Pawns that only shuffle over (a Start or Home neighbor closing the gap). */
const NUDGE_MS = 250

/** The squares a pawn passes through walking from `from` to `to`, excluding both ends. */
export function walkPath(color: Color, from: PawnPos, to: PawnPos): PawnPos[] {
  if (from.kind === 'start') return []
  for (const step of [stepForward, stepBackward]) {
    const path: PawnPos[] = []
    for (let p = step(color, from); p; p = step(color, p)) {
      if (samePos(p, to)) return path
      path.push(p)
      if (path.length > 50) break
    }
  }
  return []
}

interface Leg {
  pos: PawnPos
  weight: number
}

export function effectsFor(before: GameState, after: GameState, events: GameEvent[]): Effects {
  const motions: Motion[] = []
  const bursts: Burst[] = []
  const cues: Cue[] = []
  const at = (state: GameState, id: string) => pawnSpot(state, pawnById(state, id))

  // The mover's legs, in order: walk, then maybe a slide (or a swap's single jump).
  let mover: string | null = null
  const legs: Leg[] = []
  for (const e of events) {
    if (e.type === 'move') {
      mover = e.pawn
      const color = pawnById(before, e.pawn).color
      if (e.from.kind === 'start') legs.push({ pos: e.to, weight: JUMP_WEIGHT })
      else {
        for (const pos of walkPath(color, e.from, e.to)) legs.push({ pos, weight: 1 })
        legs.push({ pos: e.to, weight: 1 })
      }
    } else if (e.type === 'slide') {
      legs.push({ pos: e.to, weight: JUMP_WEIGHT })
    } else if (e.type === 'swap') {
      mover = e.pawn
      legs.push({ pos: pawnById(after, e.pawn).pos, weight: JUMP_WEIGHT })
    }
  }

  let moverMs = 0
  if (mover) {
    const color = pawnById(before, mover).color
    const total = legs.reduce((sum, l) => sum + l.weight, 0)
    const stepMs = Math.min(STEP_MS, MAX_WALK_MS / total)
    moverMs = Math.round(total * stepMs)
    // The first and last keyframes use the drawn spots, which spread pawns sharing Start or Home.
    const points = [
      at(before, mover),
      ...legs.slice(0, -1).map((l) => pawnPoint(color, l.pos)),
      at(after, mover),
    ]
    // Divide running totals rather than add up fractions: rounding could push the last offset a
    // hair past 1, and the Web Animations API throws on that. total / total is exactly 1.
    const offsets = [0]
    let walked = 0
    for (const l of legs) offsets.push((walked += l.weight) / total)
    motions.push({ pawn: mover, points, offsets, delay: 0, duration: moverMs })

    const slideLeg = events.some((e) => e.type === 'slide')
    cues.push({ sound: 'move', delay: 0 })
    if (slideLeg)
      cues.push({ sound: 'slide', delay: Math.round(moverMs * (1 - JUMP_WEIGHT / total)) })
  }

  for (const e of events) {
    switch (e.type) {
      case 'draw':
        cues.push({ sound: 'draw', delay: 0 })
        break
      case 'snooze':
        cues.push({ sound: 'snooze', delay: 0 })
        break
      case 'nap':
        bursts.push({ kind: 'nap', at: at(before, e.pawn), delay: 0 })
        cues.push({ sound: 'nap', delay: 0 })
        break
      case 'bump': {
        // Victims wait for the mover to arrive, then fly back to Start.
        const from = at(before, e.pawn)
        motions.push(direct(e.pawn, from, at(after, e.pawn), moverMs, BUMP_MS))
        bursts.push({ kind: 'bump', at: from, delay: moverMs })
        cues.push({ sound: 'bump', delay: moverMs })
        break
      }
      case 'home':
        bursts.push({ kind: 'home', at: at(after, e.pawn), delay: moverMs })
        cues.push({ sound: 'home', delay: moverMs })
        break
      case 'win':
        cues.push({ sound: 'win', delay: moverMs + 300 })
        break
    }
  }

  // A swap's other pawn glides over alongside the mover. Anyone nudged aside in Start or Home
  // (to make room, or to close a gap) shuffles over once the mover has arrived.
  for (const pawn of after.pawns) {
    if (motions.some((m) => m.pawn === pawn.id)) continue
    const from = at(before, pawn.id)
    const to = pawnSpot(after, pawn)
    if (from.x === to.x && from.y === to.y) continue
    const swapped = events.some((e) => e.type === 'swap' && e.target === pawn.id)
    motions.push(
      swapped
        ? direct(pawn.id, from, to, 0, moverMs)
        : direct(pawn.id, from, to, moverMs, NUDGE_MS),
    )
  }

  const end = Math.max(
    0,
    ...motions.map((m) => m.delay + m.duration),
    ...bursts.map((b) => b.delay + BURST_MS[b.kind]),
  )
  return { motions, bursts, cues, end }
}

function direct(pawn: string, from: Point, to: Point, delay: number, duration: number): Motion {
  return { pawn, points: [from, to], offsets: [0, 1], delay, duration }
}
