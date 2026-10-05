// Lights a drawing as a surface, the way korniza's carving is modelled rather
// than filled: every leaflet, fruit and stem is a turned shape that catches
// the sun on one side and falls into shade on the other.
//
// A drawing is two layers. The colour layer is an SVG of the object's own
// colours, without any painted shading. The height layer says how the
// surface stands up from the page: a leaflet domes, its midrib and veins are
// sunk into it, a stem is a rounded ridge. From the heights come surface
// normals, and from those the light: diffuse shading from the same upper-left
// sun the bed is lit by, a sheen whose size and strength belong to the
// material (wax on a tomato, matte hair on a cucumber leaf), and the glow of
// sunlight through the thin edge of a leaf. The result is baked to an image.

import { createCanvas, loadImage, Path2D } from '@napi-rs/canvas'

// The sun: from the upper left and in front. x right, y down, z towards you.
const LIGHT = normalize([-0.52, -0.6, 0.6])
const HALF = normalize([LIGHT[0], LIGHT[1], LIGHT[2] + 1])

function normalize([x, y, z]) {
  const n = Math.hypot(x, y, z)
  return [x / n, y / n, z / n]
}

const toLinear = (c) => Math.pow(c / 255, 2.2)
const toSrgb = (c) => Math.round(255 * Math.pow(Math.min(1, Math.max(0, c)), 1 / 2.2))

// mulberry32, the same generator object-studies-core exports as seededRandom.
function rng(seed) {
  let value = seed >>> 0
  return () => {
    value = (value + 0x6d2b79f5) | 0
    let n = Math.imul(value ^ (value >>> 15), 1 | value)
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n)
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296
  }
}

/** A box blur of a field, `r` pixels each side. Twice over is close to a gaussian. */
function boxBlur(src, W, H, r) {
  if (r < 1) return src
  const tmp = new Float32Array(src.length)
  const out = new Float32Array(src.length)
  const span = 2 * r + 1
  for (let y = 0; y < H; y++) {
    let sum = 0
    for (let x = -r; x <= r; x++) sum += src[y * W + Math.min(W - 1, Math.max(0, x))]
    for (let x = 0; x < W; x++) {
      tmp[y * W + x] = sum / span
      sum += src[y * W + Math.min(W - 1, x + r + 1)] - src[y * W + Math.max(0, x - r)]
    }
  }
  for (let x = 0; x < W; x++) {
    let sum = 0
    for (let y = -r; y <= r; y++) sum += tmp[Math.min(H - 1, Math.max(0, y)) * W + x]
    for (let y = 0; y < H; y++) {
      out[y * W + x] = sum / span
      sum += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x]
    }
  }
  return out
}

/** Smooth value noise on a lattice `cell` units apart. */
function valueNoise(seed, cell) {
  const random = rng(seed)
  const size = 64
  const grid = Float32Array.from({ length: size * size }, () => random())
  const at = (i, j) => grid[(((j % size) + size) % size) * size + (((i % size) + size) % size)]
  return (x, y) => {
    const u = x / cell, v = y / cell
    const i = Math.floor(u), j = Math.floor(v)
    const fu = u - i, fv = v - j
    const su = fu * fu * (3 - 2 * fu), sv = fv * fv * (3 - 2 * fv)
    const top = at(i, j) + (at(i + 1, j) - at(i, j)) * su
    const bottom = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * su
    return top + (bottom - top) * sv
  }
}

/**
 * Materials. `bump` scales how strongly the heights tilt the surface; `ambient`
 * is the light that reaches surfaces turned away from the sun; `spec` and
 * `shine` are the sheen's strength and tightness; `rim` is light glowing
 * through thin edges, in `rimColour`.
 */
export const MATERIALS = {
  leaf: { bump: 1, ambient: 0.3, spec: 0.1, shine: 18, rim: 0.12, rimColour: [0.55, 0.75, 0.2] },
  matteLeaf: { bump: 1, ambient: 0.33, spec: 0.04, shine: 10, rim: 0.1, rimColour: [0.6, 0.72, 0.3] },
  glossyLeaf: { bump: 1, ambient: 0.28, spec: 0.38, shine: 34, rim: 0.1, rimColour: [0.5, 0.8, 0.25] },
  velvet: { bump: 1, ambient: 0.36, spec: 0.03, shine: 6, rim: 0.16, rimColour: [0.62, 0.7, 0.42] },
  waxyFruit: { bump: 1, ambient: 0.32, spec: 0.85, shine: 70, rim: 0.05, rimColour: [0.9, 0.4, 0.2] },
  rind: { bump: 1, ambient: 0.36, spec: 0.3, shine: 26, rim: 0, rimColour: [0, 0, 0] },
  petal: { bump: 1, ambient: 0.5, spec: 0.08, shine: 12, rim: 0.35, rimColour: [1, 0.85, 0.3] },
  stem: { bump: 1, ambient: 0.42, spec: 0.12, shine: 16, rim: 0.1, rimColour: [0.5, 0.7, 0.2] },
}

/** A lit drawing as an AVIF image. */
export async function relief({ quality = 12, ...drawing }) {
  return (await litCanvas(drawing)).toBuffer('image/avif', { quality, speed: 2 })
}

/**
 * Renders a lit drawing onto a canvas.
 *
 * `svg(w, h)` gives the colour layer as a full SVG document. `height(api)`
 * builds the height layer with the helpers below, all in drawing units.
 * `mirror` flips both layers, so the sun stays at the upper left on a drawing
 * that faces the other way. `tile` lights a seamless tile as one. `shadow` bakes in the tight shadow the drawing
 * casts on whatever is just behind it, down and to the right of the sun: one
 * leaf over another, a fruit on its leaves. { x, y, blur } in drawing units.
 */
export async function litCanvas({ w, h, scale = 2, mirror = false, svg, height, material, edge = 1.2, shadow = null, tile = false }) {
  const W = Math.round(w * scale), H = Math.round(h * scale)
  const size = W * H

  // The colour layer, which also gives the drawing its edge.
  const colourCanvas = createCanvas(W, H)
  const colourCtx = colourCanvas.getContext('2d')
  // Rasterised at full size, not drawn small and stretched.
  const sized = svg.replace(/width='[\d.]+' height='[\d.]+'/, `width='${W}' height='${H}'`)
  colourCtx.drawImage(await loadImage(Buffer.from(sized)), 0, 0, W, H)
  const colour = colourCtx.getImageData(0, 0, W, H)

  // A layer drawn in drawing units, read back as coverage from 0 to 1.
  const layer = (draw, blur = 0) => {
    const c = createCanvas(W, H)
    const ctx = c.getContext('2d')
    ctx.setTransform(mirror ? -scale : scale, 0, 0, scale, mirror ? W : 0, 0)
    if (blur > 0) ctx.filter = `blur(${(blur * scale).toFixed(2)}px)`
    ctx.fillStyle = '#fff'
    ctx.strokeStyle = '#fff'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    draw(ctx)
    const data = ctx.getImageData(0, 0, W, H).data
    const out = new Float32Array(size)
    for (let i = 0; i < size; i++) out[i] = data[i * 4 + 3] / 255
    return out
  }
  const field = new Float32Array(size)
  const gloss = new Float32Array(size).fill(1)
  const toPath = (d) => (typeof d === 'string' ? new Path2D(d) : d)
  const api = {
    /** A shape that swells towards its middle, `amount` units high, or sinks for a negative `amount`. */
    dome(d, { blur, amount, transform }) {
      const a = layer((ctx) => {
        if (transform) ctx.transform(...transform)
        ctx.fill(toPath(d))
      }, blur)
      // A raised shape stands on what is there; a hollow (negative) is pressed into it.
      for (let i = 0; i < size; i++) {
        const s = a[i] * a[i] * (3 - 2 * a[i])
        field[i] = amount >= 0 ? Math.max(field[i], amount * s) : field[i] + amount * s
      }
    },
    /**
     * An upright cylinder between `left` and `right`, `amount` high at its
     * middle. Worked out exactly rather than blurred, so a broad curve has no
     * steps in it for the light to find.
     */
    cylinder({ left, right, amount, top = -Infinity, bottom = Infinity }) {
      const middle = (left + right) / 2, half = (right - left) / 2
      const from = Math.max(0, Math.round(top * scale)), to = Math.min(H, Math.round(bottom * scale))
      for (let x = 0; x < W; x++) {
        const u = ((mirror ? W - x : x) / scale - middle) / half
        if (Math.abs(u) > 1) continue
        const z = amount * Math.sqrt(1 - u * u)
        for (let y = from; y < to; y++) field[y * W + x] += z
      }
    },
    /** Any surface given as a height at each point, for curves worked out exactly: the rounded nose of a board. */
    surface(heightAt) {
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) field[y * W + x] += heightAt((mirror ? W - x : x) / scale, y / scale)
    },
    /** A rounded ridge along a line: a stem, a rib, a raised vein. */
    ridge(d, { width, blur = width * 0.4, amount, transform }) {
      const a = layer((ctx) => {
        if (transform) ctx.transform(...transform)
        ctx.lineWidth = width
        ctx.stroke(toPath(d))
      }, blur)
      for (let i = 0; i < size; i++) field[i] += amount * a[i]
    },
    /** A sunken line: a midrib or vein pressed into a leaf. */
    groove(d, { width, blur = width * 0.5, amount, transform }) {
      const a = layer((ctx) => {
        if (transform) ctx.transform(...transform)
        ctx.lineWidth = width
        ctx.stroke(toPath(d))
      }, blur)
      for (let i = 0; i < size; i++) field[i] -= amount * a[i]
    },
    /** Round bumps: spines, warts, seeds. Each is [x, y, radius, height]. */
    bumps(list, blur = 0.6) {
      for (const [x, y, r, amount] of list) {
        const a = layer((ctx) => {
          ctx.beginPath()
          ctx.arc(x, y, r, 0, Math.PI * 2)
          ctx.fill()
        }, blur)
        for (let i = 0; i < size; i++) field[i] += amount * a[i]
      }
    },
    /** Part of the drawing without the material's sheen, `value` 0 for none at all. */
    matte(d, { value = 0, blur = 0.4, transform, stroke }) {
      const a = layer((ctx) => {
        if (transform) ctx.transform(...transform)
        if (stroke) {
          ctx.lineWidth = stroke
          ctx.stroke(toPath(d))
        } else ctx.fill(toPath(d))
      }, blur)
      for (let i = 0; i < size; i++) gloss[i] = Math.min(gloss[i], 1 - a[i] * (1 - value))
    },
    /**
     * An SVG drawn at the drawing's size, its coverage used as height (a coat
     * of paint standing proud of the metal under it) and, with `matte`, to
     * take the sheen off where it covers.
     */
    async raster(svgDocument, { amount = 0, matte }) {
      const c = createCanvas(W, H)
      const ctx = c.getContext('2d')
      ctx.drawImage(await loadImage(Buffer.from(svgDocument.replace(/width='[d.]+' height='[d.]+'/, `width='${W}' height='${H}'`))), 0, 0, W, H)
      const data = ctx.getImageData(0, 0, W, H).data
      for (let i = 0; i < size; i++) {
        const a = data[i * 4 + 3] / 255
        field[i] += amount * a
        if (matte !== undefined) gloss[i] = Math.min(gloss[i], 1 - a * (1 - matte))
      }
    },
    /** Fine surface grain, `cell` units across. */
    grain(seed, cell, amount) {
      const n = valueNoise(seed, cell)
      const m = valueNoise(seed + 1, cell * 0.43)
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const ux = (mirror ? W - x : x) / scale, uy = y / scale
          field[y * W + x] += amount * (n(ux, uy) * 0.65 + m(ux, uy) * 0.35 - 0.5)
        }
    },
  }
  await height(api)

  // How far inside the edge each pixel is, for light through thin edges.
  const inside = layer((ctx) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(colourCanvas, 0, 0)
  }, edge)

  // Hollows and the parts tucked under something else get less light: compare
  // each height with the heights around it.
  const around = boxBlur(boxBlur(field, W, H, Math.round(scale * 1.6)), W, H, Math.round(scale * 1.6))

  // The cast shadow's coverage, offset away from the sun.
  let cast = null
  if (shadow) {
    const c = createCanvas(W, H)
    const ctx = c.getContext('2d')
    ctx.filter = `blur(${(shadow.blur * scale).toFixed(2)}px)`
    ctx.drawImage(colourCanvas, shadow.x * scale, shadow.y * scale)
    const data = ctx.getImageData(0, 0, W, H).data
    cast = new Float32Array(size)
    for (let i = 0; i < size; i++) cast[i] = (data[i * 4 + 3] / 255) * (shadow.opacity ?? 0.4)
  }

  const m = { ...MATERIALS.leaf, ...material }
  const out = colourCtx.createImageData(W, H)
  // A seamless tile reads its neighbours across the edge, so the light has no seam either.
  const at = tile
    ? (x, y) => field[((y + H) % H) * W + ((x + W) % W)]
    : (x, y) => field[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))]
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      const alpha = colour.data[i * 4 + 3]
      const behind = cast ? cast[i] * (1 - alpha / 255) : 0
      if (behind > 0) {
        // Shadow under the drawing's own edge: dark, a little warm.
        out.data[i * 4] = 22
        out.data[i * 4 + 1] = 26
        out.data[i * 4 + 2] = 10
        out.data[i * 4 + 3] = Math.round(behind * 255)
      }
      if (alpha === 0) continue
      // Height change per drawing unit.
      const dx = ((at(x + 1, y) - at(x - 1, y)) / 2) * scale * m.bump
      const dy = ((at(x, y + 1) - at(x, y - 1)) / 2) * scale * m.bump
      const [nx, ny, nz] = normalize([-dx, -dy, 1])
      const diffuse = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2])
      // A flat surface keeps its own colour; one turned to the sun is brighter.
      const occlusion = 1 - Math.min(0.45, Math.max(0, around[i] - field[i]) * (m.occlusion ?? 0.35))
      // Capped, so a slope facing the sun brightens without bleaching.
      const shade = Math.min(1.3, m.ambient + (1 - m.ambient) * (diffuse / LIGHT[2])) * occlusion
      const spec = m.spec * gloss[i] * Math.pow(Math.max(0, nx * HALF[0] + ny * HALF[1] + nz * HALF[2]), m.shine)
      const edge = Math.max(0, 1 - inside[i]) * m.rim
      for (let c = 0; c < 3; c++) {
        const base = toLinear(colour.data[i * 4 + c])
        const lit = toSrgb(base * shade + spec + edge * m.rimColour[c] * base * 2)
        // Over the shadow, where the edge is partly transparent.
        const a = alpha / 255
        out.data[i * 4 + c] = behind > 0 ? Math.round((lit * a + out.data[i * 4 + c] * behind) / (a + behind)) : lit
      }
      out.data[i * 4 + 3] = Math.round(Math.min(255, alpha + behind * 255))
    }
  const result = createCanvas(W, H)
  result.getContext('2d').putImageData(out, 0, 0)
  return result
}
