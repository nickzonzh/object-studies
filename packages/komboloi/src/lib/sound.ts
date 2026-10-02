import type { Material } from './materials.js'

/**
 * The click of one bead on another, synthesised: a few milliseconds of noise
 * through a resonant band-pass tuned to the material, and for glass and stone
 * a short ring on top. Nothing is loaded and nothing plays until someone has
 * touched the strand, because browsers only allow sound after a gesture.
 */
export type Clacker = {
  /** Call from inside a pointer or key handler: it unlocks audio. */
  unlock: () => void
  /** `strength` is 0 to 1. `pan` is -1 (left) to 1 (right). */
  clack: (strength: number, pan: number) => void
  setVolume: (volume: number) => void
  dispose: () => void
}

const MAX_VOICES = 14

export function createClacker(material: Material, volume: number): Clacker {
  let ctx: AudioContext | null = null
  let out: GainNode | null = null
  let noise: AudioBuffer | null = null
  let voices = 0
  let level = volume
  let last = 0

  const setup = () => {
    if (ctx || typeof window === 'undefined') return
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    try {
      ctx = new Ctor()
    } catch {
      return
    }
    out = ctx.createGain()
    out.gain.value = level
    // A gentle limiter: a cascade of beads should not clip.
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -14
    limiter.ratio.value = 6
    limiter.attack.value = 0.002
    limiter.release.value = 0.12
    out.connect(limiter).connect(ctx.destination)
    const length = Math.floor(ctx.sampleRate * 0.06)
    noise = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = noise.getChannelData(0)
    // Fixed noise: the same click every time is fine, the filter varies it.
    let seed = 1234567
    for (let i = 0; i < length; i++) {
      seed = (seed * 1103515245 + 12345) >>> 0
      data[i] = (seed / 0xffffffff) * 2 - 1
    }
  }

  return {
    unlock() {
      setup()
      if (ctx?.state === 'suspended') void ctx.resume().catch(() => {})
    },
    clack(strength, pan) {
      if (!ctx || !out || !noise || ctx.state !== 'running' || level <= 0) return
      if (voices >= MAX_VOICES) return
      const now = ctx.currentTime
      // Two knocks inside a couple of milliseconds are heard as one.
      if (now - last < 0.004) return
      last = now
      const s = Math.min(1, Math.max(0, strength))
      const { pitch, decay, ring } = material.sound
      const detune = 0.9 + Math.random() * 0.2
      const amp = 0.08 + s * 0.9

      const src = ctx.createBufferSource()
      src.buffer = noise
      src.playbackRate.value = 0.9 + Math.random() * 0.2
      const band = ctx.createBiquadFilter()
      band.type = 'bandpass'
      band.frequency.value = pitch * detune * (0.92 + s * 0.16)
      band.Q.value = 5 + ring * 10
      const env = ctx.createGain()
      env.gain.setValueAtTime(0, now)
      env.gain.linearRampToValueAtTime(amp, now + 0.0015)
      env.gain.exponentialRampToValueAtTime(0.0001, now + decay * (0.8 + s * 0.5))
      const panner = ctx.createStereoPanner?.()
      src.connect(band).connect(env)
      if (panner) {
        panner.pan.value = Math.max(-1, Math.min(1, pan)) * 0.6
        env.connect(panner).connect(out)
      } else env.connect(out)
      src.start(now)
      src.stop(now + decay * 2 + 0.02)
      voices++
      src.onended = () => {
        voices--
        src.disconnect()
        env.disconnect()
        panner?.disconnect()
      }

      if (ring > 0.05) {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = pitch * detune * 1.62
        const ringEnv = ctx.createGain()
        const ringAmp = amp * ring * 0.18
        ringEnv.gain.setValueAtTime(0, now)
        ringEnv.gain.linearRampToValueAtTime(ringAmp, now + 0.002)
        ringEnv.gain.exponentialRampToValueAtTime(0.0001, now + decay * 2.4)
        osc.connect(ringEnv).connect(panner ?? out)
        osc.start(now)
        osc.stop(now + decay * 2.6)
        osc.onended = () => {
          osc.disconnect()
          ringEnv.disconnect()
        }
      }
    },
    setVolume(v) {
      level = Math.min(1, Math.max(0, v))
      if (out && ctx) out.gain.setTargetAtTime(level, ctx.currentTime, 0.02)
    },
    dispose() {
      void ctx?.close().catch(() => {})
      ctx = null
      out = null
    },
  }
}
