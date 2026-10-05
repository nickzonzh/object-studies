import type { Material } from './materials.js'

/** Clicks allowed to ring at once across the whole page. */
const MAX_VOICES = 14

type Audio = {
  ctx: AudioContext
  out: GainNode
  noise: AudioBuffer
}

// One audio graph for the whole page. Browsers cap and throttle
// AudioContexts, so every strand shares this one.
let audio: Audio | null = null
let voices = 0
let lastClick = 0

/**
 * Creates the shared audio graph on first use and resumes it if the browser
 * suspended it. Browsers only allow this from a user gesture: pointerdown on
 * desktop, pointerup or a key press on touch devices.
 */
export function unlockAudio(): void {
  if (!audio) {
    if (typeof window === 'undefined') return
    const AudioContextClass =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    let ctx: AudioContext
    try {
      ctx = new AudioContextClass()
    } catch {
      return
    }
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -14
    limiter.ratio.value = 6
    limiter.attack.value = 0.002
    limiter.release.value = 0.12
    const out = ctx.createGain()
    out.connect(limiter).connect(ctx.destination)
    // A short burst of seeded white noise, filtered per click.
    const length = Math.floor(ctx.sampleRate * 0.06)
    const noise = ctx.createBuffer(1, length, ctx.sampleRate)
    const samples = noise.getChannelData(0)
    let state = 1234567
    for (let i = 0; i < length; i++) {
      state = (state * 1103515245 + 12345) >>> 0
      samples[i] = (state / 4294967295) * 2 - 1
    }
    audio = { ctx, out, noise }
  }
  if (audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {})
}

/**
 * One bead knocking another: band-passed noise at the material's pitch, plus
 * a short sine ring for glass and stone. `strength` runs 0 to 1 and `pan`
 * -1 (left) to 1 (right). Silent until `unlockAudio` has run.
 */
export function playClack(material: Material, strength: number, pan: number, volume: number): void {
  if (!audio || audio.ctx.state !== 'running' || volume <= 0 || voices >= MAX_VOICES) return
  const { ctx, out, noise } = audio
  const now = ctx.currentTime
  if (now - lastClick < 0.004) return
  lastClick = now
  const k = Math.min(1, Math.max(0, strength))
  const { pitch, decay, ring } = material.sound
  const detune = 0.9 + Math.random() * 0.2
  const peak = (0.08 + k * 0.9) * volume

  const source = ctx.createBufferSource()
  source.buffer = noise
  source.playbackRate.value = 0.9 + Math.random() * 0.2
  const band = ctx.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = pitch * detune * (0.92 + k * 0.16)
  band.Q.value = 5 + ring * 10
  const envelope = ctx.createGain()
  envelope.gain.setValueAtTime(0, now)
  envelope.gain.linearRampToValueAtTime(peak, now + 0.0015)
  envelope.gain.exponentialRampToValueAtTime(1e-4, now + decay * (0.8 + k * 0.5))
  const panner = ctx.createStereoPanner?.()
  source.connect(band).connect(envelope)
  if (panner) {
    panner.pan.value = Math.max(-1, Math.min(1, pan)) * 0.6
    envelope.connect(panner).connect(out)
  } else envelope.connect(out)
  source.start(now)
  source.stop(now + decay * 2 + 0.02)
  voices++
  source.onended = () => {
    voices--
    source.disconnect()
    envelope.disconnect()
    panner?.disconnect()
  }

  if (ring > 0.05) {
    const tone = ctx.createOscillator()
    tone.type = 'sine'
    tone.frequency.value = pitch * detune * 1.62
    const toneGain = ctx.createGain()
    toneGain.gain.setValueAtTime(0, now)
    toneGain.gain.linearRampToValueAtTime(peak * ring * 0.18, now + 0.002)
    toneGain.gain.exponentialRampToValueAtTime(1e-4, now + decay * 2.4)
    tone.connect(toneGain).connect(panner ?? out)
    tone.start(now)
    tone.stop(now + decay * 2.6)
    tone.onended = () => {
      tone.disconnect()
      toneGain.disconnect()
    }
  }
}
