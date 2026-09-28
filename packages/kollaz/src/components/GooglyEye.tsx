import { type CSSProperties, useEffect, useRef } from 'react'
import { BUMP_EVENT } from '../lib/bump.js'
import { restingPupil, stepPupil, type Pupil } from '../lib/googly.js'
import '../styles.css'

export type GooglyEyeProps = {
  /** Diameter in px. */
  size?: number
  /** Pupil follows the cursor instead of rattling under gravity. */
  track?: boolean
  /** How strongly the eye's own movement (scrolling, dragging) throws the pupil around. */
  wobble?: number
  className?: string
  style?: CSSProperties
}

const PUPIL_RATIO = 0.52
// The pupil rattles inside the white card, which sits just inside the clear flange.
const CARD_RATIO = 0.86
const LIMIT = CARD_RATIO - PUPIL_RATIO
const SLEEP_AFTER = 24

// One shared ticker for every eye on the page. Each frame reads all eye positions
// first, then writes all pupils, so there is never a forced layout. Eyes fall asleep
// once they have settled and stopped moving, and wake on scroll, resize, pointer
// movement or a bump. A page full of resting eyes costs nothing.
type EyeState = {
  eye: HTMLElement
  pupilEl: HTMLElement
  track: boolean
  wobble: number
  pupil: Pupil
  prev: { x: number; y: number; vx: number; vy: number } | null
  impulse: { x: number; y: number }
  still: number
  visible: boolean
  placed: string
}

const eyes = new Set<EyeState>()
let frame = 0
let last = 0
let pointer: { x: number; y: number } | null = null
let listening = false
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((entries) => {
  for (const entry of entries) {
    for (const state of eyes) if (state.eye === entry.target) state.visible = entry.isIntersecting
  }
  wake()
})

function wake() {
  for (const state of eyes) state.still = 0
  if (!frame) { last = 0; frame = requestAnimationFrame(tick) }
}

function tick(time: number) {
  frame = 0
  const dt = last ? Math.min((time - last) / 1000, 1 / 30) : 1 / 60
  last = time
  const still = reduced()
  const awake = [...eyes].filter((s) => s.visible && s.still < SLEEP_AFTER)
  // Read phase.
  const rects = awake.map((s) => s.eye.getBoundingClientRect())
  // Write phase.
  awake.forEach((s, i) => {
    const rect = rects[i]
    const radius = rect.width / 2 || 1
    const cx = rect.left + radius
    const cy = rect.top + radius
    let ax = 0
    let ay = 0
    let moved = false
    if (s.prev) {
      const vx = (cx - s.prev.x) / dt
      const vy = (cy - s.prev.y) / dt
      moved = Math.abs(cx - s.prev.x) > 0.05 || Math.abs(cy - s.prev.y) > 0.05
      ax = ((vx - s.prev.vx) / dt / radius) * -0.018 * s.wobble
      ay = ((vy - s.prev.vy) / dt / radius) * -0.018 * s.wobble
      s.prev = { x: cx, y: cy, vx, vy }
    } else {
      s.prev = { x: cx, y: cy, vx: 0, vy: 0 }
    }
    ax = Math.max(-900, Math.min(900, ax))
    ay = Math.max(-900, Math.min(900, ay))

    if (s.track && pointer) {
      const dx = pointer.x - cx
      const dy = pointer.y - cy
      const d = Math.hypot(dx, dy) || 1
      const reach = Math.min(1, d / (radius * 3)) * LIMIT
      const tx = (dx / d) * reach
      const ty = (dy / d) * reach
      if (still) s.pupil = { x: tx, y: ty, vx: 0, vy: 0 }
      else { ax += (tx - s.pupil.x) * 260; ay += (ty - s.pupil.y) * 260 }
    }
    if (!still) {
      s.pupil = { ...s.pupil, vx: s.pupil.vx + s.impulse.x, vy: s.pupil.vy + s.impulse.y }
      s.impulse = { x: 0, y: 0 }
      s.pupil = stepPupil(s.pupil, dt, ax, ay, { limit: LIMIT, gravity: s.track ? 0 : 34, drag: s.track ? 9 : 1.6 })
    }
    const transform = `translate(${(s.pupil.x * radius).toFixed(2)}px, ${(s.pupil.y * radius).toFixed(2)}px)`
    if (transform !== s.placed) { s.pupilEl.style.transform = transform; s.placed = transform }
    const resting = Math.hypot(s.pupil.vx, s.pupil.vy) < 0.02 && !moved
    s.still = resting ? s.still + 1 : 0
  })
  if (awake.some((s) => s.still < SLEEP_AFTER)) frame = requestAnimationFrame(tick)
}

function listen() {
  if (listening) return
  listening = true
  window.addEventListener('scroll', () => wake(), { passive: true, capture: true })
  window.addEventListener('resize', () => wake(), { passive: true })
  window.addEventListener('pointermove', (event) => {
    pointer = { x: event.clientX, y: event.clientY }
    // Anything under the pointer may be moving an eye (a drag), so check them all.
    wake()
  }, { passive: true })
  window.addEventListener(BUMP_EVENT, (event) => {
    const strength = (event as CustomEvent<number>).detail ?? 1
    for (const s of eyes) {
      s.impulse = { x: (Math.random() - 0.5) * 9 * strength, y: -(2 + Math.random() * 5) * strength }
    }
    wake()
  })
}

export function GooglyEye({ size = 48, track = false, wobble = 1, className = '', style }: GooglyEyeProps) {
  const eyeRef = useRef<HTMLSpanElement>(null)
  const pupilRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    listen()
    const state: EyeState = {
      eye: eyeRef.current!, pupilEl: pupilRef.current!, track, wobble,
      pupil: restingPupil(LIMIT), prev: null, impulse: { x: 0, y: 0 }, still: 0, visible: true, placed: '',
    }
    eyes.add(state)
    observer?.observe(state.eye)
    wake()
    return () => {
      eyes.delete(state)
      observer?.unobserve(state.eye)
    }
  }, [track, wobble])

  return (
    <span
      ref={eyeRef}
      className={`kollaz-googly-eye ${className}`}
      style={{ ...style, width: size, height: size, '--size': `${size}px` } as CSSProperties}
      aria-hidden="true"
    >
      <span className="kollaz-googly-eye__flange" />
      <span className="kollaz-googly-eye__card" />
      <span ref={pupilRef} className="kollaz-googly-eye__pupil" />
      <span className="kollaz-googly-eye__dome" />
    </span>
  )
}
