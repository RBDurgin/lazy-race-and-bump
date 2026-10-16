import { describe, expect, it } from 'vitest'
import { easyBot } from '../bots/easy'
import { legalMoves } from '../engine/game'
import { currentColor } from '../engine/state'
import { COLORS } from '../engine/types'
import { botAction, initUi, opponentColors, uiReducer } from './gameReducer'

describe('uiReducer', () => {
  it('seats the human first', () => {
    const ui = initUi({ human: 'yellow', players: ['red', 'yellow'], seed: 1 })
    expect(currentColor(ui.game)).toBe('yellow')
    expect(ui.game.players).toEqual(['yellow', 'red'])
  })

  it('logs draws and moves', () => {
    let ui = initUi({ human: 'red', players: ['red', 'yellow'], seed: 1 })
    ui = uiReducer(ui, { type: 'draw' })
    expect(ui.log.at(-1)?.text).toMatch(/^Red drew a/)
    const moves = legalMoves(ui.game)
    ui = uiReducer(ui, moves.length ? { type: 'play', move: moves[0] } : { type: 'pass' })
    expect(ui.log.length).toBeGreaterThanOrEqual(2)
    expect(new Set(ui.log.map((e) => e.id)).size).toBe(ui.log.length)
  })

  it('plays a whole game with bots driving every turn', () => {
    let ui = initUi({ human: 'red', players: ['red', 'blue', 'yellow', 'green'], seed: 7 })
    for (let action = botAction(ui.game, easyBot); action; action = botAction(ui.game, easyBot)) {
      ui = uiReducer(ui, action)
    }
    expect(ui.game.winner).not.toBeNull()
    expect(ui.log.at(-1)?.text).toMatch(/wins!/)
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
