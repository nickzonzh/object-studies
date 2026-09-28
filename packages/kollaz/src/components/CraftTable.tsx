import { type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PaperShapeView } from './PaperShape.js'
import { GooglyEye, bumpGooglyEyes } from './GooglyEye.js'
import { EyePot, GlueStickBody, InkPad, MarkerBody, PipeBundle, PipeInHand, Pom, PomCup, ScissorsBody, SequinTub, ShakerBody, StampBody, TapeRoll } from './CraftObjects.js'
import { createRng } from '../lib/rng.js'
import {
  GLUE_DRY_MS, clearGlue, createGlueField, paintGlue, pourFlakes, settleFlake, tackiness, tipStep, type Flake,
} from '../lib/glitter.js'
import { paintFlakes, paintGlints, paintGlue as paintGlueFilm, paintPompoms, paintSequins, paintSparkles, type GlueStroke, type Sparkle } from '../lib/render.js'
import { dropPompom, isRolling, nudgePompoms, settlePompom, stepPompoms, type Pompom } from '../lib/pompom.js'
import { inkAfterStamp, inkCoverage, stampNoise } from '../lib/stamp.js'
import { createToolMotion, leanToward, type Pose, type ToolAnchor } from '../lib/toolMotion.js'
import { GLITTERS } from '../lib/palette.js'
import { INK, POM_COLORS, STAMP_RADIUS, drawStampDesign, paintChenille, paintMarkerSegment, paintTapeStrip } from '../lib/sprites.js'
import { TAPE_WIDTH, tapeLength, tapeOutline, tapeSamples, type TapeStrip } from '../lib/tape.js'
import { PIPE_LENGTH, PIPE_RADIUS, pathLength, resamplePath, smoothPath, trimToLength } from '../lib/pipe.js'
import { TABLE_HEIGHT, TABLE_WIDTH, drawMat } from '../lib/mat.js'
import { tornOutline, type Point } from '../lib/tornEdge.js'
import {
  SNIP_LENGTH, bounds, cutSheet, fromPoints, inShape, shapeMask, shapePath2D, translateShape, unionOf,
  type PaperShape, type Shape,
} from '../lib/cut.js'
import '../styles.css'

export { TABLE_HEIGHT, TABLE_WIDTH }

const SHEET = { x: 150, y: 48, w: 700, h: 520 }
const GLUE_WIDTH = 24
const MAX_FLAKES = 20000
const MAX_SEQUINS = 800

export const PAPERS = [
  { id: 'cobalt', label: 'Cobalt', color: '#2f4f9e' },
  { id: 'black', label: 'Black', color: '#26262b' },
  { id: 'tomato', label: 'Tomato', color: '#c7433a' },
  { id: 'sunflower', label: 'Sunflower', color: '#e6b23a' },
  { id: 'kraft', label: 'Kraft', color: '#b58958' },
]

type Tool = 'glue' | 'scissors' | 'marker' | 'tape' | 'pipes' | 'eyes' | 'sequins' | 'pompoms' | 'stamp' | `glitter-${number}` | null
type Eye = { id: number; x: number; y: number; size: number }
type Box = { x: number; y: number; width: number; height: number }
/**
 * A piece cut out of the sheet. It carries a snapshot of everything that was on it.
 * Geometry lives in the piece's own frame (where the snapshot was taken); `dx`/`dy`
 * say where it has been moved since. A piece cut again keeps its parent's snapshot.
 */
type Piece = {
  id: number
  shape: PaperShape
  box: Box
  artBox: Box
  dx: number
  dy: number
  color: string
  art: string
  eyes: Eye[]
  glued: boolean
  falling: boolean
}
type Cut = { shape: Shape; path: Path2D }
/** A pipe cleaner: a bent chenille stem, painted once and moved as a whole. */
type Pipe = { id: number; points: Point[]; box: Box; art: string; dx: number; dy: number; color: number; glued: boolean; falling: boolean }
/** A texta line, drawn into the paper like a stamp print. */
type Mark = { points: Point[]; epoch: number; seq: number }
/** Tape lives in the same layer as ink, in the order things happened. */
type LaidTape = TapeStrip & { epoch: number; seq: number }
const padBox = (shape: Shape): Box => {
  const b = bounds(shape)
  return { x: b.x - 2, y: b.y - 2, width: b.width + 4, height: b.height + 4 }
}

const TABLE_BOX: Box = { x: 0, y: 0, width: TABLE_WIDTH, height: TABLE_HEIGHT }

/** The fresh sheet: torn on every side, in table units. */
function freshSheet(seed: number): PaperShape {
  const { outer, inner } = tornOutline(SHEET.w, SHEET.h, seed, undefined, 11)
  const place = (points: Point[]) => fromPoints(points.map((p) => ({ x: p.x + SHEET.x, y: p.y + SHEET.y })))
  return { outer: place(outer), inner: place(inner) }
}
type GluePoint = { x: number; y: number; t: number }

/** Glue strokes keep their path, extended point by point, so nothing is rebuilt per frame. */
let strokeSeed = 0
function makeStroke(points: GluePoint[]): GlueStroke {
  const path = new Path2D()
  path.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) path.lineTo(points[i].x, points[i].y)
  return { points, path, seed: strokeSeed++, epoch: 0, order: 0 }
}
type Print = { x: number; y: number; angle: number; level: number; seed: number; epoch: number; seq?: number }

const EYE_SIZES = [44, 36, 50, 40]

// Where each in-hand body's working tip sits, so it lands exactly on the pointer.
const GLUE_ANCHOR: ToolAnchor = { tipX: 0, tipY: 14, width: 106, height: 28 }
const SHAKER_ANCHOR: ToolAnchor = { tipX: 0, tipY: 14, width: 90, height: 28 }
const ANCHORS: Record<string, ToolAnchor> = {
  glue: GLUE_ANCHOR,
  'glitter-0': SHAKER_ANCHOR,
  'glitter-1': SHAKER_ANCHOR,
  'glitter-2': SHAKER_ANCHOR,
  'glitter-3': SHAKER_ANCHOR,
  sequins: { tipX: 23, tipY: 23, width: 46, height: 46, rest: 'center' },
  eyes: { tipX: 20, tipY: 20, width: 40, height: 40, rest: 'center', restScale: 0.42, keepSlot: true },
  pompoms: { tipX: 17, tipY: 17, width: 34, height: 34, rest: 'center', restScale: 0.5, keepSlot: true },
  stamp: { tipX: 31, tipY: 31, width: 62, height: 62, rest: 'center' },
  marker: { tipX: 0, tipY: 9, width: 108, height: 18 },
  tape: { tipX: 25, tipY: 25, width: 50, height: 50, rest: 'center' },
  pipes: { tipX: 0, tipY: 5, width: 70, height: 10, rest: 'center', restScale: 0.7, keepSlot: true },
  // The cut happens where the blades meet, just behind the rounded tips.
  scissors: { tipX: 6, tipY: 28, width: 130, height: 56, rest: 'center' },
}
// Resting wrist angle, and how each tool leans as it travels: [base, offset, min, max].
const leanFor = (tool: string): [number, number, number, number] => {
  if (tool === 'glue' || tool === 'marker' || tool === 'pipes') return [-38, 42, -62, -20]
  if (tool === 'scissors') return [30, 0, 0, 0]
  if (tool.startsWith('glitter')) return [-55, 58, -76, -36]
  return [0, 0, 0, 0]
}

const toolHint = (tool: Tool, ink: number) => {
  if (tool === 'glue') return 'Draw with the glue. It goes on purple and dries clear in about 15 seconds.'
  if (tool === 'eyes') return 'Tap to stick an eye down. Tap the pot to put it back.'
  if (tool === 'scissors') return 'Cut all the way round a shape to lift it out, or cut from one edge to the other to split the sheet.'
  if (tool === 'marker') return 'Draw with the texta. It is permanent, so it goes wherever the paper goes.'
  if (tool === 'tape') return 'Drag to lay a strip of masking tape. Tape over a cut-out piece or a pipe cleaner holds it down.'
  if (tool === 'pipes') return 'Draw a path and a pipe cleaner bends along it, up to about 15 cm. Drag it, glue it or tape it down.'
  if (tool === 'sequins') return 'Hold down to sprinkle sequins. Like glitter, they only stick to purple glue.'
  if (tool === 'pompoms') return 'Tap to drop a pom pom. Pressed into purple glue it stays put. Anywhere else it rolls.'
  if (tool === 'stamp') {
    return ink > 0
      ? 'Stamp the paper. Each print uses a little ink, so they fade as you go.'
      : 'Press the stamp on the ink pad first.'
  }
  if (tool?.startsWith('glitter')) return 'Hold down to shake. Glitter only sticks where the glue is still purple.'
  return 'Pick something up from the caddy. Drag the eyes, cut-out pieces and pipe cleaners around, or tap the mat to give it a knock.'
}

/**
 * Print one stamp impression into the ink layer. `k` is canvas px per table unit.
 * Real prints pool ink along the edges of the raised design, go mottled in the middle
 * of solid areas, and often pick up a faint arc from the edge of the rubber itself.
 */
function printStamp(ctx: CanvasRenderingContext2D, k: number, print: Print) {
  const size = Math.ceil(STAMP_RADIUS * 2.2 * k) + 4
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const g = canvas.getContext('2d')!
  const c = size / 2
  const radius = STAMP_RADIUS * k
  drawStampDesign(g, c, c, radius, '#ffffff')
  // Ghost of the rubber die's edge, printed only where the stamp was pressed hardest.
  const rng = createRng(print.seed)
  const start = rng() * Math.PI * 2
  g.strokeStyle = 'rgba(255, 255, 255, 0.45)'
  g.lineWidth = radius * 0.035
  g.beginPath(); g.arc(c, c, radius * 1.05, start, start + Math.PI * (0.25 + rng() * 0.45)); g.stroke()

  // Edge map: the design minus a blurred copy of itself is strongest just inside edges.
  const blurred = document.createElement('canvas')
  blurred.width = size
  blurred.height = size
  const b = blurred.getContext('2d')!
  b.filter = `blur(${Math.max(1, radius * 0.035)}px)`
  b.drawImage(canvas, 0, 0)
  const soft = b.getImageData(0, 0, size, size).data

  const image = g.getImageData(0, 0, size, size)
  const noise = stampNoise(print.seed)
  const [r, gr, bl] = INK.rgb
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const a = image.data[i + 3]
      if (!a) continue
      const edge = Math.max(0, (a - soft[i + 3]) / 255)
      image.data[i] = r
      image.data[i + 1] = gr
      image.data[i + 2] = bl
      image.data[i + 3] = a * Math.min(1, inkCoverage(print.level, noise(x / size, y / size) + edge * 0.4) * (0.82 + edge * 0.5))
    }
  }
  g.putImageData(image, 0, 0)
  ctx.save()
  ctx.translate(print.x * k, print.y * k)
  ctx.rotate(print.angle)
  ctx.globalAlpha = 0.94
  ctx.drawImage(canvas, -c, -c)
  ctx.restore()
}

/** Redraw a texta line into the ink layer (after a resize). */
function replayMark(ctx: CanvasRenderingContext2D, k: number, mark: Mark) {
  const pts = mark.points
  paintMarkerSegment(ctx, k, pts[0], pts[0])
  for (let i = 1; i < pts.length; i++) paintMarkerSegment(ctx, k, pts[i - 1], pts[i])
}

/** Punch a cut out of a canvas layer. */
function eraseCut(ctx: CanvasRenderingContext2D, k: number, cut: Cut) {
  ctx.save()
  ctx.setTransform(k, 0, 0, k, 0, 0)
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fill(cut.path)
  ctx.restore()
}

/** A piece's snapshot, shaped to the piece so nothing spills past its cut edge. */
function PieceArt({ piece }: { piece: Piece }) {
  const mask = useMemo(() => shapeMask(piece.shape.outer, piece.box), [piece.shape, piece.box])
  const { box, artBox } = piece
  return (
    <div className="kollaz-piece__art" style={{ maskImage: mask, WebkitMaskImage: mask }}>
      <div
        className="kollaz-piece__snapshot"
        style={{
          left: `${((artBox.x - box.x) / box.width) * 100}%`,
          top: `${((artBox.y - box.y) / box.height) * 100}%`,
          width: `${(artBox.width / box.width) * 100}%`,
          height: `${(artBox.height / box.height) * 100}%`,
          backgroundImage: `url(${piece.art})`,
        }}
      />
    </div>
  )
}

export function CraftTable() {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const matRef = useRef<HTMLCanvasElement>(null)
  const inkRef = useRef<HTMLCanvasElement>(null)
  const fxRef = useRef<HTMLCanvasElement>(null)
  const glowRef = useRef<HTMLSpanElement>(null)
  const baseRef = useRef<HTMLCanvasElement | null>(null)
  const rectRef = useRef<DOMRect | null>(null)
  const scaleRef = useRef(1)
  const rootRef = useRef<HTMLElement>(null)
  const motionRef = useRef<ReturnType<typeof createToolMotion> | null>(null)
  const angleRef = useRef(-38)
  const previousPointerRef = useRef<{ x: number; y: number } | null>(null)
  const pendingToolRef = useRef<[string, Pose, boolean] | null>(null)
  const noticeTimer = useRef(0)

  const [tool, setTool] = useState<Tool>(null)
  const toolRef = useRef<Tool>(null)
  const [sheet, setSheet] = useState(() => ({ color: PAPERS[0].color, seed: 4, shape: freshSheet(4) }))
  const sheetRef = useRef(sheet)
  sheetRef.current = sheet
  const [pieces, setPieces] = useState<Piece[]>([])
  const [pipes, setPipes] = useState<Pipe[]>([])
  const pipesRef = useRef(pipes)
  pipesRef.current = pipes
  const [nextPipe, setNextPipe] = useState(4)
  const tapePreviewRef = useRef<HTMLDivElement>(null)
  const piecesRef = useRef(pieces)
  piecesRef.current = pieces
  const [eyes, setEyes] = useState<Eye[]>([])
  const [scale, setScale] = useState(1)
  const [hasLoose, setHasLoose] = useState(false)
  const [tipping, setTipping] = useState(false)
  const [ink, setInk] = useState(0)
  const [padPressed, setPadPressed] = useState(false)
  const [nextPom, setNextPom] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)

  const sim = useRef({
    field: createGlueField(TABLE_WIDTH, TABLE_HEIGHT),
    glue: [] as GlueStroke[],
    flakes: [] as Flake[],
    pending: [] as Flake[],
    sequins: [] as Flake[],
    pendingSequins: [] as Flake[],
    poms: [] as Pompom[],
    prints: [] as Print[],
    // Holes cut in the sheet, oldest first. Glue and prints made before a cut are clipped by it.
    cuts: [] as Cut[],
    slits: [] as Path2D[],
    cutting: null as Point[] | null,
    marks: [] as Mark[],
    tapes: [] as LaidTape[],
    // Everything in the ink layer (prints, texta, tape) is replayed in this order.
    seq: 10,
    marking: null as Mark | null,
    taping: null as Point | null,
    piping: null as Point[] | null,
    nextPipe: 4,
    pipeId: 0,
    sheetPath: null as Path2D | null,
    // Stacking order shared by glue strokes and pieces, and each piece's footprint on the table.
    order: 0,
    covers: [] as { id: number; order: number; shape: Shape }[],
    clipCache: new Map<string, Path2D | null>(),
    snipTravel: 0,
    pieceId: 0,
    ink: 0,
    nextPom: 0,
    pomId: 0,
    rng: createRng(20260927),
    light: null as { x: number; y: number } | null,
    pointer: { x: 0, y: 0, speed: 0 },
    drawing: false,
    pouring: false,
    tipUntil: 0,
    dirty: true,
    eyeCount: 0,
    seeded: false,
    // Resting glitter is painted once into a cached layer; see the render loop.
    baseCount: 0,
    baseStale: true,
    visible: true,
  })

  useEffect(() => { toolRef.current = tool }, [tool])
  // Slits and live cuts only show on paper, so keep the sheet's outline handy for clipping.
  useEffect(() => {
    sim.current.sheetPath = shapePath2D(sheet.shape.outer)
    sim.current.dirty = true
  }, [sheet.shape])

  // The mat's position is cached and only re-measured after a scroll, resize or tilt,
  // so pointer moves never force a layout.
  const matRect = useCallback(() => {
    if (!rectRef.current) rectRef.current = surfaceRef.current!.getBoundingClientRect()
    return rectRef.current
  }, [])
  useEffect(() => {
    const invalidate = () => { rectRef.current = null }
    window.addEventListener('scroll', invalidate, { passive: true, capture: true })
    window.addEventListener('resize', invalidate, { passive: true })
    return () => {
      window.removeEventListener('scroll', invalidate, { capture: true })
      window.removeEventListener('resize', invalidate)
    }
  }, [])

  const toLogical = useCallback((clientX: number, clientY: number) => {
    const rect = matRect()
    return {
      x: ((clientX - rect.left) / rect.width) * TABLE_WIDTH,
      y: ((clientY - rect.top) / rect.height) * TABLE_HEIGHT,
    }
  }, [matRect])

  const inkScale = () => inkRef.current!.width / TABLE_WIDTH
  const redrawPrints = useCallback(() => {
    const canvas = inkRef.current!
    const ctx = canvas.getContext('2d')!
    const s = sim.current
    const k = canvas.width / TABLE_WIDTH
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    // Replay prints and cuts in order, so a cut only removes the ink that was there before it.
    // One layer, one timeline: prints, texta and tape in the order they were made,
    // with each cut applied just before the first thing made after it.
    const items = [
      ...s.prints.map((print, i) => ({ seq: print.seq ?? i, epoch: print.epoch, draw: () => printStamp(ctx, k, print) })),
      ...s.marks.map((mark) => ({ seq: mark.seq, epoch: mark.epoch, draw: () => replayMark(ctx, k, mark) })),
      ...s.tapes.map((tape) => ({ seq: tape.seq, epoch: tape.epoch, draw: () => paintTapeStrip(ctx, k, tape, tapeOutline(tapeLength(tape), TAPE_WIDTH, tape.seed), TAPE_WIDTH) })),
    ].sort((a, b) => a.seq - b.seq)
    let erased = 0
    for (const item of items) {
      while (erased < item.epoch && erased < s.cuts.length) eraseCut(ctx, k, s.cuts[erased++])
      item.draw()
    }
    while (erased < s.cuts.length) eraseCut(ctx, k, s.cuts[erased++])
  }, [])

  /**
   * Where a glue stroke may show: everywhere except holes cut after it was laid and
   * pieces placed on top of it since. Cached until a cut or a piece changes.
   */
  const clipFor = useCallback((stroke: GlueStroke) => {
    const s = sim.current
    const covers = s.covers.filter((c) => c.order > stroke.order)
    if (stroke.epoch >= s.cuts.length && !covers.length) return null
    const key = `${stroke.epoch}:${covers.map((c) => c.id).join(',')}`
    let clip = s.clipCache.get(key)
    if (clip === undefined) {
      // Merged first: a piece lying on its own hole must not cancel the hole out.
      const hidden = unionOf([...s.cuts.slice(stroke.epoch).map((c) => c.shape), ...covers.map((c) => c.shape)])
      clip = new Path2D()
      clip.rect(-100, -100, TABLE_WIDTH + 200, TABLE_HEIGHT + 200)
      clip.addPath(shapePath2D(hidden))
      s.clipCache.set(key, clip)
    }
    return clip
  }, [])

  /** Record where a piece now lies, on top of everything laid before it. */
  const coverWith = (piece: Piece, dx: number, dy: number) => {
    const s = sim.current
    const shape = translateShape(piece.shape.outer, dx, dy)
    s.covers = [...s.covers.filter((c) => c.id !== piece.id), { id: piece.id, order: ++s.order, shape }]
    s.clipCache.clear()
    s.dirty = true
  }
  const uncover = (ids: number[]) => {
    const s = sim.current
    s.covers = s.covers.filter((c) => !ids.includes(c.id))
    s.clipCache.clear()
    s.dirty = true
  }

  const say = (message: string) => {
    setNotice(message)
    window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), 2600)
  }

  // A finished sample so the table never opens empty: a glittered star with eyes and
  // pom pom points, a club stamp, loose bits to tip off, and fresh glue drying live.
  const seedSample = useCallback(() => {
    const s = sim.current
    if (s.seeded) return
    s.seeded = true
    const now = performance.now()
    const dried = now - GLUE_DRY_MS - 1
    const cx = 395
    const cy = 318
    const star: GluePoint[] = []
    for (let i = 0; i <= 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5
      const r = i % 2 === 0 ? 150 : 64
      star.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, t: dried })
    }
    s.glue.push(makeStroke(star))
    for (let i = 1; i < star.length; i++) {
      const a = star[i - 1]
      const b = star[i]
      paintGlue(s.field, a.x, a.y, b.x, b.y, GLUE_WIDTH / 2, dried)
      const length = Math.hypot(b.x - a.x, b.y - a.y)
      for (let k = 0; k < length * 13; k++) {
        const t = s.rng()
        const ang = s.rng() * Math.PI * 2
        const rad = Math.sqrt(s.rng()) * (GLUE_WIDTH / 2 - 0.5)
        const [flake] = pourFlakes(s.rng, a.x + (b.x - a.x) * t + Math.cos(ang) * rad, a.y + (b.y - a.y) * t + Math.sin(ang) * rad, 1, 0, dried, 0)
        flake.stuck = true
        s.flakes.push(flake)
      }
    }
    // Pom poms glued to the two lower points of the star.
    for (const [i, color] of [[4, 5], [6, 3]] as const) {
      const p = dropPompom(s.rng, ++s.pomId, star[i].x, star[i].y, color, 15)
      p.stuck = true
      p.vx = 0
      p.vy = 0
      s.poms.push(p)
    }
    for (const [x, y, color] of [[575, 505, 2], [612, 520, 0], [560, 540, 4]] as const) {
      const p = dropPompom(s.rng, ++s.pomId, x, y, color, 12 + s.rng() * 3)
      p.vx = 0
      p.vy = 0
      s.poms.push(p)
    }
    for (const [x, y, color, count, spread] of [[655, 470, 1, 520, 50], [705, 190, 2, 220, 42], [290, 530, 1, 160, 34]] as const) {
      for (const f of pourFlakes(s.rng, x, y, count, color, dried, spread)) { f.stuck = false; s.flakes.push(f) }
    }
    for (const q of pourFlakes(s.rng, 250, 160, 26, 0, dried, 30, 9, 4)) { q.stuck = false; s.sequins.push(q) }
    s.prints.push({ x: 770, y: 118, angle: -0.14, level: 1, seed: 11, epoch: 0 }, { x: 700, y: 520, angle: 0.2, level: 0.34, seed: 12, epoch: 0 })
    const wave: GluePoint[] = []
    for (let i = 0; i <= 40; i++) {
      const x = 590 + i * 5.5
      const y = 330 + Math.sin(i / 4.2) * 26
      wave.push({ x, y, t: now })
      if (i) paintGlue(s.field, wave[i - 1].x, wave[i - 1].y, x, y, GLUE_WIDTH / 2, now)
    }
    s.glue.push(makeStroke(wave))
    s.eyeCount = 2
    setEyes([{ id: 1, x: cx - 26, y: cy - 14, size: 42 }, { id: 2, x: cx + 26, y: cy - 16, size: 50 }])
    setHasLoose(true)
    s.nextPom = 1
    setNextPom(1)
    s.dirty = true
  }, [])

  // Size canvases to the surface and keep them sharp.
  useEffect(() => {
    const surface = surfaceRef.current!
    const motion = createToolMotion(rootRef.current!, ANCHORS)
    motionRef.current = motion
    seedSample()
    if (!baseRef.current) baseRef.current = document.createElement('canvas')
    const resize = () => {
      motion.dockAll(false)
      rectRef.current = null
      const rect = surface.getBoundingClientRect()
      scaleRef.current = rect.width / TABLE_WIDTH
      setScale(rect.width / TABLE_WIDTH)
      drawMat(matRef.current!)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      for (const canvas of [fxRef.current!, inkRef.current!, baseRef.current!]) {
        canvas.width = Math.round(rect.width * dpr)
        canvas.height = Math.round(rect.height * dpr)
      }
      redrawPrints()
      sim.current.baseStale = true
      sim.current.dirty = true
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(surface)
    return () => { observer.disconnect(); motion.destroy() }
  }, [seedSample, redrawPrints])

  // The render loop. Resting glitter lives in a cached layer that is only extended
  // as flakes land; each frame redraws glue, the cached layer, the handful of flakes
  // catching the light, sequins and pom poms. Idle shimmer runs at 30 fps and the
  // loop stops drawing entirely while the mat is scrolled out of view.
  useEffect(() => {
    const canvas = fxRef.current!
    const ctx = canvas.getContext('2d')!
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let last = performance.now()
    let lastDraw = 0
    let looseCheck = 0
    let wasTilting = false
    const observer = new IntersectionObserver(([entry]) => {
      sim.current.visible = entry.isIntersecting
      sim.current.dirty = true
    })
    observer.observe(surfaceRef.current!)

    const land = (pending: Flake[], into: Flake[], now: number) => {
      const still: Flake[] = []
      for (const f of pending) {
        if (f.landAt <= now) { settleFlake(f, sim.current.field); into.push(f) } else still.push(f)
      }
      return still
    }

    const render = (now: number) => {
      frame = requestAnimationFrame(render)
      const s = sim.current
      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now

      // Commit the held tool's pose in the same frame as fresh glue and glitter.
      if (pendingToolRef.current) { motionRef.current?.move(...pendingToolRef.current); pendingToolRef.current = null }

      const t = toolRef.current
      if (s.pouring && t?.startsWith('glitter')) {
        const color = Number(t.split('-')[1])
        const count = Math.round(5 + Math.min(s.pointer.speed, 1600) * 0.016)
        s.pending.push(...pourFlakes(s.rng, s.pointer.x, s.pointer.y + 4, count, color, now, 16))
        s.pointer.speed *= 0.8
      }
      if (s.pouring && t === 'sequins' && s.rng() < 0.4 + Math.min(s.pointer.speed, 1200) * 0.0005) {
        s.pendingSequins.push(...pourFlakes(s.rng, s.pointer.x, s.pointer.y + 3, 1, 0, now, 18, 9, 4))
        s.pointer.speed *= 0.85
      }
      if (s.pending.length) {
        s.pending = land(s.pending, s.flakes, now)
        if (s.flakes.length > MAX_FLAKES) {
          // Drop the oldest loose glitter first, like it fell on the floor.
          const excess = s.flakes.length - MAX_FLAKES
          let removed = 0
          s.flakes = s.flakes.filter((f) => f.stuck || removed++ >= excess)
          s.baseStale = true
        }
        s.dirty = true
      }
      if (s.pendingSequins.length) {
        s.pendingSequins = land(s.pendingSequins, s.sequins, now)
        if (s.sequins.length > MAX_SEQUINS) s.sequins.splice(Math.max(0, s.sequins.findIndex((q) => !q.stuck)), 1)
        s.dirty = true
      }
      const tilting = s.tipUntil > now
      if (tilting !== wasTilting) { s.baseStale = true; rectRef.current = null }
      wasTilting = tilting
      if (tilting) {
        s.flakes = tipStep(s.flakes, dt, TABLE_HEIGHT, s.rng)
        s.sequins = tipStep(s.sequins, dt, TABLE_HEIGHT, s.rng)
        s.dirty = true
      }
      if (tilting || isRolling(s.poms)) {
        s.poms = stepPompoms(s.poms, dt, { width: TABLE_WIDTH, height: TABLE_HEIGHT }, tilting ? 1700 : 0)
        s.dirty = true
      }
      if (!s.visible) return

      const wet = s.glue.some((g) => now - g.points[g.points.length - 1].t < GLUE_DRY_MS)
      const twinkle = !reduced && !s.light && (s.flakes.length > 0 || s.sequins.length > 0)
      if (!s.dirty && !wet && !twinkle) return
      // Drying glue and idle shimmer are slow changes. 30 fps is plenty.
      if (!s.dirty && now - lastDraw < 33) return
      s.dirty = false
      lastDraw = now

      if (now - looseCheck > 250) {
        looseCheck = now
        const loose = s.flakes.some((f) => !f.stuck) || s.sequins.some((q) => !q.stuck) || s.poms.some((p) => !p.stuck)
          || piecesRef.current.some((p) => !p.glued) || pipesRef.current.some((p) => !p.glued)
        setHasLoose((v) => (v === loose ? v : loose))
      }

      const k = canvas.width / TABLE_WIDTH
      const base = baseRef.current!
      const baseCtx = base.getContext('2d')!
      if (s.baseStale) {
        baseCtx.setTransform(1, 0, 0, 1, 0, 0)
        baseCtx.clearRect(0, 0, base.width, base.height)
        baseCtx.setTransform(k, 0, 0, k, 0, 0)
        // While the mat tilts, loose flakes are moving, so only glued ones are cached.
        paintFlakes(baseCtx, s.flakes, 0, tilting ? (f) => f.stuck : undefined)
        s.baseCount = s.flakes.length
        s.baseStale = false
      } else if (s.baseCount < s.flakes.length) {
        baseCtx.setTransform(k, 0, 0, k, 0, 0)
        paintFlakes(baseCtx, s.flakes, s.baseCount)
        s.baseCount = s.flakes.length
      }

      ctx.setTransform(k, 0, 0, k, 0, 0)
      ctx.clearRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      const light = s.light
        ? { x: s.light.x, y: s.light.y, z: 220 }
        : { x: TABLE_WIDTH * 0.45 + Math.cos(now / 2600) * 260, y: TABLE_HEIGHT * 0.4 + Math.sin(now / 3100) * 180, z: 380 }

      paintGlueFilm(ctx, s.glue, now, light, GLUE_WIDTH, clipFor)

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.drawImage(base, 0, 0)
      ctx.setTransform(k, 0, 0, k, 0, 0)
      if (tilting) paintFlakes(ctx, s.flakes, 0, (f) => !f.stuck)

      const sparkles: Sparkle[] = []
      paintGlints(ctx, s.flakes, light, sparkles)
      paintSequins(ctx, s.sequins, light, sparkles)
      // Sparkles first: a pom pom sitting on glitter hides its glints.
      paintSparkles(ctx, sparkles)
      paintPompoms(ctx, s.poms)

      // A pipe cleaner being bent into shape: a soft fuzzy stroke until it is let go.
      if (s.piping && s.piping.length > 1) {
        const pts = smoothPath(s.piping, 2)
        const color = POM_COLORS[s.nextPipe]
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        const path = new Path2D()
        path.moveTo(pts[0].x, pts[0].y)
        for (const p of pts) path.lineTo(p.x, p.y)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'
        ctx.lineWidth = PIPE_RADIUS * 2
        ctx.save(); ctx.translate(1.5, 3); ctx.stroke(path); ctx.restore()
        ctx.globalAlpha = 0.55
        ctx.strokeStyle = color
        ctx.lineWidth = PIPE_RADIUS * 2.1
        ctx.stroke(path)
        ctx.globalAlpha = 1
        ctx.lineWidth = PIPE_RADIUS * 1.5
        ctx.stroke(path)
      }

      // Slits and the cut in progress: a hairline gap, dark below and caught by light above.
      if ((s.slits.length || s.cutting) && s.sheetPath) {
        ctx.save()
        ctx.clip(s.sheetPath, 'evenodd')
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        const live = s.cutting && s.cutting.length > 1 ? (() => {
          const path = new Path2D()
          path.moveTo(s.cutting[0].x, s.cutting[0].y)
          for (const p of s.cutting) path.lineTo(p.x, p.y)
          return path
        })() : null
        for (const path of live ? [...s.slits, live] : s.slits) {
          ctx.strokeStyle = 'rgba(10, 16, 14, 0.55)'
          ctx.lineWidth = 1.3
          ctx.stroke(path)
          ctx.save()
          ctx.translate(-0.6, -0.8)
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)'
          ctx.lineWidth = 0.7
          ctx.stroke(path)
          ctx.restore()
        }
        ctx.restore()
      }
    }
    frame = requestAnimationFrame(render)
    return () => { cancelAnimationFrame(frame); observer.disconnect() }
  }, [clipFor])

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      motionRef.current?.dockAll()
      setTool(null)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  const toolScale = () => Math.max(0.72, Math.min(1.05, scaleRef.current * 1.1))

  // Same model as Aspro: the tool leans with travel, and while working its pose is
  // held until the render frame so tool and ink move together.
  const updateTool = (clientX: number, clientY: number, working: boolean, pickup = true) => {
    const id = toolRef.current
    if (!id) return
    const previous = previousPointerRef.current
    const [, offset, min, max] = leanFor(id)
    if (previous && min !== max) {
      angleRef.current = leanToward(angleRef.current, clientX - previous.x, clientY - previous.y, offset, min, max)
    }
    if (id === 'scissors' && previous && working) {
      // Blades point along the cut, turning the short way round.
      const dx = clientX - previous.x
      const dy = clientY - previous.y
      const travel = Math.hypot(dx, dy)
      if (travel > 1.2) {
        const target = (Math.atan2(dy, dx) * 180) / Math.PI + 180
        const diff = ((((target - angleRef.current) % 360) + 540) % 360) - 180
        angleRef.current += diff * 0.22
      }
      // Blades close over one snip's length, then spring open for the next.
      const s = sim.current
      s.snipTravel += travel / Math.max(0.3, scaleRef.current)
      const phase = (s.snipTravel % SNIP_LENGTH) / SNIP_LENGTH
      scissorsFlight()?.style.setProperty('--open', `${(15 * (1 - phase)).toFixed(1)}deg`)
    }
    previousPointerRef.current = { x: clientX, y: clientY }
    const pose: Pose = { x: clientX, y: clientY, angle: angleRef.current, scale: toolScale() * (working ? 0.97 : 1) }
    if (working) pendingToolRef.current = [id, pose, true]
    else {
      pendingToolRef.current = null
      motionRef.current?.move(id, pose, false, pickup)
    }
  }

  const scissorsFlight = () => rootRef.current?.querySelector<HTMLElement>('[data-kollaz-flight="scissors"] .kollaz-scissors') ?? null

  /** A quick press and release, for tools that act once per tap. */
  const tap = (clientX: number, clientY: number) => {
    updateTool(clientX, clientY, true)
    window.setTimeout(() => updateTool(clientX, clientY, false), 140)
  }

  const selectTool = (next: Exclude<Tool, null>, event: ReactMouseEvent<HTMLButtonElement>) => {
    const old = toolRef.current
    if (old) motionRef.current?.dock(old, event.detail !== 0)
    const chosen = old === next ? null : next
    toolRef.current = chosen
    setTool(chosen)
    setNotice(null)
    sim.current.pouring = false
    previousPointerRef.current = null
    if (chosen) angleRef.current = leanFor(chosen)[0]
    if (chosen && event.detail !== 0) updateTool(event.clientX, event.clientY, false)
  }

  const inkStamp = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (toolRef.current !== 'stamp') { say('Pick up the stamp, then press it on the ink pad.'); return }
    sim.current.ink = 1
    setInk(1)
    setNotice(null)
    setPadPressed(true)
    window.setTimeout(() => setPadPressed(false), 500)
    if (event.detail !== 0) tap(event.clientX, event.clientY)
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const s = sim.current
    const p = toLogical(event.clientX, event.clientY)
    s.pointer = { x: p.x, y: p.y, speed: 0 }
    const t = toolRef.current
    if (!t) {
      bumpGooglyEyes(1.2)
      nudgePompoms(s.poms, s.rng, 1.4)
      return
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    updateTool(event.clientX, event.clientY, true)
    if (t === 'marker') {
      const mark: Mark = { points: [p], epoch: s.cuts.length, seq: ++s.seq }
      s.marks.push(mark)
      s.marking = mark
      paintMarkerSegment(inkRef.current!.getContext('2d')!, inkScale(), p, p)
    } else if (t === 'tape') {
      s.taping = p
      showTapePreview(p, p)
    } else if (t === 'pipes') {
      s.piping = [p]
      s.dirty = true
    } else if (t === 'scissors') {
      s.cutting = [p]
      s.snipTravel = 0
      s.dirty = true
    } else if (t === 'glue') {
      const now = performance.now()
      s.drawing = true
      const stroke = makeStroke([{ ...p, t: now }, { x: p.x + 0.1, y: p.y, t: now }])
      stroke.epoch = s.cuts.length
      stroke.order = ++s.order
      s.glue.push(stroke)
      paintGlue(s.field, p.x, p.y, p.x, p.y, GLUE_WIDTH / 2, now)
      s.dirty = true
    } else if (t === 'eyes') {
      const size = EYE_SIZES[s.eyeCount++ % EYE_SIZES.length]
      setEyes((list) => [...list, { id: Date.now(), x: p.x, y: p.y, size }])
    } else if (t === 'pompoms') {
      const pom = dropPompom(s.rng, ++s.pomId, p.x, p.y, s.nextPom, 11 + s.rng() * 6)
      settlePompom(pom, s.field, performance.now())
      s.poms.push(pom)
      let next = s.nextPom
      while (next === s.nextPom) next = Math.floor(s.rng() * POM_COLORS.length)
      s.nextPom = next
      setNextPom(next)
      s.dirty = true
    } else if (t === 'stamp') {
      if (s.ink <= 0) { say('The stamp is dry. Press it on the ink pad.'); return }
      const print: Print = { x: p.x, y: p.y, angle: (s.rng() - 0.5) * 0.2, level: s.ink, seed: Math.floor(s.rng() * 1e6), epoch: s.cuts.length, seq: ++s.seq }
      s.prints.push(print)
      printStamp(inkRef.current!.getContext('2d')!, inkScale(), print)
      s.ink = inkAfterStamp(s.ink)
      setInk(s.ink)
    } else {
      s.pouring = true
    }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return
    const s = sim.current
    const p = toLogical(event.clientX, event.clientY)
    if (s.drawing || s.pouring || s.cutting || s.marking || s.taping || s.piping) updateTool(event.clientX, event.clientY, true)
    if (s.marking) {
      const last = s.marking.points[s.marking.points.length - 1]
      if (Math.hypot(p.x - last.x, p.y - last.y) >= 1) {
        paintMarkerSegment(inkRef.current!.getContext('2d')!, inkScale(), last, p)
        s.marking.points.push(p)
      }
    }
    if (s.taping) showTapePreview(s.taping, p)
    if (s.piping) {
      const last = s.piping[s.piping.length - 1]
      if (Math.hypot(p.x - last.x, p.y - last.y) >= 2 && pathLength(s.piping) < PIPE_LENGTH) {
        s.piping.push(p)
        s.dirty = true
      }
    }
    if (s.cutting) {
      const last = s.cutting[s.cutting.length - 1]
      if (Math.hypot(p.x - last.x, p.y - last.y) >= 2) s.cutting.push(p)
    }
    const moved = Math.hypot(p.x - s.pointer.x, p.y - s.pointer.y)
    s.pointer = { x: p.x, y: p.y, speed: s.pointer.speed * 0.5 + moved * 60 * 0.5 }
    s.light = p
    s.dirty = true
    // The room light follows the pointer as a composited transform. No repaint, no style recalc.
    const rect = matRect()
    const glow = glowRef.current
    if (glow) glow.style.transform = `translate3d(${event.clientX - rect.left - rect.width * 0.3}px, ${event.clientY - rect.top - rect.width * 0.3}px, 0)`
    if (s.drawing) {
      const now = performance.now()
      const stroke = s.glue[s.glue.length - 1]
      const prev = stroke.points[stroke.points.length - 1]
      if (Math.hypot(p.x - prev.x, p.y - prev.y) < 1.5) return
      stroke.points.push({ ...p, t: now })
      stroke.path.lineTo(p.x, p.y)
      paintGlue(s.field, prev.x, prev.y, p.x, p.y, GLUE_WIDTH / 2, now)
    }
  }

  const endStroke = (event: ReactPointerEvent<HTMLDivElement>) => {
    const s = sim.current
    if (s.drawing) {
      // A stroke dries as one piece, so its tackiness matches how purple it looks.
      const stroke = s.glue[s.glue.length - 1]
      const end = stroke.points[stroke.points.length - 1].t
      for (let i = 1; i < stroke.points.length; i++) {
        const a = stroke.points[i - 1]
        const b = stroke.points[i]
        paintGlue(s.field, a.x, a.y, b.x, b.y, GLUE_WIDTH / 2, end)
      }
    }
    if (s.marking) s.marking = null
    if (s.taping) {
      const end = toLogical(event.clientX, event.clientY)
      layTape(s.taping, end)
      s.taping = null
      hideTapePreview()
    }
    if (s.piping) {
      finishPipe(s.piping)
      s.piping = null
      s.dirty = true
    }
    if (s.cutting) {
      const path = s.cutting
      s.cutting = null
      finishCut(path)
      scissorsFlight()?.style.setProperty('--open', '10deg')
    }
    s.drawing = false
    s.pouring = false
    updateTool(event.clientX, event.clientY, false)
    const rect = rootRef.current!.getBoundingClientRect()
    const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom
    // Touch has no hover, so the tool goes back to the caddy between strokes, as in Aspro.
    if (event.pointerType === 'touch' || event.type !== 'pointerup' || outside) motionRef.current?.dockAll()
  }

  /**
   * Apply a finished scissor stroke. A cut-out piece takes a snapshot of the ink and
   * effects layers inside its outline, and everything under it leaves the table with it:
   * glitter, sequins and pom poms are baked in, eyes move onto the piece, the glue under
   * it stops being tacky, and older glue and prints are clipped by the new hole.
   */
  const finishCut = (path: Point[]) => {
    const s = sim.current
    // Scissors cut every layer under the blades: the sheet, and any pieces lying on it.
    const pieceCuts = cutPieces(path)
    const result = cutSheet(sheetRef.current.shape, path)
    if (result.kind === 'slit' && !pieceCuts) {
      const slit = new Path2D()
      slit.moveTo(result.path[0].x, result.path[0].y)
      for (const p of result.path) slit.lineTo(p.x, p.y)
      s.slits.push(slit)
      s.dirty = true
      return
    }
    if (result.kind !== 'piece') return
    const { piece: shape } = result
    const box = padBox(shape.outer)
    const hole: Cut = { shape: shape.outer, path: shapePath2D(shape.outer) }

    // Snapshot what is on the paper inside the cut, at full canvas resolution.
    const fx = fxRef.current!
    const inkCanvas = inkRef.current!
    const k = fx.width / TABLE_WIDTH
    const snap = document.createElement('canvas')
    snap.width = Math.max(1, Math.round(box.width * k))
    snap.height = Math.max(1, Math.round(box.height * k))
    const g = snap.getContext('2d')!
    g.setTransform(k, 0, 0, k, -box.x * k, -box.y * k)
    g.clip(hole.path)
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.drawImage(inkCanvas, -box.x * k, -box.y * k)
    g.drawImage(fx, -box.x * k, -box.y * k)
    const art = snap.toDataURL()

    // Everything under the piece goes with it.
    const inside = (x: number, y: number) => inShape(shape.outer, x, y)
    s.flakes = s.flakes.filter((f) => !inside(f.x, f.y))
    s.sequins = s.sequins.filter((q) => !inside(q.x, q.y))
    s.poms = s.poms.filter((p) => !inside(p.x, p.y))
    s.baseStale = true
    const { field } = s
    for (let r = Math.floor(box.y / field.cell); r <= Math.ceil((box.y + box.height) / field.cell); r++) {
      for (let c = Math.floor(box.x / field.cell); c <= Math.ceil((box.x + box.width) / field.cell); c++) {
        if (r < 0 || c < 0 || r >= field.rows || c >= field.cols) continue
        if (inside((c + 0.5) * field.cell, (r + 0.5) * field.cell)) field.wetAt[r * field.cols + c] = -Infinity
      }
    }
    s.cuts.push(hole)
    s.clipCache.clear()
    eraseCut(inkCanvas.getContext('2d')!, k, hole)
    s.dirty = true

    const id = ++s.pieceId
    const carried = eyes.filter((e) => inside(e.x, e.y))
    setEyes((list) => list.filter((e) => !inside(e.x, e.y)))
    setSheet((current) => ({ ...current, shape: result.sheet }))
    const piece: Piece = {
      id, shape, box, artBox: box, dx: 0, dy: 0, color: sheetRef.current.color, art,
      eyes: carried.map((e) => ({ ...e, x: e.x - box.x, y: e.y - box.y })),
      glued: false, falling: false,
    }
    coverWith(piece, 0, 0)
    // The sheet's piece lies under anything cut from pieces on top of it.
    setPieces((list) => {
      const at = list.findIndex((p) => pieceCuts?.fresh.includes(p.id))
      return at < 0 ? [...list, piece] : [...list.slice(0, at), piece, ...list.slice(at)]
    })
    setHasLoose(true)
    bumpGooglyEyes(0.6)
  }

  /**
   * Cut the pieces lying under the blades. Each piece is cut in its own frame; the part
   * inside the cut becomes a new loose piece that keeps the parent's snapshot and eyes.
   */
  const cutPieces = (path: Point[]): { fresh: number[] } | null => {
    const s = sim.current
    const next: Piece[] = []
    const fresh: number[] = []
    let changed = false
    for (const piece of piecesRef.current) {
      if (piece.falling) { next.push(piece); continue }
      const local = path.map((p) => ({ x: p.x - piece.dx, y: p.y - piece.dy }))
      const result = cutSheet(piece.shape, local)
      if (result.kind !== 'piece') { next.push(piece); continue }
      changed = true
      const toFrame = (e: Eye, from: Box) => ({ ...e, x: e.x + from.x, y: e.y + from.y })
      const eyesInFrame = piece.eyes.map((e) => toFrame(e, piece.box))
      const inCut = (e: Eye) => inShape(result.piece.outer, e.x, e.y)
      const keep = result.sheet
      if (keep.outer.length) {
        const box = padBox(keep.outer)
        next.push({ ...piece, shape: keep, box, eyes: eyesInFrame.filter((e) => !inCut(e)).map((e) => ({ ...e, x: e.x - box.x, y: e.y - box.y })) })
        coverWith({ ...piece, shape: keep }, piece.dx, piece.dy)
      } else {
        uncover([piece.id])
      }
      const box = padBox(result.piece.outer)
      const id = ++s.pieceId
      const cutOut: Piece = {
        ...piece, id, shape: result.piece, box, glued: false,
        eyes: eyesInFrame.filter(inCut).map((e) => ({ ...e, x: e.x - box.x, y: e.y - box.y })),
      }
      next.push(cutOut)
      fresh.push(id)
      coverWith(cutOut, piece.dx, piece.dy)
    }
    if (!changed) return null
    setPieces(next)
    return { fresh }
  }

  /** Is there tacky glue anywhere under this piece at its current position? */
  const pieceSticks = (piece: Piece, dx: number, dy: number) => {
    const s = sim.current
    const now = performance.now()
    const b = piece.box
    for (let y = b.y + 4; y < b.y + b.height; y += 8) {
      for (let x = b.x + 4; x < b.x + b.width; x += 8) {
        if (!inShape(piece.shape.outer, x, y)) continue
        if (tackiness(s.field, x + dx, y + dy, now) > 0) return true
      }
    }
    return false
  }

  // Pieces move as DOM elements during a drag and commit their offset on release.
  const dragPiece = (id: number) => (event: ReactPointerEvent<HTMLDivElement>) => {
    const piece = piecesRef.current.find((p) => p.id === id)
    if (toolRef.current || !piece || piece.glued) return
    event.stopPropagation()
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)
    target.classList.add('is-dragging')
    const start = toLogical(event.clientX, event.clientY)
    let at = { dx: piece.dx, dy: piece.dy }
    const move = (e: PointerEvent) => {
      const p = toLogical(e.clientX, e.clientY)
      at = { dx: piece.dx + p.x - start.x, dy: piece.dy + p.y - start.y }
      target.style.left = `${((piece.box.x + at.dx) / TABLE_WIDTH) * 100}%`
      target.style.top = `${((piece.box.y + at.dy) / TABLE_HEIGHT) * 100}%`
    }
    const up = () => {
      target.classList.remove('is-dragging')
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
      target.removeEventListener('pointercancel', up)
      const glued = pieceSticks(piece, at.dx, at.dy)
      coverWith(piece, at.dx, at.dy)
      setPieces((list) => list.map((p) => (p.id === id ? { ...p, ...at, glued } : p)))
      if (glued) say('Stuck down. The glue under it was still purple.')
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
    target.addEventListener('pointercancel', up)
  }

  // ---------- Masking tape ----------

  /** A strip from a to b, at least a short tab long, so a tap still lays some tape. */
  const stripBetween = (a: Point, b: Point, id = 0, seed = 1): TapeStrip => {
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    const min = 36
    if (len >= min) return { id, x1: a.x, y1: a.y, x2: b.x, y2: b.y, seed }
    const angle = len > 2 ? Math.atan2(b.y - a.y, b.x - a.x) : -0.08
    return { id, x1: a.x, y1: a.y, x2: a.x + Math.cos(angle) * min, y2: a.y + Math.sin(angle) * min, seed }
  }
  const tapeStyle = (t: TapeStrip): CSSProperties => {
    const len = tapeLength(t)
    const outline = tapeOutline(len, TAPE_WIDTH, t.seed)
    return {
      left: pct(t.x1, TABLE_WIDTH),
      top: pct(t.y1, TABLE_HEIGHT),
      width: pct(len, TABLE_WIDTH),
      height: pct(TAPE_WIDTH, TABLE_HEIGHT),
      transform: `translateY(-50%) rotate(${Math.atan2(t.y2 - t.y1, t.x2 - t.x1)}rad)`,
      clipPath: `polygon(${outline.map((q) => `${((q.x / len) * 100).toFixed(2)}% ${(((q.y + TAPE_WIDTH / 2) / TAPE_WIDTH) * 100).toFixed(2)}%`).join(', ')})`,
    }
  }
  const showTapePreview = (a: Point, b: Point) => {
    const el = tapePreviewRef.current
    if (!el) return
    Object.assign(el.style, tapeStyle(stripBetween(a, b)), { display: 'block' })
  }
  const hideTapePreview = () => { if (tapePreviewRef.current) tapePreviewRef.current.style.display = 'none' }

  /** Lay a strip, and hold down any cut-out pieces and pipe cleaners it crosses. */
  const layTape = (a: Point, b: Point) => {
    const s = sim.current
    const strip = stripBetween(a, b, Date.now(), Math.floor(s.rng() * 1e6))
    const samples = tapeSamples(strip)
    const pinnedPieces = piecesRef.current.filter((piece) => !piece.glued && !piece.falling
      && samples.some((q) => inShape(piece.shape.outer, q.x - piece.dx, q.y - piece.dy))).map((p) => p.id)
    const pinnedPipes = pipesRef.current.filter((pipe) => !pipe.glued && !pipe.falling
      && samples.some((q) => pipe.points.some((pt) => Math.hypot(pt.x + pipe.dx - q.x, pt.y + pipe.dy - q.y) < PIPE_RADIUS + 6))).map((p) => p.id)
    const laid: LaidTape = { ...strip, epoch: s.cuts.length, seq: ++s.seq }
    s.tapes.push(laid)
    paintTapeStrip(inkRef.current!.getContext('2d')!, inkScale(), laid, tapeOutline(tapeLength(laid), TAPE_WIDTH, laid.seed), TAPE_WIDTH)
    if (pinnedPieces.length) setPieces((list) => list.map((p) => (pinnedPieces.includes(p.id) ? { ...p, glued: true } : p)))
    if (pinnedPipes.length) setPipes((list) => list.map((p) => (pinnedPipes.includes(p.id) ? { ...p, glued: true } : p)))
    if (pinnedPieces.length || pinnedPipes.length) say('Taped down.')
  }

  // ---------- Pipe cleaners ----------

  /** Bend a pipe cleaner along the drawn path and paint its chenille once. */
  const finishPipe = (raw: Point[]) => {
    const s = sim.current
    const points = trimToLength(smoothPath(raw, 3), PIPE_LENGTH)
    if (pathLength(points) < 24) return
    const b = bounds(fromPoints(points))
    const pad = PIPE_RADIUS * 2
    const box = { x: b.x - pad, y: b.y - pad, width: b.width + pad * 2, height: b.height + pad * 2 }
    const k = fxRef.current!.width / TABLE_WIDTH
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(box.width * k))
    canvas.height = Math.max(1, Math.round(box.height * k))
    const samples = resamplePath(points, 0.9).map((q) => ({ x: (q.x - box.x) * k, y: (q.y - box.y) * k, angle: q.angle }))
    const color = s.nextPipe
    paintChenille(canvas.getContext('2d')!, samples, POM_COLORS[color], PIPE_RADIUS * k, s.pipeId + 17)
    const pipe: Pipe = { id: ++s.pipeId, points, box, art: canvas.toDataURL(), dx: 0, dy: 0, color, glued: false, falling: false }
    pipe.glued = pipeSticks(pipe, 0, 0)
    setPipes((list) => [...list, pipe])
    s.nextPipe = (s.nextPipe + 3) % POM_COLORS.length
    setNextPipe(s.nextPipe)
    setHasLoose(true)
  }

  const pipeSticks = (pipe: Pipe, dx: number, dy: number) => {
    const s = sim.current
    const now = performance.now()
    return resamplePath(pipe.points, 8).some((q) => tackiness(s.field, q.x + dx, q.y + dy, now) > 0)
  }

  const dragPipe = (id: number) => (event: ReactPointerEvent<HTMLDivElement>) => {
    const pipe = pipesRef.current.find((p) => p.id === id)
    if (toolRef.current || !pipe || pipe.glued) return
    event.stopPropagation()
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)
    target.classList.add('is-dragging')
    const start = toLogical(event.clientX, event.clientY)
    let at = { dx: pipe.dx, dy: pipe.dy }
    const move = (e: PointerEvent) => {
      const p = toLogical(e.clientX, e.clientY)
      at = { dx: pipe.dx + p.x - start.x, dy: pipe.dy + p.y - start.y }
      target.style.left = `${((pipe.box.x + at.dx) / TABLE_WIDTH) * 100}%`
      target.style.top = `${((pipe.box.y + at.dy) / TABLE_HEIGHT) * 100}%`
    }
    const up = () => {
      target.classList.remove('is-dragging')
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
      target.removeEventListener('pointercancel', up)
      const glued = pipeSticks(pipe, at.dx, at.dy)
      setPipes((list) => list.map((p) => (p.id === id ? { ...p, ...at, glued } : p)))
      if (glued) say('Stuck down. The glue under it was still purple.')
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
    target.addEventListener('pointercancel', up)
  }

  const tipOff = () => {
    const s = sim.current
    s.tipUntil = performance.now() + 1300
    setTipping(true)
    bumpGooglyEyes(2)
    window.setTimeout(() => setTipping(false), 900)
    // Loose pieces slide off the mat with everything else.
    const falling = piecesRef.current.filter((p) => !p.glued).map((p) => p.id)
    setPieces((list) => list.map((p) => (p.glued ? p : { ...p, falling: true })))
    setPipes((list) => list.map((p) => (p.glued ? p : { ...p, falling: true })))
    window.setTimeout(() => {
      uncover(falling)
      setPieces((list) => list.filter((p) => !p.falling))
      setPipes((list) => list.filter((p) => !p.falling))
    }, 950)
  }

  const newSheet = (color: string) => {
    const s = sim.current
    s.glue = []
    s.flakes = []
    s.pending = []
    s.sequins = []
    s.pendingSequins = []
    s.poms = []
    s.prints = []
    s.cuts = []
    s.covers = []
    s.clipCache.clear()
    s.slits = []
    s.marks = []
    s.tapes = []
    s.baseStale = true
    redrawPrints()
    setPieces([])
    setPipes([])
    s.tapes = []
    clearGlue(s.field)
    s.dirty = true
    setEyes([])
    setHasLoose(false)
    setSheet((current) => ({ color, seed: current.seed + 1, shape: freshSheet(current.seed + 1) }))
  }

  // Dragging moves the element directly and commits to state once, on release,
  // so the whole table doesn't re-render on every pointer move.
  const dragEye = (id: number) => (event: ReactPointerEvent<HTMLDivElement>) => {
    if (toolRef.current) return
    event.stopPropagation()
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)
    target.classList.add('is-lifted')
    const start = toLogical(event.clientX, event.clientY)
    const eye = eyes.find((e) => e.id === id)!
    const offset = { x: eye.x - start.x, y: eye.y - start.y }
    let at = { x: eye.x, y: eye.y }
    const move = (e: PointerEvent) => {
      const p = toLogical(e.clientX, e.clientY)
      at = { x: p.x + offset.x, y: p.y + offset.y }
      target.style.left = `${(at.x / TABLE_WIDTH) * 100}%`
      target.style.top = `${(at.y / TABLE_HEIGHT) * 100}%`
    }
    const up = () => {
      target.classList.remove('is-lifted')
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
      target.removeEventListener('pointercancel', up)
      setEyes((list) => list.map((item) => (item.id === id ? { ...item, ...at } : item)))
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
    target.addEventListener('pointercancel', up)
  }

  const glitterIndex = tool?.startsWith('glitter') ? Number(tool.split('-')[1]) : -1
  const pct = (v: number, of: number) => `${(v / of) * 100}%`

  return (
    <section
      className="kollaz"
      aria-label="Craft table"
      ref={rootRef}
      onPointerMove={(event) => {
        const s = sim.current
        if (event.isPrimary && !s.drawing && !s.pouring) updateTool(event.clientX, event.clientY, false)
      }}
      onPointerLeave={() => {
        const s = sim.current
        if (!s.drawing && !s.pouring) motionRef.current?.dockAll()
        previousPointerRef.current = null
      }}
    >
      <div
        className={`kollaz-mat${tool ? ' kollaz-mat--holding' : ''}${tipping ? ' kollaz-mat--tipping' : ''}`}
        ref={surfaceRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onPointerLeave={() => { sim.current.light = null }}
      >
        <canvas ref={matRef} className="kollaz-mat__canvas" />
        <PaperShapeView className="kollaz-mat__sheet" shape={sheet.shape} color={sheet.color} box={TABLE_BOX} style={{ inset: 0 }} />
        <div className="kollaz-mat__pieces" style={{ pointerEvents: 'none' }}>
          {pieces.map((piece) => (
            <div
              key={piece.id}
              className={`kollaz-piece${piece.glued ? ' is-glued' : ''}${piece.falling ? ' is-falling' : ''}`}
              style={{
                left: pct(piece.box.x + piece.dx, TABLE_WIDTH), top: pct(piece.box.y + piece.dy, TABLE_HEIGHT),
                width: pct(piece.box.width, TABLE_WIDTH), height: pct(piece.box.height, TABLE_HEIGHT),
                pointerEvents: tool ? 'none' : undefined,
                transform: piece.falling ? `translateY(${TABLE_HEIGHT * scale * 1.2}px) rotate(${piece.id % 2 ? 8 : -8}deg)` : undefined,
              }}
              onPointerDown={dragPiece(piece.id)}
            >
              <PaperShapeView shape={piece.shape} color={piece.color} box={piece.box} style={{ inset: 0 }}>
                <PieceArt piece={piece} />
              </PaperShapeView>
              {piece.eyes.map((eye) => (
                <div key={eye.id} className="kollaz-mat__eye" style={{ left: pct(eye.x, piece.box.width), top: pct(eye.y, piece.box.height) }}>
                  <GooglyEye size={Math.round(eye.size * scale)} />
                </div>
              ))}
            </div>
          ))}
        </div>
        {/* Pipe cleaners sit under the ink layer, so tape and texta can go over them. */}
        <div className="kollaz-pipes">
          {pipes.map((pipe) => (
            <div
              key={pipe.id}
              className={`kollaz-pipe${pipe.glued ? ' is-glued' : ''}${pipe.falling ? ' is-falling' : ''}`}
              style={{
                left: pct(pipe.box.x + pipe.dx, TABLE_WIDTH), top: pct(pipe.box.y + pipe.dy, TABLE_HEIGHT),
                width: pct(pipe.box.width, TABLE_WIDTH), height: pct(pipe.box.height, TABLE_HEIGHT),
                backgroundImage: `url(${pipe.art})`,
                pointerEvents: tool ? 'none' : undefined,
                transform: pipe.falling ? `translateY(${TABLE_HEIGHT * scale * 1.2}px) rotate(${pipe.id % 2 ? 10 : -10}deg)` : undefined,
              }}
              onPointerDown={dragPipe(pipe.id)}
            />
          ))}
        </div>
        <canvas ref={inkRef} className="kollaz-mat__ink" />
        <canvas ref={fxRef} className="kollaz-mat__fx" />
        <div className="kollaz-tape-strips kollaz-tape-shadow">
          <div ref={tapePreviewRef} className="kollaz-tape-strip kollaz-tape-strip--preview" style={{ display: 'none' }} />
        </div>
        <div className="kollaz-mat__eyes" style={{ pointerEvents: tool ? 'none' : undefined }}>
          {eyes.map((eye) => (
            <div
              key={eye.id}
              className="kollaz-mat__eye"
              style={{ left: pct(eye.x, TABLE_WIDTH), top: pct(eye.y, TABLE_HEIGHT) }}
              onPointerDown={dragEye(eye.id)}
            >
              <GooglyEye size={Math.round(eye.size * scale)} />
            </div>
          ))}
        </div>
        <span className="kollaz-mat__glow" ref={glowRef} />
        <span className="kollaz-mat__edge" />
      </div>

      <div className="kollaz-caddy" role="group" aria-label="Craft caddy">
        <div className="kollaz-caddy__row">
        <button type="button" className="kollaz-well kollaz-well--long" data-kollaz-slot="glue"
          aria-pressed={tool === 'glue'} aria-label="Glue stick" onClick={(event) => selectTool('glue', event)}>
          <GlueStickBody />
        </button>
        <button type="button" className="kollaz-well kollaz-well--scissors" data-kollaz-slot="scissors"
          aria-pressed={tool === 'scissors'} aria-label="Scissors" onClick={(event) => selectTool('scissors', event)}>
          <ScissorsBody />
        </button>
        <button type="button" className="kollaz-well kollaz-well--texta" data-kollaz-slot="marker"
          aria-pressed={tool === 'marker'} aria-label="Texta" onClick={(event) => selectTool('marker', event)}>
          <MarkerBody />
        </button>
        <button type="button" className={`kollaz-well kollaz-well--pipes${tool === 'pipes' ? ' is-picked' : ''}`} data-kollaz-slot="pipes"
          aria-pressed={tool === 'pipes'} aria-label="Pipe cleaners" onClick={(event) => selectTool('pipes', event)}>
          <PipeBundle />
        </button>
        {GLITTERS.map((g, i) => (
          <button key={g.id} type="button" className="kollaz-well kollaz-well--tube" data-kollaz-slot={`glitter-${i}`}
            aria-pressed={glitterIndex === i} aria-label={`${g.label} glitter`} onClick={(event) => selectTool(`glitter-${i}`, event)}>
            <ShakerBody index={i} />
          </button>
        ))}
        </div>
        <div className="kollaz-caddy__row">
        <button type="button" className="kollaz-well kollaz-well--round kollaz-well--sequins" data-kollaz-slot="sequins"
          aria-pressed={tool === 'sequins'} aria-label="Holographic sequins" onClick={(event) => selectTool('sequins', event)}>
          <SequinTub />
        </button>
        <button type="button" className={`kollaz-well kollaz-well--round kollaz-well--eyes${tool === 'eyes' ? ' is-picked' : ''}`} data-kollaz-slot="eyes"
          aria-pressed={tool === 'eyes'} aria-label="Googly eyes" onClick={(event) => selectTool('eyes', event)}>
          <EyePot />
        </button>
        <button type="button" className={`kollaz-well kollaz-well--round kollaz-well--poms${tool === 'pompoms' ? ' is-picked' : ''}`} data-kollaz-slot="pompoms"
          aria-pressed={tool === 'pompoms'} aria-label="Pom poms" onClick={(event) => selectTool('pompoms', event)}>
          <PomCup />
        </button>
        <button type="button" className="kollaz-well kollaz-well--round kollaz-well--stamp" data-kollaz-slot="stamp"
          aria-pressed={tool === 'stamp'} aria-label="Rubber stamp" onClick={(event) => selectTool('stamp', event)}>
          <StampBody ink={ink} />
        </button>
        <button type="button" className="kollaz-well kollaz-well--pad" aria-label="Ink pad" onClick={inkStamp}>
          <InkPad pressed={padPressed} />
        </button>
        <button type="button" className="kollaz-well kollaz-well--round kollaz-well--tape" data-kollaz-slot="tape"
          aria-pressed={tool === 'tape'} aria-label="Masking tape" onClick={(event) => selectTool('tape', event)}>
          <TapeRoll />
        </button>
        </div>
      </div>

      <div className="kollaz-utility-bar">
        <span className="kollaz-utility-label">New sheet</span>
        <div className="kollaz-paper-stack" role="group" aria-label="New sheet of paper">
          {PAPERS.map((paper, i) => (
            <button
              key={paper.id}
              type="button"
              className="kollaz-paper-chip"
              style={{ '--paper': paper.color, '--tilt': `${[-4, 3, -2, 5, -3][i]}deg` } as CSSProperties}
              aria-label={`New ${paper.label.toLowerCase()} sheet`}
              title={paper.label}
              onClick={() => newSheet(paper.color)}
            />
          ))}
        </div>
        <span className="kollaz-utility-divider" />
        <button type="button" className="kollaz-utility-button" onClick={tipOff} disabled={!hasLoose || tipping}>
          Tip off loose bits
        </button>
      </div>

      <p className="kollaz-table-hint" aria-live="polite">{notice ?? toolHint(tool, ink)}</p>

      {Object.entries(ANCHORS).map(([id, anchor]) => (
        <div className="kollaz-tool-flight" data-kollaz-flight={id} key={id} aria-hidden="true" hidden>
          <span
            className="kollaz-flight-body"
            style={{ left: -anchor.tipX, top: -anchor.tipY, width: anchor.width, height: anchor.height, transformOrigin: `${anchor.tipX}px ${anchor.tipY}px` }}
          >
            {id === 'glue' && <GlueStickBody inHand />}
            {id.startsWith('glitter') && <ShakerBody index={Number(id.split('-')[1])} inHand />}
            {id === 'sequins' && <SequinTub />}
            {id === 'eyes' && <span className="kollaz-static-eye" />}
            {id === 'pompoms' && <Pom color={nextPom} />}
            {id === 'stamp' && <StampBody ink={ink} />}
            {id === 'scissors' && <ScissorsBody />}
            {id === 'marker' && <MarkerBody inHand />}
            {id === 'tape' && <TapeRoll />}
            {id === 'pipes' && <PipeInHand color={nextPipe} />}
          </span>
        </div>
      ))}
    </section>
  )
}
