import { describe, expect, it } from 'vitest'
import { HOME, START, safety, track } from './board'
import { createGame, drawCard, legalMoves, passTurn, playMove } from './game'
import { currentColor } from './state'
import { scenario } from './testing'
import type { GameState } from './types'

describe('createGame', () => {
  it('seats players clockwise starting from the first color given', () => {
    const g = createGame({ players: ['yellow', 'red', 'green'], seed: 1 })
    expect(g.players).toEqual(['yellow', 'green', 'red'])
    expect(currentColor(g)).toBe('yellow')
  })

  it('starts every pawn in Start with a full shuffled deck', () => {
    const g = createGame({ players: ['red', 'blue'], seed: 1 })
    expect(g.pawns.map((p) => p.id)).toEqual(['red-0', 'red-1', 'blue-0', 'blue-1'])
    expect(g.pawns.every((p) => p.pos.kind === 'start')).toBe(true)
    expect(g.drawPile).toHaveLength(40)
    expect(g).toMatchObject({ phase: 'draw', turn: 0, winner: null })
    expect(g.settings).toEqual({ naps: false, couches: false, snooze: false })
  })

  it('is reproducible from its seed', () => {
    const a = createGame({ players: ['red', 'blue'], seed: 5 })
    expect(createGame({ players: ['red', 'blue'], seed: 5 })).toEqual(a)
    expect(createGame({ players: ['red', 'blue'], seed: 6 }).drawPile).not.toEqual(a.drawPile)
  })

  it('rejects bad player lists', () => {
    expect(() => createGame({ players: ['red'], seed: 1 })).toThrow()
    expect(() => createGame({ players: ['red', 'red'], seed: 1 })).toThrow()
  })
})

describe('turn flow', () => {
  it('draws the top card into the move phase', () => {
    const s = scenario({ drawPile: ['5', '3'] })
    const r = drawCard(s)
    expect(r.state).toMatchObject({ card: '5', drawPile: ['3'], phase: 'move' })
    expect(r.events).toEqual([{ type: 'draw', color: 'red', card: '5' }])
  })

  it('passes to the next player after a move and discards the card', () => {
    const s = scenario({ card: '1' })
    const r = playMove(s, { kind: 'leaveStart', pawn: 'red-0' })
    expect(r.state).toMatchObject({ phase: 'draw', card: null, turn: 1 })
    expect(r.state.discardPile.at(-1)).toBe('1')
    expect(currentColor(r.state)).toBe('blue')
  })

  it('lets the same player draw again after a 2', () => {
    const s = scenario({ card: '2' })
    const r = playMove(s, { kind: 'leaveStart', pawn: 'red-0' })
    expect(r.state).toMatchObject({ phase: 'draw', turn: 0 })
    expect(currentColor(r.state)).toBe('red')
  })

  it('still draws again after a 2 that has no legal move', () => {
    const s = scenario({ card: '2', at: { 'red-0': safety(2), 'red-1': HOME } })
    expect(legalMoves(s)).toEqual([])
    const r = passTurn(s)
    expect(currentColor(r.state)).toBe('red')
    expect(r.events).toEqual([{ type: 'pass', color: 'red', card: '2' }])
  })

  it('forfeits the turn when no legal move exists', () => {
    const s = scenario({ card: '5' })
    const r = passTurn(s)
    expect(currentColor(r.state)).toBe('blue')
    expect(r.state.discardPile.at(-1)).toBe('5')
  })

  it('refuses to pass while a legal move exists, and refuses illegal moves', () => {
    const s = scenario({ card: '1' })
    expect(() => passTurn(s)).toThrow(/legal move/)
    expect(() => playMove(s, { kind: 'forward', pawn: 'red-0', steps: 1 })).toThrow(/Illegal/)
    expect(() => drawCard(s)).toThrow(/phase/)
  })

  it('wraps turn order back to the first player', () => {
    const s = { ...scenario({ card: '5' }), current: 1 }
    expect(currentColor(passTurn(s).state)).toBe('red')
  })

  it('reshuffles the discard pile when the draw pile runs out', () => {
    const s: GameState = { ...scenario({ drawPile: [] }), discardPile: ['3', '4', '5'] }
    const r = drawCard(s)
    expect(r.events[0]).toEqual({ type: 'reshuffle' })
    expect(r.state.drawPile).toHaveLength(2)
    expect(r.state.discardPile).toEqual([])
  })

  it('ends the game when both pawns of a color are Home', () => {
    const s = scenario({ card: '1', at: { 'red-0': HOME, 'red-1': safety(2) } })
    const r = playMove(s, { kind: 'forward', pawn: 'red-1', steps: 1 })
    expect(r.state).toMatchObject({ phase: 'over', winner: 'red' })
    expect(r.events.at(-1)).toEqual({ type: 'win', color: 'red' })
    expect(() => drawCard(r.state)).toThrow()
  })

  it('a winning 2 ends the game instead of drawing again', () => {
    const s = scenario({ card: '2', at: { 'red-0': HOME, 'red-1': safety(1) } })
    expect(playMove(s, { kind: 'forward', pawn: 'red-1', steps: 2 }).state.phase).toBe('over')
  })

  it('bumped pawns go back to Start for real', () => {
    const s = scenario({ card: '3', at: { 'red-0': track(10), 'blue-0': track(13) } })
    const r = playMove(s, { kind: 'forward', pawn: 'red-0', steps: 3 })
    expect(r.state.pawns.find((p) => p.id === 'blue-0')?.pos).toEqual(START)
  })
})
