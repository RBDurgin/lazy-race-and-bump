# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

**Lazy Race and Bump** is a browser race-and-bump board game: a shortened, "lazy" take on classic pawn-racing games. Phases 0–4 are done: the base-rules engine (`src/engine/`), the Easy and Medium bots (`src/bots/`), a playable UI (`src/ui/`: setup screen with bot level, lazy-rule and auto-move toggles, SVG board, click-to-move, event log, game-over screen), the lazy mechanics (naps, couches, snooze) and autopilot (auto-move, full lazy mode). Next up is Phase 5 (polish and ship). Design docs:

- `docs/PLAN.md`: the approved phased plan (Phase 0 setup → Phase 5 polish). Work through it phase by phase.
- `docs/RULES.md`: the rules. This is the source of truth for game behavior. When the engine and the rules disagree, fix one of them so they match. Don't let them drift apart.

## Naming constraint (trademark)

Never use "Sorry" or "Sorry!" in user-facing text, card names, identifiers, the package name, art or commit messages. The game is "Lazy Race and Bump" (package `lazy-race-and-bump`), and the bump-from-Start card is `Bump!`. The folder name `lazy-sorry` is a local leftover and is fine. Before shipping, grep for "Sorry" to check.

## Stack and commands

Vite + React + TypeScript (`strict`), Vitest, ESLint (flat config) + Prettier. GitHub Pages deploy comes in Phase 5.

- `npm run dev`: dev server
- `npm test`: Vitest, single run (`npm run test:watch` for watch mode). Tests live next to code as `src/**/*.test.ts`.
- `npx vitest run src/engine/moves.test.ts -t "bump"`: run a single test file or test name
- `npm run lint`: ESLint. `eslint.config.js` enforces engine purity: files in `src/engine/` can't import React, `ui/` or `bots/`, touch `window`/`document`, or call `Math.random`.
- `npm run format` / `npm run format:check`: Prettier (no semicolons, single quotes, width 100)
- `npm run typecheck`: `tsc -b` only
- `npm run build`: type-check plus production build

## Architecture

- **`src/engine/`**: the pure game engine. It must not import React, the DOM or `Math.random`.
  - All randomness (shuffles, nap rolls) goes through the seeded RNG in `rng.ts`. That keeps games reproducible from a seed, which tests, bot simulations and replay all depend on.
  - State is immutable. `applyMove(state, move)` returns a new state plus a list of events (bump, slide, nap). The UI renders the event log from those events.
  - Turn flow lives in `game.ts`: `createGame` → `drawCard` → `legalMoves` → `playMove` (or `passTurn` when there's no legal move) → next player, with an extra draw on a `2`. Each step returns `{ state, events }`.
  - Pawn positions are `start | track(0–39) | safety(0–2) | home`. `board.ts` walks them one step at a time (`walk`), so the safety-zone turn-in and backward moves both come from the same code path.
  - `testing.ts` has `scenario()` for building positions in tests. `simulation.test.ts` plays 1,000 random games as a smoke test.
- **Lazy mechanics** (naps, couches, snooze) live in `lazy.ts`, and each one is gated by a `Settings` toggle. With every toggle off, the engine must play the plain base game, seed for seed. Tests rely on that.
  - Naps are rolled in `playMove`, not `applyMove`, so `applyMove` stays deterministic and the UI can use it to preview moves (including couch effects).
  - Couch state is `GameState.asleep` (pawn id → the turn it fell asleep on). `getLegalMoves` filters out drowsy pawns, and `endTurn` wakes them.
  - Snooze is `snoozeTurn`. The kept card sits in `GameState.kept` and comes back from `drawCard`.
- **`src/bots/`**: each bot is a function `(state, card) => Move` behind a common `Bot` interface. `index.ts` maps `BotLevel` → bot. Autopilot's "full lazy mode" reuses the Medium bot, so it's not a separate code path.
  - `medium.ts` scores each legal move by running `applyMove` on a copy and calling `evaluate()` on the result (steps to Home, danger from opponents' next draws, couches), averaging in the nap chance. Weight tweaks barely move its win rate, because only about 38% of draws offer a real choice.
  - `arena.ts` (`playBots`) plays headless bot-vs-bot games. `benchmark.test.ts` checks that Medium clearly beats Easy.
- **`src/ui/`**: React components with an SVG board. The UI never reimplements rules; it asks the engine for legal moves.
  - `gameReducer.ts` is the pure `useReducer` wrapper: one action per engine step (`draw`, `play`, `pass`), plus the event log. `botAction()` picks a bot's next action and `autopilotAction()` picks one for the human's turn (a forced move, or every step in full lazy mode); `Game.tsx` dispatches either on a timer. Keep logic here (tested as `.ts`) rather than in components.
  - `layout.ts` maps positions to SVG coordinates on an 11×11 grid. Each side is laid out as if it were the top row, then rotated.
  - `describe.ts` holds all user-facing text for cards, moves and events.
