# Lazy Race and Bump: Rules

_Draft v0.1. Numbers here (nap odds, board size, deck mix) will be tuned in Phase 3 using bot simulations._

## Goal

Be the first player to get both of your pawns from **Start** to **Home**.

## Setup

- 2–4 players. Each player has a color and **2 pawns**, which begin in their Start area.
- The board is a loop of **40 squares**, 10 on each side.
- Each color has:
  - a Start exit square,
  - a **Safety zone** of 3 squares that only that color can enter,
  - **Home** at the end of the safety zone.
- Each side has one **slide** (4 squares long) and one **couch** square.
- Shuffle the 40-card deck. The youngest player (or the human) goes first, then play passes clockwise.

## On your turn

1. Draw a card.
2. Make one legal move it allows. If no legal move exists, you lose the turn.
3. Discard the card. If it was a `2`, draw again.

## Cards

| Card    | Effect                                                                                                  |
| ------- | ------------------------------------------------------------------------------------------------------- |
| `1`     | Move a pawn out of Start, **or** move a pawn 1 forward.                                                 |
| `2`     | Move a pawn out of Start, **or** move a pawn 2 forward. Then **draw again**.                            |
| `3`     | Move 3 forward.                                                                                         |
| `4`     | Move 4 **backward**.                                                                                    |
| `5`     | Move 5 forward.                                                                                         |
| `8`     | Move 8 forward.                                                                                         |
| `10`    | Move 10 forward, **or** move 1 backward.                                                                |
| `11`    | Move 11 forward, **or** swap places with an opponent's pawn on the main track.                          |
| `Bump!` | Move a pawn from Start onto any opponent's pawn on the main track and send that pawn back to its Start. |

## Movement rules

- **Bumping:** if you end your move on an opponent's pawn, it goes back to its Start.
- You can't end a move on a square occupied by your own pawn.
- **Home needs an exact count.** Overshooting is not a legal move.
- Pawns in a Safety zone can't be bumped or swapped.
- Backward moves can carry a pawn out of the Safety zone and back onto the main track.
- **Slides:** landing exactly on the start of another color's slide carries your pawn to the end of it. Every pawn on the slide, yours included, is bumped back to Start. You don't slide on your own color's slide.

## Lazy rules

Each of these can be switched off in Settings.

### 💤 Naps

Each time a pawn is about to move by a number, roll a hidden die. On a 1-in-6 chance the pawn **naps** and moves only **half the value, rounded down**. A nap on a `1` means the pawn doesn't move at all. Leaving Start, `Bump!` and swaps never nap.

### 🛋️ Couches

A pawn that ends its move on a couch square **falls asleep**:

- On your next turn you can't move that pawn unless it is your only legal move. Then it wakes up.
- While asleep it's an easy target: an opponent ending a move **on or next to** it bumps it.
- It wakes up after your next turn either way.

### ⏰ Snooze button

Once per game, each player may skip a turn on purpose and keep the card they drew for their next turn instead of drawing.

## Autopilot (for lazy humans)

- **Auto-move:** if you have exactly one legal move, or none, the game plays it for you.
- **Full lazy mode:** hand your turns to the Medium bot. You can toggle it at any time.
