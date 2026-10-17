import { useLayoutEffect, useRef, type KeyboardEvent } from 'react'
import { COUCHES, SAFETY_LENGTH, TRACK_LENGTH, startExit } from '../engine/board'
import {
  COLORS,
  type Color,
  type GameState,
  type Move,
  type Pawn,
  type PawnPos,
} from '../engine/types'
import { pawnName } from './describe'
import type { Burst, Effects } from './effects'
import {
  BOARD_SIZE,
  HOME_RADIUS,
  SLIDE_SHAPES,
  START_RADIUS,
  homeLabelPoint,
  homePoint,
  pawnPoint,
  pawnSpot,
  safetyPoint,
  startLabelPoint,
  startPoint,
  trackPoint,
} from './layout'

export interface Target {
  pos: PawnPos
  moves: Move[]
}

interface BoardProps {
  game: GameState
  movable: ReadonlySet<string>
  /** The pawn that napped on the latest move, if any. */
  napped: string | null
  selected: string | null
  /** Destinations for the selected pawn, each with the move(s) that land there. */
  targets: Target[]
  onPawnClick: (pawn: Pawn) => void
  onTargetClick: (target: Target) => void
  /** Animations for the latest step; `effectsId` changes with each step so they replay. */
  effects: Effects | null
  effectsId: number
}

const colorVar = (c: Color) => `var(--${c})`
const tintVar = (c: Color) => `var(--${c}-tint)`
const sideColor = (square: number) => COLORS[Math.floor(square / (TRACK_LENGTH / COLORS.length))]

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

const translate = (p: { x: number; y: number }) => `translate(${p.x}px, ${p.y}px)`

/** Plays each pawn's motion. The pawns render at their new spots; this animates them there. */
function usePawnMotion(effects: Effects | null, effectsId: number) {
  const pawnEls = useRef(new Map<string, SVGGElement>())
  useLayoutEffect(() => {
    if (!effects || reducedMotion()) return
    for (const m of effects.motions) {
      const el = pawnEls.current.get(m.pawn)
      if (!el || typeof el.animate !== 'function') continue
      el.getAnimations().forEach((a) => a.cancel())
      const keyframes = m.points.map((p, i) => ({ transform: translate(p), offset: m.offsets[i] }))
      // `backwards` holds the first keyframe through the delay: a bumped pawn waits to be hit.
      // Animations aren't cancelled when the step changes, only when the same pawn moves again.
      el.animate(keyframes, {
        duration: m.duration,
        delay: m.delay,
        easing: 'ease-in-out',
        fill: 'backwards',
      })
    }
  }, [effects, effectsId])
  return (id: string) => (el: SVGGElement | null) => {
    if (el) pawnEls.current.set(id, el)
    else pawnEls.current.delete(id)
  }
}

const STAR = Array.from({ length: 16 }, (_, i) => {
  const r = i % 2 === 0 ? 0.62 : 0.3
  const a = (i * Math.PI) / 8
  return `${(r * Math.sin(a)).toFixed(3)},${(-r * Math.cos(a)).toFixed(3)}`
}).join(' ')

function BurstMark({ burst }: { burst: Burst }) {
  return (
    <g className={`burst burst-${burst.kind}`} transform={`translate(${burst.at.x} ${burst.at.y})`}>
      <g className="burst-body" style={{ animationDelay: `${burst.delay}ms` }}>
        {burst.kind === 'bump' && (
          <>
            <polygon points={STAR} />
            <text y={0.03}>Bump!</text>
          </>
        )}
        {burst.kind === 'home' && (
          <>
            <circle r={0.5} />
            <circle r={0.75} />
          </>
        )}
        {burst.kind === 'nap' && <text>Zzz</text>}
      </g>
    </g>
  )
}

function activate(handler: () => void) {
  return {
    role: 'button',
    tabIndex: 0,
    onClick: handler,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handler()
      }
    },
  }
}

export function Board({
  game,
  movable,
  napped,
  selected,
  targets,
  onPawnClick,
  onTargetClick,
  effects,
  effectsId,
}: BoardProps) {
  const pawnRef = usePawnMotion(effects, effectsId)
  const exits = new Set(game.players.map(startExit))
  const selectedPawn = game.pawns.find((p) => p.id === selected)

  return (
    <svg
      className="board"
      viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
      role="img"
      aria-label="Game board"
    >
      <rect className="board-bg" x={0} y={0} width={BOARD_SIZE} height={BOARD_SIZE} rx={0.3} />
      <text className="board-title" x={BOARD_SIZE / 2} y={BOARD_SIZE / 2 - 0.2}>
        Lazy Race
      </text>
      <text className="board-title" x={BOARD_SIZE / 2} y={BOARD_SIZE / 2 + 0.55}>
        and Bump
      </text>

      {Array.from({ length: TRACK_LENGTH }, (_, sq) => {
        const p = trackPoint(sq)
        const c = sideColor(sq)
        return (
          <rect
            key={sq}
            className="square"
            x={p.x - 0.46}
            y={p.y - 0.46}
            width={0.92}
            height={0.92}
            rx={0.12}
            style={{ fill: exits.has(sq) ? tintVar(c) : undefined }}
          />
        )
      })}

      {game.settings.couches &&
        COUCHES.map((sq) => {
          const p = trackPoint(sq)
          return (
            <g key={sq} className="couch" transform={`translate(${p.x} ${p.y})`}>
              <title>Couch</title>
              <rect x={-0.27} y={-0.2} width={0.54} height={0.2} rx={0.06} />
              <rect x={-0.27} y={-0.02} width={0.54} height={0.16} rx={0.04} />
              <rect x={-0.34} y={-0.12} width={0.12} height={0.3} rx={0.05} />
              <rect x={0.22} y={-0.12} width={0.12} height={0.3} rx={0.05} />
            </g>
          )
        })}

      {SLIDE_SHAPES.map((s) => (
        <g key={s.color} className="slide" style={{ color: colorVar(s.color) }}>
          <line x1={s.from.x} y1={s.from.y} x2={s.to.x} y2={s.to.y} />
          <circle cx={s.from.x} cy={s.from.y} r={0.14} />
          <circle cx={s.to.x} cy={s.to.y} r={0.24} />
        </g>
      ))}

      {game.players.map((c) => {
        const start = startPoint(c)
        const home = homePoint(c)
        const startLabel = startLabelPoint(c)
        const homeLabel = homeLabelPoint(c)
        return (
          <g key={c}>
            {Array.from({ length: SAFETY_LENGTH }, (_, i) => {
              const p = safetyPoint(c, i)
              return (
                <rect
                  key={i}
                  className="square"
                  x={p.x - 0.42}
                  y={p.y - 0.42}
                  width={0.84}
                  height={0.84}
                  rx={0.1}
                  style={{ fill: tintVar(c) }}
                />
              )
            })}
            <circle
              className="start"
              cx={start.x}
              cy={start.y}
              r={START_RADIUS}
              style={{ stroke: colorVar(c) }}
            />
            <text className="zone-label" x={startLabel.x} y={startLabel.y}>
              Start
            </text>
            <circle
              className="home"
              cx={home.x}
              cy={home.y}
              r={HOME_RADIUS}
              style={{ fill: tintVar(c), stroke: colorVar(c) }}
            />
            <text className="zone-label" x={homeLabel.x} y={homeLabel.y}>
              Home
            </text>
          </g>
        )
      })}

      {game.pawns.map((pawn) => {
        const p = pawnSpot(game, pawn)
        const canMove = movable.has(pawn.id)
        const asleep = pawn.id in game.asleep
        const classes = [
          'pawn',
          canMove && 'movable',
          pawn.id === selected && 'selected',
          asleep && 'asleep',
        ]
        const label = asleep ? `${pawnName(pawn.id)}, asleep` : pawnName(pawn.id)
        return (
          <g
            key={pawn.id}
            ref={pawnRef(pawn.id)}
            className={classes.filter(Boolean).join(' ')}
            transform={`translate(${p.x} ${p.y})`}
            aria-label={label}
            {...activate(() => onPawnClick(pawn))}
          >
            {pawn.id === selected && <circle className="halo" r={0.45} />}
            <circle r={0.32} style={{ fill: colorVar(pawn.color) }} />
            <text y={0.02}>{Number(pawn.id.split('-')[1]) + 1}</text>
            {(asleep || pawn.id === napped) && (
              <text className={asleep ? 'zzz' : 'zzz napped'} x={0.32} y={-0.3}>
                Zz
              </text>
            )}
          </g>
        )
      })}

      {selectedPawn &&
        targets.map((t) => {
          const p = pawnPoint(selectedPawn.color, t.pos)
          return (
            <circle
              key={`${p.x},${p.y}`}
              className="target"
              cx={p.x}
              cy={p.y}
              r={0.4}
              aria-label="Move here"
              {...activate(() => onTargetClick(t))}
            />
          )
        })}

      {!reducedMotion() &&
        effects?.bursts.map((b, i) => <BurstMark key={`${effectsId}-${i}`} burst={b} />)}
    </svg>
  )
}
