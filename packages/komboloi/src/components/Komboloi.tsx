import { type CSSProperties, useEffect, useId, useMemo, useRef } from 'react'
import { backingScale, createCooperativeTask, type Point } from 'object-studies-core'
import { playClack, unlockAudio } from '../lib/audio.js'
import { MATERIALS, type MaterialId } from '../lib/materials.js'
import { StrandPainter } from '../lib/painter.js'
import { type Grab, StrandSimulation } from '../lib/simulation.js'
import { buildStrand } from '../lib/strand.js'
import '../styles.css'

export type KomboloiProps = {
  /** Defaults to `'amber'`. */
  material?: MaterialId
  /** Whole beads from 9 to 45. Defaults to 21. */
  beads?: number
  /** Each seed strings a different strand. Defaults to 7. */
  seed?: number
  /** Tassel and cord colour, as CSS hex or rgb(). Defaults to the material's first tassel colour. */
  tassel?: string
  /** Play a click when beads knock together. Defaults to true. */
  sound?: boolean
  /** From 0 to 1. Defaults to 0.6. */
  volume?: number
  /** Called on every knock, with its strength from 0 to 1. */
  onClack?: (strength: number) => void
  /** Accessible name. Defaults to the material and bead count. */
  label?: string
  className?: string
  style?: CSSProperties
}

/** The canvases are twice the strand's width, so a swing stays in view. */
const SWING_ROOM = 0.5
/** And this tall, so the tassel's shadow isn't cut off at the bottom. */
const OVERHANG = 1.08
/** Millimetres per pixel on the shadow layer. Lower resolution means a softer edge. */
const SHADOW_COARSENESS = 2
/** The animation loop stops after this many frames below `REST_ENERGY`. */
const REST_ENERGY = 30
const REST_FRAMES = 40
/** A press shorter and stiller than this is a tap. */
const TAP_MS = 240
const TAP_SLOP = 6
/** Physics steps per unit of cooperative settling work. */
const SETTLE_STEPS = 6

/** How loud a knock is, from its closing speed in mm/s. */
const clackStrength = (speed: number) => Math.min(1, Math.max(0, (speed - 120) / 1400))

/**
 * A komboloi hanging from a brass peg. Drag a bead to lift the strand, tap a
 * bead to flick it along the cord, tap the cord or tassel to swing it. With
 * the strand focused, Space or Enter counts the next bead across and the
 * arrow keys swing it.
 *
 * The strand fills its container's width at a 1:2 aspect ratio. It settles
 * in small slices of work after mounting and fades in once it is still.
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
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const shadowRef = useRef<HTMLCanvasElement>(null)
  const hintId = useId()
  const strand = useMemo(() => buildStrand({ material, beads, seed, tassel }), [material, beads, seed, tassel])
  const options = useRef({ sound, volume, onClack })

  useEffect(() => {
    options.current = { sound, volume, onClack }
  })

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    const shade = shadowRef.current
    const ctx = canvas?.getContext('2d')
    const shadeCtx = shade?.getContext('2d')
    if (!host || !canvas || !ctx || !shade || !shadeCtx) return

    const sim = new StrandSimulation(strand)
    const painter = new StrandPainter(strand)
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const applyMotion = () => (sim.damping = motion.matches ? 4 : 1)
    applyMotion()
    motion.addEventListener('change', applyMotion)

    let raf = 0
    let last = 0
    let quiet = 0
    let visible = true
    let ready = false
    let scale = 1
    let cssWidth = 1

    const draw = () => {
      if (!ready) return
      const pose = sim.view()
      const offset = sim.width * SWING_ROOM
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      painter.draw(ctx, pose, scale, offset)
      painter.drawShadow(shadeCtx, pose, shade.width / (sim.width * 2), shade.height / (sim.height * OVERHANG), offset)
    }

    const frame = (now: number) => {
      raf = 0
      if (!visible) return
      const elapsed = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60
      last = now
      sim.advance(elapsed)
      for (const hit of sim.drainImpacts()) {
        const strength = clackStrength(hit.speed)
        if (strength <= 0) continue
        const { sound, volume, onClack } = options.current
        if (sound) playClack(strand.material, strength, (hit.x / sim.width) * 2 - 1, volume)
        onClack?.(strength)
      }
      draw()
      quiet = !sim.holding && sim.energy() < REST_ENERGY ? quiet + 1 : 0
      if (quiet < REST_FRAMES) raf = requestAnimationFrame(frame)
    }

    const wake = () => {
      quiet = 0
      if (!raf && visible && ready) {
        last = 0
        raf = requestAnimationFrame(frame)
      }
    }

    const resize = () => {
      const rect = host.getBoundingClientRect()
      cssWidth = Math.max(1, rect.width)
      const dpr = backingScale(rect.width * 2, rect.height * OVERHANG, window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.round(rect.width * 2 * dpr))
      const height = Math.max(1, Math.round(rect.height * OVERHANG * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      scale = width / (sim.width * 2)
      const shadeWidth = Math.max(8, Math.round((sim.width * 2) / SHADOW_COARSENESS))
      const shadeHeight = Math.max(8, Math.round((sim.height * OVERHANG) / SHADOW_COARSENESS))
      if (shade.width !== shadeWidth || shade.height !== shadeHeight) {
        shade.width = shadeWidth
        shade.height = shadeHeight
      }
      draw()
    }
    const sizes = new ResizeObserver(resize)
    sizes.observe(host)
    resize()

    const seen = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting)
      if (visible && ready && (sim.holding || sim.energy() >= REST_ENERGY)) wake()
    })
    seen.observe(host)

    // Settle, then bake the bead textures, then reveal: small slices of work
    // that leave room for input and paint, however many strands are mounting.
    // Until then a restrung strand keeps showing the one it replaces.
    const settling = createCooperativeTask(() => {})
    const settle = function* () {
      sim.beginSettle()
      while (!sim.settleChunk(SETTLE_STEPS)) yield
      yield
      painter.ensureBodies(scale)
      ready = true
      host.classList.add('komboloi--ready')
      draw()
    }
    const kickoff = setTimeout(() => settling.run(settle()), 0)

    const toSim = (x: number, y: number): Point => {
      const rect = host.getBoundingClientRect()
      return {
        x: ((x - rect.left) / Math.max(1, rect.width)) * sim.width,
        y: ((y - rect.top) / Math.max(1, rect.height)) * sim.height,
      }
    }
    /** Hit slop in millimetres: generous for fingers, tight for a mouse. */
    const reach = (pointerType: string) => ((pointerType === 'touch' ? 14 : 4) * sim.width) / cssWidth

    let press: { id: number; grab: Grab; x: number; y: number; t: number } | null = null

    const down = (event: PointerEvent) => {
      if (!ready || press || !event.isPrimary || event.button > 0) return
      if (options.current.sound) unlockAudio()
      const at = toSim(event.clientX, event.clientY)
      const hit = sim.hitTest(at, reach(event.pointerType))
      if (!hit) return
      event.preventDefault()
      host.setPointerCapture?.(event.pointerId)
      press = { id: event.pointerId, grab: hit, x: event.clientX, y: event.clientY, t: performance.now() }
      sim.hold(hit, at)
      host.classList.add('komboloi--holding')
      wake()
    }

    const move = (event: PointerEvent) => {
      if (!press) {
        if (ready && event.pointerType === 'mouse')
          host.classList.toggle(
            'komboloi--over',
            !!sim.hitTest(toSim(event.clientX, event.clientY), reach('mouse')),
          )
        return
      }
      if (event.pointerId !== press.id) return
      sim.moveTo(toSim(event.clientX, event.clientY))
      wake()
    }

    const finish = (event: PointerEvent, cancelled: boolean) => {
      // Touch browsers only allow audio to start on pointerup, so unlock here
      // too or the first tap on a phone is silent.
      if (!cancelled && options.current.sound) unlockAudio()
      if (!press || event.pointerId !== press.id) return
      const { grab, x, y, t } = press
      press = null
      host.classList.remove('komboloi--holding')
      sim.release()
      const tapped =
        !cancelled && performance.now() - t < TAP_MS && Math.hypot(event.clientX - x, event.clientY - y) < TAP_SLOP
      if (tapped) {
        if (grab.kind === 'bead') sim.flick(grab.index)
        else {
          const left = event.clientX < host.getBoundingClientRect().left + host.clientWidth / 2
          sim.swing(left ? 1 : -1, 0.8)
        }
      }
      wake()
    }
    const up = (event: PointerEvent) => finish(event, false)
    const cancel = (event: PointerEvent) => finish(event, true)
    const leave = () => host.classList.remove('komboloi--over')

    // Stop the page scrolling when a touch starts on the strand itself.
    const touchStart = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (
        ready &&
        event.touches.length === 1 &&
        touch &&
        sim.hitTest(toSim(touch.clientX, touch.clientY), reach('touch'))
      )
        event.preventDefault()
    }

    const key = (event: KeyboardEvent) => {
      if (!ready || event.altKey || event.ctrlKey || event.metaKey) return
      if (event.key === ' ' || event.key === 'Enter') sim.flickNext()
      else if (event.key === 'ArrowLeft') sim.swing(-1)
      else if (event.key === 'ArrowRight') sim.swing(1)
      else return
      event.preventDefault()
      if (options.current.sound) unlockAudio()
      wake()
    }

    host.addEventListener('pointerdown', down)
    host.addEventListener('pointermove', move)
    host.addEventListener('pointerup', up)
    host.addEventListener('pointercancel', cancel)
    host.addEventListener('pointerleave', leave)
    host.addEventListener('touchstart', touchStart, { passive: false })
    host.addEventListener('keydown', key)

    return () => {
      clearTimeout(kickoff)
      settling.cancel()
      cancelAnimationFrame(raf)
      sizes.disconnect()
      seen.disconnect()
      motion.removeEventListener('change', applyMotion)
      host.removeEventListener('pointerdown', down)
      host.removeEventListener('pointermove', move)
      host.removeEventListener('pointerup', up)
      host.removeEventListener('pointercancel', cancel)
      host.removeEventListener('pointerleave', leave)
      host.removeEventListener('touchstart', touchStart)
      host.removeEventListener('keydown', key)
      host.classList.remove('komboloi--holding', 'komboloi--over')
    }
  }, [strand])

  const name = label ?? `${MATERIALS[strand.material.id].label} komboloi, ${strand.beads.length} beads`
  return (
    <div
      ref={hostRef}
      className={`komboloi ${className}`.trim()}
      style={{ ...style, aspectRatio: '1 / 2' }}
      role="application"
      aria-roledescription="worry beads"
      aria-label={name}
      aria-describedby={hintId}
      tabIndex={0}
    >
      <canvas ref={shadowRef} className="komboloi__shadow" aria-hidden="true" />
      <canvas ref={canvasRef} className="komboloi__canvas" aria-hidden="true" />
      <p id={hintId} className="komboloi__hint">
        Space or Enter flicks the next bead across the cord. The left and right arrow keys swing the strand.
      </p>
    </div>
  )
}
