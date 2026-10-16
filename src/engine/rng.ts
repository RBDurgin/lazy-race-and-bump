// Seeded PRNG (mulberry32). The state is a plain 32-bit number stored in GameState,
// so every random draw is reproducible from the game's seed.

/** Returns a float in [0, 1) and the next RNG state. */
export function nextFloat(state: number): [number, number] {
  const next = (state + 0x6d2b79f5) | 0
  let t = next
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next]
}

/** Returns an integer in [0, n) and the next RNG state. */
export function nextInt(state: number, n: number): [number, number] {
  const [f, next] = nextFloat(state)
  return [Math.floor(f * n), next]
}

/** Fisher–Yates shuffle. Returns a new array and the next RNG state. */
export function shuffle<T>(items: readonly T[], state: number): [T[], number] {
  const out = [...items]
  let rng = state
  for (let i = out.length - 1; i > 0; i--) {
    let j: number
    ;[j, rng] = nextInt(rng, i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return [out, rng]
}
