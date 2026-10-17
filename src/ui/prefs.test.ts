import { describe, expect, it } from 'vitest'
import { DEFAULT_PREFS, loadPrefs, savePrefs, type Prefs } from './prefs'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    data,
  }
}

describe('prefs', () => {
  it('falls back to defaults with nothing saved, or no storage at all', () => {
    expect(loadPrefs(memoryStorage())).toEqual(DEFAULT_PREFS)
    expect(loadPrefs(null)).toEqual(DEFAULT_PREFS)
  })

  it('round-trips saved prefs', () => {
    const storage = memoryStorage()
    const prefs: Prefs = {
      human: 'green',
      count: 4,
      settings: { naps: false, couches: true, snooze: false },
      bot: 'easy',
      autoMove: false,
      sound: false,
    }
    savePrefs(prefs, storage)
    expect(loadPrefs(storage)).toEqual(prefs)
  })

  it('replaces invalid or missing fields with defaults', () => {
    const storage = memoryStorage()
    storage.setItem(
      'lazy-race-and-bump:prefs',
      JSON.stringify({ human: 'purple', count: 9, bot: 'easy', settings: { naps: 'yes' } }),
    )
    expect(loadPrefs(storage)).toEqual({ ...DEFAULT_PREFS, bot: 'easy' })
  })

  it('survives corrupt JSON and storage that throws', () => {
    expect(loadPrefs(memoryStorage({ 'lazy-race-and-bump:prefs': '{oops' }))).toEqual(DEFAULT_PREFS)
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('full')
      },
    }
    expect(loadPrefs(broken)).toEqual(DEFAULT_PREFS)
    expect(() => savePrefs(DEFAULT_PREFS, broken)).not.toThrow()
  })
})
