import type { Point } from 'object-studies-core'
import type { Strand } from './strand.js'

// Everything is modelled at real size: millimetres, grams and seconds.

/** mm/s² */
const GRAVITY = 9810
/** Fixed physics step. */
export const STEP = 1 / 240
/** Most steps one frame may run after a stall, so a slow frame can't spiral. */
const MAX_CATCH_UP = 10
/** Constraint passes per step. */
const ITERATIONS = 24
/** Target cord segment length; short loops still get at least 24 segments. */
const SEGMENT_LENGTH = 6
/** Every cord node's own mass before beads add theirs. */
const NODE_MASS = 0.05
/** How hard a bead grips the cord when pressed against it. */
const FRICTION = 0.22
/** Share of closing speed two beads bounce apart with. */
const RESTITUTION = 0.35
/** Beads meeting slower than this (mm/s) touch without a clack. */
const CLACK_SPEED = 130
/** The cord where it wraps the peg loses this share of its slip each step. */
const PEG_GRIP = 0.012
const MAX_ACCELERATION = GRAVITY * 6
/** mm/s, the fastest a flicked bead leaves. */
const MAX_FLICK = 2600
/** Mass given to a held bead, so the others move around it. */
const HELD = 1e9
/** The peg sits this share of the strand's width below the top of its box. */
const PEG_DROP = 0.15
const PEG_RADIUS = 3
export const CORD_RADIUS = 0.7
/** Distance from the peg's centre to the cord's centre where it wraps. */
const HOOK_RADIUS = 3.7 + 1.6
const TASSEL_LINKS = 5
const CAP_LENGTH = 7

export type Grab =
  | { kind: 'bead'; index: number }
  | { kind: 'cord'; s: number }
  | { kind: 'pendant'; index: number }

export type Impact = { x: number; y: number; speed: number }

type PendantLink = { part: 'papas' | 'shield' | 'cap' | 'tassel'; rest: number; mass: number }

/** Fixed facts about one strand's hanging geometry. */
type StrandFrame = {
  strand: Strand
  /** Cord nodes in the loop. */
  cord: number
  segment: number
  /** Box the strand hangs in, millimetres. It is twice as tall as it is wide. */
  width: number
  height: number
  hook: Point
  /** Papas, shield, tassel cap, then the tassel's links, hanging from cord node 0. */
  pendant: PendantLink[]
}

/**
 * Where everything is: cord nodes then pendant nodes in `x`/`y`, and each
 * bead's distance along the loop in `s`. The simulation is one of these, and
 * so is the blended pose it hands the painter each frame.
 */
export class StrandPose {
  readonly frame: StrandFrame
  readonly strand: Strand
  readonly cord: number
  readonly segment: number
  readonly width: number
  readonly height: number
  readonly hook: Point
  readonly pendant: PendantLink[]
  readonly x: Float64Array
  readonly y: Float64Array
  readonly s: Float64Array

  constructor(frame: StrandFrame, x: Float64Array, y: Float64Array, s: Float64Array) {
    this.frame = frame
    this.strand = frame.strand
    this.cord = frame.cord
    this.segment = frame.segment
    this.width = frame.width
    this.height = frame.height
    this.hook = frame.hook
    this.pendant = frame.pendant
    this.x = x
    this.y = y
    this.s = s
  }

  /** The cord segment a distance along the loop falls in, and how far into it. */
  locate(position: number): { k: number; t: number } {
    const length = this.strand.cordLength
    const along = (((position % length) + length) % length) / this.segment
    const k = Math.min(this.cord - 1, Math.floor(along))
    return { k, t: along - k }
  }

  pointAt(k: number, t: number): Point {
    const next = (k + 1) % this.cord
    return {
      x: this.x[k] + (this.x[next] - this.x[k]) * t,
      y: this.y[k] + (this.y[next] - this.y[k]) * t,
    }
  }

  positionAt(position: number): Point {
    const { k, t } = this.locate(position)
    return this.pointAt(k, t)
  }

  angleAt(position: number): number {
    const { k } = this.locate(position)
    const next = (k + 1) % this.cord
    return Math.atan2(this.y[next] - this.y[k], this.x[next] - this.x[k])
  }

  bead(index: number): Point {
    return this.positionAt(this.s[index])
  }

  pendantPoint(index: number): Point {
    return { x: this.x[this.cord + index], y: this.y[this.cord + index] }
  }
}

/**
 * A worry-bead strand in two dimensions. The silk loop is a ring of Verlet
 * nodes hung over a peg, the papas and tassel hang from where the loop closes,
 * and the beads slide along the loop in one dimension: pushed by gravity and
 * the cord's own acceleration, held back by friction, and kept apart by an
 * ordered-spacing solve that turns their collisions into clacks.
 */
export class StrandSimulation extends StrandPose {
  // Verlet state: previous positions, inverse masses, smoothed accelerations.
  readonly ox: Float64Array
  readonly oy: Float64Array
  readonly px: Float64Array
  readonly py: Float64Array
  readonly invMass: Float64Array
  readonly pinned: Uint8Array
  readonly mass: Float64Array
  readonly ax: Float64Array
  readonly ay: Float64Array
  readonly lvx: Float64Array
  readonly lvy: Float64Array
  // Bead state: speed along the cord, half-lengths, previous positions.
  readonly ps: Float64Array
  readonly v: Float64Array
  readonly half: Float64Array
  readonly cooldown: Float64Array
  readonly before: Float64Array
  readonly cx: Float64Array
  readonly cy: Float64Array
  readonly closing: Float64Array

  grab: Grab | null = null
  target: Point = { x: 0, y: 0 }
  stepTarget: Point = { x: 0, y: 0 }
  from: Point = { x: 0, y: 0 }
  /** Where along the loop the cord sits on the peg. */
  contactS = 0
  contactValid = false
  accumulator = 0
  impacts: Impact[] = []
  /** Which way keyboard flicks are counting the beads across. */
  counting = 1
  /** Multiplies every damping rate; reduced motion raises it. */
  damping = 1
  time = 0
  /** How far into the next step the clock has run, for render blending. */
  alpha = 1
  private pose: StrandPose | null = null
  private settleLeft = 0
  private settleDamping = 1

  constructor(strand: Strand) {
    const frame = frameFor(strand)
    const nodes = frame.cord + frame.pendant.length
    super(frame, new Float64Array(nodes), new Float64Array(nodes), new Float64Array(strand.beads.length))
    const { cord, hook } = frame
    this.ox = new Float64Array(nodes)
    this.oy = new Float64Array(nodes)
    this.invMass = new Float64Array(nodes)
    this.pinned = new Uint8Array(nodes)
    this.mass = new Float64Array(nodes)
    this.ax = new Float64Array(nodes)
    this.ay = new Float64Array(nodes)
    this.lvx = new Float64Array(nodes)
    this.lvy = new Float64Array(nodes)
    this.px = new Float64Array(nodes)
    this.py = new Float64Array(nodes)

    // Hang the loop as an ellipse under the peg, and the pendant straight below.
    const drop = radiusForPerimeter(strand.cordLength, 0.2)
    const top = hook.y - PEG_RADIUS - CORD_RADIUS + drop
    const loop = ellipsePoints(drop * 0.2, drop, cord)
    for (let i = 0; i < cord; i++) {
      this.x[i] = hook.x + loop[i].x
      this.y[i] = top + loop[i].y
    }
    let y = this.y[0]
    this.pendant.forEach((link, i) => {
      y += link.rest
      this.x[cord + i] = hook.x
      this.y[cord + i] = y
    })
    this.ox.set(this.x)
    this.oy.set(this.y)

    const count = strand.beads.length
    this.ps = new Float64Array(count)
    this.v = new Float64Array(count)
    this.half = new Float64Array(count)
    this.cooldown = new Float64Array(count + 1)
    this.before = new Float64Array(count)
    this.cx = new Float64Array(count)
    this.cy = new Float64Array(count)
    this.closing = new Float64Array(count + 1)
    strand.beads.forEach((bead, i) => (this.half[i] = bead.length / 2))

    // Half the beads start packed up one side of the loop, half up the other.
    const split = Math.ceil(count / 2)
    let at = strand.clearance
    for (let i = 0; i < split; i++) {
      this.s[i] = at + this.half[i]
      at += this.half[i] * 2
    }
    at = strand.cordLength - strand.clearance
    for (let i = count - 1; i >= split; i--) {
      this.s[i] = at - this.half[i]
      at -= this.half[i] * 2
    }
    this.updateMasses()
    this.px.set(this.x)
    this.py.set(this.y)
    this.ps.set(this.s)
  }

  /**
   * Settling runs heavily damped, so a freshly strung strand reaches rest in
   * about half the steps. Call `settleChunk` until it reports done.
   */
  beginSettle(seconds = 1.2, damping = 12): void {
    this.settleLeft = Math.round(seconds / STEP)
    this.settleDamping = damping
  }

  /** Runs up to `steps` settling steps. Returns true once the strand is at rest. */
  settleChunk(steps: number): boolean {
    const damping = this.damping
    const run = Math.min(steps, this.settleLeft)
    this.damping = Math.max(damping, this.settleDamping)
    for (let i = 0; i < run; i++) this.step(STEP)
    this.damping = damping
    this.settleLeft -= run
    if (this.settleLeft > 0) return false
    // Start from stillness so a freshly hung strand doesn't drift.
    this.ox.set(this.x)
    this.oy.set(this.y)
    this.px.set(this.x)
    this.py.set(this.y)
    this.ps.set(this.s)
    this.v.fill(0)
    this.lvx.fill(0)
    this.lvy.fill(0)
    this.ax.fill(0)
    this.ay.fill(0)
    this.impacts = []
    this.time = 0
    this.accumulator = 0
    this.alpha = 1
    return true
  }

  /** Runs as many fixed steps as `elapsed` seconds allow. Returns the count. */
  advance(elapsed: number): number {
    this.accumulator = Math.min(this.accumulator + elapsed, STEP * MAX_CATCH_UP)
    const steps = Math.floor(this.accumulator / STEP + 1e-9)
    // A held point moves from where it was to the pointer across this frame's steps.
    for (let i = 1; i <= steps; i++) {
      this.stepTarget = lerpPoint(this.from, this.target, i / steps)
      this.step(STEP)
    }
    this.accumulator -= steps * STEP
    this.alpha = Math.min(1, Math.max(0, this.accumulator / STEP))
    if (steps) this.from = { ...this.target }
    return steps
  }

  /**
   * The strand blended between its last two physics steps, so motion stays
   * even when the display rate isn't a divisor of 240 Hz (144 Hz, 90 Hz,
   * dropped frames). Reuses one pose; read it before the next call.
   */
  view(): StrandPose {
    const pose = (this.pose ??= new StrandPose(
      this.frame,
      new Float64Array(this.x.length),
      new Float64Array(this.y.length),
      new Float64Array(this.s.length),
    ))
    const t = this.alpha
    const u = 1 - t
    const { x, y, px, py, s, ps } = this
    for (let i = 0; i < x.length; i++) {
      pose.x[i] = px[i] * u + x[i] * t
      pose.y[i] = py[i] * u + y[i] * t
    }
    for (let i = 0; i < s.length; i++) pose.s[i] = ps[i] * u + s[i] * t
    return pose
  }

  step(dt: number): void {
    const cord = this.cord
    const nodes = this.x.length
    const cordLength = this.strand.cordLength
    this.px.set(this.x)
    this.py.set(this.y)
    this.ps.set(this.s)
    this.time += dt
    this.updateMasses()

    // Verlet integration. The tassel loses energy faster than the silk loop.
    const cordKeep = Math.exp(-0.35 * this.damping * dt)
    const tasselKeep = Math.exp(-2.2 * this.damping * dt)
    for (let i = 0; i < nodes; i++) {
      if (this.pinned[i]) continue
      const keep = i >= cord + 3 ? tasselKeep : cordKeep
      const vx = (this.x[i] - this.ox[i]) * keep
      const vy = (this.y[i] - this.oy[i]) * keep
      this.ox[i] = this.x[i]
      this.oy[i] = this.y[i]
      this.x[i] += vx
      this.y[i] += vy + GRAVITY * dt * dt
    }
    if (this.grab?.kind === 'pendant') {
      const i = cord + this.grab.index
      this.x[i] = this.stepTarget.x
      this.y[i] = this.stepTarget.y
    }

    let contact = -1
    for (let pass = 0; pass < ITERATIONS; pass++) {
      // Alternate sweep direction so the loop doesn't creep one way.
      if (pass % 2 === 0) for (let i = 0; i < cord; i++) this.distance(i, (i + 1) % cord, this.segment)
      else for (let i = cord - 1; i >= 0; i--) this.distance(i, (i + 1) % cord, this.segment)
      let previous = 0
      for (let i = 0; i < this.pendant.length; i++) {
        this.distance(previous, cord + i, this.pendant[i].rest)
        previous = cord + i
      }
      contact = this.hookConstraint()
      if (pass % 2 === 1) this.tether()
      if (pass % 3 === 2) this.separateSides()
      const grab = this.grab
      if (grab?.kind === 'bead') this.attach(this.s[grab.index], this.stepTarget)
      else if (grab?.kind === 'cord') this.attach(grab.s, this.stepTarget)
    }
    this.keepBelow(0, cord + 2)
    if (contact >= 0)
      for (const i of [contact, (contact + 1) % cord]) {
        this.ox[i] += (this.x[i] - this.ox[i]) * PEG_GRIP
        this.oy[i] += (this.y[i] - this.oy[i]) * PEG_GRIP
      }

    // Smoothed node accelerations, so beads feel the cord being swung.
    for (let i = 0; i < nodes; i++) {
      const vx = (this.x[i] - this.ox[i]) / dt
      const vy = (this.y[i] - this.oy[i]) / dt
      let ax = (vx - this.lvx[i]) / dt
      let ay = (vy - this.lvy[i]) / dt
      const magnitude = Math.sqrt(ax * ax + ay * ay)
      if (magnitude > MAX_ACCELERATION) {
        ax *= MAX_ACCELERATION / magnitude
        ay *= MAX_ACCELERATION / magnitude
      }
      this.ax[i] = this.ax[i] * 0.75 + ax * 0.25
      this.ay[i] = this.ay[i] * 0.75 + ay * 0.25
      this.lvx[i] = vx
      this.lvy[i] = vy
    }

    // Beads slide along the cord under apparent gravity, against friction.
    const beads = this.s.length
    const slideKeep = Math.exp(-0.9 * this.damping * dt)
    const before = this.before
    before.set(this.s)
    for (let n = 0; n < beads; n++) {
      if (this.grab?.kind === 'bead' && this.grab.index === n) {
        this.v[n] = 0
        continue
      }
      const { k, t } = this.locate(this.s[n])
      const next = (k + 1) % cord
      let tx = this.x[next] - this.x[k]
      let ty = this.y[next] - this.y[k]
      const length = Math.sqrt(tx * tx + ty * ty) || 1
      tx /= length
      ty /= length
      const gx = -(this.ax[k] * (1 - t) + this.ax[next] * t)
      const gy = GRAVITY - (this.ay[k] * (1 - t) + this.ay[next] * t)
      const along = gx * tx + gy * ty
      const normal = Math.abs(gx * ty - gy * tx)
      // A bead sitting over the peg rolls off whichever side it's on.
      const fromPeg = wrapSigned(this.s[n] - this.contactS, cordLength)
      const onPeg = this.contactValid && Math.abs(fromPeg) < this.half[n] + 4
      const roll = onPeg && Math.abs(this.v[n]) < 40 ? Math.sign(fromPeg || 1) * GRAVITY * 0.35 : 0
      const speed = this.v[n] + (along + roll) * dt
      const grip = onPeg ? 0 : FRICTION * normal * dt
      this.v[n] = Math.abs(speed) <= grip ? 0 : (speed - Math.sign(speed) * grip) * slideKeep
    }

    // Closing speed across each gap, measured before the beads move.
    const closing = this.closing
    const held = this.grab?.kind === 'bead' ? this.grab.index : -1
    for (let gap = 0; gap <= beads; gap++) {
      const behind = gap === 0 || gap - 1 === held ? 0 : this.v[gap - 1]
      const ahead = gap === beads || gap === held ? 0 : this.v[gap]
      closing[gap] = behind - ahead
    }
    for (let n = 0; n < beads; n++) this.s[n] += this.v[n] * dt
    for (let i = 0; i < this.cooldown.length; i++) this.cooldown[i] = Math.max(0, this.cooldown[i] - dt)
    this.collideBeads(cordLength, before, closing, dt)
  }

  /** Cord nodes carry their share of each bead's mass; the pendant hangs its own. */
  updateMasses(): void {
    const cord = this.cord
    const beads = this.s.length
    const total = this.strand.beads.reduce((sum, bead) => sum + bead.mass, 0)
    const mass = this.mass
    mass.fill(NODE_MASS + (total * 0.15) / cord)
    for (let n = 0; n < beads; n++) {
      const { k, t } = this.locate(this.s[n])
      const share = this.strand.beads[n].mass * 0.85
      mass[k] += share * (1 - t)
      mass[(k + 1) % cord] += share * t
    }
    this.pendant.forEach((link, i) => (mass[cord + i] = link.mass))
    this.pinned.fill(0)
    if (this.grab?.kind === 'pendant') this.pinned[cord + this.grab.index] = 1
    for (let i = 0; i < mass.length; i++) this.invMass[i] = this.pinned[i] ? 0 : 1 / mass[i]
  }

  distance(a: number, b: number, rest: number): void {
    const wa = this.invMass[a]
    const wb = this.invMass[b]
    const w = wa + wb
    if (w === 0) return
    const dx = this.x[b] - this.x[a]
    const dy = this.y[b] - this.y[a]
    const d = Math.sqrt(dx * dx + dy * dy) || 1e-9
    const k = (d - rest) / (d * w)
    this.x[a] += dx * k * wa
    this.y[a] += dy * k * wa
    this.x[b] -= dx * k * wb
    this.y[b] -= dy * k * wb
  }

  /** Moves the point `t` of the way along segment `k`, sharing the move by mass. */
  moveAlong(k: number, t: number, dx: number, dy: number): void {
    const next = (k + 1) % this.cord
    const wa = this.invMass[k] * (1 - t)
    const wb = this.invMass[next] * t
    const w = wa * (1 - t) + wb * t
    if (w === 0) return
    this.x[k] += (dx * wa) / w
    this.y[k] += (dy * wa) / w
    this.x[next] += (dx * wb) / w
    this.y[next] += (dy * wb) / w
  }

  attach(position: number, target: Point): void {
    const { k, t } = this.locate(position)
    const point = this.pointAt(k, t)
    this.moveAlong(k, t, target.x - point.x, target.y - point.y)
  }

  /** Keeps the cord off the peg and draped over it. Returns the segment on the peg, or -1. */
  hookConstraint(): number {
    const cord = this.cord
    const clear = PEG_RADIUS + CORD_RADIUS
    for (let i = 0; i < cord; i++) {
      const dx = this.x[i] - this.hook.x
      const dy = this.y[i] - this.hook.y
      const d2 = dx * dx + dy * dy
      if (d2 >= clear * clear || this.invMass[i] === 0) continue
      const d = Math.sqrt(d2) || 1e-6
      this.x[i] = this.hook.x + (dx / d) * clear
      this.y[i] = this.hook.y + (dy / d) * clear
    }
    // Search near last step's contact when there was one, else the whole loop.
    let best = -1
    let bestDistance = Infinity
    let bestT = 0
    const reach = this.contactValid ? 6 : cord
    const first = this.contactValid ? Math.floor(this.contactS / this.segment) - reach : 0
    for (let j = 0; j < Math.min(cord, reach * 2 + 1); j++) {
      const k = (((first + j) % cord) + cord) % cord
      const next = (k + 1) % cord
      const t = closestT(this.hook, this.x[k], this.y[k], this.x[next], this.y[next])
      const px = this.x[k] + (this.x[next] - this.x[k]) * t
      const py = this.y[k] + (this.y[next] - this.y[k]) * t
      const hx = px - this.hook.x
      const hy = py - this.hook.y
      const d = Math.sqrt(hx * hx + hy * hy)
      if (d < bestDistance) {
        bestDistance = d
        best = k
        bestT = t
      }
    }
    this.contactS = (best + bestT) * this.segment
    this.contactValid = bestDistance < HOOK_RADIUS + 6
    if (bestDistance > HOOK_RADIUS) {
      const point = this.pointAt(best, bestT)
      const pull = (bestDistance - HOOK_RADIUS) / bestDistance
      this.moveAlong(best, bestT, (this.hook.x - point.x) * pull, (this.hook.y - point.y) * pull)
    }
    return bestDistance <= HOOK_RADIUS + 0.5 ? best : -1
  }

  /** Beads on opposite sides of the loop push the cord apart instead of overlapping. */
  separateSides(): void {
    const beads = this.s.length
    const cx = this.cx
    const cy = this.cy
    for (let n = 0; n < beads; n++) {
      const p = this.positionAt(this.s[n])
      cx[n] = p.x
      cy[n] = p.y
    }
    const radius = (n: number) => this.strand.beads[n].width * 0.47
    for (let i = 0; i < beads; i++)
      for (let j = i + 2; j < beads; j++) {
        const dx = cx[j] - cx[i]
        const dy = cy[j] - cy[i]
        const min = radius(i) + radius(j)
        const d2 = dx * dx + dy * dy
        // Neighbours along the cord are the spacing solve's job, not this one's.
        if (d2 >= min * min || Math.abs(this.s[j] - this.s[i]) < (this.half[i] + this.half[j]) * 1.6) continue
        const d = Math.sqrt(d2) || 1e-6
        const push = (min - d) / 2 / d
        const a = this.locate(this.s[i])
        const b = this.locate(this.s[j])
        this.moveAlong(a.k, a.t, -dx * push, -dy * push)
        this.moveAlong(b.k, b.t, dx * push, dy * push)
        cx[i] -= dx * push
        cy[i] -= dy * push
        cx[j] += dx * push
        cy[j] += dy * push
      }
  }

  /** No node may hang further from the peg than the cord between them allows. */
  tether(): void {
    const cord = this.cord
    const cordLength = this.strand.cordLength
    const hx = this.hook.x
    const hy = this.hook.y
    const limit = (i: number, along: number) => {
      const dx = this.x[i] - hx
      const dy = this.y[i] - hy
      const d = Math.sqrt(dx * dx + dy * dy)
      const max = along + HOOK_RADIUS
      if (d <= max || this.invMass[i] === 0) return
      const k = max / d
      this.x[i] = hx + dx * k
      this.y[i] = hy + dy * k
    }
    for (let i = 0; i < cord; i++) {
      const d = Math.abs(i * this.segment - this.contactS)
      limit(i, Math.min(d, cordLength - d))
    }
    const fromPeg = Math.abs(this.contactS)
    let along = Math.min(fromPeg, cordLength - fromPeg)
    for (let i = 0; i < this.pendant.length; i++) {
      along += this.pendant[i].rest
      limit(cord + i, along)
    }
  }

  keepBelow(above: number, below: number): void {
    if (this.y[below] - this.y[above] < 2 && this.invMass[below] > 0) this.y[below] = this.y[above] + 2
  }

  /** Keeps beads apart along the cord, bounces them off each other and records clacks. */
  collideBeads(cordLength: number, before: Float64Array, closing: Float64Array, dt: number): void {
    const beads = this.s.length
    if (!beads) return
    const low = this.strand.clearance
    const high = cordLength - this.strand.clearance
    const held = this.grab?.kind === 'bead' ? this.grab.index : -1
    const inverse = (n: number) => (n < 0 || n >= beads || n === held ? 0 : 1 / this.strand.beads[n].mass)
    const gapAt = (gap: number) => ({
      left: gap === 0 ? low : this.s[gap - 1] + this.half[gap - 1],
      right: gap === beads ? high : this.s[gap] - this.half[gap],
    })
    resolveSpacing(this.s, this.half, (n) => (n === held ? HELD : this.strand.beads[n].mass), low, high)
    for (let n = 0; n < beads; n++) if (n !== held) this.v[n] = (this.s[n] - before[n]) / dt
    for (let gap = 0; gap <= beads; gap++) {
      const speed = closing[gap]
      if (speed <= CLACK_SPEED) continue
      const { left, right } = gapAt(gap)
      if (right - left > 0.05) continue
      const wa = inverse(gap - 1)
      const wb = inverse(gap)
      const w = wa + wb
      if (w === 0) continue
      const va = gap === 0 || gap - 1 === held ? 0 : this.v[gap - 1]
      const vb = gap === beads || gap === held ? 0 : this.v[gap]
      const impulse = RESTITUTION * speed - (vb - va)
      if (impulse > 0) {
        if (wa) this.v[gap - 1] -= (impulse * wa) / w
        if (wb) this.v[gap] += (impulse * wb) / w
      }
      if (this.cooldown[gap] === 0) {
        this.cooldown[gap] = 0.03
        const p = this.positionAt(left)
        this.impacts.push({ x: p.x, y: p.y, speed })
      }
    }
  }

  drainImpacts(): Impact[] {
    const impacts = this.impacts
    this.impacts = []
    return impacts
  }

  /** What's under a point (mm): a bead, then the pendant, then the cord. */
  hitTest(point: Point, slop = 2): Grab | null {
    let found: Grab | null = null
    let best = Infinity
    for (let n = 0; n < this.s.length; n++) {
      const p = this.bead(n)
      const d = Math.hypot(p.x - point.x, p.y - point.y) - this.strand.beads[n].width / 2
      if (d < slop && d < best) {
        best = d
        found = { kind: 'bead', index: n }
      }
    }
    const reach = [this.strand.papas.width / 2, this.strand.shield.width / 2, 4, 6, 7, 7, 7, 6]
    for (let i = 0; i < this.pendant.length; i++) {
      const p = this.pendantPoint(i)
      const d = Math.hypot(p.x - point.x, p.y - point.y) - (reach[i] ?? 5)
      if (d < slop && d < best) {
        best = d
        found = { kind: 'pendant', index: i }
      }
    }
    if (found) return found
    const cord = this.cord
    for (let k = 0; k < cord; k++) {
      const next = (k + 1) % cord
      const t = closestT(point, this.x[k], this.y[k], this.x[next], this.y[next])
      const p = this.pointAt(k, t)
      const d = Math.hypot(p.x - point.x, p.y - point.y)
      if (d < slop + 1 && d < best) {
        best = d
        found = { kind: 'cord', s: (k + t) * this.segment }
      }
    }
    return found
  }

  hold(grab: Grab, at: Point): void {
    this.grab = grab
    this.target = { ...at }
    this.from =
      grab.kind === 'bead'
        ? this.bead(grab.index)
        : grab.kind === 'cord'
          ? this.positionAt(grab.s)
          : this.pendantPoint(grab.index)
    this.stepTarget = { ...this.from }
    if (grab.kind === 'bead') this.v[grab.index] = 0
  }

  moveTo(at: Point): void {
    this.target = { ...at }
  }

  release(): void {
    this.grab = null
  }

  get holding(): Grab | null {
    return this.grab
  }

  /** Free cord either side of a bead, millimetres. */
  room(index: number): { before: number; after: number } {
    const beads = this.s.length
    const low = this.strand.clearance
    const high = this.strand.cordLength - this.strand.clearance
    return {
      before: this.s[index] - this.half[index] - (index === 0 ? low : this.s[index - 1] + this.half[index - 1]),
      after:
        (index === beads - 1 ? high : this.s[index + 1] - this.half[index + 1]) - (this.s[index] + this.half[index]),
    }
  }

  /**
   * Sends a bead along the cord, fast enough to climb over the peg if that's
   * where the open cord is. A bead packed against others passes the push on
   * to the last bead in the run.
   */
  flick(index: number, direction?: number): void {
    if (index < 0 || index >= this.s.length) return
    const ahead = this.openAhead(index, 1)
    const behind = this.openAhead(index, -1)
    const dir = direction ?? (ahead.gap >= behind.gap ? 1 : -1)
    const { j, gap } = dir > 0 ? ahead : behind
    const start = this.positionAt(this.s[j])
    let top = start.y
    for (let i = 1; i <= 16; i++) top = Math.min(top, this.positionAt(this.s[j] + (dir * gap * i) / 16).y)
    const climb = Math.max(0, start.y - top)
    const speed = Math.sqrt(2 * GRAVITY * (climb + 10) + 2 * FRICTION * GRAVITY * gap * 0.6) * 1.1 + 140
    this.v[j] = dir * Math.min(MAX_FLICK, speed)
  }

  openAhead(index: number, direction: number): { j: number; gap: number } {
    let j = index
    for (;;) {
      const room = this.room(j)
      const gap = direction > 0 ? room.after : room.before
      const next = j + direction
      if (gap >= 0.5 || next < 0 || next >= this.s.length) return { j, gap: Math.max(0, gap) }
      j = next
    }
  }

  /** Counts one bead across the widest gap, the way thumbs work a komboloi. */
  flickNext(): void {
    const beads = this.s.length
    if (!beads) return
    let widest = -Infinity
    let at = 0
    for (let gap = 0; gap <= beads; gap++) {
      const left = gap === 0 ? this.strand.clearance : this.s[gap - 1] + this.half[gap - 1]
      const right = gap === beads ? this.strand.cordLength - this.strand.clearance : this.s[gap] - this.half[gap]
      if (right - left > widest) {
        widest = right - left
        at = gap
      }
    }
    if (at === 0) this.counting = -1
    else if (at === beads) this.counting = 1
    else if (this.full(this.counting > 0 ? at : at - 1)) this.counting = -this.counting
    if (this.counting > 0) this.flick(at - 1, 1)
    else this.flick(at, -1)
  }

  /** True when a bead has been counted right up to the peg. */
  full(index: number): boolean {
    return (
      this.bead(index).y - this.strand.beads[index].width / 2 - this.hook.y < this.strand.beads[index].length * 1.4
    )
  }

  /** Gives the whole strand a sideways push, more the lower it hangs. */
  swing(direction: number, strength = 1): void {
    const cord = this.cord
    const top = this.hook.y
    const span = Math.max(1, this.height - top)
    for (let i = 0; i < this.x.length; i++) {
      if (this.pinned[i]) continue
      const depth = Math.max(0, (this.y[i] - top) / span)
      const push = direction * strength * 520 * depth * STEP
      this.ox[i] -= push * (i >= cord ? 1.1 : 1)
    }
  }

  /** Mean squared speed of every node and bead. Below about 30 the strand looks still. */
  energy(): number {
    let total = 0
    for (let i = 0; i < this.x.length; i++) {
      const dx = this.x[i] - this.ox[i]
      const dy = this.y[i] - this.oy[i]
      total += dx * dx + dy * dy
    }
    total /= STEP * STEP * this.x.length
    for (let n = 0; n < this.v.length; n++) total += (this.v[n] * this.v[n]) / this.v.length
    return total
  }
}

function frameFor(strand: Strand): StrandFrame {
  const cordLength = strand.cordLength
  const cord = Math.max(24, Math.round(cordLength / SEGMENT_LENGTH))
  const papasRadius = strand.papas.width / 2
  const link = strand.tassel.length / TASSEL_LINKS
  const pendant: PendantLink[] = [
    { part: 'papas', rest: papasRadius + 0.6, mass: strand.papas.mass },
    {
      part: 'shield',
      rest: papasRadius + strand.shield.length / 2,
      mass: strand.shield.kind === 'self' ? strand.papas.mass * 0.4 : 1.6,
    },
    { part: 'cap', rest: strand.shield.length / 2 + CAP_LENGTH / 2, mass: 0.7 },
  ]
  for (let i = 0; i < TASSEL_LINKS; i++)
    pendant.push({ part: 'tassel', rest: i === 0 ? CAP_LENGTH / 2 + link * 0.6 : link, mass: 0.45 })
  const drop = radiusForPerimeter(cordLength, 0.2)
  const hanging = pendant.reduce((sum, p) => sum + p.rest, 0)
  const width = (2 * drop + hanging + 16) / 1.85
  return {
    strand,
    cord,
    segment: cordLength / cord,
    width,
    height: width * 2,
    hook: { x: width / 2, y: width * PEG_DROP },
    pendant,
  }
}

/**
 * Pool-adjacent-violators: the closest arrangement (weighted by mass) of
 * bead centres that keeps every bead clear of its neighbours and inside the
 * cord's ends. Heavy beads move least, a held bead not at all.
 */
function resolveSpacing(
  s: Float64Array,
  half: Float64Array,
  massOf: (index: number) => number,
  low: number,
  high: number,
): void {
  const count = s.length
  if (!count) return
  const offset = new Float64Array(count)
  for (let i = 1; i < count; i++) offset[i] = offset[i - 1] + half[i - 1] + half[i]
  const levels: number[] = []
  const weights: number[] = []
  const sizes: number[] = []
  for (let i = 0; i < count; i++) {
    let level = s[i] - offset[i]
    let weight = massOf(i)
    let size = 1
    while (levels.length && levels[levels.length - 1] > level) {
      const prevWeight = weights.pop()!
      const prevLevel = levels.pop()!
      size += sizes.pop()!
      level = (prevLevel * prevWeight + level * weight) / (prevWeight + weight)
      weight += prevWeight
    }
    levels.push(level)
    weights.push(weight)
    sizes.push(size)
  }
  const min = low + half[0]
  const max = high - half[count - 1] - offset[count - 1]
  let i = 0
  for (let block = 0; block < levels.length; block++) {
    const level = Math.min(max, Math.max(min, levels[block]))
    for (let r = 0; r < sizes[block]; r++, i++) s[i] = level + offset[i]
  }
}

/** A distance around a loop of `length`, as the shortest signed way round. */
function wrapSigned(value: number, length: number): number {
  const wrapped = ((value % length) + length) % length
  return wrapped > length / 2 ? wrapped - length : wrapped
}

function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

/** How far along segment a→b the point nearest `p` lies, from 0 to 1. */
function closestT(p: Point, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const lengthSquared = dx * dx + dy * dy
  return lengthSquared === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - ax) * dx + (p.y - ay) * dy) / lengthSquared))
}

/** The long semi-axis of an ellipse with this perimeter and short/long ratio (Ramanujan). */
function radiusForPerimeter(perimeter: number, ratio: number): number {
  return perimeter / (Math.PI * (3 * (ratio + 1) - Math.sqrt((3 * ratio + 1) * (ratio + 3))))
}

/** `count` points evenly spaced by arc length round an ellipse, starting at the bottom. */
function ellipsePoints(rx: number, ry: number, count: number): Point[] {
  const samples = 2048
  const points: Point[] = []
  const arc = [0]
  for (let i = 0; i <= samples; i++) {
    const angle = Math.PI / 2 + (i / samples) * Math.PI * 2
    points.push({ x: rx * Math.cos(angle), y: ry * Math.sin(angle) })
    if (i > 0) arc.push(arc[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y))
  }
  const total = arc[samples]
  const result: Point[] = []
  let c = 0
  for (let i = 0; i < count; i++) {
    const target = (i / count) * total
    while (arc[c + 1] < target) c++
    const t = (target - arc[c]) / (arc[c + 1] - arc[c] || 1)
    result.push({
      x: points[c].x + (points[c + 1].x - points[c].x) * t,
      y: points[c].y + (points[c + 1].y - points[c].y) * t,
    })
  }
  return result
}
