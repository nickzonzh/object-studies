import { useEffect, useRef, useState } from 'react'
import { SHAPES, type ShapeId } from '../lib/shapes.js'
import {
  DEFAULT_LIGHT,
  type Scene,
  VaseRenderer,
  detailFor,
  frameFor,
  STILL_MOVING_BUDGET,
  STILL_REST_BUDGET,
  lampLight,
  renderInto,
  sharedRenderer,
} from '../lib/renderer.js'
import { paintSurface } from '../lib/paint.js'
import type { StyleId } from '../lib/styles.js'
import '../styles.css'

export type VaseProps = {
  shape?: ShapeId
  /** 'ikaros' | 'black-figure' | 'red-figure' */
  vaseStyle?: StyleId
  palette?: string
  /** Each seed is a different hand-painted piece. */
  seed?: number
  /**
   * 'live' renders continuously on its own GPU context: use it for the one
   * piece people will study. 'still' renders once in the room light and only
   * comes alive (turning, catching the pointer's light) while hovered or
   * focused. Still pieces share a single GPU context across the whole page.
   */
  mode?: 'live' | 'still'
  /** Slow idle rotation, like a piece on a turntable. Still pieces only turn while hovered. */
  turntable?: boolean
  /** Starting angle, radians. */
  angle?: number
  /** Let people drag to turn the piece. */
  draggable?: boolean
  /**
   * Texture detail: 1 is standard. Leave it out and it follows the size the
   * piece is shown at, so small pieces paint faster and use less GPU memory.
   */
  detail?: number
  /** Idle turntable speed multiplier. */
  spin?: number
  /** Cap the frame rate, handy when several pieces share a page. */
  maxFps?: number
  className?: string
  label?: string
  onReady?: () => void
}

const CANVAS_FILL = { position: 'absolute', inset: 0, width: '100%', height: '100%' } as const

const SPIN = 0.16 // rad/s
const FRICTION = 3.2

// Painting a surface takes a few hundred milliseconds, so pieces on the same
// page take turns: one paint at a time, whether it runs in the paint worker or
// (where there is none) on the main thread, which must not freeze all at once.
type PaintJob = { run: (cancelled: () => boolean) => Promise<void>; cancelled: boolean }
const paintQueue: PaintJob[] = []
let draining = false
function schedulePaint(run: PaintJob['run']) {
  const job: PaintJob = { run, cancelled: false }
  paintQueue.push(job)
  if (!draining) drain()
  return () => {
    job.cancelled = true
  }
}
function drain() {
  // A cancelled job (the design changed, the piece left the page) gives up its turn at once.
  let job = paintQueue.shift()
  while (job?.cancelled) job = paintQueue.shift()
  if (!job) {
    draining = false
    return
  }
  draining = true
  const next = job
  window.setTimeout(async () => {
    if (!next.cancelled) await next.run(() => next.cancelled)
    drain()
  }, 24)
}

export function Vase({
  shape = 'rhodos',
  vaseStyle = 'ikaros',
  palette = 'cobalt-gold',
  seed = 7,
  mode = 'live',
  turntable = true,
  angle = 0,
  draggable = true,
  spin = 1,
  maxFps = 60,
  detail,
  className,
  label,
  onReady,
}: VaseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const ownRenderer = useRef<VaseRenderer | null>(null)
  const stopListening = useRef<(() => void) | null>(null)
  const sceneRef = useRef<Scene | null>(null)
  const paintedRef = useRef<string | null>(null)
  /** A freshly painted design waiting for its first frame before it is shown. */
  const revealRef = useRef<string | null>(null)
  const loopRef = useRef<{ wake: () => void; draw: () => void } | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [paintedKey, setPaintedKey] = useState<string | null>(null)
  const [awake, setAwake] = useState(false)
  /** Within reach of the viewport, so worth painting. */
  const [near, setNear] = useState(false)
  /** Detail the displayed size calls for, per shape; none until the piece has been measured. */
  const [autoDetail, setAutoDetail] = useState<{ shape: ShapeId; value: number } | null>(null)
  /** Bumped when a lost GPU context comes back and the piece must be painted again. */
  const [generation, setGeneration] = useState(0)
  const isPlate = SHAPES[shape].kind === 'plate'
  const state = useRef({
    rotation: angle,
    velocity: 0,
    dragging: false,
    lastX: 0,
    lastT: 0,
    lightAz: DEFAULT_LIGHT.az,
    lightEl: DEFAULT_LIGHT.el,
    targetAz: DEFAULT_LIGHT.az,
    targetEl: DEFAULT_LIGHT.el,
    dirty: true,
    /** A still piece is 'engaged' while hovered, focused or dragged. */
    engaged: false,
    turntable: turntable && !isPlate,
    reduced: false,
    visible: true,
    spin,
    maxFps,
  })
  // What the loop and the painter read, without restarting either.
  const latest = useRef({ onReady })
  useEffect(() => {
    latest.current = { onReady }
    // a wall plate stays put until someone spins it
    Object.assign(state.current, { turntable: turntable && !isPlate, spin, maxFps })
  })
  const { aspect } = frameFor(SHAPES[shape])
  const detailValue = detail ?? (autoDetail?.shape === shape ? autoDetail.value : 0)
  const key = `${mode}|${shape}|${vaseStyle}|${palette}|${seed}|${detailValue}|${generation}`
  const painting = !failed && paintedKey !== key

  // The renderer is created on first paint; this only lets go of it.
  useEffect(() => {
    return () => {
      if (sceneRef.current) (mode === 'live' ? ownRenderer.current : sharedRenderer())?.deleteScene(sceneRef.current)
      sceneRef.current = null
      paintedRef.current = null
      stopListening.current?.()
      stopListening.current = null
      ownRenderer.current?.dispose()
      ownRenderer.current = null
    }
  }, [mode])

  // Paint the surface whenever the design changes, once the piece is near the viewport.
  useEffect(() => {
    if (failed || !near || !detailValue || paintedRef.current === key) return
    return schedulePaint(async (cancelled) => {
      try {
        const r = acquireRenderer()
        if (r.lost) return
        const t0 = performance.now()
        const s = await paintSurface({ shape, style: vaseStyle, palette, seed, detail: detailValue })
        // the design changed, the piece left the page or the GPU went away while it was being painted
        if (cancelled() || r.lost) {
          s.release()
          return
        }
        const def = SHAPES[shape]
        const next = r.createScene(def, s.color, s.mat, s.finish)
        s.release()
        if (sceneRef.current) r.deleteScene(sceneRef.current)
        sceneRef.current = next
        console.debug(`[keramos] painted ${shape} in ${Math.round(performance.now() - t0)}ms`)
      } catch (err) {
        console.error('[keramos]', err)
        setFailed(err instanceof Error ? err.message : String(err))
        return
      }
      paintedRef.current = key
      revealRef.current = key
      state.current.dirty = true
      loopRef.current?.draw()
    })

    function acquireRenderer() {
      const repaint = () => {
        sceneRef.current = null
        paintedRef.current = null
        setGeneration((g) => g + 1)
      }
      if (mode === 'live') {
        if (!ownRenderer.current) {
          ownRenderer.current = new VaseRenderer(canvasRef.current!)
          stopListening.current = ownRenderer.current.onRestore(repaint)
          const wrap = wrapRef.current!.getBoundingClientRect()
          ownRenderer.current.resize(wrap.width, wrap.height, window.devicePixelRatio || 1)
        }
        return ownRenderer.current
      }
      const shared = sharedRenderer()
      if (!stopListening.current) stopListening.current = shared.onRestore(repaint)
      return shared
    }
  }, [key, failed, near, mode, shape, vaseStyle, palette, seed, detailValue])

  // sizing and the frame loop
  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const st = state.current
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    st.reduced = mq.matches
    const onMq = () => (st.reduced = mq.matches)
    mq.addEventListener('change', onMq)

    // Stills render at full supersampling when they come to rest, and a
    // little lighter while they move. Returns false while the shader is still
    // compiling, so the frame is tried again.
    const draw = (atRest = true) => {
      const scene = sceneRef.current
      if (!scene) return true
      const view = { rotation: st.rotation, lightAz: st.lightAz, lightEl: st.lightEl }
      try {
        const drawn =
          mode === 'live'
            ? (ownRenderer.current?.render(scene, view) ?? false)
            : renderInto(scene, view, canvas, atRest ? STILL_REST_BUDGET : STILL_MOVING_BUDGET)
        st.dirty = !drawn
        // Show a new design only once it is on screen: the shader may still be compiling.
        const revealed = revealRef.current
        if (drawn && revealed) {
          revealRef.current = null
          setPaintedKey(revealed)
          latest.current.onReady?.()
        }
        return drawn
      } catch (err) {
        console.error('[keramos]', err)
        setFailed(err instanceof Error ? err.message : String(err))
        return true
      }
    }

    const ro = new ResizeObserver(() => {
      const rect = wrap.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      // Grows only, in tenths, so a window being dragged wider repaints a few times, not every frame.
      const wanted = Math.ceil(detailFor(SHAPES[shape], rect.height, dpr) * 10) / 10
      setAutoDetail((d) => ({ shape, value: d?.shape === shape ? Math.max(d.value, wanted) : wanted }))
      if (mode === 'live') ownRenderer.current?.resize(rect.width, rect.height, dpr)
      else {
        const scale = Math.min(dpr, 2)
        const w = Math.max(1, Math.round(rect.width * scale))
        const h = Math.max(1, Math.round(rect.height * scale))
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w
          canvas.height = h
        }
      }
      st.dirty = true
      if (!running && !draw()) wake()
    })
    ro.observe(wrap)
    const io = new IntersectionObserver((entries) => {
      st.visible = entries.some((e) => e.isIntersecting)
      if (st.visible) wake()
    })
    io.observe(wrap)
    // Paint a little ahead of scrolling, so pieces are ready as they arrive.
    const approach = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setNear(true)
      },
      { rootMargin: '50% 0px' },
    )
    approach.observe(wrap)

    let raf = 0
    let running = false
    let last = performance.now()

    const settled = () =>
      !st.engaged &&
      !st.dragging &&
      Math.abs(st.velocity) < 0.002 &&
      Math.abs(st.targetAz - st.lightAz) < 0.0005 &&
      Math.abs(st.targetEl - st.lightEl) < 0.0005

    const tick = (now: number) => {
      if (!st.visible) {
        running = false
        return
      }
      // a still piece stops its loop once it has come to rest in the room light
      // one last, fully supersampled frame in the room light
      if (mode === 'still' && settled() && draw(true)) {
        running = false
        setAwake(false)
        return
      }
      raf = requestAnimationFrame(tick)
      // an idle turntable is slow enough to run at half rate; anything the
      // person is doing gets the full rate
      const interactive = st.dragging || Math.abs(st.velocity) > 0.002 || Math.abs(st.targetAz - st.lightAz) > 0.002 || Math.abs(st.targetEl - st.lightEl) > 0.002
      const fps = interactive ? st.maxFps : Math.min(st.maxFps, 30)
      if (now - last < 1000 / fps - 2) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const turning = mode === 'live' ? st.turntable : st.turntable && st.engaged
      if (!st.dragging) {
        if (Math.abs(st.velocity) > 0.002) {
          st.rotation += st.velocity * dt
          st.velocity *= Math.exp(-FRICTION * dt)
          st.dirty = true
        } else if (turning && !st.reduced) {
          st.rotation += SPIN * st.spin * dt
          st.dirty = true
        }
      }
      const ease = st.reduced ? 1 : 1 - Math.exp(-6 * dt)
      const dAz = st.targetAz - st.lightAz
      const dEl = st.targetEl - st.lightEl
      if (Math.abs(dAz) > 0.0005 || Math.abs(dEl) > 0.0005) {
        st.lightAz += dAz * ease
        st.lightEl += dEl * ease
        st.dirty = true
      } else {
        st.lightAz = st.targetAz
        st.lightEl = st.targetEl
      }
      if (st.dirty) draw(mode === 'live')
    }

    const wake = () => {
      if (running || !st.visible) return
      running = true
      last = performance.now()
      if (mode === 'still') setAwake(true)
      raf = requestAnimationFrame(tick)
    }
    loopRef.current = {
      wake,
      draw: () => {
        if (running) st.dirty = true
        else if (!draw()) wake()
      },
    }
    if (mode === 'live') wake()

    return () => {
      cancelAnimationFrame(raf)
      running = false
      ro.disconnect()
      io.disconnect()
      approach.disconnect()
      mq.removeEventListener('change', onMq)
      loopRef.current = null
    }
  }, [mode, shape])

  // The pointer is a lamp. A live piece always sees it, softening with
  // distance; a still piece only follows it while engaged.
  useEffect(() => {
    const st = state.current
    const onMove = (e: PointerEvent) => {
      const wrap = wrapRef.current
      if (!wrap) return
      if (mode === 'still' && !st.engaged) return
      const l = lampLight(wrap.getBoundingClientRect(), e.clientX, e.clientY)
      st.targetAz = l.az
      st.targetEl = l.el
      loopRef.current?.wake()
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [mode])

  const engage = (on: boolean, e?: { clientX: number; clientY: number }) => {
    if (mode !== 'still') return
    const st = state.current
    st.engaged = on
    if (on && e && wrapRef.current) {
      const l = lampLight(wrapRef.current.getBoundingClientRect(), e.clientX, e.clientY)
      st.targetAz = l.az
      st.targetEl = l.el
    }
    if (!on) {
      st.targetAz = DEFAULT_LIGHT.az
      st.targetEl = DEFAULT_LIGHT.el
    }
    loopRef.current?.wake()
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!draggable) return
    const st = state.current
    st.dragging = true
    st.lastX = e.clientX
    st.lastT = performance.now()
    st.velocity = 0
    ;(e.target as Element).setPointerCapture(e.pointerId)
    loopRef.current?.wake()
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const st = state.current
    if (!st.dragging) return
    const rect = wrapRef.current!.getBoundingClientRect()
    const now = performance.now()
    const dx = e.clientX - st.lastX
    const dAng = (dx / rect.width) * Math.PI * 1.4
    st.rotation -= dAng
    const dt = Math.max(0.001, (now - st.lastT) / 1000)
    st.velocity = st.velocity * 0.6 + (-dAng / dt) * 0.4
    st.lastX = e.clientX
    st.lastT = now
    st.dirty = true
  }
  const onPointerUp = () => {
    state.current.dragging = false
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    const st = state.current
    if (e.key === 'ArrowLeft') st.rotation += 0.2
    else if (e.key === 'ArrowRight') st.rotation -= 0.2
    else return
    st.dirty = true
    loopRef.current?.wake()
    e.preventDefault()
  }

  return (
    <div
      ref={wrapRef}
      className={`keramos-vase${painting ? ' keramos-vase--painting' : ''}${awake ? ' keramos-vase--awake' : ''}${className ? ` ${className}` : ''}`}
      style={{ aspectRatio: `${aspect}` }}
      role="img"
      aria-label={label ?? `${SHAPES[shape].label}, ${vaseStyle.replace('-', ' ')} style`}
      tabIndex={draggable ? 0 : undefined}
      onKeyDown={draggable ? onKeyDown : undefined}
      onPointerEnter={(e) => engage(true, e)}
      onPointerLeave={() => engage(false)}
      onFocus={() => engage(true)}
      onBlur={() => engage(false)}
    >
      <canvas
        ref={canvasRef}
        className="keramos-vase__canvas"
        // Inline, so the canvas can never size its own wrapper (and loop) without the stylesheet.
        style={CANVAS_FILL}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      {failed ? <p className="keramos-vase__fallback">This piece needs WebGL2 to render.</p> : null}
    </div>
  )
}
