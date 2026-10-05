import { type CSSProperties, type ReactNode, memo, useEffect, useMemo, useRef } from 'react'
import type { CropId } from '../lib/garden.js'
import { type Part, type PlantDrawing, arrival, plantDrawing } from '../lib/plants.js'

export type PlantProps = {
  crop: CropId
  /** 0 at sowing, 1 ripe. */
  progress: number
  wilted: boolean
  /** Varies the plant's shape. The same seed always grows the same plant. */
  seed: number
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
// Coarse steps, so a slow clock doesn't restyle every part on every tick.
const step = (n: number) => Math.round(clamp01(n) * 40) / 40
const u = (n: number) => `calc(var(--kipos-u) * ${Math.round(n * 100) / 100})`
const pct = (n: number) => `${Math.round(n * 1000) / 10}%`

/** The baked drawing a part uses, from art.css. Canes are tiled; trusses and twine are plain CSS. */
function spriteFor(part: Part, crop: CropId): string {
  const dir = part.side < 0 ? 'l' : 'r'
  switch (part.kind) {
    case 'cane':
      return 'kipos-cane'
    case 'tie':
      return part.variant ? 'kipos-sprite--tie-blue' : 'kipos-sprite--tie-cream'
    case 'cotyledon':
      return `kipos-sprite--cotyledon-${dir}`
    case 'leaf':
      return `kipos-sprite--tomato-leaf-${part.variant % 3}-${dir}`
    case 'vine-leaf':
      return `kipos-sprite--cucumber-leaf-${part.variant % 2}-${dir}`
    case 'melon-leaf':
      return `kipos-sprite--melon-leaf-${part.variant % 2}-${dir}`
    case 'basil-leaf':
      return `kipos-sprite--basil-leaf-${part.variant % 3}-${dir}`
    case 'round-leaf':
      return `kipos-sprite--geranium-leaf-${part.variant % 2}-${dir}`
    case 'flower':
      return crop === 'tomato' ? 'kipos-sprite--tomato-flower' : 'kipos-sprite--squash-flower'
    case 'tomato':
      return 'kipos-sprite--tomato-green'
    case 'cucumber':
      return 'kipos-sprite--cucumber'
    case 'melon':
      return 'kipos-sprite--melon'
    case 'bloom':
      return 'kipos-sprite--bloom'
    case 'vine':
      return 'kipos-sprite--melon-vine'
    case 'tendril':
      return `kipos-sprite--tendril-${dir}`
    default:
      return ''
  }
}

const LEAVES = new Set(['leaf', 'vine-leaf', 'melon-leaf', 'basil-leaf', 'round-leaf'])

/** A part's place and state. `base` is its height up the segment it grows on, 0 for a free part. */
function partStyle(part: Part, progress: number, shown: number, index: number, base: number): CSSProperties {
  const [ax, ay] = part.anchor
  const style: Record<string, string | number> = {
    left: u(part.x - ax * part.w),
    bottom: u(base + part.y - (1 - ay) * part.h),
    width: u(part.w),
    height: u(part.h),
    transformOrigin: `${pct(ax)} ${pct(ay)}`,
    '--r': `${Math.round(part.r * 10) / 10}deg`,
    '--side': part.side,
  }
  if (part.grows) {
    const span = part.span ?? Math.max(0.05, 0.78 - part.at)
    style['--grow'] = Math.max(0.04, step((progress - part.at) / span))
  } else {
    // Parts set at sowing (canes, twine) are simply there. A leaf unfolds small
    // and keeps expanding for a while; anything else grows in quickly.
    style['--s'] =
      shown === 0 ? 1 : LEAVES.has(part.kind) ? 0.3 + 0.7 * step((progress - shown) / 0.24) : step((progress - shown) / 0.06)
  }
  // Leaves behind the stem sit in its shade, leaves coming towards you catch
  // the light; no two quite match.
  if (LEAVES.has(part.kind)) {
    const depth = (part.z ?? 0) < 0 ? 0.76 : (part.z ?? 0) > 0 ? 1.04 : 0.92
    style['--shade'] = (depth + ((index * 53) % 7) / 100).toFixed(2)
  }
  // Seed leaves yellow and fall away once the plant has true leaves to spare.
  if (part.kind === 'cotyledon') style['--age'] = step((progress - 0.35) / 0.3)
  if (part.ripeAt !== undefined) {
    const span = Math.max(0.01, part.ripeAt - part.at)
    style['--size'] = 0.3 + 0.7 * step((progress - part.at) / span)
    style['--ripe'] = step((progress - (part.ripeAt - 0.12)) / 0.12)
  }
  return style as CSSProperties
}

function PartView({ part, index, progress, shown, base, crop }: { part: Part; index: number; progress: number; shown: number; base: number; crop: CropId }) {
  const across = part.grows && part.kind !== 'vine' && part.w > part.h ? ' kipos-part--across' : ''
  return (
    <i
      className={`kipos-part kipos-part--${part.kind}${across} ${spriteFor(part, crop)}`}
      style={partStyle(part, progress, shown, index, base)}
    />
  )
}

type Placed = { part: Part; index: number }

/**
 * One segment of a stalk and everything above it. Each segment hangs off the
 * top of the one below and turns from there, so wilting bends the whole stalk
 * and whatever grows on it.
 */
function segmentView(drawing: PlantDrawing, onSegments: Placed[][][], s: number, i: number, progress: number, crop: CropId): ReactNode {
  const stalk = drawing.stalks[s]
  const { angles, length } = drawing.segments[s]
  const count = angles.length
  const start = arrival(stalk, drawing.segments[s], i * length)
  if (progress < start) return null
  const end = arrival(stalk, drawing.segments[s], (i + 1) * length)
  const grow = clamp01((progress - start) / Math.max(1e-6, end - start))
  const width = stalk.width * (1 - (0.45 * i) / count)
  // Wilting bends each joint a little more than the one below.
  const slump = (stalk.side * stalk.wilt * (i + 1)) / ((count * (count + 1)) / 2)
  const placed = (list: Placed[]) =>
    list.map(({ part, index }) => {
      const along = part.along ?? 0
      const shown = Math.max(part.at, arrival(stalk, drawing.segments[s], along))
      if (progress < shown || progress >= (part.until ?? Infinity)) return null
      return <PartView key={index} part={part} index={index} progress={progress} shown={shown} base={along - i * length} crop={crop} />
    })
  const style: Record<string, string | number> = {
    height: u(length),
    '--a': `${Math.round((angles[i] - (i ? angles[i - 1] : 0)) * 10) / 10}deg`,
    '--wa': `${Math.round(slump * 10) / 10}deg`,
  }
  if (i === 0) {
    style.left = u(stalk.origin[0])
    style.bottom = u(stalk.origin[1])
  }
  return (
    <span key={`${s}-${i}`} className={`kipos-seg kipos-seg--${stalk.kind}`} style={style as CSSProperties}>
      {/* Behind the stem first, then the stem, then everything in front of it. */}
      {placed(onSegments[s][i].filter(({ part }) => (part.z ?? 0) < 0))}
      <i
        className="kipos-seg__body"
        style={{ width: u(width), '--w': Math.round(width * 100) / 100, '--grow': Math.round(grow * 20) / 20 } as CSSProperties}
      />
      {placed(onSegments[s][i].filter(({ part }) => (part.z ?? 0) >= 0))}
      {/* The growing tip: a bud of new leaves riding the top of the stalk until it stops. */}
      {stalk.kind !== 'stalk' && (grow < 1 || i + 1 === count) && progress < stalk.to + 0.02 && (
        <span className="kipos-seg__tip" style={{ '--grow': Math.round(grow * 20) / 20 } as CSSProperties}>
          <i className="kipos-sprite--cotyledon-l" />
          <i className="kipos-sprite--cotyledon-r" />
        </span>
      )}
      {grow >= 1 && i + 1 < count && segmentView(drawing, onSegments, s, i + 1, progress, crop)}
    </span>
  )
}

/** A plant drawn at its current growth. Decorative: the plot it stands in carries the words. */
export const Plant = memo(function Plant({ crop, progress, wilted, seed }: PlantProps) {
  const drawing = useMemo(() => plantDrawing(crop, seed), [crop, seed])
  // The parts on each stalk, sorted into the segment they grow on.
  const onSegments = useMemo(() => {
    const placed = drawing.stalks.map((_, s) => drawing.segments[s].angles.map((): Placed[] => []))
    drawing.parts.forEach((part, index) => {
      if (part.stalk === undefined) return
      const { length, angles } = drawing.segments[part.stalk]
      placed[part.stalk][Math.min(angles.length - 1, Math.floor((part.along ?? 0) / length))].push({ part, index })
    })
    return placed
  }, [drawing])
  // What is there on arrival is simply there; what grows after that grows in.
  const root = useRef<HTMLSpanElement>(null)
  useEffect(() => root.current?.setAttribute('data-live', ''), [])
  return (
    <span ref={root} className={`kipos-plant kipos-plant--${crop}${wilted ? ' kipos-plant--wilted' : ''}`} aria-hidden="true">
      <span className="kipos-plant__body">
        <i className="kipos-plant__shadow" style={{ '--spread': step(progress) } as CSSProperties} />
        <i className="kipos-plant__mound" />
        {drawing.parts.map((part, index) =>
          part.stalk === undefined && progress >= part.at && progress < (part.until ?? Infinity) ? (
            <PartView key={index} part={part} index={index} progress={progress} shown={part.at} base={0} crop={crop} />
          ) : null,
        )}
        {drawing.stalks.map((_, s) => segmentView(drawing, onSegments, s, 0, progress, crop))}
      </span>
    </span>
  )
})
