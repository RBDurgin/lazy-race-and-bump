// Human-readable text for cards, moves and engine events.
import { applyMove } from '../engine/apply'
import { pawnById } from '../engine/state'
import type { BotLevel } from '../bots'
import type { Card, Color, GameEvent, GameState, Move, Settings } from '../engine/types'

export const COLOR_NAMES: Readonly<Record<Color, string>> = {
  red: 'Red',
  blue: 'Blue',
  yellow: 'Yellow',
  green: 'Green',
}

export const CARD_TEXT: Readonly<Record<Card, string>> = {
  '1': 'Leave Start, or move 1 forward.',
  '2': 'Leave Start, or move 2 forward. Then draw again.',
  '3': 'Move 3 forward.',
  '4': 'Move 4 backward.',
  '5': 'Move 5 forward.',
  '8': 'Move 8 forward.',
  '10': 'Move 10 forward, or 1 backward.',
  '11': "Move 11 forward, or swap with an opponent's pawn on the track.",
  'Bump!': "Move a pawn from Start onto an opponent's pawn and send it back to Start.",
}

export const LAZY_RULES: readonly { key: keyof Settings; name: string; text: string }[] = [
  {
    key: 'naps',
    name: '💤 Naps',
    text: 'One move in six, a pawn naps and goes only half as far.',
  },
  {
    key: 'couches',
    name: '🛋️ Couches',
    text: 'Land on a couch and fall asleep: you sit out a turn, and anyone landing next to you bumps you.',
  },
  {
    key: 'snooze',
    name: '⏰ Snooze',
    text: 'Once per game, skip a turn and keep your card for later.',
  },
]

export const BOT_LEVELS: readonly { key: BotLevel; name: string; text: string }[] = [
  { key: 'easy', name: 'Easy', text: 'Picks any legal move at random.' },
  { key: 'medium', name: 'Medium', text: 'Goes for bumps and progress, and dodges danger.' },
]

/** `red-0` → `Red 1`. */
export function pawnName(id: string): string {
  const [color, n] = id.split('-')
  return `${COLOR_NAMES[color as Color]} ${Number(n) + 1}`
}

export function moveLabel(move: Move): string {
  switch (move.kind) {
    case 'leaveStart':
      return `${pawnName(move.pawn)}: leave Start`
    case 'forward':
      return `${pawnName(move.pawn)}: ${move.steps} forward`
    case 'backward':
      return `${pawnName(move.pawn)}: ${move.steps} back`
    case 'swap':
      return `${pawnName(move.pawn)}: swap with ${pawnName(move.target)}`
    case 'bump':
      return `${pawnName(move.pawn)}: Bump! ${pawnName(move.target)}`
  }
}

/** What a move would cause beyond moving the pawn, e.g. "slides, bumps Blue 2". */
export function movePreview(state: GameState, move: Move): string {
  const notes = applyMove(state, move).events.flatMap((e) => {
    if (e.type === 'slide') return ['slides']
    if (e.type === 'bump') {
      return [
        pawnById(state, e.pawn).color === pawnById(state, move.pawn).color
          ? `bumps your own ${pawnName(e.pawn)}`
          : `bumps ${pawnName(e.pawn)}`,
      ]
    }
    if (e.type === 'home') return ['reaches Home']
    if (e.type === 'sleep') return ['falls asleep on the couch']
    return []
  })
  return notes.join(', ')
}

/** Log lines for engine events. `move` and `draw` events are covered by the move summary. */
export function eventText(e: GameEvent): string | null {
  switch (e.type) {
    case 'reshuffle':
      return 'The discard pile was shuffled into a new draw pile.'
    case 'draw':
      return e.kept
        ? `${COLOR_NAMES[e.color]} picked up the ${e.card} they kept.`
        : `${COLOR_NAMES[e.color]} drew ${e.card === 'Bump!' ? 'a Bump!' : `a ${e.card}`}.`
    case 'pass':
      return `${COLOR_NAMES[e.color]} had no legal move and lost the turn.`
    case 'slide':
      return `${pawnName(e.pawn)} slid down the slide!`
    case 'bump':
      return `💥 ${pawnName(e.pawn)} got bumped back to Start by ${pawnName(e.by)}!`
    case 'home':
      return `🏠 ${pawnName(e.pawn)} made it Home.`
    case 'win':
      return `🏆 ${COLOR_NAMES[e.color]} wins!`
    case 'nap':
      return e.moved === 0
        ? `💤 ${pawnName(e.pawn)} napped and didn't move at all.`
        : `💤 ${pawnName(e.pawn)} napped and only moved ${e.moved} of ${e.steps}.`
    case 'sleep':
      return `🛋️ ${pawnName(e.pawn)} fell asleep on the couch.`
    case 'wake':
      return `${pawnName(e.pawn)} woke up.`
    case 'snooze':
      return `⏰ ${COLOR_NAMES[e.color]} hit snooze and kept the ${e.card} for next turn.`
    case 'move':
    case 'swap':
      return null
  }
}
