// Little synthesized sound effects (Web Audio, no asset files). Every call is best-effort: if the
// browser has no audio, or blocks it, the game just stays quiet.
import type { Sound } from './effects'

interface Note {
  /** Hz at the start, and optionally at the end (a glide). */
  freq: number
  to?: number
  /** Seconds after the sound starts. */
  at: number
  length: number
  type?: OscillatorType
  volume?: number
}

const SOUNDS: Readonly<Record<Sound, Note[]>> = {
  draw: [{ freq: 1400, to: 900, at: 0, length: 0.05, type: 'triangle', volume: 0.12 }],
  move: [
    { freq: 520, at: 0, length: 0.07, type: 'triangle' },
    { freq: 660, at: 0.08, length: 0.07, type: 'triangle' },
  ],
  slide: [{ freq: 300, to: 900, at: 0, length: 0.28, type: 'sine', volume: 0.15 }],
  bump: [
    { freq: 220, to: 60, at: 0, length: 0.22, type: 'square', volume: 0.12 },
    { freq: 880, to: 440, at: 0.02, length: 0.12, type: 'triangle', volume: 0.1 },
  ],
  nap: [
    { freq: 392, to: 330, at: 0, length: 0.3, type: 'sine' },
    { freq: 330, to: 247, at: 0.3, length: 0.45, type: 'sine' },
  ],
  home: [
    { freq: 784, at: 0, length: 0.12, type: 'triangle' },
    { freq: 1047, at: 0.1, length: 0.2, type: 'triangle' },
  ],
  win: [523, 659, 784, 1047].map((freq, i) => ({
    freq,
    at: i * 0.12,
    length: i === 3 ? 0.5 : 0.14,
    type: 'triangle' as const,
  })),
  snooze: [
    { freq: 988, at: 0, length: 0.06, type: 'square', volume: 0.06 },
    { freq: 988, at: 0.12, length: 0.06, type: 'square', volume: 0.06 },
  ],
}

let context: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null
  context ??= new AudioContext()
  // Browsers start audio suspended until the page has had a click; resuming is harmless after.
  if (context.state === 'suspended') void context.resume().catch(() => {})
  return context
}

export function playSound(sound: Sound) {
  try {
    const ctx = audio()
    if (!ctx) return
    const now = ctx.currentTime
    for (const n of SOUNDS[sound]) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = now + n.at
      const end = start + n.length
      osc.type = n.type ?? 'sine'
      osc.frequency.setValueAtTime(n.freq, start)
      if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, end)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(n.volume ?? 0.18, start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, end)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(end + 0.02)
    }
  } catch {
    // No sound is fine.
  }
}
