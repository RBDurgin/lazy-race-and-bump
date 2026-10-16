import { useState } from 'react'
import { COLORS, type Color } from '../engine/types'
import { COLOR_NAMES } from './describe'
import { newSeed, opponentColors, type GameConfig } from './gameReducer'

export function Setup({ onStart }: { onStart: (config: GameConfig) => void }) {
  const [human, setHuman] = useState<Color>('red')
  const [count, setCount] = useState(2)

  const start = () =>
    onStart({
      human,
      players: [human, ...opponentColors(human, count - 1, COLORS)],
      seed: newSeed(),
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
      <button className="primary" onClick={start}>
        Start game
      </button>
    </section>
  )
}
