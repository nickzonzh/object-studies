import assert from 'node:assert/strict'
import { test } from 'vitest'
import { VaseRenderer, clampDetail } from '../src/lib/renderer.js'

test('detail is kept to what the painter can allocate, and nonsense means auto', () => {
  assert.equal(clampDetail(undefined), undefined)
  assert.equal(clampDetail(0), undefined)
  assert.equal(clampDetail(-1), undefined)
  assert.equal(clampDetail(Number.NaN), undefined)
  assert.equal(clampDetail(0.1), 0.3)
  assert.equal(clampDetail(1), 1)
  assert.equal(clampDetail(3), 2)
  assert.equal(clampDetail(Number.POSITIVE_INFINITY), 2)
})

const COMPLETION_STATUS_KHR = 0x91b1
const LINK_STATUS = 0x8b82

/**
 * Just enough of a WebGL2 context to follow the shader's build status through a
 * loss and a restore. As in Chrome, a lost context answers every query with
 * null, and a restored one has no extensions enabled until they are asked for again.
 */
function fakeCanvas({ parallel = true } = {}) {
  const gpu = { lost: false, parallelEnabled: false, lostContext: 0 }
  const calls: Record<string, unknown> = {
    LINK_STATUS,
    isContextLost: () => gpu.lost,
    getExtension: (name: string) => {
      if (gpu.lost) return null
      if (name === 'KHR_parallel_shader_compile' && parallel) {
        gpu.parallelEnabled = true
        return { COMPLETION_STATUS_KHR }
      }
      if (name === 'WEBGL_lose_context') return { loseContext: () => gpu.lostContext++ }
      return null
    },
    getProgramParameter: (_program: unknown, pname: number) => {
      if (gpu.lost) return null
      if (pname === COMPLETION_STATUS_KHR) return gpu.parallelEnabled ? true : null
      return pname === LINK_STATUS
    },
  }
  const gl = new Proxy(calls, { get: (target, name: string) => (name in target ? target[name] : () => ({})) })
  const canvas = Object.assign(new EventTarget(), { getContext: () => gl, isConnected: true, width: 1, height: 1 })
  const lose = () => {
    gpu.lost = true
    gpu.parallelEnabled = false
  }
  const restore = () => {
    gpu.lost = false
    canvas.dispatchEvent(new Event('webglcontextrestored'))
  }
  return { canvas: canvas as unknown as HTMLCanvasElement & { isConnected: boolean }, gpu, lose, restore }
}

test.each([true, false])('a lost context waits for the browser instead of failing the piece, and draws again once restored (parallel compile: %s)', (parallel) => {
  const { canvas, lose, restore } = fakeCanvas({ parallel })
  const r = new VaseRenderer(canvas)
  // lost before the shader was ever asked about, and before the browser's event arrives
  lose()
  assert.equal(r.ready(), false)
  canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
  assert.equal(r.lost, true)
  assert.equal(r.ready(), false)
  restore()
  assert.equal(r.lost, false)
  assert.equal(r.ready(), true)
  // and a second loss after it had drawn
  lose()
  assert.equal(r.ready(), false)
  canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
  restore()
  assert.equal(r.ready(), true)
})

test('disposing lets go of the GPU context once the canvas has left the page', () => {
  const kept = fakeCanvas()
  new VaseRenderer(kept.canvas).dispose()
  assert.equal(kept.gpu.lostContext, 0, 'a canvas still on the page keeps its context for the next renderer')

  const gone = fakeCanvas()
  const r = new VaseRenderer(gone.canvas)
  gone.canvas.isConnected = false
  r.dispose()
  assert.equal(gone.gpu.lostContext, 1)
})
