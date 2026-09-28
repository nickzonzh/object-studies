import { useEffect, useRef, useState } from 'react'
import { SHAPES, type ShapeId } from '../lib/shapes.js'
import {
  DEFAULT_LIGHT,
  type Scene,
  VaseRenderer,
  frameFor,
  STILL_MOVING_BUDGET,
  STILL_REST_BUDGET,
  lampLight,
  renderInto,
  sharedRenderer,
} from '../lib/renderer.js'
import { paintVessel, type StyleId } from '../lib/styles.js'
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
  /** Texture detail: 1 is standard, higher for a piece shown large, lower for small shelf pieces. */
  detail?: number
  /** Idle turntable speed multiplier. */
  spin?: number
  /** Cap the frame rate, handy when several pieces share a page. */
  maxFps?: number
  className?: string
  label?: string
  onReady?: () => void
}

const SPIN = 0.16 // rad/s
const FRICTION = 3.2

// Painting a surface takes a few hundred milliseconds on the main thread, so
// pieces on the same page take turns instead of freezing it all at once.
const paintQueue: (() => void)[] = []
let painting = false
function schedulePaint(job: () => void) {
  paintQueue.push(job)
  if (!painting) drain()
}
function drain() {
  const job = paintQueue.shift()
  if (!job) {
    painting = false
    return
  }
  painting = true
  window.setTimeout(() => {
    job()
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
  detail = 1,
  className,
  label,
  onReady,
}: VaseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const ownRenderer = useRef<VaseRenderer | null>(null)
  const sceneRef = useRef<Scene | null>(null)
  const loopRef = useRef<{ wake: () => void; draw: () => void } | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [painting, setPainting] = useState(true)
  const [awake, setAwake] = useState(false)
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
  // a wall plate stays put until someone spins it
  state.current.turntable = turntable && !isPlate
  state.current.spin = spin
  state.current.maxFps = maxFps
  const def = SHAPES[shape]
  const { aspect } = frameFor(def)

  // The renderer: a live piece owns a GPU context; a still piece borrows the shared one.
  const renderer = () => (mode === 'live' ? ownRenderer.current : sharedRenderer())

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      if (mode === 'live') ownRenderer.current = new VaseRenderer(canvas)
      else sharedRenderer()
    } catch (err) {
      console.error('[keramos]', err)
      setFailed(err instanceof Error ? err.message : 'WebGL unavailable')
      return
    }
    return () => {
      if (sceneRef.current) renderer()?.deleteScene(sceneRef.current)
      sceneRef.current = null
      ownRenderer.current?.dispose()
      ownRenderer.current = null
    }
  }, [mode])

  // paint the surface whenever the design changes
  useEffect(() => {
    if (failed) return
    setPainting(true)
    let cancelled = false
    schedulePaint(() => {
      const r = renderer()
      if (cancelled || !r) return
      try {
        const t0 = performance.now()
        const s = paintVessel(def, vaseStyle, palette, seed, detail)
        const next = r.createScene(def, s.color, s.mat, s.finish)
        s.color.width = s.color.height = 1
        s.mat.width = s.mat.height = 1
        if (sceneRef.current) r.deleteScene(sceneRef.current)
        sceneRef.current = next
        console.debug(`[keramos] painted ${shape} in ${Math.round(performance.now() - t0)}ms`)
      } catch (err) {
        console.error('[keramos]', err)
        setFailed(err instanceof Error ? err.message : String(err))
        return
      }
      state.current.dirty = true
      loopRef.current?.draw()
      setPainting(false)
      onReady?.()
    })
    return () => {
      cancelled = true
    }
  }, [shape, vaseStyle, palette, seed, detail, failed])

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
    // little lighter while they move.
    const draw = (atRest = true) => {
      const scene = sceneRef.current
      if (!scene) return
      const view = { rotation: st.rotation, lightAz: st.lightAz, lightEl: st.lightEl }
      if (mode === 'live') ownRenderer.current?.render(scene, view)
      else renderInto(scene, view, canvas, atRest ? STILL_REST_BUDGET : STILL_MOVING_BUDGET)
      st.dirty = false
    }

    const ro = new ResizeObserver(() => {
      const rect = wrap.getBoundingClientRect()
      const scale = Math.min(window.devicePixelRatio || 1, 2)
      if (mode === 'live') ownRenderer.current?.resize(rect.width, rect.height, window.devicePixelRatio || 1)
      else {
        const w = Math.max(1, Math.round(rect.width * scale))
        const h = Math.max(1, Math.round(rect.height * scale))
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w
          canvas.height = h
        }
      }
      st.dirty = true
      if (!running) draw()
    })
    ro.observe(wrap)
    const io = new IntersectionObserver((entries) => {
      st.visible = entries.some((e) => e.isIntersecting)
      if (st.visible) wake()
    })
    io.observe(wrap)

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
      if (mode === 'still' && settled()) {
        // one last, fully supersampled frame in the room light
        draw(true)
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
    loopRef.current = { wake, draw: () => (running ? (st.dirty = true) : draw()) }
    if (mode === 'live') wake()

    return () => {
      cancelAnimationFrame(raf)
      running = false
      ro.disconnect()
      io.disconnect()
      mq.removeEventListener('change', onMq)
      loopRef.current = null
    }
  }, [mode])

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
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      {failed ? <p className="keramos-vase__fallback">This piece needs WebGL2 to render.</p> : null}
    </div>
  )
}
