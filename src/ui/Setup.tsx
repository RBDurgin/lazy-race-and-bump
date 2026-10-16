import { useState } from 'react'
import { COLORS, type Color, type Settings } from '../engine/types'
import { COLOR_NAMES, LAZY_RULES } from './describe'
import { newSeed, opponentColors, type GameConfig } from './gameReducer'

const ALL_LAZY: Settings = { naps: true, couches: true, snooze: true }

/** The setup form. `last` pre-fills it with the previous game's choices. */
export function Setup({
  last,
  onStart,
}: {
  last: GameConfig | null
  onStart: (config: GameConfig) => void
}) {
  const [human, setHuman] = useState<Color>(last?.human ?? 'red')
  const [count, setCount] = useState(last?.players.length ?? 2)
  const [settings, setSettings] = useState<Settings>(last?.settings ?? ALL_LAZY)

  const start = () =>
    onStart({
      human,
      players: [human, ...opponentColors(human, count - 1, COLORS)],
      seed: newSeed(),
      settings,
    })

  return (
    <section className="panel setup">
      <h2>New game</h2>
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
          You against {count - 1} Easy {count === 2 ? 'bot' : 'bots'}.
        </p>
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
      <button className="primary" onClick={start}>
        Start game
      </button>
    </section>
  )
}
