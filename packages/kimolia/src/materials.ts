import { seededRandom } from 'object-studies-core'

/**
 * Slate, oak and chalk dust are drawn once, procedurally and deterministically,
 * into small canvases instead of shipping bitmaps: the published package stays
 * a few kilobytes and the same pixels back the CSS surfaces and the PNG export.
 *
 * Canvas-drawn textures also keep the export readable. Mobile WebKit raises a
 * SecurityError when a canvas containing a filtered SVG is serialised, which is
 * why the materials were baked to PNG before; nothing here is an image source,
 * so the export canvas is never tainted (see src/assets/README.md).
 */
export type Materials = {
  /** Low-frequency mineral mottling, stretched across the slate. */
  clouds: HTMLCanvasElement
  /** Tileable fine grain shared by slate, chalk and felt. */
  grain: HTMLCanvasElement
  /** Chalk that never quite washed off: permanent haze and wipe streaks. */
  residue: HTMLCanvasElement
  /** Custom properties carrying the textures as `url()` values. */
  properties: Record<string, string>
}

const canvasOf = (width: number, height: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

/** Tileable value noise: a wrapped lattice sampled with smoothstep. */
function lattice(cellsX: number, cellsY: number, next: () => number) {
  const values = new Float32Array(cellsX * cellsY)
  for (let i = 0; i < values.length; i++) values[i] = next()
  const at = (i: number, j: number) =>
    values[(((j % cellsY) + cellsY) % cellsY) * cellsX + (((i % cellsX) + cellsX) % cellsX)]
  return (u: number, v: number) => {
    const x = u * cellsX
    const y = v * cellsY
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const sx = (x - x0) * (x - x0) * (3 - 2 * (x - x0))
    const sy = (y - y0) * (y - y0) * (3 - 2 * (y - y0))
    const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx
    const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx
    return top + (bottom - top) * sy
  }
}

function fractalNoise(
  cellsX: number,
  cellsY: number,
  octaves: number,
  next: () => number,
) {
  const layers = Array.from({ length: octaves }, (_, index) =>
    lattice(cellsX << index, cellsY << index, next),
  )
  return (u: number, v: number) => {
    let sum = 0
    let amplitude = 1
    let total = 0
    for (const layer of layers) {
      sum += layer(u, v) * amplitude
      total += amplitude
      amplitude /= 2
    }
    return sum / total
  }
}

function buildClouds() {
  const canvas = canvasOf(320, 200)
  const ctx = canvas.getContext('2d')!
  const noise = fractalNoise(4, 3, 3, seededRandom(0x51a7e))
  const image = ctx.createImageData(canvas.width, canvas.height)
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const value = noise(x / canvas.width, y / canvas.height)
      const grey = Math.round(40 + value * 200)
      const index = (y * canvas.width + x) * 4
      image.data[index] = image.data[index + 1] = image.data[index + 2] = grey
      image.data[index + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
  return canvas
}

function buildGrain() {
  const canvas = canvasOf(96, 96)
  const ctx = canvas.getContext('2d')!
  const next = seededRandom(0x9d0e5)
  const image = ctx.createImageData(canvas.width, canvas.height)
  for (let i = 0; i < image.data.length; i += 4) {
    image.data[i] = image.data[i + 1] = image.data[i + 2] = Math.round(
      70 + next() * 130,
    )
    image.data[i + 3] = Math.round(40 + next() * 185)
  }
  ctx.putImageData(image, 0, 0)
  return canvas
}

/** Soft elliptical haze, the shape chalk dust leaves when it is wiped away. */
function haze(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  colour: string,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(rx, ry)
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  gradient.addColorStop(0, colour)
  gradient.addColorStop(1, 'transparent')
  ctx.fillStyle = gradient
  ctx.fillRect(-1, -1, 2, 2)
  ctx.restore()
}

function buildResidue() {
  const canvas = canvasOf(400, 250)
  const ctx = canvas.getContext('2d')!
  const next = seededRandom(0x2b4c19)
  // Broad clouding first: chalk that was cleaned off years of lessons ago.
  for (let i = 0; i < 6; i++)
    haze(
      ctx,
      (0.08 + next() * 0.84) * canvas.width,
      (0.1 + next() * 0.85) * canvas.height,
      (0.22 + next() * 0.34) * canvas.width,
      (0.14 + next() * 0.26) * canvas.height,
      `rgba(226, 228, 208, ${(0.022 + next() * 0.03).toFixed(3)})`,
    )
  // Then the passes of a duster: shallow arcs of overlapping smudges, never a
  // ruled line. Each blob is faint; where they overlap a band appears.
  for (let pass = 0; pass < 8; pass++) {
    const span = (0.3 + next() * 0.45) * canvas.width
    const from = next() * (canvas.width - span)
    const level = (0.05 + next() * 0.9) * canvas.height
    const bow = (next() - 0.5) * 22
    const thickness = 2.5 + next() * 6
    const blobs = 10 + Math.floor(next() * 10)
    for (let i = 0; i <= blobs; i++) {
      const t = i / blobs
      haze(
        ctx,
        from + span * t,
        level + Math.sin(t * Math.PI) * bow + (next() - 0.5) * 3,
        span / blobs + 6 + next() * 14,
        thickness * (0.6 + next() * 0.8),
        `rgba(233, 233, 214, ${(0.012 + next() * 0.026).toFixed(3)})`,
      )
    }
  }
  return canvas
}

/**
 * Oak, not brushed metal: a handful of wide, wandering fibres with tapered
 * interruptions, a soft cathedral figure and short open pores — never an evenly
 * ruled field of hairlines.
 */
function drawOak(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const next = seededRandom(0x0a4f21)
  const flow = (x: number, y: number) =>
    Math.sin(x / 119) * 0.7 +
    Math.sin(x / 207 + y / 13) * 1.4 +
    Math.exp(-(((x - width * 0.63) / (width * 0.14)) ** 2)) *
      Math.sin(y / 11) *
      2.2

  const fibre = (
    y: number,
    lineWidth: number,
    opacity: number,
    amplitude: number,
    phase: number,
    colour: string,
  ) => {
    let start = -width * 0.1 + next() * width * 0.12
    while (start < width) {
      const end = Math.min(width * 1.02, start + width * (0.1 + next() * 0.45))
      const gradient = ctx.createLinearGradient(start, 0, end, 0)
      gradient.addColorStop(0, 'transparent')
      gradient.addColorStop(0.18, colour)
      gradient.addColorStop(0.76, colour)
      gradient.addColorStop(1, 'transparent')
      ctx.strokeStyle = gradient
      ctx.lineWidth = lineWidth
      ctx.globalAlpha = opacity
      ctx.beginPath()
      for (let x = start; x <= end; x += 7) {
        const py = y + flow(x, y) + Math.sin(x / 41 + phase) * amplitude
        if (x === start) ctx.moveTo(x, py)
        else ctx.lineTo(x, py)
      }
      ctx.stroke()
      start = end + width * (0.02 + next() * 0.09)
    }
  }

  ctx.lineCap = 'round'
  // Soft figure: wide, pale bands that make the timber look quarter-sawn.
  for (let i = 0; i < 5; i++)
    fibre(
      next() * height,
      height * (0.08 + next() * 0.14),
      0.05 + next() * 0.07,
      1.6 + next() * 3,
      next() * 6.28,
      '#2e2116',
    )
  let y = -2
  while (y < height + 2) {
    y += 0.9 + next() ** 1.4 * 3.6
    fibre(
      y,
      0.55 + next() * 1.7,
      0.1 + next() * 0.3,
      0.2 + next() * 1.3,
      next() * 6.28,
      '#33251a',
    )
  }
  // Open pores: short, always along the timber, never across it.
  ctx.lineWidth = 0.9
  ctx.strokeStyle = '#2b2018'
  for (let i = 0; i < 210; i++) {
    const x = next() * width
    const py = next() * height
    ctx.globalAlpha = 0.07 + next() * 0.24
    ctx.beginPath()
    ctx.moveTo(x, py)
    ctx.lineTo(x + 1.5 + next() * 8, py)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

function buildOak(vertical: boolean) {
  const length = 800
  const across = 52
  const canvas = canvasOf(
    vertical ? across : length,
    vertical ? length : across,
  )
  const ctx = canvas.getContext('2d')!
  if (vertical) {
    ctx.translate(across, 0)
    ctx.rotate(Math.PI / 2)
  }
  drawOak(ctx, length, across)
  return canvas
}

function buildRailDust() {
  const canvas = canvasOf(500, 16)
  const ctx = canvas.getContext('2d')!
  const next = seededRandom(0x55f0d)
  ctx.fillStyle = '#eee7ce'
  for (let i = 0; i < 260; i++) {
    ctx.globalAlpha = 0.04 + next() * 0.14
    ctx.beginPath()
    ctx.arc(
      1 + next() * 498,
      3 + next() * 12,
      0.15 + next() * 0.75,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }
  ctx.globalAlpha = 1
  return canvas
}

let cache: Materials | null = null

/**
 * Builds the materials once per document and caches them. Browser only: call it
 * from an effect, never during render.
 */
export function getMaterials(): Materials {
  if (cache) return cache
  const clouds = buildClouds()
  const grain = buildGrain()
  const residue = buildResidue()
  cache = {
    clouds,
    grain,
    residue,
    properties: {
      '--kimolia-clouds-image': `url(${clouds.toDataURL()})`,
      '--kimolia-grain-image': `url(${grain.toDataURL()})`,
      '--kimolia-residue-image': `url(${residue.toDataURL()})`,
      '--kimolia-oak-image': `url(${buildOak(false).toDataURL()})`,
      '--kimolia-oak-vertical-image': `url(${buildOak(true).toDataURL()})`,
      '--kimolia-dust-image': `url(${buildRailDust().toDataURL()})`,
    },
  }
  return cache
}

/** Paints the generated textures onto an element as custom properties. */
export function applyMaterials(element: HTMLElement) {
  for (const [name, value] of Object.entries(getMaterials().properties))
    element.style.setProperty(name, value)
}
