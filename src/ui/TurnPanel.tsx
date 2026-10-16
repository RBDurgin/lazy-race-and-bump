import type { Card, Color, GameState, Move } from '../engine/types'
import { CARD_TEXT, COLOR_NAMES, moveLabel, movePreview, pawnName } from './describe'
import { isDrowsy } from '../engine/lazy'
import { moveKey } from '../engine/moves'

interface TurnPanelProps {
  game: GameState
  human: Color
  /** The human may act now (their turn, and not handed to full lazy mode). */
  isHumanTurn: boolean
  /** A status line, e.g. a bot thinking or autopilot about to move. */
  note: string | null
  drawAgain: boolean
  /** Moves to offer as buttons: all legal moves, or the ones sharing a clicked square. */
  moves: Move[]
  choosing: boolean
  canSnooze: boolean
  onDraw: () => void
  onPass: () => void
  onPlay: (move: Move) => void
  onSnooze: () => void
}

function CardFace({ card }: { card: Card | null }) {
  if (!card) return <div className="card card-back" aria-label="No card drawn" />
  return (
    <div className="card">
      <span className="card-value">{card}</span>
      <span className="card-text">{CARD_TEXT[card]}</span>
    </div>
  )
}

function drawLabel(game: GameState, human: Color, drawAgain: boolean): string {
  const kept = game.kept[human]
  if (kept) return `Pick up the ${kept} you kept`
  return drawAgain ? 'You played a 2: draw again' : 'Draw a card'
}

export function TurnPanel(props: TurnPanelProps) {
  const { game, human, isHumanTurn, drawAgain, moves, choosing } = props
  const drowsy = game.pawns.filter((p) => p.color === human && isDrowsy(game, p.id))
  const color = game.players[game.current]
  const whose =
    game.phase === 'over'
      ? 'Game over'
      : color === human
        ? 'Your turn'
        : `${COLOR_NAMES[color]}'s turn`

  return (
    <section className="panel turn-panel" aria-live="polite">
      <h2>
        <span className="swatch" style={{ background: `var(--${color})` }} />
        {whose}
      </h2>
      <CardFace card={game.card} />
      <p className="deck-count">{game.drawPile.length} cards left in the draw pile</p>

      {isHumanTurn && game.phase === 'draw' && (
        <button className="primary" onClick={props.onDraw} autoFocus>
          {drawLabel(game, human, drawAgain)}
        </button>
      )}
      {isHumanTurn && game.phase === 'move' && moves.length === 0 && (
        <button className="primary" onClick={props.onPass} autoFocus>
          No legal move: pass
        </button>
      )}
      {isHumanTurn && game.phase === 'move' && moves.length > 0 && (
        <>
          <p className="hint">
            {choosing
              ? 'Two moves land there. Which one?'
              : 'Click a glowing pawn, then a highlighted square. Or pick a move:'}
          </p>
          <ul className="move-list">
            {moves.map((m) => {
              const preview = movePreview(game, m)
              return (
                <li key={moveKey(m)}>
                  <button onClick={() => props.onPlay(m)}>
                    {moveLabel(m)}
                    {preview && <span className="preview"> ({preview})</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
      {isHumanTurn && game.phase === 'move' && drowsy.length > 0 && (
        <p className="hint">
          💤 {drowsy.map((p) => pawnName(p.id)).join(' and ')} {drowsy.length === 1 ? 'is' : 'are'}{' '}
          asleep on the couch and can only move if nothing else can.
        </p>
      )}
      {isHumanTurn && props.canSnooze && (
        <button className="snooze" onClick={props.onSnooze}>
          ⏰ Snooze: skip this turn, keep the {game.card} (once per game)
        </button>
      )}
      {props.note && <p className="hint">{props.note}</p>}
    </section>
  )
}
