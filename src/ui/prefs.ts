// Setup choices and the sound toggle, remembered in localStorage between visits. Storage can be
// missing, full or blocked (private windows), so every read and write is best-effort.
import { BOTS, type BotLevel } from '../bots'
import { COLORS, type Color, type Settings } from '../engine/types'

export interface Prefs {
  human: Color
  /** Players including the human, 2–4. */
  count: number
  settings: Settings
  bot: BotLevel
  autoMove: boolean
  sound: boolean
}

export const DEFAULT_PREFS: Prefs = {
  human: 'red',
  count: 2,
  settings: { naps: true, couches: true, snooze: true },
  bot: 'medium',
  autoMove: true,
  sound: true,
}

const KEY = 'lazy-race-and-bump:prefs'

export type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>

export function defaultStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

const isBool = (v: unknown): v is boolean => typeof v === 'boolean'

/** Saved prefs, with anything missing or invalid replaced by its default. */
export function loadPrefs(storage = defaultStorage()): Prefs {
  let saved: Record<string, unknown> = {}
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(KEY) ?? '{}')
    if (parsed && typeof parsed === 'object') saved = parsed as Record<string, unknown>
  } catch {
    return DEFAULT_PREFS
  }
  const d = DEFAULT_PREFS
  const s = (saved.settings ?? {}) as Record<string, unknown>
  return {
    human: COLORS.includes(saved.human as Color) ? (saved.human as Color) : d.human,
    count: [2, 3, 4].includes(saved.count as number) ? (saved.count as number) : d.count,
    settings: {
      naps: isBool(s.naps) ? s.naps : d.settings.naps,
      couches: isBool(s.couches) ? s.couches : d.settings.couches,
      snooze: isBool(s.snooze) ? s.snooze : d.settings.snooze,
    },
    bot: Object.keys(BOTS).includes(saved.bot as string) ? (saved.bot as BotLevel) : d.bot,
    autoMove: isBool(saved.autoMove) ? saved.autoMove : d.autoMove,
    sound: isBool(saved.sound) ? saved.sound : d.sound,
  }
}

export function savePrefs(prefs: Prefs, storage = defaultStorage()) {
  try {
    storage?.setItem(KEY, JSON.stringify(prefs))
  } catch {
    // Not remembering is fine.
  }
}
