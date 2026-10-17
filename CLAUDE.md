# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

**Lazy Race and Bump** is a browser race-and-bump board game: a shortened, "lazy" take on classic pawn-racing games. Phases 0–5 are done, stretch goals included: the base-rules engine (`src/engine/`), the Easy, Medium and Hard bots (`src/bots/`), a playable UI (`src/ui/`: setup screen with bot level, lazy-rule and auto-move toggles, SVG board, click-to-move, event log, game-over screen), the lazy mechanics (naps, couches, snooze), autopilot (auto-move, full lazy mode) and polish (pawn animations, bump/nap/home bursts, synthesized sounds, mobile layout, remembered settings, GitHub Pages deploy) and replays with shareable links. Design docs:

- `docs/PLAN.md`: the approved phased plan (Phase 0 setup → Phase 5 polish). Work through it phase by phase.
- `docs/RULES.md`: the rules. This is the source of truth for game behavior. When the engine and the rules disagree, fix one of them so they match. Don't let them drift apart.

## Naming constraint (trademark)

Never use "Sorry" or "Sorry!" in user-facing text, card names, identifiers, the package name, art or commit messages. The game is "Lazy Race and Bump" (package `lazy-race-and-bump`), and the bump-from-Start card is `Bump!`. The folder name `lazy-sorry` is a local leftover and is fine. Before shipping, grep for "Sorry" to check.

## Stack and commands

Vite + React + TypeScript (`strict`), Vitest, ESLint (flat config) + Prettier. `.github/workflows/deploy.yml` runs lint, format check, tests and build, then deploys `dist/` to GitHub Pages on every push to `main`. `vite.config.ts` uses `base: './'`, so the build works under any repo path.

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
- **`src/bots/`**: each bot is a function `(state, card) => Move` behind a common `Bot` interface, with an optional `snooze(state)` (only Hard has one). `index.ts` maps `BotLevel` → bot. Autopilot's "full lazy mode" reuses the Medium bot, so it's not a separate code path.
  - `medium.ts` scores each legal move by running `applyMove` on a copy and calling `evaluate()` on the result (steps to Home, danger from opponents' next draws, couches), averaging in the nap chance. Weight tweaks barely move its win rate, because only about 38% of draws offer a real choice.
  - `hard.ts` is greedy like Medium but scores positions in turns, from `race.ts`: a value-iteration table of expected turns for one color to bring both pawns Home alone, worked out for red and rotated for other colors. It counts cards (`cardOdds`, from the draw pile's contents, never its order) and snoozes when every move is worse than standing still. One-ply lookahead over the opponent's reply was tried and added nothing at 7× the cost, and evaluation weight tweaks (Medium's or Hard's) stay within noise: the game is mostly luck.
  - `arena.ts` (`playBots`) plays headless bot-vs-bot games. `benchmark.test.ts` checks that Medium clearly beats Easy and that Hard beats Medium (fixed seeds, so these are regression checks).
- **`src/ui/`**: React components with an SVG board. The UI never reimplements rules; it asks the engine for legal moves.
  - `gameReducer.ts` is the pure `useReducer` wrapper: one action per engine step (`draw`, `play`, `pass`), plus the event log. `botAction()` picks a bot's next action and `autopilotAction()` picks one for the human's turn (a forced move, or every step in full lazy mode); `Game.tsx` dispatches either on a timer. Keep logic here (tested as `.ts`) rather than in components.
  - `layout.ts` maps positions to SVG coordinates on an 11×11 grid. Each side is laid out as if it were the top row, then rotated.
  - `describe.ts` holds all user-facing text for cards, moves and events.
  - `effects.ts` (`effectsFor(before, after, events)`) turns one engine step into pawn motions (keyframes walking square by square, then a slide; bumped pawns fly back once the mover arrives), bursts (bump, home, nap) and timed sound cues. `UiState.latest` holds each step's `before` state and events for it. `Board.tsx` plays the motions with the Web Animations API on top of the pawns' final positions, so state always renders correctly and animation is purely cosmetic; `prefers-reduced-motion` turns it all off. `Game.tsx` waits for `effects.end` before the next bot or autopilot step, so a bump is seen before the next card is drawn. `BURST_MS` must match the burst animations in `index.css`.
  - `replay.ts`: `UiState.actions` records every action, so a game is its `GameConfig` (with the seed) plus that list. `replayFrames` rebuilds every step by re-running `uiReducer`. `encodeReplay`/`decodeReplay` turn it into a base64url code for `#replay=` links; decoding replays the actions and rejects any code with an illegal one. The last finished game is kept in `localStorage`. `ReplayView.tsx` is the player (only a single step forward animates). `App.tsx` keeps a finished `Game` mounted but hidden while its replay plays, so Done returns to it.
  - `sound.ts` synthesizes the sounds with Web Audio (no asset files). `prefs.ts` keeps setup choices and the sound toggle in `localStorage`, validating every field and tolerating blocked storage.
