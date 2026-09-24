// One acanthus hand for all Carved Oak carving: the running torus and
// leaf-tip tiles (scripts/generate-carving.mjs) and the corner and centre
// clasps (scripts/ornaments/oak.mjs) are all drawn from these generators.

/* --- vectors ------------------------------------------------------------ */

const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k]
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]]
const len = a => Math.hypot(a[0], a[1])
const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l] }
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

let DECIMALS = 1
/** Decimal places written into path data from here on. */
export const precision = places => { DECIMALS = places }
const num = v => {
  const k = 10 ** DECIMALS
  const r = Math.round(v * k) / k
  return (Object.is(r, -0) ? 0 : r).toString().replace(/^(-?)0\./, '$1.')
}
const pt = p => `${num(p[0])} ${num(p[1])}`

/* --- acanthus ----------------------------------------------------------- */

/**
 * An acanthus leaf along a quadratic midrib base → ctrl → tip. Each side is a
 * run of lobes that shrink toward the tip; each lobe a run of teeth with a
 * rounded back and a point hooked toward the tip, and a rounded eye cut
 * between lobes. Returns the two halves of the silhouette (each takes its own
 * run of the body gradient, so the midrib reads as a fold), the eyes, a raised
 * ridge per lobe and the gouged veins.
 */
export function leaf({ base, ctrl, tip, width, lobes = 3, fingers = 3, curl = .1, hook = .05, scale = [1, .92, .74], eye = .26 }) {
  const at = t => lerp(lerp(base, ctrl, t), lerp(ctrl, tip, t), t)
  const tan = t => norm(sub(lerp(ctrl, tip, t), lerp(base, ctrl, t)))
  const nrm = t => { const d = tan(t); return [-d[1], d[0]] }
  const w = t => width * Math.sin(Math.PI * Math.min(.999, t ** .72)) ** .85
  const side = s => {
    const path = []
    const eyes = []
    const veins = []
    const ridges = []
    const stem = .08
    const end = .86
    const weights = Array.from({ length: lobes }, (_, i) => scale[i] ?? .6)
    const total = weights.reduce((a, b) => a + b)
    let a = stem
    let prev = add(at(.02), nrm(.02), s * w(.06) * .5)
    path.push(`L${pt(prev)}`)
    weights.forEach((weight, i) => {
      const b = a + (end - stem) * weight / total
      const notch = add(at(a), nrm(a), s * w(a) * (i === 0 ? .4 : eye))
      path.push(i === 0 ? `L${pt(notch)}` : `Q${pt(add(add(notch, nrm(a), s * w(a) * .25), tan(a), -width * .12))} ${pt(notch)}`)
      if (i > 0) {
        const centre = add(add(at(a), nrm(a), s * w(a) * (eye + .1)), tan(a), -width * .02)
        const r = Math.max(.45, w(a) * .1)
        const t = tan(a)
        const n = nrm(a)
        eyes.push(`M${pt(add(centre, t, r * 1.9))}Q${pt(add(add(centre, n, s * r * 1.3), t, -r * .3))} ${pt(add(centre, t, -r))}` +
          `Q${pt(add(add(centre, n, -s * r * 1.1), t, -r * .1))} ${pt(add(centre, t, r * 1.9))}Z`)
      }
      prev = notch
      const teeth = i === lobes - 1 ? Math.max(2, fingers - 1) : fingers
      for (let j = 0; j < teeth; j++) {
        const ft = a + (b - a) * (j + .85) / teeth
        const reach = (j === teeth - 1 ? 1 : j === 0 ? .8 : .93) * (i === 0 ? .98 : 1)
        const point = add(add(at(ft), nrm(ft), s * w(ft) * reach), tan(ft), width * curl)
        const back = lerp(prev, point, .55)
        path.push(`Q${pt(add(add(back, nrm(ft), s * len(sub(point, prev)) * .32), tan(ft), -width * .02))} ${pt(point)}`)
        if (j < teeth - 1) {
          const nt = a + (b - a) * (j + 1.02) / teeth
          const cleft = add(add(at(nt), nrm(nt), s * w(nt) * .62), tan(nt), -width * hook)
          path.push(`Q${pt(add(lerp(point, cleft, .5), nrm(ft), -s * width * .02))} ${pt(cleft)}`)
          prev = cleft
        } else prev = point
        veins.push(`M${pt(add(at(Math.max(.03, ft - .06)), nrm(ft), s * w(ft) * .16))}Q${pt(add(at(ft - .01), nrm(ft), s * w(ft) * .5))} ` +
          `${pt(add(add(at(ft), nrm(ft), s * w(ft) * reach * .72), tan(ft), width * curl * .6))}`)
      }
      const mid = a + (b - a) * .55
      const r0 = add(at(a + (b - a) * .1), nrm(a), s * w(a) * .1)
      const r1 = add(add(at(mid), nrm(mid), s * w(mid) * .78), tan(mid), width * curl * .6)
      const bulge = len(sub(r1, r0)) * .15
      const m = lerp(r0, r1, .5)
      const across = norm([-(r1[1] - r0[1]), r1[0] - r0[0]])
      ridges.push(`M${pt(r0)}Q${pt(add(m, across, bulge))} ${pt(r1)}Q${pt(add(m, across, -bulge * .5))} ${pt(r0)}Z`)
      a = b
    })
    path.push(`Q${pt(add(at(.94), nrm(.94), s * w(.94) * .5))} ${pt(tip)}`)
    return { path, eyes, veins, ridges }
  }
  const one = side(1)
  const two = side(-1)
  const half = S => `M${pt(at(0))}${S.path.join('')}L${pt(at(.6))}Z`
  const lift = t => add(at(t), nrm(t), width * .08)
  const drop = t => add(at(t), nrm(t), -width * .05)
  return {
    masses: [half(one), half(two)],
    eyes: [...one.eyes, ...two.eyes],
    folds: [...one.ridges, ...two.ridges, `M${pt(at(.03))}Q${pt(lift(.45))} ${pt(at(.96))}Q${pt(drop(.5))} ${pt(at(.03))}Z`],
    veins: [...one.veins, ...two.veins, `M${pt(at(.02))}Q${pt(ctrl)} ${pt(at(.97))}`],
  }
}

/** A flowerhead: rounded petals about a centre, the dome carried as a fold. */
export function rosette(cx, cy, r, petals = 6, turn = 0) {
  const p = (a, k) => [cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k]
  let d = ''
  for (let i = 0; i < petals; i++) {
    const a0 = turn + i * 2 * Math.PI / petals
    const a1 = a0 + Math.PI / petals
    const a2 = a0 + 2 * Math.PI / petals
    d += (i ? '' : `M${pt(p(a0, .38))}`) + `Q${pt(p(a0 + .1, 1.05))} ${pt(p(a1, 1))}Q${pt(p(a2 - .1, 1.05))} ${pt(p(a2, .38))}`
  }
  return `${d}Z`
}

/** Merges carved parts in drawing order. */
export function carve(...parts) {
  const out = { masses: [], folds: [], eyes: [], veins: [] }
  for (const part of parts) for (const key of Object.keys(out)) out[key].push(...(part[key] ?? []))
  return out
}

export const flower = (cx, cy, r, petals, turn) => ({
  masses: [rosette(cx, cy, r, petals, turn)],
  folds: [rosette(cx, cy, r * .45, petals, turn + .3)],
})

/** Applies a coordinate map to every point of every path in a part. */
export function mapPart(part, f) {
  const out = {}
  for (const [key, list] of Object.entries(part)) {
    out[key] = list.map(d => d.replace(/(-?[\d.]+) (-?[\d.]+)/g, (_, x, y) => pt(f([+x, +y]))))
  }
  return out
}
