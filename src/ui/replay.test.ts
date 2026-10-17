import { describe, expect, it } from 'vitest'
import { hardBot } from '../bots/hard'
import { mediumBot } from '../bots/medium'
import { currentColor } from '../engine/state'
import { botAction, initUi, uiReducer, type GameConfig, type UiState } from './gameReducer'
import {
  decodeReplay,
  encodeReplay,
  loadLastReplay,
  replayCodeFrom,
  replayFrames,
  replayLink,
  replayOf,
  saveLastReplay,
} from './replay'

const config: GameConfig = {
  human: 'blue',
  players: ['blue', 'red', 'green'],
  seed: 1234,
  settings: { naps: true, couches: true, snooze: true },
  bot: 'hard',
  autoMove: false,
}

/** A whole game, the human played by Medium and the rest by Hard (which may snooze). */
function finishedGame(): UiState {
  let ui = initUi(config)
  for (;;) {
    const bot = currentColor(ui.game) === config.human ? mediumBot : hardBot
    const action = botAction(ui.game, bot)
    if (!action) return ui
    ui = uiReducer(ui, action)
  }
}

describe('replays', () => {
  const ui = finishedGame()
  const replay = replayOf(ui)

  it('rebuild every step of the game from the seed and actions', () => {
    const frames = replayFrames(replay)
    expect(frames).toHaveLength(replay.actions.length + 1)
    expect(frames.at(-1)).toEqual(ui)
    expect(frames.at(-1)!.game.winner).not.toBeNull()
  })

  it('survive a round trip through a replay code', () => {
    const code = encodeReplay(replay)
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(decodeReplay(code)).toEqual(replay)
  })

  it('cover every kind of action', () => {
    const kinds = new Set(replay.actions.map((a) => (a.type === 'play' ? a.move.kind : a.type)))
    expect([...kinds]).toEqual(expect.arrayContaining(['draw', 'leaveStart', 'forward']))
    const decoded = decodeReplay(encodeReplay(replay))!
    expect(decoded.actions).toEqual(replay.actions)
  })

  it('reject malformed or illegal codes', () => {
    expect(decodeReplay('not base64!')).toBeNull()
    expect(decodeReplay(btoa('{"v":1}'))).toBeNull()
    // A move that wasn't legal at that point.
    const bad = { ...replay, actions: [{ type: 'draw' as const }, { type: 'draw' as const }] }
    expect(decodeReplay(encodeReplay(bad))).toBeNull()
  })

  it('live in a link’s hash', () => {
    const link = replayLink(replay, 'https://example.com/game/#old')
    expect(link.startsWith('https://example.com/game/#replay=')).toBe(true)
    expect(replayCodeFrom(new URL(link).hash)).toBe(encodeReplay(replay))
    expect(replayCodeFrom('#something-else')).toBeNull()
  })

  it('remember the last game, tolerating blocked storage', () => {
    const items = new Map<string, string>()
    const storage = {
      getItem: (k: string) => items.get(k) ?? null,
      setItem: (k: string, v: string) => void items.set(k, v),
    }
    expect(loadLastReplay(storage)).toBeNull()
    saveLastReplay(replay, storage)
    expect(loadLastReplay(storage)).toEqual(replay)
    const blocked = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(() => saveLastReplay(replay, blocked)).not.toThrow()
    expect(loadLastReplay(blocked)).toBeNull()
  })
})
