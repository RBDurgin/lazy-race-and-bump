import { useEffect, useState } from 'react'
import { Game } from './ui/Game'
import { newSeed, type GameConfig } from './ui/gameReducer'
import { loadPrefs, savePrefs, type Prefs } from './ui/prefs'
import {
  decodeReplay,
  loadLastReplay,
  replayCodeFrom,
  saveLastReplay,
  type Replay,
} from './ui/replay'
import { ReplayView } from './ui/ReplayView'
import { Setup } from './ui/Setup'

type View =
  | { kind: 'setup'; notice?: string }
  | { kind: 'game'; config: GameConfig }
  /** `back` is where Done returns to. */
  | { kind: 'replay'; replay: Replay; back: View }

/** Opens a shared replay if the page was loaded from a replay link. */
function initialView(): View {
  const code = replayCodeFrom(window.location.hash)
  if (code === null) return { kind: 'setup' }
  const replay = decodeReplay(code)
  if (replay) return { kind: 'replay', replay, back: { kind: 'setup' } }
  clearHash()
  return { kind: 'setup', notice: 'That replay link didn’t work. It may be cut short.' }
}

function clearHash() {
  history.replaceState(null, '', window.location.pathname + window.location.search)
}

function App() {
  const [view, setView] = useState<View>(initialView)
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const [lastReplay, setLastReplay] = useState<Replay | null>(loadLastReplay)

  // A replay link opened in a tab that already has the game loaded only changes the hash.
  useEffect(() => {
    const onHash = () => {
      if (replayCodeFrom(window.location.hash) !== null) setView(initialView())
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const updatePrefs = (next: Prefs) => {
    setPrefs(next)
    savePrefs(next)
  }

  const start = (next: GameConfig) => {
    const { human, players, settings, bot, autoMove } = next
    updatePrefs({ ...prefs, human, count: players.length, settings, bot, autoMove })
    setView({ kind: 'game', config: next })
  }

  const finished = (replay: Replay) => {
    saveLastReplay(replay)
    setLastReplay(replay)
  }

  const closeReplay = (back: View) => {
    clearHash()
    setView(back)
  }

  const gameView =
    view.kind === 'game'
      ? view
      : view.kind === 'replay' && view.back.kind === 'game'
        ? view.back
        : null

  return (
    <main>
      <header>
        <div>
          <h1>Lazy Race and Bump</h1>
          <p className="tagline">Race your pawns home. Or don&apos;t. They might nap anyway.</p>
        </div>
        <button
          className="icon-button"
          onClick={() => updatePrefs({ ...prefs, sound: !prefs.sound })}
          aria-pressed={prefs.sound}
          aria-label="Sound effects"
          title={prefs.sound ? 'Sound is on' : 'Sound is off'}
        >
          {prefs.sound ? '🔊' : '🔇'}
        </button>
      </header>
      {/* A finished game stays mounted, hidden, while its replay plays, so Done returns to it. */}
      {gameView && (
        <div hidden={view.kind !== 'game'}>
          <Game
            key={gameView.config.seed}
            config={gameView.config}
            sound={prefs.sound}
            onPlayAgain={() =>
              setView({ kind: 'game', config: { ...gameView.config, seed: newSeed() } })
            }
            onNewSetup={() => setView({ kind: 'setup' })}
            onFinish={finished}
            onReplay={(replay) => setView({ kind: 'replay', replay, back: gameView })}
          />
        </div>
      )}
      {view.kind === 'replay' && (
        <ReplayView
          key={view.replay.config.seed}
          replay={view.replay}
          sound={prefs.sound}
          onClose={() => closeReplay(view.back)}
        />
      )}
      {view.kind === 'setup' && (
        <Setup
          prefs={prefs}
          onStart={start}
          notice={view.notice}
          onWatchLast={
            lastReplay && (() => setView({ kind: 'replay', replay: lastReplay, back: view }))
          }
        />
      )}
    </main>
  )
}

export default App
