// Replays. The engine is deterministic from its seed, so a finished game is just its config plus
// the list of actions taken: replaying them rebuilds every step, log and animation exactly.
// Replays are shared as a compact code in the URL (#replay=…), and the last finished game is
// kept in localStorage.
import type { BotLevel } from '../bots'
import { BOTS } from '../bots'
import { COLORS, type Color, type Move } from '../engine/types'
import { initUi, uiReducer, type Action, type GameConfig, type UiState } from './gameReducer'
import { defaultStorage } from './prefs'

export interface Replay {
  config: GameConfig
  actions: Action[]
}

export function replayOf(ui: UiState): Replay {
  return { config: ui.config, actions: ui.actions }
}

/** The UI state before any action, then after each one. Throws if an action is illegal. */
export function replayFrames({ config, actions }: Replay): UiState[] {
  const frames = [initUi(config)]
  for (const action of actions) frames.push(uiReducer(frames.at(-1)!, action))
  return frames
}

// Actions as short tokens: `d` draw, `x` pass, `z` snooze, or a move such as `F:red-0:5`.
const MOVE_CODES = {
  leaveStart: 'L',
  forward: 'F',
  backward: 'B',
  swap: 'S',
  bump: 'U',
} as const satisfies Record<Move['kind'], string>

function actionToken(action: Action): string {
  switch (action.type) {
    case 'draw':
      return 'd'
    case 'pass':
      return 'x'
    case 'snooze':
      return 'z'
    case 'play': {
      const m = action.move
      const code = MOVE_CODES[m.kind]
      if (m.kind === 'leaveStart') return `${code}:${m.pawn}`
      if (m.kind === 'forward' || m.kind === 'backward') return `${code}:${m.pawn}:${m.steps}`
      return `${code}:${m.pawn}:${m.target}`
    }
  }
}

function parseToken(token: string): Action {
  if (token === 'd') return { type: 'draw' }
  if (token === 'x') return { type: 'pass' }
  if (token === 'z') return { type: 'snooze' }
  const [code, pawn, arg] = token.split(':')
  const move = ((): Move | null => {
    switch (code) {
      case 'L':
        return { kind: 'leaveStart', pawn }
      case 'F':
      case 'B':
        return { kind: code === 'F' ? 'forward' : 'backward', pawn, steps: Number(arg) }
      case 'S':
      case 'U':
        return { kind: code === 'S' ? 'swap' : 'bump', pawn, target: arg }
      default:
        return null
    }
  })()
  if (!move) throw new Error(`Bad replay token: ${token}`)
  return { type: 'play', move }
}

// Base64url, so the code can sit in a URL without escaping. The JSON is plain ASCII.
const toBase64Url = (text: string) =>
  btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromBase64Url = (code: string) => atob(code.replace(/-/g, '+').replace(/_/g, '/'))

export function encodeReplay({ config, actions }: Replay): string {
  return toBase64Url(
    JSON.stringify({
      v: 1,
      human: config.human,
      players: config.players,
      seed: config.seed,
      settings: config.settings,
      bot: config.bot,
      autoMove: config.autoMove,
      actions: actions.map(actionToken).join(' '),
    }),
  )
}

const isBool = (v: unknown): v is boolean => typeof v === 'boolean'

/**
 * Reads a replay code. Returns null for anything malformed, including codes whose actions aren't
 * legal for their game (a hand-edited or truncated link), so a viewer never gets stuck mid-game.
 */
export function decodeReplay(code: string): Replay | null {
  try {
    const data = JSON.parse(fromBase64Url(code)) as Record<string, unknown>
    const settings = (data.settings ?? {}) as Record<string, unknown>
    const players = data.players as Color[]
    if (
      data.v !== 1 ||
      !COLORS.includes(data.human as Color) ||
      !Array.isArray(players) ||
      !players.every((c) => COLORS.includes(c)) ||
      !players.includes(data.human as Color) ||
      !Number.isInteger(data.seed) ||
      !isBool(settings.naps) ||
      !isBool(settings.couches) ||
      !isBool(settings.snooze) ||
      !Object.keys(BOTS).includes(data.bot as string) ||
      typeof data.actions !== 'string'
    ) {
      return null
    }
    const replay: Replay = {
      config: {
        human: data.human as Color,
        players,
        seed: data.seed as number,
        settings: { naps: settings.naps, couches: settings.couches, snooze: settings.snooze },
        bot: data.bot as BotLevel,
        autoMove: isBool(data.autoMove) && data.autoMove,
      },
      actions: data.actions ? data.actions.split(' ').map(parseToken) : [],
    }
    replayFrames(replay) // throws on an illegal action
    return replay
  } catch {
    return null
  }
}

const HASH_PREFIX = '#replay='

/** A link to this page that opens the replay. */
export function replayLink(replay: Replay, href: string): string {
  return href.split('#')[0] + HASH_PREFIX + encodeReplay(replay)
}

/** The replay code in a URL hash, if there is one. */
export function replayCodeFrom(hash: string): string | null {
  return hash.startsWith(HASH_PREFIX) ? hash.slice(HASH_PREFIX.length) : null
}

const LAST_KEY = 'lazy-race-and-bump:last-replay'

export function saveLastReplay(replay: Replay, storage = defaultStorage()) {
  try {
    storage?.setItem(LAST_KEY, encodeReplay(replay))
  } catch {
    // Not remembering is fine.
  }
}

export function loadLastReplay(storage = defaultStorage()): Replay | null {
  try {
    const code = storage?.getItem(LAST_KEY)
    return code ? decodeReplay(code) : null
  } catch {
    return null
  }
}
