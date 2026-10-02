import type { Strand } from './strand.js'

/**
 * The komboloi as a physical thing, in millimetres and seconds, with y pointing
 * down. The cord is a closed loop of particles hung through a brass hook. Both
 * ends of the loop pass through the papas bead, which hangs below the loop with
 * the shield and the tassel. The free beads are not particles: each one rides on
 * the cord at an arc length, slides under gravity and the cord's own motion,
 * and knocks into its neighbours. The knocks are what the strand sounds like.
 *
 * Nothing here touches the DOM, so the whole thing runs in tests.
 */

export type Vec = { x: number; y: number }

/** Two beads (or a bead and the papas) knocking together. */
export type Impact = {
  x: number
  y: number
  /** Closing speed, mm/s. */
  speed: number
}

/** What a pointer is over, and so what it takes hold of: a free bead, a part of the pendant, or bare cord. */
export type Grab =
  | { kind: 'bead'; index: number }
  | { kind: 'pendant'; index: number }
  | { kind: 'cord'; s: number }

export type Hit = Grab

/** How far down the frame the peg's centre sits, as a fraction of the frame's width. */
export const PEG_TOP = 0.15

export const GRAVITY = 9810
export const STEP = 1 / 240
const MAX_STEPS = 10
const ITERATIONS = 24
const CORD_SEGMENT = 6
/** Grams per particle of silk cord. */
const CORD_MASS = 0.05
const CORD_DAMPING = 0.35
const TASSEL_DAMPING = 2.2
/** Bead on silk. */
const FRICTION = 0.22
const BEAD_DRAG = 0.9
const RESTITUTION = 0.35
/** Below this, beads settling against each other stay quiet. */
const CLACK_SPEED = 130
const HOOK_FRICTION = 0.012
const MAX_ACCEL = GRAVITY * 6
const MAX_FLICK = 2600

export type PendantPart = 'papas' | 'shield' | 'cap' | 'tassel'

export class Komboloi {
  readonly strand: Strand
  readonly hook: Vec
  /** The peg the loop hangs over. */
  readonly pegRadius = 3
  readonly cordRadius = 0.7
  /** The cord is caught within this of the peg's centre: it can slide round the peg, never off it. */
  readonly hookRadius = 3 + 0.7 + 1.6
  readonly width: number
  readonly height: number
  /** Cord particles. */
  readonly cord: number
  readonly segment: number
  /** Particle positions, previous positions and inverse masses: cord first, then the pendant. */
  readonly x: Float64Array
  readonly y: Float64Array
  private readonly ox: Float64Array
  private readonly oy: Float64Array
  private readonly invMass: Float64Array
  private readonly pinned: Uint8Array
  /** Smoothed particle acceleration, which the beads feel as they ride. */
  private readonly ax: Float64Array
  private readonly ay: Float64Array
  private readonly lvx: Float64Array
  private readonly lvy: Float64Array
  /** Pendant particles in order, with their rest distance from the one above. */
  readonly pendant: { part: PendantPart; rest: number; mass: number }[]
  /** Free beads: arc length along the cord and speed along it. */
  readonly s: Float64Array
  readonly v: Float64Array
  private readonly half: Float64Array
  private readonly cooldown: Float64Array
  private readonly before: Float64Array
  private readonly cx: Float64Array
  private readonly mass: Float64Array
  private readonly cy: Float64Array
  private readonly closing: Float64Array
  private grab: Grab | null = null
  private target: Vec = { x: 0, y: 0 }
  /** Where the held point is this step, on its way from `from` to `target`. */
  private stepTarget: Vec = { x: 0, y: 0 }
  /** Arc length where the cord passes through the hook. */
  private contactS = 0
  private contactValid = false
  private from: Vec = { x: 0, y: 0 }
  private accumulator = 0
  private impacts: Impact[] = []
  /** Which way the keyboard counts beads round, +1 or -1. */
  private counting = 1
  damping = 1
  time = 0

  constructor(strand: Strand) {
    this.strand = strand
    const L = strand.cordLength
    const n = Math.max(24, Math.round(L / CORD_SEGMENT))
    this.cord = n
    this.segment = L / n

    const papasR = strand.papas.width / 2
    const capLength = 7
    const tasselSegments = 5
    const tasselStep = strand.tassel.length / tasselSegments
    this.pendant = [
      { part: 'papas', rest: papasR + 0.6, mass: strand.papas.mass },
      { part: 'shield', rest: papasR + strand.shield.length / 2, mass: strand.shield.kind === 'self' ? strand.papas.mass * 0.4 : 1.6 },
      { part: 'cap', rest: strand.shield.length / 2 + capLength / 2, mass: 0.7 },
    ]
    for (let i = 0; i < tasselSegments; i++) {
      this.pendant.push({ part: 'tassel', rest: i === 0 ? capLength / 2 + tasselStep * 0.6 : tasselStep, mass: 0.45 })
    }
    const total = n + this.pendant.length
    this.x = new Float64Array(total)
    this.y = new Float64Array(total)
    this.ox = new Float64Array(total)
    this.oy = new Float64Array(total)
    this.invMass = new Float64Array(total)
    this.pinned = new Uint8Array(total)
    this.mass = new Float64Array(total)
    this.ax = new Float64Array(total)
    this.ay = new Float64Array(total)
    this.lvx = new Float64Array(total)
    this.lvy = new Float64Array(total)

    // The loop hangs as a long teardrop: an ellipse of the cord's length.
    const b = ellipseHalfHeight(L, 0.2)
    const a = b * 0.2
    const pendantLength = this.pendant.reduce((sum, p) => sum + p.rest, 0)
    // The frame is twice as tall as it is wide, with the peg PEG_TOP of the
    // width down from the top, whatever the strand's length: strands hung side
    // by side line their pegs up.
    const below = 2 * b + pendantLength + 16
    this.width = below / (2 - PEG_TOP)
    this.height = this.width * 2
    const hookY = this.width * PEG_TOP
    this.hook = { x: this.width / 2, y: hookY }
    const cx = this.hook.x
    // Draped over the top of the peg.
    const cy = hookY - this.pegRadius - this.cordRadius + b
    const ring = resampleEllipse(a, b, n)
    for (let i = 0; i < n; i++) {
      this.x[i] = cx + ring[i].x
      this.y[i] = cy + ring[i].y
    }
    let py = this.y[0]
    this.pendant.forEach((p, i) => {
      py += p.rest
      this.x[n + i] = cx
      this.y[n + i] = py
    })
    this.ox.set(this.x)
    this.oy.set(this.y)

    // Beads start packed down both sides, the gap over the hook.
    const count = strand.beads.length
    this.s = new Float64Array(count)
    this.v = new Float64Array(count)
    this.half = new Float64Array(count)
    this.cooldown = new Float64Array(count + 1)
    this.before = new Float64Array(count)
    this.cx = new Float64Array(count)
    this.cy = new Float64Array(count)
    this.closing = new Float64Array(count + 1)
    strand.beads.forEach((bead, i) => (this.half[i] = bead.length / 2))
    const split = Math.ceil(count / 2)
    let at = strand.clearance
    for (let i = 0; i < split; i++) {
      this.s[i] = at + this.half[i]
      at += this.half[i] * 2
    }
    at = L - strand.clearance
    for (let i = count - 1; i >= split; i--) {
      this.s[i] = at - this.half[i]
      at -= this.half[i] * 2
    }
    this.updateMasses()
  }

  /** Lets the strand fall into its resting drape. */
  settle(seconds = 2) {
    const steps = Math.round(seconds / STEP)
    for (let i = 0; i < steps; i++) this.step(STEP)
    this.impacts = []
    this.time = 0
  }

  /** Advances by real time, in fixed steps. Returns the number of steps taken. */
  advance(dt: number): number {
    this.accumulator = Math.min(this.accumulator + dt, STEP * MAX_STEPS)
    const steps = Math.floor(this.accumulator / STEP + 1e-9)
    for (let k = 1; k <= steps; k++) {
      // The held point moves in a straight line through the frame, not in one jump.
      this.stepTarget = lerp(this.from, this.target, k / steps)
      this.step(STEP)
    }
    this.accumulator -= steps * STEP
    if (steps) this.from = { ...this.target }
    return steps
  }

  step(dt: number) {
    const n = this.cord
    const total = this.x.length
    const L = this.strand.cordLength
    this.time += dt
    this.updateMasses()

    // Integrate.
    const cordKeep = Math.exp(-CORD_DAMPING * this.damping * dt)
    const tasselKeep = Math.exp(-TASSEL_DAMPING * this.damping * dt)
    for (let i = 0; i < total; i++) {
      if (this.pinned[i]) continue
      const keep = i >= n + 3 ? tasselKeep : cordKeep
      const vx = (this.x[i] - this.ox[i]) * keep
      const vy = (this.y[i] - this.oy[i]) * keep
      this.ox[i] = this.x[i]
      this.oy[i] = this.y[i]
      this.x[i] += vx
      this.y[i] += vy + GRAVITY * dt * dt
    }
    if (this.grab?.kind === 'pendant') {
      const p = n + this.grab.index
      this.x[p] = this.stepTarget.x
      this.y[p] = this.stepTarget.y
    }

    // Constraints.
    let contact = -1
    for (let iteration = 0; iteration < ITERATIONS; iteration++) {
      // Alternate the sweep, so a pull at one end reaches the other in both directions.
      if (iteration % 2 === 0) for (let i = 0; i < n; i++) this.distance(i, (i + 1) % n, this.segment)
      else for (let i = n - 1; i >= 0; i--) this.distance(i, (i + 1) % n, this.segment)
      let above = 0
      for (let k = 0; k < this.pendant.length; k++) {
        this.distance(above, n + k, this.pendant[k].rest)
        above = n + k
      }
      contact = this.hookConstraint()
      if (iteration % 2 === 1) this.tether()
      // The two sides of the loop hang against each other: beads are round, not ghosts.
      if (iteration % 3 === 2) this.separateSides()
      if (this.grab?.kind === 'bead') this.attach(this.s[this.grab.index], this.stepTarget)
      else if (this.grab?.kind === 'cord') this.attach(this.grab.s, this.stepTarget)
    }
    // The tassel hangs from the cap; it never folds up over the papas.
    this.keepBelow(0, n + 2)

    // Silk dragging through the hook.
    if (contact >= 0) {
      for (const i of [contact, (contact + 1) % n]) {
        this.ox[i] += (this.x[i] - this.ox[i]) * HOOK_FRICTION
        this.oy[i] += (this.y[i] - this.oy[i]) * HOOK_FRICTION
      }
    }

    // Acceleration of every particle, smoothed: the beads feel the cord swing.
    for (let i = 0; i < total; i++) {
      const vx = (this.x[i] - this.ox[i]) / dt
      const vy = (this.y[i] - this.oy[i]) / dt
      let ax = (vx - this.lvx[i]) / dt
      let ay = (vy - this.lvy[i]) / dt
      const m = Math.hypot(ax, ay)
      if (m > MAX_ACCEL) {
        ax *= MAX_ACCEL / m
        ay *= MAX_ACCEL / m
      }
      this.ax[i] = this.ax[i] * 0.75 + ax * 0.25
      this.ay[i] = this.ay[i] * 0.75 + ay * 0.25
      this.lvx[i] = vx
      this.lvy[i] = vy
    }

    // Beads slide along the cord.
    const count = this.s.length
    const drag = Math.exp(-BEAD_DRAG * this.damping * dt)
    const before = this.before
    before.set(this.s)
    for (let i = 0; i < count; i++) {
      if (this.grab?.kind === 'bead' && this.grab.index === i) {
        this.v[i] = 0
        continue
      }
      const { k, t } = this.locate(this.s[i])
      const k1 = (k + 1) % n
      let tx = this.x[k1] - this.x[k]
      let ty = this.y[k1] - this.y[k]
      const len = Math.hypot(tx, ty) || 1
      tx /= len
      ty /= len
      const gx = -(this.ax[k] * (1 - t) + this.ax[k1] * t)
      const gy = GRAVITY - (this.ay[k] * (1 - t) + this.ay[k1] * t)
      const along = gx * tx + gy * ty
      const normal = Math.abs(gx * ty - gy * tx)
      // Over the peg the cord bends too sharply for a bead to sit balanced on top.
      const fromPeg = wrapArc(this.s[i] - this.contactS, L)
      const onPeg = this.contactValid && Math.abs(fromPeg) < this.half[i] + 4
      const tip = onPeg && Math.abs(this.v[i]) < 40 ? Math.sign(fromPeg || 1) * GRAVITY * 0.35 : 0
      const trial = this.v[i] + (along + tip) * dt
      const grip = onPeg ? 0 : FRICTION * normal * dt
      this.v[i] = Math.abs(trial) <= grip ? 0 : (trial - Math.sign(trial) * grip) * drag
    }
    // How fast each pair was closing before anything stopped them.
    const closing = this.closing
    const held = this.grab?.kind === 'bead' ? this.grab.index : -1
    for (let i = 0; i <= count; i++) {
      const vl = i === 0 || i - 1 === held ? 0 : this.v[i - 1]
      const vr = i === count || i === held ? 0 : this.v[i]
      closing[i] = vl - vr
    }
    for (let i = 0; i < count; i++) this.s[i] += this.v[i] * dt
    for (let i = 0; i < this.cooldown.length; i++) this.cooldown[i] = Math.max(0, this.cooldown[i] - dt)
    this.collideBeads(L, before, closing, dt)
  }

  /**
   * The beads' weight hangs on the cord. Mostly it is spread evenly round the
   * loop, with a share where the beads actually are, so the cord sags where they
   * gather but the solver never has to hold a heavy point between light ones
   * (a long chain of very uneven masses stretches).
   */
  private updateMasses() {
    const n = this.cord
    const count = this.s.length
    const beadMass = this.strand.beads.reduce((sum, b) => sum + b.mass, 0)
    const mass = this.mass
    mass.fill(CORD_MASS + (beadMass * 0.15) / n)
    for (let i = 0; i < count; i++) {
      const { k, t } = this.locate(this.s[i])
      const m = this.strand.beads[i].mass * 0.85
      mass[k] += m * (1 - t)
      mass[(k + 1) % n] += m * t
    }
    this.pendant.forEach((p, i) => (mass[n + i] = p.mass))
    this.pinned.fill(0)
    if (this.grab?.kind === 'pendant') this.pinned[n + this.grab.index] = 1
    for (let i = 0; i < mass.length; i++) this.invMass[i] = this.pinned[i] ? 0 : 1 / mass[i]
  }

  private distance(a: number, b: number, rest: number) {
    const wa = this.invMass[a]
    const wb = this.invMass[b]
    const w = wa + wb
    if (w === 0) return
    const dx = this.x[b] - this.x[a]
    const dy = this.y[b] - this.y[a]
    const d = Math.hypot(dx, dy) || 1e-9
    const c = (d - rest) / (d * w)
    this.x[a] += dx * c * wa
    this.y[a] += dy * c * wa
    this.x[b] -= dx * c * wb
    this.y[b] -= dy * c * wb
  }

  /** A point part way along a segment is moved to a target, the two ends sharing the move by weight. */
  private moveAlong(k: number, t: number, dx: number, dy: number) {
    const k1 = (k + 1) % this.cord
    const wa = this.invMass[k] * (1 - t)
    const wb = this.invMass[k1] * t
    const denom = wa * (1 - t) + wb * t
    if (denom === 0) return
    this.x[k] += (dx * wa) / denom
    this.y[k] += (dy * wa) / denom
    this.x[k1] += (dx * wb) / denom
    this.y[k1] += (dy * wb) / denom
  }

  private attach(s: number, target: Vec) {
    const { k, t } = this.locate(s)
    const p = this.pointAt(k, t)
    this.moveAlong(k, t, target.x - p.x, target.y - p.y)
  }

  /** The cord passes through the hook: its nearest point is kept inside the crook. Returns the segment held. */
  private hookConstraint(): number {
    const n = this.cord
    // The peg is solid: the cord lies over it.
    const solid = this.pegRadius + this.cordRadius
    for (let i = 0; i < n; i++) {
      const dx = this.x[i] - this.hook.x
      const dy = this.y[i] - this.hook.y
      const d2 = dx * dx + dy * dy
      if (d2 >= solid * solid || this.invMass[i] === 0) continue
      const d = Math.sqrt(d2) || 1e-6
      this.x[i] = this.hook.x + (dx / d) * solid
      this.y[i] = this.hook.y + (dy / d) * solid
    }
    let best = -1
    let bestD = Infinity
    let bestT = 0
    // Near where it was last step, unless the strand has been thrown about.
    const local = this.contactValid ? 6 : n
    const from = this.contactValid ? Math.floor(this.contactS / this.segment) - local : 0
    for (let step = 0; step < Math.min(n, local * 2 + 1); step++) {
      const k = (((from + step) % n) + n) % n
      const k1 = (k + 1) % n
      const t = projectT(this.hook, this.x[k], this.y[k], this.x[k1], this.y[k1])
      const px = this.x[k] + (this.x[k1] - this.x[k]) * t
      const py = this.y[k] + (this.y[k1] - this.y[k]) * t
      const d = Math.hypot(px - this.hook.x, py - this.hook.y)
      if (d < bestD) {
        bestD = d
        best = k
        bestT = t
      }
    }
    this.contactS = (best + bestT) * this.segment
    this.contactValid = bestD < this.hookRadius + 6
    if (bestD > this.hookRadius) {
      const p = this.pointAt(best, bestT)
      const pull = (bestD - this.hookRadius) / bestD
      this.moveAlong(best, bestT, (this.hook.x - p.x) * pull, (this.hook.y - p.y) * pull)
    }
    return bestD <= this.hookRadius + 0.5 ? best : -1
  }

  /**
   * Beads that are not neighbours on the cord still bump each other across the
   * loop, and against the papas. Each push moves the cord under both beads.
   */
  private separateSides() {
    const count = this.s.length
    const cx = this.cx
    const cy = this.cy
    for (let i = 0; i < count; i++) {
      const p = this.positionAt(this.s[i])
      cx[i] = p.x
      cy[i] = p.y
    }
    const reach = (i: number) => this.strand.beads[i].width * 0.47
    for (let i = 0; i < count; i++) {
      for (let j = i + 2; j < count; j++) {
        const dx = cx[j] - cx[i]
        const dy = cy[j] - cy[i]
        const min = reach(i) + reach(j)
        const d2 = dx * dx + dy * dy
        if (d2 >= min * min) continue
        // Neighbours a few beads apart along a tight bend are allowed to touch.
        if (Math.abs(this.s[j] - this.s[i]) < (this.half[i] + this.half[j]) * 1.6) continue
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
  }

  /**
   * Nothing on a hanging strand can be further from the hook than the cord
   * between them. Iterating distance constraints alone lets a long, heavy loop
   * stretch like elastic; this pulls every particle back inside its reach at
   * once (a "long range attachment").
   */
  private tether() {
    const n = this.cord
    const L = this.strand.cordLength
    const hx = this.hook.x
    const hy = this.hook.y
    const reach = (i: number, along: number) => {
      const dx = this.x[i] - hx
      const dy = this.y[i] - hy
      const d = Math.hypot(dx, dy)
      const max = along + this.hookRadius
      if (d <= max || this.invMass[i] === 0) return
      const f = max / d
      this.x[i] = hx + dx * f
      this.y[i] = hy + dy * f
    }
    for (let i = 0; i < n; i++) {
      const gap = Math.abs(i * this.segment - this.contactS)
      reach(i, Math.min(gap, L - gap))
    }
    const junction = Math.abs(this.contactS)
    let along = Math.min(junction, L - junction)
    for (let k = 0; k < this.pendant.length; k++) {
      along += this.pendant[k].rest
      reach(n + k, along)
    }
  }

  /** The tassel cap stays below the junction's horizontal: it can swing, not flip over the loop. */
  private keepBelow(junction: number, cap: number) {
    const dy = this.y[cap] - this.y[junction]
    if (dy < 2 && this.invMass[cap] > 0) this.y[cap] = this.y[junction] + 2
  }

  /**
   * Beads are kept apart by position, so a row resting against the papas is
   * simply a row, not a stack of tiny collisions. Speeds are then read back from
   * how far each bead really moved, and a real knock (one closing faster than a
   * settle) gets its bounce, and its click, on top.
   */
  private collideBeads(L: number, before: Float64Array, closingBefore: Float64Array, dt: number) {
    const count = this.s.length
    if (!count) return
    const lo = this.strand.clearance
    const hi = L - this.strand.clearance
    const held = this.grab?.kind === 'bead' ? this.grab.index : -1
    const w = (i: number) => (i < 0 || i >= count || i === held ? 0 : 1 / this.strand.beads[i].mass)
    const edges = (i: number) => ({
      left: i === 0 ? lo : this.s[i - 1] + this.half[i - 1],
      right: i === count ? hi : this.s[i] - this.half[i],
    })

    keepApart(this.s, this.half, (i) => (i === held ? HELD : this.strand.beads[i].mass), lo, hi)

    for (let i = 0; i < count; i++) if (i !== held) this.v[i] = (this.s[i] - before[i]) / dt

    for (let i = 0; i <= count; i++) {
      const closing = closingBefore[i]
      if (closing <= CLACK_SPEED) continue
      const { left, right } = edges(i)
      if (right - left > 0.05) continue
      const wl = w(i - 1)
      const wr = w(i)
      const sum = wl + wr
      if (sum === 0) continue
      const vl = i === 0 || i - 1 === held ? 0 : this.v[i - 1]
      const vr = i === count || i === held ? 0 : this.v[i]
      const bounce = RESTITUTION * closing - (vr - vl)
      if (bounce > 0) {
        if (wl) this.v[i - 1] -= (bounce * wl) / sum
        if (wr) this.v[i] += (bounce * wr) / sum
      }
      if (this.cooldown[i] === 0) {
        this.cooldown[i] = 0.03
        const p = this.positionAt(left)
        this.impacts.push({ x: p.x, y: p.y, speed: closing })
      }
    }
  }

  /** The cord segment and fraction at an arc length. */
  locate(s: number): { k: number; t: number } {
    const n = this.cord
    const L = this.strand.cordLength
    const wrapped = ((s % L) + L) % L
    const f = wrapped / this.segment
    const k = Math.min(n - 1, Math.floor(f))
    return { k, t: f - k }
  }

  private pointAt(k: number, t: number): Vec {
    const k1 = (k + 1) % this.cord
    return { x: this.x[k] + (this.x[k1] - this.x[k]) * t, y: this.y[k] + (this.y[k1] - this.y[k]) * t }
  }

  /** Where an arc length is on the cord now. */
  positionAt(s: number): Vec {
    const { k, t } = this.locate(s)
    return this.pointAt(k, t)
  }

  /** The cord's direction at an arc length, as an angle in radians. */
  angleAt(s: number): number {
    const { k } = this.locate(s)
    const k1 = (k + 1) % this.cord
    return Math.atan2(this.y[k1] - this.y[k], this.x[k1] - this.x[k])
  }

  /** A free bead's centre. */
  bead(i: number): Vec {
    return this.positionAt(this.s[i])
  }

  /** A pendant particle's position. */
  pendantPoint(i: number): Vec {
    return { x: this.x[this.cord + i], y: this.y[this.cord + i] }
  }

  /** The knocks since the last call. */
  drainImpacts(): Impact[] {
    const out = this.impacts
    this.impacts = []
    return out
  }

  /** What is under a point, within `reach` mm of its edge. Beads win over the cord. */
  hitTest(p: Vec, reach = 2): Hit | null {
    let best: Hit | null = null
    let bestD = Infinity
    for (let i = 0; i < this.s.length; i++) {
      const c = this.bead(i)
      const d = Math.hypot(c.x - p.x, c.y - p.y) - this.strand.beads[i].width / 2
      if (d < reach && d < bestD) {
        bestD = d
        best = { kind: 'bead', index: i }
      }
    }
    const sizes = [this.strand.papas.width / 2, this.strand.shield.width / 2, 4, 6, 7, 7, 7, 6]
    for (let i = 0; i < this.pendant.length; i++) {
      const c = this.pendantPoint(i)
      const d = Math.hypot(c.x - p.x, c.y - p.y) - (sizes[i] ?? 5)
      if (d < reach && d < bestD) {
        bestD = d
        best = { kind: 'pendant', index: i }
      }
    }
    if (best) return best
    // The bare cord between beads.
    const n = this.cord
    for (let k = 0; k < n; k++) {
      const k1 = (k + 1) % n
      const t = projectT(p, this.x[k], this.y[k], this.x[k1], this.y[k1])
      const q = this.pointAt(k, t)
      const d = Math.hypot(q.x - p.x, q.y - p.y)
      if (d < reach + 1 && d < bestD) {
        bestD = d
        best = { kind: 'cord', s: (k + t) * this.segment }
      }
    }
    return best
  }

  /** Takes hold of a bead or the pendant. The held point follows `moveTo`. */
  hold(grab: Grab, at: Vec) {
    this.grab = grab
    this.target = { ...at }
    this.from =
      grab.kind === 'bead' ? this.bead(grab.index) : grab.kind === 'cord' ? this.positionAt(grab.s) : this.pendantPoint(grab.index)
    this.stepTarget = { ...this.from }
    if (grab.kind === 'bead') this.v[grab.index] = 0
  }

  moveTo(at: Vec) {
    this.target = { ...at }
  }

  release() {
    this.grab = null
  }

  get holding(): Grab | null {
    return this.grab
  }

  /** Free cord on each side of a bead, mm. */
  room(i: number): { before: number; after: number } {
    const count = this.s.length
    const lo = this.strand.clearance
    const hi = this.strand.cordLength - this.strand.clearance
    const before = this.s[i] - this.half[i] - (i === 0 ? lo : this.s[i - 1] + this.half[i - 1])
    const after = (i === count - 1 ? hi : this.s[i + 1] - this.half[i + 1]) - (this.s[i] + this.half[i])
    return { before, after }
  }

  /**
   * Flicks a bead along the cord, hard enough to carry it over whatever rise
   * lies across the free cord ahead of it. With no direction it goes toward
   * the more open side.
   */
  flick(i: number, direction?: 1 | -1) {
    if (i < 0 || i >= this.s.length) return
    const forward = this.openAhead(i, 1)
    const back = this.openAhead(i, -1)
    const dir = direction ?? (forward.gap >= back.gap ? 1 : -1)
    // A bead in a run knocks the run along; the last one in it is the one that flies.
    const { j, gap } = dir > 0 ? forward : back
    const start = this.positionAt(this.s[j])
    let top = start.y
    const samples = 16
    for (let k = 1; k <= samples; k++) top = Math.min(top, this.positionAt(this.s[j] + (dir * gap * k) / samples).y)
    const rise = Math.max(0, start.y - top)
    const speed = Math.sqrt(2 * GRAVITY * (rise + 10) + 2 * FRICTION * GRAVITY * gap * 0.6) * 1.1 + 140
    // Tap a bead in a run and the knock goes down the row: the last one flies.
    this.v[j] = dir * Math.min(MAX_FLICK, speed)
  }

  /** The last bead in the run of touching beads from `i` toward `dir`, and the open cord past it. */
  private openAhead(i: number, dir: 1 | -1): { j: number; gap: number } {
    let j = i
    for (;;) {
      const r = this.room(j)
      const gap = dir > 0 ? r.after : r.before
      const next = j + dir
      if (gap >= 0.5 || next < 0 || next >= this.s.length) return { j, gap: Math.max(0, gap) }
      j = next
    }
  }

  /**
   * The bead a thumb would move next: the one at the edge of the gap, sent
   * across it. Successive calls count round the strand one way, bead after
   * bead, and turn back once the far side has filled up to the hook.
   */
  flickNext() {
    const count = this.s.length
    if (!count) return
    let bestGap = -Infinity
    let at = 0
    for (let i = 0; i <= count; i++) {
      const left = i === 0 ? this.strand.clearance : this.s[i - 1] + this.half[i - 1]
      const right = i === count ? this.strand.cordLength - this.strand.clearance : this.s[i] - this.half[i]
      if (right - left > bestGap) {
        bestGap = right - left
        at = i
      }
    }
    // A gap against the papas can only be crossed one way.
    if (at === 0) this.counting = -1
    else if (at === count) this.counting = 1
    else if (this.full(this.counting > 0 ? at : at - 1)) this.counting = -this.counting
    if (this.counting > 0) this.flick(at - 1, 1)
    else this.flick(at, -1)
  }

  /** Whether the beads behind this one are stacked so high there is no room on top. */
  private full(i: number): boolean {
    const top = this.bead(i).y - this.strand.beads[i].width / 2
    return top - this.hook.y < this.strand.beads[i].length * 1.4
  }

  /** A push sideways, as if the strand were nudged. */
  swing(direction: 1 | -1, strength = 1) {
    const n = this.cord
    const top = this.hook.y
    const span = Math.max(1, this.height - top)
    for (let i = 0; i < this.x.length; i++) {
      if (this.pinned[i]) continue
      const depth = Math.max(0, (this.y[i] - top) / span)
      const push = direction * strength * 520 * depth * STEP
      this.ox[i] -= push * (i >= n ? 1.1 : 1)
    }
  }

  /** Total movement, for deciding when the strand has come to rest. */
  energy(): number {
    let e = 0
    for (let i = 0; i < this.x.length; i++) {
      const vx = this.x[i] - this.ox[i]
      const vy = this.y[i] - this.oy[i]
      e += vx * vx + vy * vy
    }
    e /= STEP * STEP * this.x.length
    for (let i = 0; i < this.v.length; i++) e += (this.v[i] * this.v[i]) / this.v.length
    return e
  }
}

const HELD = 1e9

/**
 * Moves beads the least distance (weighted by mass) so that none overlap and
 * all stay between the walls. In terms of each bead's position less the room
 * the beads before it take up, "no overlap" is just "in order", so this is a
 * weighted isotonic regression: pool adjacent violators, then clamp to the
 * walls. Exact in one pass, where pushing pairs apart one at a time leaves a
 * long row resting on the papas slightly crushed.
 */
export function keepApart(s: Float64Array, half: Float64Array, weight: (i: number) => number, lo: number, hi: number) {
  const n = s.length
  if (!n) return
  const offset = new Float64Array(n)
  for (let i = 1; i < n; i++) offset[i] = offset[i - 1] + half[i - 1] + half[i]
  const value: number[] = []
  const mass: number[] = []
  const size: number[] = []
  for (let i = 0; i < n; i++) {
    let v = s[i] - offset[i]
    let w = weight(i)
    let c = 1
    while (value.length && value[value.length - 1] > v) {
      const pw = mass.pop()!
      const pv = value.pop()!
      c += size.pop()!
      v = (pv * pw + v * w) / (pw + w)
      w += pw
    }
    value.push(v)
    mass.push(w)
    size.push(c)
  }
  const min = lo + half[0]
  const max = hi - half[n - 1] - offset[n - 1]
  let i = 0
  for (let b = 0; b < value.length; b++) {
    const v = Math.min(max, Math.max(min, value[b]))
    for (let k = 0; k < size[b]; k++, i++) s[i] = v + offset[i]
  }
}

/** An arc-length difference round the loop, folded into (-L/2, L/2]. */
function wrapArc(d: number, L: number): number {
  const m = ((d % L) + L) % L
  return m > L / 2 ? m - L : m
}

function lerp(a: Vec, b: Vec, t: number): Vec {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

function projectT(p: Vec, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return 0
  return Math.min(1, Math.max(0, ((p.x - ax) * dx + (p.y - ay) * dy) / len2))
}

/** Half-height of an ellipse with this perimeter and width-to-height ratio (Ramanujan). */
export function ellipseHalfHeight(perimeter: number, ratio: number): number {
  const unit = Math.PI * (3 * (ratio + 1) - Math.sqrt((3 * ratio + 1) * (ratio + 3)))
  return perimeter / unit
}

/**
 * `n` points evenly spaced round an ellipse centred on the origin, starting at
 * the bottom and going clockwise on screen (up the left side first).
 */
function resampleEllipse(a: number, b: number, n: number): Vec[] {
  const dense = 2048
  const pts: Vec[] = []
  const cum = [0]
  for (let i = 0; i <= dense; i++) {
    const th = Math.PI / 2 + (i / dense) * Math.PI * 2
    pts.push({ x: a * Math.cos(th), y: b * Math.sin(th) })
    if (i > 0) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
  }
  const total = cum[dense]
  const out: Vec[] = []
  let j = 0
  for (let i = 0; i < n; i++) {
    const want = (i / n) * total
    while (cum[j + 1] < want) j++
    const t = (want - cum[j]) / (cum[j + 1] - cum[j] || 1)
    out.push({ x: pts[j].x + (pts[j + 1].x - pts[j].x) * t, y: pts[j].y + (pts[j + 1].y - pts[j].y) * t })
  }
  return out
}
