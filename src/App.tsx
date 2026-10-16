import { useState } from 'react'
import { Game } from './ui/Game'
import { newSeed, type GameConfig } from './ui/gameReducer'
import { Setup } from './ui/Setup'

function App() {
  const [config, setConfig] = useState<GameConfig | null>(null)

  return (
    <main>
      <header>
        <h1>Lazy Race and Bump</h1>
        <p className="tagline">Race your pawns home. Or don&apos;t. They might nap anyway.</p>
      </header>
      {config ? (
        <Game
          key={config.seed}
          config={config}
          onPlayAgain={() => setConfig({ ...config, seed: newSeed() })}
          onNewSetup={() => setConfig(null)}
        />
      ) : (
        <Setup onStart={setConfig} />
      )}
    </main>
  )
}

export default App
