// Regenerates the timber cross-sections: node scripts/generate-profile.mjs
//
// A moulding is a shape, not a stack of stripes. Each variant below describes
// its section as a run of members — flats, rounds, coves, chamfers — walked
// from the outer edge to the sight edge, and this script turns that height
// field into the two gradients the nine-slice paints with:
//
//   z(x)      the surface, in units of the section's own width
//   n(x)      its normal
//   lambert   one key light, arriving from the outer side at 40° off normal
//   shadow    the same light ray-marched across the section, so a fillet
//             standing proud actually shades what sits behind it
//   ao        hollows lose ambient in proportion to how enclosed they are
//
// The shade that falls out is read through a per-timber colour ramp sampled
// from the reference photographs in docs/references.md, so a highlight stays
// the timber's own pale honey or grey and never washes to white. Stops are
// then simplified to the fewest that carry the curve within a visible
// tolerance: smooth where the surface rolls, abrupt only at a true arris.
import { readFile, writeFile } from 'node:fs/promises'

/* --- shading ------------------------------------------------------------ */

const SAMPLES = 480
const THETA = 40 * Math.PI / 180
const LIGHT = { x: -Math.sin(THETA), z: Math.cos(THETA) }
const COT = Math.cos(THETA) / Math.sin(THETA)
const AMBIENT = .26
const KEY = .74
/* Exposure: a plain flat face lands here on the timber's ramp, and the tone
   curve then decides how far a hollow falls and a crest climbs from it. */
const MID = .54
const GAMMA = 1.75

/** Walks the members into a height field sampled across the section. */
function surface(members) {
  const edges = []
  let at = 0
  for (const member of members) {
    edges.push({ member, from: at, to: at + member.span })
    at += member.span
  }
  const z = new Float64Array(SAMPLES)
  const owner = new Array(SAMPLES)
  let base = 0
  let cursor = 0
  for (const { member, from, to } of edges) {
    base += member.step ?? 0
    const slope = member.slope ?? 0
    const amp = member.amp ?? 0
    while (cursor < SAMPLES && (cursor + .5) / SAMPLES < to) {
      const t = ((cursor + .5) / SAMPLES - from) / (to - from)
      const bow = member.kind === 'round' ? amp * Math.sin(Math.PI * t)
        : member.kind === 'cove' ? -amp * Math.sin(Math.PI * t)
        : member.kind === 'chamfer' ? -amp * t
        : 0
      z[cursor] = base + slope * t + bow
      owner[cursor] = member
      cursor++
    }
    base += slope
  }
  return { z, owner }
}

/** Lambert, cast shadow and ambient occlusion, all from the one key light. */
function shading(z, { gloss, key, expose }) {
  const shade = new Float64Array(SAMPLES)
  const window = Math.round(SAMPLES * .13)
  // A camera exposes for the broad flat face, so that is what lands mid-ramp;
  // every other member is read as a ratio against it, then pulled apart by a
  // gamma — which is what gives a hollow its depth and a crest its catch.
  const flat = AMBIENT + KEY * LIGHT.z
  // Half vector of a waxed or satin finish, viewed square on.
  const half = (() => {
    const length = Math.hypot(LIGHT.x, LIGHT.z + 1)
    return { x: LIGHT.x / length, z: (LIGHT.z + 1) / length }
  })()
  for (let i = 0; i < SAMPLES; i++) {
    const a = z[Math.max(0, i - 1)]
    const b = z[Math.min(SAMPLES - 1, i + 1)]
    const slope = (b - a) * SAMPLES / 2
    const length = Math.hypot(slope, 1)
    const normal = { x: -slope / length, z: 1 / length }
    const lambert = Math.max(0, normal.x * LIGHT.x + normal.z * LIGHT.z)
    // March back toward the light: anything higher along the ray occludes.
    let blocked = 0
    for (let j = i - 1; j >= 0; j--) {
      const rise = z[j] - (z[i] + (i - j) / SAMPLES * COT)
      if (rise > blocked) blocked = rise
    }
    const shadow = 1 - Math.min(1, Math.max(0, blocked / .014)) * .86
    let high = z[i]
    for (let j = Math.max(0, i - window); j <= Math.min(SAMPLES - 1, i + window); j++) {
      if (z[j] > high) high = z[j]
    }
    const ao = 1 - Math.min(1, (high - z[i]) / .085) * .6
    const diffuse = AMBIENT * ao + key * lambert * shadow
    const specular = gloss * (key / KEY) * shadow * Math.max(0, normal.x * half.x + normal.z * half.z) ** 24
    shade[i] = Math.min(1, expose * (diffuse / flat) ** GAMMA + specular)
  }
  return shade
}

/* --- colour ------------------------------------------------------------- */

const hex = value => {
  const n = Math.round(Math.min(255, Math.max(0, value)))
  return n.toString(16).padStart(2, '0')
}
const toLinear = v => (v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
const toSrgb = v => (v <= .0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - .055)
const parse = text => [1, 3, 5].map(i => toLinear(parseInt(text.slice(i, i + 2), 16) / 255))

/** Ramps are authored as sRGB but mixed in light, so mid-tones stay clean. */
const ramp = stops => {
  const anchors = stops.map(([at, colour]) => ({ at, rgb: parse(colour) }))
  return t => {
    const clamped = Math.min(1, Math.max(0, t))
    let i = 1
    while (i < anchors.length - 1 && anchors[i].at < clamped) i++
    const a = anchors[i - 1]
    const b = anchors[i]
    const k = (clamped - a.at) / (b.at - a.at)
    return a.rgb.map((channel, index) => toSrgb(channel + (b.rgb[index] - channel) * k) * 255)
  }
}

/* --- stop simplification ------------------------------------------------ */

/** Keeps the fewest stops whose linear interpolation stays within tolerance. */
function simplify(colours, tolerance) {
  const keep = new Uint8Array(colours.length)
  keep[0] = keep[colours.length - 1] = 1
  const stack = [[0, colours.length - 1]]
  while (stack.length) {
    const [from, to] = stack.pop()
    if (to - from < 2) continue
    let worst = 0
    let at = -1
    for (let i = from + 1; i < to; i++) {
      const k = (i - from) / (to - from)
      let error = 0
      for (let c = 0; c < 3; c++) {
        error = Math.max(error, Math.abs(colours[i][c] - (colours[from][c] + (colours[to][c] - colours[from][c]) * k)))
      }
      if (error > worst) { worst = error; at = i }
    }
    if (worst > tolerance) {
      keep[at] = 1
      stack.push([from, at], [at, to])
    }
  }
  return [...keep].flatMap((flag, i) => (flag ? [i] : []))
}

/* --- sections ----------------------------------------------------------- */

/* Every section runs outer edge → sight edge, the axis --profile is painted
   along. `span` is a fraction of the rail width, `amp` and `step` are depths
   in the same units, so a section scales with the frame and keeps its relief
   proportions from a 140px thumbnail to a 550px sheet. */

const timber = {
  // Quartersawn oak, waxed: honey ground, amber in the recesses, pale silver
  // ray fleck on the crests. Anchored on quercus-alba-qs, whose median #9f7c54
  // holds a red:green:blue of 1 : .78 : .53 — any more saturation reads brass.
  oak: ramp([[0, '#251a0e'], [.16, '#43301c'], [.34, '#6b5032'], [.54, '#8f6f4b'], [.76, '#b8966e'], [1, '#decca8']]),
  // American black walnut under wax: cool chocolate core, warm tan crests.
  walnut: ramp([[0, '#130b07'], [.17, '#2d1c13'], [.37, '#523223'], [.57, '#7b5138'], [.78, '#ab8055'], [1, '#dcbc8e']]),
  // Ebonised fruitwood: black that still returns a grey, never a blue, sheen.
  ebony: ramp([[0, '#050404'], [.22, '#15120f'], [.44, '#282320'], [.64, '#3d3733'], [.84, '#615950'], [1, '#948b7e']]),
  // Black-stained ash, satin: a narrow value band with a soft charcoal top.
  ash: ramp([[0, '#0c0b0b'], [.3, '#191716'], [.56, '#242120'], [.8, '#322e2b'], [1, '#4f4a46']]),
  // Water-gilt slip: bole in the hollows, pale leaf on the catch.
  gilt: ramp([[0, '#2b1f0d'], [.32, '#6d5423'], [.62, '#a98a41'], [.86, '#dcc079'], [1, '#f7e6b4']]),
}

const sections = {
  'carved-oak': {
    file: 'CarvedOak/oak.css',
    ramp: 'oak', gloss: .08, expose: .62,
    members: [
      { kind: 'chamfer', span: .035, amp: .012 },                 // back edge
      { kind: 'round', span: .130, amp: .058 },                   // outer torus
      { kind: 'cove', span: .070, amp: .040 },                    // quirk
      { kind: 'round', span: .340, amp: .012, slope: -.010 },     // broad face
      { kind: 'cove', span: .075, amp: .038 },                    // hollow
      { kind: 'round', span: .120, amp: .052, step: .004 },       // carved reed
      { kind: 'chamfer', span: .040, amp: .014 },                 // fillet
      { kind: 'cove', span: .120, amp: .050, slope: -.030 },      // sight cove
      { kind: 'flat', span: .070, step: -.090, ink: .28 },        // rabbet
    ],
  },
  'dark-walnut': {
    file: 'DarkWalnut/walnut.css',
    ramp: 'walnut', gloss: .20,
    members: [
      { kind: 'round', span: .125, amp: .050 },                   // outer edge roll
      { kind: 'cove', span: .375, amp: .112, slope: .010 },       // deep scotia
      { kind: 'round', span: .255, amp: .078 },                   // bolection roll
      { kind: 'cove', span: .070, amp: .036, slope: -.020 },      // quirk
      { kind: 'flat', span: .060, step: .020, ramp: 'gilt' },     // gilt slip
      { kind: 'cove', span: .055, amp: .026, step: -.016 },       // step to sight
      { kind: 'flat', span: .070, step: -.085, ink: .36 },        // rabbet
    ],
  },
  'ebonised-black': {
    file: 'EbonisedBlack/ebonised.css',
    ramp: 'ebony', gloss: .26,
    members: [
      { kind: 'flat', span: .240, slope: -.016 },                 // rippled fascia
      { kind: 'round', span: .090, amp: .030 },                   // torus
      { kind: 'cove', span: .170, amp: .082 },                    // deep cove
      { kind: 'round', span: .235, amp: .058 },                   // broad astragal
      { kind: 'cove', span: .100, amp: .044, slope: -.018 },      // hollow
      { kind: 'flat', span: .060, step: .018, ramp: 'gilt' },     // gold lip
      { kind: 'flat', span: .105, step: -.090, ink: .34 },        // rabbet
    ],
  },
  'modern-black': {
    file: 'ModernBlack/modern-black.css',
    ramp: 'ash', gloss: .07, expose: .50,
    members: [
      { kind: 'chamfer', span: .028, amp: .011 },                 // outer arris
      { kind: 'round', span: .752, amp: .014, slope: -.026 },     // satin face
      { kind: 'chamfer', span: .040, amp: .016, step: .005 },     // inner arris
      { kind: 'flat', span: .080, slope: -.006 },                 // inner flat
      { kind: 'cove', span: .030, amp: .014 },                    // quirk
      { kind: 'flat', span: .070, step: -.060, ink: .30 },        // rabbet
    ],
  },
}

/* --- emission ----------------------------------------------------------- */

/** One stop list. `key` is the share of the key light this rail still sees. */
function gradient(section, { key, tolerance }) {
  const { z, owner } = surface(section.members)
  const shade = shading(z, { gloss: section.gloss, key, expose: section.expose ?? MID })
  const colours = []
  for (let i = 0; i < SAMPLES; i++) {
    const member = owner[i]
    const paint = timber[member.ramp ?? section.ramp]
    colours.push(paint(member.ink ? shade[i] * (1 - member.ink) : shade[i]))
  }
  const kept = simplify(colours, tolerance)
  return kept.map(i => {
    const [r, g, b] = colours[i]
    const at = i === 0 ? 0 : i === SAMPLES - 1 ? 100 : Math.round((i + .5) / SAMPLES * 1000) / 10
    return `#${hex(r)}${hex(g)}${hex(b)} ${at}%`
  })
}

/** A 24-bucket luminance read of the section, for eyeballing against a photo. */
const readout = section => {
  const { z, owner } = surface(section.members)
  const shade = shading(z, { gloss: section.gloss, key: KEY, expose: section.expose ?? MID })
  const buckets = []
  for (let b = 0; b < 24; b++) {
    let sum = 0
    const from = Math.floor(b * SAMPLES / 24)
    const to = Math.floor((b + 1) * SAMPLES / 24)
    for (let i = from; i < to; i++) {
      const member = owner[i]
      const [r, g, bl] = timber[member.ramp ?? section.ramp](member.ink ? shade[i] * (1 - member.ink) : shade[i])
      sum += .2126 * r + .7152 * g + .0722 * bl
    }
    buckets.push(Math.round(sum / (to - from)))
  }
  return buckets.join(' ')
}

/** Wraps a stop list at a sensible width, indented under the declaration. */
const wrap = (name, stops) => {
  const lines = []
  let line = ''
  for (const stop of stops) {
    const next = line ? `${line} ${stop},` : `${stop},`
    if (next.length > 74 && line) { lines.push(line); line = `${stop},` } else line = next
  }
  lines.push(line.replace(/,$/, ''))
  return `  --${name}: ${lines.join('\n    ')};`
}

const BEGIN = '  /* generated by scripts/generate-profile.mjs — edit the section there */'
const END = '  /* end generated section */'

for (const section of Object.values(sections)) {
  const path = `src/variants/${section.file}`
  const css = await readFile(path, 'utf8')
  const body = [
    BEGIN,
    wrap('profile', gradient(section, { key: KEY, tolerance: 3.2 })),
    wrap('profile-shadow', gradient(section, { key: KEY * .58, tolerance: 3.2 })),
    END,
  ].join('\n')
  const from = css.indexOf(BEGIN)
  const to = css.indexOf(END)
  if (from < 0 || to < 0) throw new Error(`${path}: missing generated-section markers`)
  const next = css.slice(0, from) + body + css.slice(to + END.length)
  await writeFile(path, next)
  const stops = body.split('%,').length
  console.log(`   ${readout(section)}`)
  console.log(`${path} ${stops} stops, ${body.length} bytes`)
}
