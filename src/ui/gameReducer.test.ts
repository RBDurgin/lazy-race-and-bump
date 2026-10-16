import { describe, expect, it } from 'vitest'
import { easyBot } from '../bots/easy'
import { BASE_SETTINGS, legalMoves } from '../engine/game'
import { currentColor } from '../engine/state'
import { COLORS } from '../engine/types'
import { botAction, initUi, opponentColors, uiReducer, type GameConfig } from './gameReducer'

const LAZY = { naps: true, couches: true, snooze: true }
const config = (c: Omit<GameConfig, 'settings'>): GameConfig => ({ settings: BASE_SETTINGS, ...c })

describe('uiReducer', () => {
  it('seats the human first', () => {
    const ui = initUi(config({ human: 'yellow', players: ['red', 'yellow'], seed: 1 }))
    expect(currentColor(ui.game)).toBe('yellow')
    expect(ui.game.players).toEqual(['yellow', 'red'])
  })

  it('logs draws and moves', () => {
    let ui = initUi(config({ human: 'red', players: ['red', 'yellow'], seed: 1 }))
    ui = uiReducer(ui, { type: 'draw' })
    expect(ui.log.at(-1)?.text).toMatch(/^Red drew a/)
    const moves = legalMoves(ui.game)
    ui = uiReducer(ui, moves.length ? { type: 'play', move: moves[0] } : { type: 'pass' })
    expect(ui.log.length).toBeGreaterThanOrEqual(2)
    expect(new Set(ui.log.map((e) => e.id)).size).toBe(ui.log.length)
  })

  it('plays a whole game with bots driving every turn', () => {
    let ui = initUi(config({ human: 'red', players: ['red', 'blue', 'yellow', 'green'], seed: 7 }))
    for (let action = botAction(ui.game, easyBot); action; action = botAction(ui.game, easyBot)) {
      ui = uiReducer(ui, action)
    }
    expect(ui.game.winner).not.toBeNull()
    expect(ui.log.at(-1)?.text).toMatch(/wins!/)
  })

  it('passes the lazy settings to the engine and logs naps and couches', () => {
    let ui = initUi({ human: 'red', players: ['red', 'blue'], seed: 3, settings: LAZY })
    expect(ui.game.settings).toEqual(LAZY)
    let napped = false
    for (let action = botAction(ui.game, easyBot); action; action = botAction(ui.game, easyBot)) {
      ui = uiReducer(ui, action)
      if (ui.napped) napped = true
    }
    expect(napped).toBe(true)
    expect(ui.log.some((e) => e.tone === 'lazy')).toBe(true)
  })

  it('snoozes, then hands back the kept card instead of drawing', () => {
    let ui = initUi({ human: 'red', players: ['red', 'blue'], seed: 1, settings: LAZY })
    ui = uiReducer(ui, { type: 'draw' })
    const card = ui.game.card
    ui = uiReducer(ui, { type: 'snooze' })
    expect(ui.log.at(-1)?.text).toMatch(/hit snooze/)
    ui = uiReducer(ui, botAction(ui.game, easyBot)!) // blue draws
    ui = uiReducer(ui, botAction(ui.game, easyBot)!) // and moves or passes
    while (ui.game.current !== 0) ui = uiReducer(ui, botAction(ui.game, easyBot)!) // after a 2
    ui = uiReducer(ui, { type: 'draw' })
    expect(ui.game.card).toBe(card)
    expect(ui.log.at(-1)?.text).toMatch(/they kept/)
  })
})

describe('opponentColors', () => {
  it('seats a single opponent across the board, and more clockwise', () => {
    expect(opponentColors('red', 1, COLORS)).toEqual(['yellow'])
    expect(opponentColors('blue', 1, COLORS)).toEqual(['green'])
    expect(opponentColors('green', 2, COLORS)).toEqual(['red', 'blue'])
    expect(opponentColors('blue', 3, COLORS)).toEqual(['yellow', 'green', 'red'])
  })
})
