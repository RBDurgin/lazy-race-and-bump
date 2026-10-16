# Lazy Race and Bump: Rules

_Draft v0.2. The lazy rules were settled in Phase 3. With random-move bots, games run about 37 turns per player with the base rules and about 45 with every lazy rule on (a "turn" here is one player's turn, and a `2` plus its extra draw count as one)._

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

### Board layout

Track squares are numbered 0–39 clockwise. Colors sit clockwise in the order red, blue, yellow, green, and each owns a side: red 0–9, blue 10–19, yellow 20–29, green 30–39. Counting from the first square of a color's side:

| Offset | What's there                                                              |
| ------ | ------------------------------------------------------------------------- |
| +1     | Safety entry: moving forward from here goes into that color's safety zone |
| +3     | Start exit: where a pawn leaving Start lands                              |
| +5..+8 | That color's slide (start at +5, end at +8)                               |
| +9     | Couch (see Lazy rules)                                                    |

From its Start exit, a pawn needs 38 steps to reach its safety entry, then 3 safety squares and 1 more step into Home (42 steps in all). A pawn that moves backward past its Start exit can reach its safety zone in just a few steps.

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

**Deck mix (40 cards):** six each of `1` and `2`, and four each of `3`, `4`, `5`, `8`, `10`, `11` and `Bump!`. When the draw pile runs out, shuffle the discard pile to make a new one.

- If a card allows any legal move, you must make one. You can't decline an `11` or a backward move.
- After a `2` you draw again even if the `2` itself had no legal move.

## Movement rules

- **Bumping:** if you end your move on an opponent's pawn, it goes back to its Start.
- You can't end a move on a square occupied by your own pawn.
- **Home needs an exact count.** Overshooting is not a legal move.
- Pawns in a Safety zone can't be bumped or swapped.
- Backward moves can carry a pawn out of the Safety zone and back onto the main track.
- Moving pawns jump over any pawns they pass; only the square you end on matters.
- **Slides:** landing exactly on the start of another color's slide carries your pawn to the end of it. Every pawn on the slide, yours included, is bumped back to Start. You don't slide on your own color's slide.
  - Any landing counts: forward, backward, an `11` swap or a `Bump!`. Passing over a slide start does nothing.
  - Only the moving pawn slides. An opponent swapped onto your old square never slides.

## Lazy rules

Each of these can be switched off in Settings.

### 💤 Naps

Each time a pawn is about to move by a number (forward or backward), roll a hidden die. On a 1-in-6 chance the pawn **naps** and moves only **half the value, rounded down**. Leaving Start, `Bump!` and swaps never nap.

- You choose your move first, then the die is rolled.
- A nap on a `1` (or the `10`'s 1 backward) means the pawn doesn't move at all.
- If the shorter move would end on your own pawn, the pawn doesn't move at all.
- Wherever a napping pawn ends up is a normal landing: it bumps, slides and can land on a couch.

### 🛋️ Couches

A pawn that ends its move on a couch square **falls asleep**:

- On your next turn you can't move that pawn unless moving your sleeping pawns is all you can legally do. If it moves, it wakes up.
- While asleep it's an easy target: an opponent ending a move **on or next to** it (on the track squares either side) bumps it. Where a pawn ends up after a slide is where it ended its move. Your own pawns never bump your sleepers.
- It wakes up after your next turn either way, even if you passed or snoozed.
- Falling asleep on the first move of a `2` doesn't stop you moving that pawn with the extra draw: it's still the same turn.
- A bumped sleeper wakes up back in Start. A sleeper swapped by an `11` stays asleep on its new square, and the swapping pawn doesn't bump it for being next door.

### ⏰ Snooze button

Once per game, each player may skip a turn on purpose and keep the card they drew for their next turn instead of drawing.

- You snooze after drawing, with any card, even one you'd have to play.
- On your next turn you pick up the kept card instead of drawing, and must play it as usual. A kept `2` still lets you draw again.
- A snooze can come on the extra draw after a `2`. It ends your turn.

## Autopilot (for lazy humans)

- **Auto-move:** if you have exactly one legal move, or none, the game plays it for you.
- **Full lazy mode:** hand your turns to the Medium bot. You can toggle it at any time.
