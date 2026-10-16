import { describe, expect, it } from 'vitest'
import { DECK_COUNTS, buildDeck, drawFrom } from './deck'

describe('deck', () => {
  it('has 40 cards in the documented mix', () => {
    const deck = buildDeck()
    expect(deck).toHaveLength(40)
    for (const [card, n] of Object.entries(DECK_COUNTS)) {
      expect(deck.filter((c) => c === card)).toHaveLength(n)
    }
  })

  it('draws from the top', () => {
    const d = drawFrom(['3', '5'], ['1'], 1)
    expect(d).toMatchObject({ card: '3', drawPile: ['5'], discardPile: ['1'], reshuffled: false })
  })

  it('reshuffles the discard pile when the draw pile is empty', () => {
    const d = drawFrom([], ['1', '2', '3'], 1)
    expect(d.reshuffled).toBe(true)
    expect(d.discardPile).toEqual([])
    expect([d.card, ...d.drawPile].sort()).toEqual(['1', '2', '3'])
  })
})
