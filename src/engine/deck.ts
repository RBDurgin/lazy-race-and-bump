import { shuffle } from './rng'
import type { Card } from './types'

/** Copies of each card in the 40-card deck. Extra `1`s and `2`s help pawns leave Start. */
export const DECK_COUNTS: Readonly<Record<Card, number>> = {
  '1': 6,
  '2': 6,
  '3': 4,
  '4': 4,
  '5': 4,
  '8': 4,
  '10': 4,
  '11': 4,
  'Bump!': 4,
}

export function buildDeck(): Card[] {
  return (Object.keys(DECK_COUNTS) as Card[]).flatMap((card) =>
    Array<Card>(DECK_COUNTS[card]).fill(card),
  )
}

export interface Draw {
  card: Card
  drawPile: Card[]
  discardPile: Card[]
  rng: number
  reshuffled: boolean
}

/** Draws the top card, first shuffling the discard pile into a new draw pile if it's empty. */
export function drawFrom(drawPile: Card[], discardPile: Card[], rng: number): Draw {
  let reshuffled = false
  if (drawPile.length === 0) {
    if (discardPile.length === 0) throw new Error('No cards left to draw')
    ;[drawPile, rng] = shuffle(discardPile, rng)
    discardPile = []
    reshuffled = true
  }
  const [card, ...rest] = drawPile
  return { card, drawPile: rest, discardPile, rng, reshuffled }
}
