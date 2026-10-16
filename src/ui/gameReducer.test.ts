import { describe, expect, it } from 'vitest'
import { easyBot } from '../bots/easy'
import { mediumBot } from '../bots/medium'
import { HOME, track } from '../engine/board'
import { BASE_SETTINGS, legalMoves } from '../engine/game'
import { currentColor } from '../engine/state'
import { scenario } from '../engine/testing'
import { COLORS } from '../engine/types'
import {
  autopilotAction,
  botAction,
  initUi,
  opponentColors,
  uiReducer,
  type GameConfig,
} from './gameReducer'

const LAZY = { naps: true, couches: true, snooze: true }
const config = (c: Pick<GameConfig, 'human' | 'players' | 'seed'> & Partial<GameConfig>) =>
  ({ settings: BASE_SETTINGS, bot: 'easy', autoMove: false, ...c }) satisfies GameConfig

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
    let ui = initUi(config({ human: 'red', players: ['red', 'blue'], seed: 3, settings: LAZY }))
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
    let ui = initUi(config({ human: 'red', players: ['red', 'blue'], seed: 1, settings: LAZY }))
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

describe('autopilotAction', () => {
  const off = { lazyMode: false, autoMove: false }
  const auto = { lazyMode: false, autoMove: true }

  it('plays a forced move or pass, but leaves real choices and draws to the human', () => {
    const one = scenario({ card: '1', at: { 'red-0': HOME } }) // only Red 2 can leave Start
    expect(autopilotAction(one, auto)).toEqual({ type: 'play', move: legalMoves(one)[0] })
    expect(autopilotAction(one, off)).toBeNull()
    const none = scenario({ card: '3' }) // both pawns in Start
    expect(autopilotAction(none, auto)).toEqual({ type: 'pass' })
    const two = scenario({ card: '3', at: { 'red-0': track(10), 'red-1': track(20) } })
    expect(autopilotAction(two, auto)).toBeNull()
    expect(autopilotAction(scenario({}), auto)).toBeNull()
  })

  it('hands every step of the turn to the Medium bot in full lazy mode', () => {
    const lazy = { lazyMode: true, autoMove: false }
    expect(autopilotAction(scenario({}), lazy)).toEqual({ type: 'draw' })
    const two = scenario({
      card: '3',
      at: { 'red-0': track(10), 'red-1': track(30), 'blue-0': track(33) },
    })
    expect(autopilotAction(two, lazy)).toEqual({ type: 'play', move: mediumBot(two, '3') })
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
