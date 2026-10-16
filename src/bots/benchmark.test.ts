// Bot-vs-bot benchmark: Medium should clearly beat Easy (docs/PLAN.md, Phase 4).
import { describe, expect, it } from 'vitest'
import { BASE_SETTINGS } from '../engine/game'
import type { Settings } from '../engine/types'
import { playBots } from './arena'
import { easyBot } from './easy'
import { mediumBot } from './medium'

const ALL_LAZY: Settings = { naps: true, couches: true, snooze: true }
const GAMES = 400

describe.each([
  ['base rules', BASE_SETTINGS],
  ['all lazy rules', ALL_LAZY],
])('Medium vs. Easy, %s', (_, settings) => {
  it('wins about 70% of 2-player games', { timeout: 60_000 }, () => {
    let wins = 0
    for (let seed = 1; seed <= GAMES; seed++) {
      // Alternate who goes first. Turn order follows the keys.
      const bots =
        seed % 2 ? { red: mediumBot, yellow: easyBot } : { red: easyBot, yellow: mediumBot }
      if (playBots(seed, bots, settings).winner === (seed % 2 ? 'red' : 'yellow')) wins++
    }
    // Two equal bots would win half; 400 games put the noise at about ±5%.
    expect(wins / GAMES).toBeGreaterThan(0.62)
  })

  it(
    'wins far more than its share of 4-player games against three Easy bots',
    { timeout: 60_000 },
    () => {
      let wins = 0
      for (let seed = 1; seed <= GAMES; seed++) {
        const seat = (['red', 'blue', 'yellow', 'green'] as const)[seed % 4]
        const bots = Object.fromEntries(
          (['red', 'blue', 'yellow', 'green'] as const).map((c) => [
            c,
            c === seat ? mediumBot : easyBot,
          ]),
        )
        if (playBots(seed, bots, settings).winner === seat) wins++
      }
      expect(wins / GAMES).toBeGreaterThan(0.4) // a fair share would be 25%
    },
  )
})
