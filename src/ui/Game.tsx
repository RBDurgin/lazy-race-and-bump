import { useEffect, useMemo, useReducer, useState } from 'react'
import { BOTS } from '../bots'
import { legalMoves } from '../engine/game'
import { canSnooze } from '../engine/lazy'
import { destinationOf } from '../engine/moves'
import { samePos } from '../engine/board'
import { currentColor } from '../engine/state'
import type { Move, Pawn } from '../engine/types'
import { Board, type Target } from './Board'
import { COLOR_NAMES } from './describe'
import { effectsFor } from './effects'
import { EventLog } from './EventLog'
import {
  autopilotAction,
  botAction,
  initUi,
  uiReducer,
  type Action,
  type GameConfig,
} from './gameReducer'
import { replayOf, type Replay } from './replay'
import { playSound } from './sound'
import { TurnPanel } from './TurnPanel'

const BOT_DELAY_MS = { draw: 500, move: 800 }
/** Long enough to see the card, and to hit snooze instead. */
const AUTO_MOVE_DELAY_MS = 1200
/** A beat after the animations finish before the next timed step. */
const SETTLE_MS = 200

interface GameProps {
  config: GameConfig
  onPlayAgain: () => void
  onNewSetup: () => void
  /** Called once when the game ends, with its replay. */
  onFinish: (replay: Replay) => void
  onReplay: (replay: Replay) => void
  sound: boolean
}

export function Game(props: GameProps) {
  const { config, onPlayAgain, onNewSetup, onFinish, onReplay, sound } = props
  const [ui, dispatch] = useReducer(uiReducer, config, initUi)
  const [selected, setSelected] = useState<string | null>(null)
  const [choice, setChoice] = useState<Move[] | null>(null)
  const [lazyMode, setLazyMode] = useState(false)
  const { game, log } = ui
  const human = config.human
  const isHumanTurn = game.phase !== 'over' && currentColor(game) === human
  // In full lazy mode the human's turns are the bot's, so the controls go quiet.
  const canAct = isHumanTurn && !lazyMode

  const act = (action: Action) => {
    setSelected(null)
    setChoice(null)
    dispatch(action)
  }

  // Bots, and autopilot on the human's turns, act on a timer, one engine step at a time.
  const bot = BOTS[config.bot]
  const autoMove = config.autoMove
  const pending = useMemo(
    () => (isHumanTurn ? autopilotAction(game, { lazyMode, autoMove }) : botAction(game, bot)),
    [game, isHumanTurn, lazyMode, autoMove, bot],
  )
  // Each engine step's animations and sound cues.
  const { latest } = ui
  const effects = useMemo(
    () => (latest ? effectsFor(latest.before, game, latest.events) : null),
    [latest, game],
  )
  useEffect(() => {
    if (!sound || !effects) return
    const timers = effects.cues.map((c) => setTimeout(() => playSound(c.sound), c.delay))
    return () => timers.forEach(clearTimeout)
  }, [effects, sound])

  // Timed steps wait for the last step's animations, so a bump is seen before the next card.
  const baseDelay = canAct
    ? AUTO_MOVE_DELAY_MS
    : BOT_DELAY_MS[game.phase === 'draw' ? 'draw' : 'move']
  const delay = Math.max(baseDelay, (effects?.end ?? 0) + SETTLE_MS)
  useEffect(() => {
    if (!pending) return
    const timer = setTimeout(() => {
      setSelected(null)
      setChoice(null)
      dispatch(pending)
    }, delay)
    return () => clearTimeout(timer)
  }, [pending, delay])

  const over = game.phase === 'over'
  const replay = useMemo(() => (over ? replayOf(ui) : null), [over, ui])
  useEffect(() => {
    if (replay) onFinish(replay)
    // Only once per game: the parent's callback identity doesn't matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replay])

  const moves = useMemo(() => (canAct ? legalMoves(game) : []), [game, canAct])
  const movable = useMemo(() => new Set(moves.map((m) => m.pawn)), [moves])
  // With only one pawn able to move, select it straight away.
  const active = selected ?? (movable.size === 1 ? [...movable][0] : null)

  const targets = useMemo(() => {
    const out: Target[] = []
    for (const move of moves.filter((m) => m.pawn === active)) {
      const pos = destinationOf(game, move)
      const same = out.find((t) => samePos(t.pos, pos))
      if (same) same.moves.push(move)
      else out.push({ pos, moves: [move] })
    }
    return out
  }, [game, moves, active])

  const onPawnClick = (pawn: Pawn) => {
    if (movable.has(pawn.id)) {
      setSelected(pawn.id)
      setChoice(null)
      return
    }
    // Start pawns are interchangeable, so clicking either one picks the movable one.
    const inStart = (id: string) => game.pawns.some((p) => p.id === id && p.pos.kind === 'start')
    const twin = pawn.pos.kind === 'start' && moves.find((m) => inStart(m.pawn))
    if (pawn.color === human && twin) {
      setSelected(twin.pawn)
      setChoice(null)
    }
  }

  const onTargetClick = (t: Target) => {
    if (t.moves.length === 1) act({ type: 'play', move: t.moves[0] })
    else setChoice(t.moves)
  }

  const drawAgain = isHumanTurn && game.phase === 'draw' && log.at(-1)?.color === human
  const note = !isHumanTurn
    ? game.phase === 'over'
      ? null
      : 'Thinking…'
    : lazyMode
      ? '🛋️ Full lazy mode: the Medium bot is playing your turn.'
      : pending?.type === 'play'
        ? 'Autopilot: only one move, so it’s playing that…'
        : pending?.type === 'pass'
          ? 'Autopilot: no legal move, so it’s passing…'
          : null

  return (
    <div className="game">
      <div className="board-wrap">
        <Board
          game={game}
          movable={movable}
          napped={ui.napped}
          selected={active}
          targets={targets}
          onPawnClick={onPawnClick}
          onTargetClick={onTargetClick}
          effects={effects}
          effectsId={latest?.id ?? 0}
        />
        {game.winner && (
          <div className="game-over" role="dialog" aria-label="Game over">
            <h2>{game.winner === human ? 'You win! 🏆' : `${COLOR_NAMES[game.winner]} wins.`}</h2>
            <p>Finished in {game.turn} turns.</p>
            <div className="row">
              <button className="primary" onClick={onPlayAgain} autoFocus>
                Play again
              </button>
              <button onClick={() => onReplay(replay!)}>Watch replay</button>
              <button onClick={onNewSetup}>Change setup</button>
            </div>
          </div>
        )}
      </div>
      <div className="side">
        <TurnPanel
          game={game}
          human={human}
          isHumanTurn={canAct}
          note={note}
          drawAgain={drawAgain}
          moves={choice ?? moves}
          choosing={choice !== null}
          canSnooze={canAct && canSnooze(game)}
          onDraw={() => act({ type: 'draw' })}
          onPass={() => act({ type: 'pass' })}
          onPlay={(move) => act({ type: 'play', move })}
          onSnooze={() => act({ type: 'snooze' })}
        />
        {game.phase !== 'over' && (
          <label className="choice lazy-mode">
            <input
              type="checkbox"
              checked={lazyMode}
              onChange={(e) => setLazyMode(e.target.checked)}
            />
            <span>
              <strong>🛋️ Full lazy mode</strong>
              <span className="hint">
                {' '}
                Let the Medium bot play your turns. Switch off any time.
              </span>
            </span>
          </label>
        )}
        <EventLog log={log} />
      </div>
    </div>
  )
}
