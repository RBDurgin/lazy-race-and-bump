import { useEffect, useMemo, useState } from 'react'
import { BOT_LEVELS, COLOR_NAMES } from './describe'
import { Board } from './Board'
import { effectsFor } from './effects'
import { EventLog } from './EventLog'
import { replayFrames, replayLink, type Replay } from './replay'
import { playSound } from './sound'
import { CardFace } from './TurnPanel'

/** Base time per step at 1× speed, as in a live game; animations stretch it when needed. */
const STEP_MS = { draw: 500, move: 800 }
const SETTLE_MS = 200
const SPEEDS = [1, 2, 4] as const

interface ReplayViewProps {
  replay: Replay
  sound: boolean
  onClose: () => void
}

/** Plays back a finished game step by step, with the same board, animations and log. */
export function ReplayView({ replay, sound, onClose }: ReplayViewProps) {
  const frames = useMemo(() => replayFrames(replay), [replay])
  const last = frames.length - 1
  // Only a single step forward animates; jumps and steps back just show the new position.
  const [{ index, animate }, setPos] = useState({ index: 0, animate: false })
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1)
  const [copied, setCopied] = useState<'yes' | 'failed' | null>(null)
  const ui = frames[index]
  const { game, latest } = ui
  const effects = useMemo(
    () => (animate && latest ? effectsFor(latest.before, game, latest.events) : null),
    [animate, latest, game],
  )
  useEffect(() => {
    if (!sound || !effects) return
    const timers = effects.cues.map((c) => setTimeout(() => playSound(c.sound), c.delay))
    return () => timers.forEach(clearTimeout)
  }, [effects, sound])

  const delay = Math.max(
    STEP_MS[game.phase === 'draw' ? 'draw' : 'move'],
    (effects?.end ?? 0) + SETTLE_MS,
  )
  const running = playing && index < last
  const next = (p: { index: number }) => ({ index: Math.min(p.index + 1, last), animate: true })
  useEffect(() => {
    if (!running) return
    const timer = setTimeout(
      () => setPos((p) => ({ index: Math.min(p.index + 1, last), animate: true })),
      delay / speed,
    )
    return () => clearTimeout(timer)
  }, [running, index, delay, speed, last])

  const go = (i: number) => {
    setPlaying(false)
    setPos({ index: Math.max(0, Math.min(last, i)), animate: false })
  }
  const togglePlay = () => {
    if (index >= last) {
      setPos({ index: 0, animate: false })
      setPlaying(true)
    } else setPlaying(!running)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(replayLink(replay, window.location.href))
      setCopied('yes')
    } catch {
      setCopied('failed')
    }
  }

  const { config } = replay
  const winner = frames[last].game.winner
  const color = game.players[game.current]
  const human = config.human
  const botName = BOT_LEVELS.find((b) => b.key === config.bot)!.name
  const status =
    game.phase === 'over'
      ? game.winner === human
        ? 'You won!'
        : `${COLOR_NAMES[game.winner!]} won.`
      : color === human
        ? 'Your turn'
        : `${COLOR_NAMES[color]}'s turn`

  return (
    <div className="game">
      <div className="board-wrap">
        <Board
          game={game}
          movable={NO_PAWNS}
          napped={ui.napped}
          selected={null}
          targets={[]}
          onPawnClick={() => {}}
          onTargetClick={() => {}}
          effects={effects}
          effectsId={latest?.id ?? 0}
        />
      </div>
      <div className="side">
        <section className="panel replay-panel" aria-live="polite">
          <h2>
            <span className="swatch" style={{ background: `var(--${color})` }} />
            Replay: {status}
          </h2>
          <p className="hint">
            You played {COLOR_NAMES[human]} against {config.players.length - 1} {botName}{' '}
            {config.players.length === 2 ? 'bot' : 'bots'}.{' '}
            {winner && (winner === human ? 'You won' : `${COLOR_NAMES[winner]} won`)} in{' '}
            {frames[last].game.turn} turns.
          </p>
          <CardFace key={`${game.turn}-${game.drawPile.length}-${game.card}`} card={game.card} />
          <input
            type="range"
            className="scrubber"
            min={0}
            max={last}
            value={index}
            onChange={(e) => go(Number(e.target.value))}
            aria-label="Replay position"
          />
          <p className="deck-count">
            Step {index} of {last} · turn {Math.min(game.turn + 1, frames[last].game.turn)}
          </p>
          <div className="replay-controls">
            <button onClick={() => go(0)} aria-label="Back to the start" title="Back to the start">
              ⏮
            </button>
            <button onClick={() => go(index - 1)} aria-label="Step back" title="Step back">
              ⏴
            </button>
            <button
              className="primary"
              onClick={togglePlay}
              aria-label={running ? 'Pause' : 'Play'}
              title={running ? 'Pause' : 'Play'}
            >
              {running ? '⏸' : '▶'}
            </button>
            <button
              onClick={() => {
                setPlaying(false)
                setPos(next)
              }}
              aria-label="Step forward"
              title="Step forward"
            >
              ⏵
            </button>
            <button onClick={() => go(last)} aria-label="Jump to the end" title="Jump to the end">
              ⏭
            </button>
          </div>
          <div className="row speed" role="group" aria-label="Speed">
            {SPEEDS.map((s) => (
              <button key={s} aria-pressed={speed === s} onClick={() => setSpeed(s)}>
                {s}×
              </button>
            ))}
          </div>
          <div className="row replay-actions">
            <button onClick={copyLink}>🔗 Copy replay link</button>
            <button onClick={onClose}>Done</button>
          </div>
          {copied === 'yes' && (
            <p className="hint">Link copied. Anyone with it can watch this game.</p>
          )}
          {copied === 'failed' && <p className="hint">Couldn’t reach the clipboard. Try again?</p>}
        </section>
        <EventLog log={ui.log} />
      </div>
    </div>
  )
}

const NO_PAWNS: ReadonlySet<string> = new Set()
