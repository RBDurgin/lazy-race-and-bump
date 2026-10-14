# Lazy Race and Bump: Project Plan

## Context

Robert wants to build **"Lazy Race and Bump"** as a personal learning side project. It's an original race-and-bump board game loosely inspired by classic "race your pawns home" games. Nothing in the game itself (name, card names, UI text, art) uses the _Sorry!_ trademark or Hasbro branding. `/workspace/lazy-sorry` is empty (no git repo yet). The folder name can stay, but the package name, app title and docs all use "Lazy Race and Bump" (`lazy-race-and-bump`).

Decisions so far:

- **Twist:** all three "lazy" ideas: _autopilot_ (the game plays obvious moves for you), _lazy pawns_ (pawns sometimes nap or slack off), and a _shorter, simpler game_.
- **Platform:** Web, TypeScript + React.
- **Players:** one human vs. rule-based bots (an all-bot "spectate" mode comes for free). No online play and no LLM opponents for now.

When planning is approved, the first step is to save this plan as `docs/PLAN.md` and the rules as `docs/RULES.md`.

---

## Game Design: Lazy Race and Bump Rules (draft, goes in docs/RULES.md)

### Board and pieces (short, simple game)

- **Track:** 40 squares (10 per side).
- **Pawns per player:** 2.
- **Safety zone:** 3 squares, then Home.
- **Players:** 2–4 (1 human + 1–3 bots).
- **Slides:** one 4-square slide per side.

**Deck (40 cards):** `1`, `2` (draw again), `3`, `4` (move back 4), `5`, `8`, `10` (10 forward or 1 back), `11` (11 forward or swap with an opponent), and **`Bump!`** (move a pawn from Start onto any opponent's square and send that pawn back to Start). You leave Start on a `1`, a `2` or a `Bump!`.

**Core rules:**

- Landing on an opponent bumps them back to Start.
- You can't land on your own pawn.
- Home needs an exact count.
- Slides bump every pawn they pass over.
- If no legal move exists, the turn is forfeited.

### Lazy pawns

- **Nap check:** each time a pawn is about to move, there's a 1-in-6 chance it "naps" and moves only half the card value, rounded down. 💤 shows on the board. A `Bump!` or a swap never naps.
- **Couch squares:** there's one per side. A pawn that lands on a couch falls asleep and can't be chosen next turn unless it's your only legal move. A sleeping pawn is easier to hit: any opponent landing _on or next to_ it bumps it.
- **Snooze button:** once per game, each player may skip their turn on purpose and keep the card in hand for the next turn.
- Every lazy mechanic is a toggle in the settings, so you can play a plain variant for comparison and testing.

### Autopilot

- **Auto-move:** when there is exactly one legal move (or none), it plays itself after a short delay.
- **Full lazy mode:** a toggle that hands your turn to the bot (it uses the Medium strategy). You can switch it on or off at any time.

### Bots

- **Easy:** picks a random legal move.
- **Medium:** scores each move with a heuristic: +bump, +reach safety/home, +leave Start, −end next to an opponent, −land on a couch.
- **Hard (stretch goal):** Medium, plus one move of lookahead over likely opponent cards.

---

## Architecture

- **Tooling:** Vite + React + TypeScript (strict), Vitest for tests, ESLint + Prettier. Package name `lazy-race-and-bump`. Deploy to GitHub Pages later.
- **Pure game engine** in `src/engine/`, with no React imports and a deterministic seeded RNG. This makes it fully unit-testable and lets bots simulate moves.
  - `types.ts`: `GameState`, `Pawn`, `Card`, `Move`, `Settings`
  - `board.ts`: track geometry (40 squares, slides, couches, safety and home per color), position math
  - `deck.ts`: deck build, shuffle, draw (seeded)
  - `rng.ts`: seeded PRNG (mulberry32)
  - `moves.ts`: `getLegalMoves(state, card)`
  - `apply.ts`: `applyMove(state, move)`, which returns a new state (immutable), plus a list of events (bump, slide, nap)
  - `lazy.ts`: nap check, couch sleep, snooze
  - `game.ts`: turn flow (draw → choose → apply → next player, extra draw on a `2`, win check)
- **Bots** in `src/bots/`: `easy.ts`, `medium.ts`, all behind a common `Bot` interface `(state, card) => Move`.
- **UI** in `src/ui/`: an SVG board component, pawn tokens, card display, move picker (click a highlighted pawn or square), an event log ("Blue napped 💤", "Red got bumped!"), settings screen, and a game-over screen. All art and wording is original.
- **State management:** a `useReducer` hook wrapping the engine, with timed effects driving bot turns and autopilot.

---

## Phases

**Phase 0: Setup**

- `git init`, Vite React-TS scaffold, Vitest, ESLint/Prettier, `.gitignore`.
- Write `docs/PLAN.md` (this plan) and `docs/RULES.md`.

**Phase 1: Core engine (base rules, no lazy mechanics yet)**

- board, deck, rng, legal moves, apply move, turn flow, win detection.
- Thorough Vitest coverage: bumps, slides, exact Home, swap, `Bump!`, backward moves into and out of safety, the draw-again `2`.
- A headless all-bot simulation that plays 1,000 random games to catch stuck states or infinite loops.

**Phase 2: Playable UI**

- SVG board, pawns, card draw, click-to-move with highlighted legal targets, event log.
- 1 human vs. Easy bots. Game setup screen (number of players, colors).

**Phase 3: Lazy mechanics**

- Nap check, couches and sleeping, snooze button, settings toggles.
- Tests for each mechanic. Run the simulation again to check game length (target: about 10 minutes, roughly 30–50 turns).

**Phase 4: Bots and autopilot**

- Medium heuristic bot, auto-move for forced moves, full lazy mode toggle.
- Bot-vs-bot benchmark: Medium should clearly beat Easy.

**Phase 5: Polish and ship**

- Pawn movement animations, nap and bump effects, optional sounds, responsive layout, `localStorage` for settings.
- GitHub Pages deploy. Stretch goals: Hard bot, a game replay built from the seeded event log.

---

## Verification

- `npm test`: engine and bot unit tests, plus the simulation smoke test (no crashes, every game ends).
- `npm run dev`: play a full game in the browser against bots. Turn each lazy toggle on and off and check that the board and event log reflect naps, couches and autopilot.
- `npm run build`: production build succeeds with type-checking.
- Before shipping, grep the repo for "Sorry" and make sure none of it appears in user-facing text.
