import type { Card, Color, GameState, Move } from '../engine/types'
import { CARD_TEXT, COLOR_NAMES, moveLabel, movePreview } from './describe'
import { moveKey } from '../engine/moves'

interface TurnPanelProps {
  game: GameState
  human: Color
  isHumanTurn: boolean
  drawAgain: boolean
  /** Moves to offer as buttons: all legal moves, or the ones sharing a clicked square. */
  moves: Move[]
  choosing: boolean
  onDraw: () => void
  onPass: () => void
  onPlay: (move: Move) => void
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

export function TurnPanel(props: TurnPanelProps) {
  const { game, human, isHumanTurn, drawAgain, moves, choosing } = props
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
          {drawAgain ? 'You played a 2: draw again' : 'Draw a card'}
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
      {!isHumanTurn && game.phase !== 'over' && <p className="hint">Thinking…</p>}
    </section>
  )
}
