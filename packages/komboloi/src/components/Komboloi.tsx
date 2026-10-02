import { type CSSProperties, useEffect, useId, useMemo, useRef } from 'react'
import { backingScale } from 'object-studies-core'
import { MATERIALS, type MaterialId } from '../lib/materials.js'
import { Komboloi as Strand, type Grab, type Vec } from '../lib/physics.js'
import { StrandPainter } from '../lib/render.js'
import { createClacker } from '../lib/sound.js'
import { stringStrand } from '../lib/strand.js'
import '../styles.css'

export type KomboloiProps = {
  /** What the beads are made of. */
  material?: MaterialId
  /** How many beads, 9 to 45. Traditional strands have an odd number. */
  beads?: number
  /** Each seed strings a different strand of the same material. */
  seed?: number
  /** The silk tassel and cord, as a CSS hex or rgb() colour. Defaults to one that suits the material. */
  tassel?: string
  /** The click of bead on bead. Nothing plays until someone has touched the strand. */
  sound?: boolean
  /** 0 to 1. */
  volume?: number
  /** Called for every knock loud enough to hear, with its strength from 0 to 1. */
  onClack?: (strength: number) => void
  /** Overrides the accessible name. */
  label?: string
  className?: string
  style?: CSSProperties
}

/** The canvas reaches this far (a fraction of the frame's width) past each side, so a swing is never cut off. */
const BLEED = 0.5
const SLEEP_ENERGY = 30
const SLEEP_FRAMES = 40
/** A press shorter and stiller than this is a flick, not a lift. */
const TAP_MS = 240
const TAP_SLOP = 6

const strengthOf = (speed: number) => Math.min(1, Math.max(0, (speed - 120) / 1400))

/**
 * A komboloi, Greek worry beads, hanging from a brass peg. Lift it by any bead
 * and let it swing; tap a bead to flick it along the cord and hear it knock
 * into the others. From the keyboard, Space flicks the next bead across the
 * gap and the arrow keys set it swinging.
 */
export function Komboloi({
  material = 'amber',
  beads,
  seed = 7,
  tassel,
  sound = true,
  volume = 0.6,
  onClack,
  label,
  className = '',
  style,
}: KomboloiProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hintId = useId()
  const strand = useMemo(() => stringStrand({ material, beads, seed, tassel }), [material, beads, seed, tassel])
  const latest = useRef({ sound, volume, onClack })
  const control = useRef<{ wake: () => void; setVolume: (v: number) => void } | null>(null)
  useEffect(() => {
    latest.current = { sound, volume, onClack }
    control.current?.setVolume(sound ? volume : 0)
  })

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!wrap || !canvas || !ctx) return

    const sim = new Strand(strand)
    sim.settle(2.5)
    const painter = new StrandPainter(strand)
    const clacker = createClacker(strand.material, latest.current.sound ? latest.current.volume : 0)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const applyMotion = () => (sim.damping = reduced.matches ? 4 : 1)
    applyMotion()
    reduced.addEventListener('change', applyMotion)

    let raf = 0
    let last = 0
    let quiet = 0
    let visible = true
    let scale = 1
    let cssWidth = 1

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      painter.draw(ctx, sim, scale, sim.width * BLEED)
    }

    const tick = (now: number) => {
      raf = 0
      if (!visible) return
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60
      last = now
      sim.advance(dt)
      for (const impact of sim.drainImpacts()) {
        const strength = strengthOf(impact.speed)
        if (strength <= 0) continue
        if (latest.current.sound) clacker.clack(strength, (impact.x / sim.width) * 2 - 1)
        latest.current.onClack?.(strength)
      }
      draw()
      quiet = !sim.holding && sim.energy() < SLEEP_ENERGY ? quiet + 1 : 0
      if (quiet < SLEEP_FRAMES) raf = requestAnimationFrame(tick)
    }

    const wake = () => {
      quiet = 0
      if (!raf && visible) {
        last = 0
        raf = requestAnimationFrame(tick)
      }
    }
    control.current = { wake, setVolume: (v) => clacker.setVolume(v) }

    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      cssWidth = Math.max(1, rect.width)
      const dpr = backingScale(rect.width * (1 + BLEED * 2), rect.height, window.devicePixelRatio || 1, 2)
      const w = Math.max(1, Math.round(rect.width * (1 + BLEED * 2) * dpr))
      const h = Math.max(1, Math.round(rect.height * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      scale = w / (sim.width * (1 + BLEED * 2))
      draw()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    resize()
    const io = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting)
      if (visible) wake()
    })
    io.observe(wrap)

    // Pointer: lift by a bead, the pendant or the cord; a quick tap flicks.
    const toWorld = (clientX: number, clientY: number): Vec => {
      const rect = wrap.getBoundingClientRect()
      return {
        x: ((clientX - rect.left) / Math.max(1, rect.width)) * sim.width,
        y: ((clientY - rect.top) / Math.max(1, rect.height)) * sim.height,
      }
    }
    const mmPerPx = () => sim.width / cssWidth
    const reachFor = (pointerType: string) => (pointerType === 'touch' ? 14 : 4) * mmPerPx()
    let press: { id: number; grab: Grab; x: number; y: number; t: number } | null = null

    const onPointerDown = (e: PointerEvent) => {
      if (press || !e.isPrimary || e.button > 0) return
      clacker.unlock()
      const at = toWorld(e.clientX, e.clientY)
      const hit = sim.hitTest(at, reachFor(e.pointerType))
      if (!hit) return
      e.preventDefault()
      wrap.setPointerCapture?.(e.pointerId)
      press = { id: e.pointerId, grab: hit, x: e.clientX, y: e.clientY, t: performance.now() }
      sim.hold(hit, at)
      wrap.classList.add('komboloi--holding')
      wake()
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!press) {
        if (e.pointerType === 'mouse') {
          const hit = sim.hitTest(toWorld(e.clientX, e.clientY), reachFor('mouse'))
          wrap.classList.toggle('komboloi--over', !!hit)
        }
        return
      }
      if (e.pointerId !== press.id) return
      sim.moveTo(toWorld(e.clientX, e.clientY))
      wake()
    }
    const finish = (e: PointerEvent, cancelled: boolean) => {
      if (!press || e.pointerId !== press.id) return
      const { grab, x, y, t } = press
      press = null
      wrap.classList.remove('komboloi--holding')
      sim.release()
      const tap = !cancelled && performance.now() - t < TAP_MS && Math.hypot(e.clientX - x, e.clientY - y) < TAP_SLOP
      if (tap) {
        if (grab.kind === 'bead') sim.flick(grab.index)
        else sim.swing(e.clientX < wrap.getBoundingClientRect().left + wrap.clientWidth / 2 ? 1 : -1, 0.8)
      }
      wake()
    }
    const onPointerUp = (e: PointerEvent) => finish(e, false)
    const onPointerCancel = (e: PointerEvent) => finish(e, true)
    const onPointerLeave = () => wrap.classList.remove('komboloi--over')
    // A touch that lands on the strand holds it; anywhere else the page scrolls.
    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (e.touches.length === 1 && touch && sim.hitTest(toWorld(touch.clientX, touch.clientY), reachFor('touch'))) e.preventDefault()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      if (e.key === ' ' || e.key === 'Enter') sim.flickNext()
      else if (e.key === 'ArrowLeft') sim.swing(-1)
      else if (e.key === 'ArrowRight') sim.swing(1)
      else return
      e.preventDefault()
      clacker.unlock()
      wake()
    }

    wrap.addEventListener('pointerdown', onPointerDown)
    wrap.addEventListener('pointermove', onPointerMove)
    wrap.addEventListener('pointerup', onPointerUp)
    wrap.addEventListener('pointercancel', onPointerCancel)
    wrap.addEventListener('pointerleave', onPointerLeave)
    wrap.addEventListener('touchstart', onTouchStart, { passive: false })
    wrap.addEventListener('keydown', onKeyDown)
    wake()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      reduced.removeEventListener('change', applyMotion)
      wrap.removeEventListener('pointerdown', onPointerDown)
      wrap.removeEventListener('pointermove', onPointerMove)
      wrap.removeEventListener('pointerup', onPointerUp)
      wrap.removeEventListener('pointercancel', onPointerCancel)
      wrap.removeEventListener('pointerleave', onPointerLeave)
      wrap.removeEventListener('touchstart', onTouchStart)
      wrap.removeEventListener('keydown', onKeyDown)
      clacker.dispose()
      control.current = null
    }
  }, [strand])

  const name = label ?? `${MATERIALS[strand.material.id].label} komboloi, ${strand.beads.length} beads`

  return (
    <div
      ref={wrapRef}
      className={`komboloi ${className}`.trim()}
      style={{ ...style, aspectRatio: '1 / 2' }}
      role="application"
      aria-roledescription="worry beads"
      aria-label={name}
      aria-describedby={hintId}
      tabIndex={0}
    >
      <canvas ref={canvasRef} className="komboloi__canvas" aria-hidden="true" />
      <p id={hintId} className="komboloi__hint">
        Space or Enter flicks the next bead across the cord. The left and right arrow keys swing the strand.
      </p>
    </div>
  )
}
