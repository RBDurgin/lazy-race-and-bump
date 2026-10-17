# Lazy Race and Bump

A browser race-and-bump board game: a shortened, "lazy" take on classic pawn-racing games.
Pawns nap, couches are comfy, and autopilot will happily play your turn for you.

Play against Easy, Medium or Hard bots. Every finished game can be watched again as a replay,
and shared as a link: the game is rebuilt from its seed and moves, so the link holds no board
state at all.

- Rules: [docs/RULES.md](docs/RULES.md)
- Plan: [docs/PLAN.md](docs/PLAN.md)

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`: lint, format check, tests, build, then a
deploy of `dist/` to GitHub Pages. One-time setup: in the repo's **Settings → Pages**, set
**Source** to **GitHub Actions**. The build uses relative asset paths, so it works at
`https://<user>.github.io/<repo>/` without configuration.

## Development

```sh
npm install
npm run dev        # dev server
npm test           # Vitest
npm run lint       # ESLint
npm run format     # Prettier
npm run build      # type-check + production build
```
