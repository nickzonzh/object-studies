// Painting a piece takes from a tenth of a second to over a second of solid
// work. Where the browser allows it, that work runs in a Web Worker so the page
// never freezes for it. Otherwise it runs here on the main thread: when there is
// no Worker or OffscreenCanvas, when the worker will not load (a bundler or a
// content security policy can stop it), or when it cannot blur and would paint
// crisper pieces than the main thread does.

// Inlined into the build, so the worker ships inside the package and needs no bundler setup to load.
import PaintWorker from './paint.worker.ts?worker&inline'
import { canvasBlurs, type PaintCanvas } from './painter.js'
import type { Finish, TextureSource } from './renderer.js'
import { SHAPES, type ShapeId } from './shapes.js'
import { paintVessel, type StyleId } from './styles.js'

type Design = { shape: ShapeId; style: StyleId; palette: string; seed: number; detail: number }
export type PaintRequest = Design & { id: number }
export type PaintReply =
  | { kind: 'ready'; blurs: boolean }
  | { kind: 'painted'; id: number; color: ImageBitmap; mat: ImageBitmap; finish: Finish }
  | { kind: 'failed'; id: number; message: string }

export type PaintedSurface = {
  color: TextureSource
  mat: TextureSource
  finish: Finish
  /** Let go of the maps once they are on the GPU. */
  release: () => void
}

type Job = { design: Design; resolve: (s: PaintedSurface) => void; reject: (err: Error) => void }

let worker: Promise<Worker | null> | null = null
const jobs = new Map<number, Job>()
let nextId = 0

const free = (c: PaintCanvas) => {
  c.width = c.height = 1
}

function paintHere({ shape, style, palette, seed, detail }: Design): PaintedSurface {
  const s = paintVessel(SHAPES[shape], style, palette, seed, detail)
  return { ...s, release: () => (free(s.color), free(s.mat)) }
}

function startWorker(): Promise<Worker | null> {
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    let w: Worker
    try {
      w = new PaintWorker()
    } catch (err) {
      console.warn('[keramos] painting on the main thread, the paint worker would not start:', err)
      resolve(null)
      return
    }
    w.addEventListener('message', (event: MessageEvent<PaintReply>) => {
      const m = event.data
      if (m.kind === 'ready') {
        if (m.blurs || !canvasBlurs()) return resolve(w)
        console.warn('[keramos] painting on the main thread, the paint worker cannot blur')
        w.terminate()
        return resolve(null)
      }
      const job = jobs.get(m.id)
      if (!job) return
      jobs.delete(m.id)
      if (m.kind === 'painted') job.resolve({ color: m.color, mat: m.mat, finish: m.finish, release: () => (m.color.close(), m.mat.close()) })
      else job.reject(new Error(m.message))
    })
    // The worker failed to load or died: paint here from now on, starting with anything it was holding.
    w.addEventListener('error', (event) => {
      event.preventDefault()
      console.warn('[keramos] painting on the main thread, the paint worker failed:', event.message)
      w.terminate()
      worker = Promise.resolve(null)
      resolve(null)
      for (const [id, job] of jobs) {
        jobs.delete(id)
        try {
          job.resolve(paintHere(job.design))
        } catch (err) {
          job.reject(err instanceof Error ? err : new Error(String(err)))
        }
      }
    })
  })
}

/** Paint a piece's colour and material maps, off the main thread where possible. */
export async function paintSurface(design: Design): Promise<PaintedSurface> {
  worker ??= startWorker()
  const w = await worker
  if (!w) return paintHere(design)
  return new Promise((resolve, reject) => {
    const id = ++nextId
    jobs.set(id, { design, resolve, reject })
    w.postMessage({ ...design, id } satisfies PaintRequest)
  })
}
