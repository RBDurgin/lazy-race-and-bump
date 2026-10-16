import type { KeyboardEvent } from 'react'
import { SAFETY_LENGTH, TRACK_LENGTH, samePos, startExit } from '../engine/board'
import {
  COLORS,
  type Color,
  type GameState,
  type Move,
  type Pawn,
  type PawnPos,
} from '../engine/types'
import { pawnName } from './describe'
import {
  BOARD_SIZE,
  HOME_RADIUS,
  SLIDE_SHAPES,
  START_RADIUS,
  homeLabelPoint,
  homePoint,
  pawnPoint,
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
  selected: string | null
  /** Destinations for the selected pawn, each with the move(s) that land there. */
  targets: Target[]
  onPawnClick: (pawn: Pawn) => void
  onTargetClick: (target: Target) => void
}

const colorVar = (c: Color) => `var(--${c})`
const tintVar = (c: Color) => `var(--${c}-tint)`
const sideColor = (square: number) => COLORS[Math.floor(square / (TRACK_LENGTH / COLORS.length))]

/** Which of a color's two pawns this is among those sharing Start or Home, for spacing. */
function slotOf(game: GameState, pawn: Pawn): number {
  if (pawn.pos.kind !== 'start' && pawn.pos.kind !== 'home') return 0
  return game.pawns.filter((p) => p.color === pawn.color && samePos(p.pos, pawn.pos)).indexOf(pawn)
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
  selected,
  targets,
  onPawnClick,
  onTargetClick,
}: BoardProps) {
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
        const p = pawnPoint(pawn.color, pawn.pos, slotOf(game, pawn))
        const canMove = movable.has(pawn.id)
        const classes = ['pawn', canMove && 'movable', pawn.id === selected && 'selected']
        return (
          <g
            key={pawn.id}
            className={classes.filter(Boolean).join(' ')}
            transform={`translate(${p.x} ${p.y})`}
            aria-label={pawnName(pawn.id)}
            {...activate(() => onPawnClick(pawn))}
          >
            {pawn.id === selected && <circle className="halo" r={0.45} />}
            <circle r={0.32} style={{ fill: colorVar(pawn.color) }} />
            <text y={0.02}>{Number(pawn.id.split('-')[1]) + 1}</text>
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
    </svg>
  )
}
