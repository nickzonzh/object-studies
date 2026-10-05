import assert from 'node:assert/strict'
import { test } from 'vitest'
import { MATERIALS } from '../src/index.js'
import { playClack, unlockAudio } from '../src/lib/audio.js'

// A stand-in for the Web Audio graph that records each node's wiring.
class FakeNode {
  kind: string
  disconnected = false
  onended: (() => void) | null = null
  constructor(kind: string) {
    this.kind = kind
  }
  connect<T>(target: T): T {
    return target
  }
  disconnect() {
    this.disconnected = true
  }
  start() {}
  stop() {}
}

const param = () => ({
  value: 0,
  setValueAtTime() {},
  linearRampToValueAtTime() {},
  exponentialRampToValueAtTime() {},
  setTargetAtTime() {},
})

const nodes: FakeNode[] = []
const make = (kind: string, extra: object = {}) => {
  const node = Object.assign(new FakeNode(kind), extra)
  nodes.push(node)
  return node
}

class FakeAudioContext {
  state = 'running'
  private clock = 1
  // Moves on with every read, so back-to-back clicks aren't merged as one.
  get currentTime() {
    return (this.clock += 0.01)
  }
  sampleRate = 48000
  destination = make('destination')
  resume() {
    return Promise.resolve()
  }
  createDynamicsCompressor() {
    return make('compressor', { threshold: param(), ratio: param(), attack: param(), release: param() })
  }
  createGain() {
    return make('gain', { gain: param() })
  }
  createBuffer(_channels: number, length: number) {
    return { getChannelData: () => new Float32Array(length) }
  }
  createBufferSource() {
    return make('noise', { buffer: null, playbackRate: param() })
  }
  createBiquadFilter() {
    return make('filter', { type: '', frequency: param(), Q: param() })
  }
  createStereoPanner() {
    return make('panner', { pan: param() })
  }
  createOscillator() {
    return make('tone', { type: '', frequency: param() })
  }
}

test('a ringing click keeps its stereo path open until the ring has finished', () => {
  ;(globalThis as { window?: unknown }).window = { AudioContext: FakeAudioContext }
  try {
    unlockAudio()
    nodes.length = 0
    playClack(MATERIALS.mati, 1, 0.5, 1)
    const noise = nodes.find((node) => node.kind === 'noise')!
    const tone = nodes.find((node) => node.kind === 'tone')!
    const panner = nodes.find((node) => node.kind === 'panner')!
    // The noise burst is 60 ms; the mati's ring runs to about 180 ms.
    noise.onended?.()
    assert.equal(panner.disconnected, false, 'the ring is cut off when the noise burst ends')
    tone.onended?.()
    assert.equal(panner.disconnected, true, 'the panner is released once both sounds end')

    // A material with no ring releases its panner with the noise burst.
    nodes.length = 0
    playClack(MATERIALS['olive-wood'], 1, -0.5, 1)
    nodes.find((node) => node.kind === 'noise')!.onended?.()
    assert.equal(nodes.find((node) => node.kind === 'panner')!.disconnected, true)
  } finally {
    delete (globalThis as { window?: unknown }).window
  }
})
