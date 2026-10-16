import type { LogEntry } from './gameReducer'

export function EventLog({ log }: { log: LogEntry[] }) {
  return (
    <section className="panel event-log">
      <h2>What happened</h2>
      {log.length === 0 ? (
        <p className="hint">Nothing yet.</p>
      ) : (
        <ol reversed>
          {[...log].reverse().map((e) => (
            <li key={e.id} className={`tone-${e.tone}`}>
              {e.color && <span className="swatch" style={{ background: `var(--${e.color})` }} />}
              {e.text}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
