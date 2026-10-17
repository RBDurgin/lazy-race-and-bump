import { useState } from 'react'
import type { BotLevel } from '../bots'
import { COLORS, type Color, type Settings } from '../engine/types'
import { BOT_LEVELS, COLOR_NAMES, LAZY_RULES } from './describe'
import { newSeed, opponentColors, type GameConfig } from './gameReducer'
import type { Prefs } from './prefs'

/** The setup form, pre-filled with the remembered choices from last time. */
interface SetupProps {
  prefs: Prefs
  onStart: (config: GameConfig) => void
  /** Something to tell the player, such as a broken replay link. */
  notice?: string
  /** Opens the replay of the last finished game, if there is one. */
  onWatchLast: (() => void) | null
}

export function Setup({ prefs, onStart, notice, onWatchLast }: SetupProps) {
  const [human, setHuman] = useState<Color>(prefs.human)
  const [count, setCount] = useState(prefs.count)
  const [settings, setSettings] = useState<Settings>(prefs.settings)
  const [bot, setBot] = useState<BotLevel>(prefs.bot)
  const [autoMove, setAutoMove] = useState(prefs.autoMove)

  const start = () =>
    onStart({
      human,
      players: [human, ...opponentColors(human, count - 1, COLORS)],
      seed: newSeed(),
      settings,
      bot,
      autoMove,
    })

  return (
    <section className="panel setup">
      <h2>New game</h2>
      {notice && <p className="notice">{notice}</p>}
      <fieldset>
        <legend>Players</legend>
        <div className="row">
          {[2, 3, 4].map((n) => (
            <label key={n} className="choice">
              <input type="radio" name="count" checked={count === n} onChange={() => setCount(n)} />
              {n}
            </label>
          ))}
        </div>
        <p className="hint">
          You against {count - 1} {BOT_LEVELS.find((b) => b.key === bot)!.name}{' '}
          {count === 2 ? 'bot' : 'bots'}.
        </p>
      </fieldset>
      <fieldset>
        <legend>Bots</legend>
        <div className="lazy-rules">
          {BOT_LEVELS.map((b) => (
            <label key={b.key} className="choice">
              <input
                type="radio"
                name="bot"
                checked={bot === b.key}
                onChange={() => setBot(b.key)}
              />
              <span>
                <strong>{b.name}</strong>
                <span className="hint"> {b.text}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Your color</legend>
        <div className="row">
          {COLORS.map((c) => (
            <label key={c} className="choice">
              <input type="radio" name="color" checked={human === c} onChange={() => setHuman(c)} />
              <span className="swatch" style={{ background: `var(--${c})` }} />
              {COLOR_NAMES[c]}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Lazy rules</legend>
        <div className="lazy-rules">
          {LAZY_RULES.map((rule) => (
            <label key={rule.key} className="choice">
              <input
                type="checkbox"
                checked={settings[rule.key]}
                onChange={(e) => setSettings({ ...settings, [rule.key]: e.target.checked })}
              />
              <span>
                <strong>{rule.name}</strong>
                <span className="hint"> {rule.text}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Autopilot</legend>
        <div className="lazy-rules">
          <label className="choice">
            <input
              type="checkbox"
              checked={autoMove}
              onChange={(e) => setAutoMove(e.target.checked)}
            />
            <span>
              <strong>🤖 Auto-move</strong>
              <span className="hint"> When you have only one move (or none), play it for me.</span>
            </span>
          </label>
        </div>
      </fieldset>
      <div className="row">
        <button className="primary" onClick={start}>
          Start game
        </button>
        {onWatchLast && <button onClick={onWatchLast}>🎬 Watch your last game</button>}
      </div>
    </section>
  )
}
