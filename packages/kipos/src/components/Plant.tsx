import { type CSSProperties, memo, useMemo } from 'react'
import type { CropId } from '../lib/garden.js'
import { type Part, plantParts } from '../lib/plants.js'

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

/** The baked drawing a part uses, from art.css. Stems, runners and twine are plain CSS. */
function spriteFor(part: Part, crop: CropId): string {
  const dir = part.side < 0 ? 'l' : 'r'
  switch (part.kind) {
    case 'cane':
      return 'kipos-sprite--cane'
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
    default:
      return ''
  }
}

function partStyle(part: Part, progress: number): CSSProperties | null {
  if (progress < part.at) return null
  const [ax, ay] = part.anchor
  const style: Record<string, string | number> = {
    left: u(part.x - ax * part.w),
    bottom: u(part.y - (1 - ay) * part.h),
    width: u(part.w),
    height: u(part.h),
    transformOrigin: `${pct(ax)} ${pct(ay)}`,
    '--r': `${part.r}deg`,
    '--side': part.side,
  }
  if (part.grows) {
    style['--grow'] = Math.max(0.04, step((progress - part.at) / Math.max(0.05, 0.78 - part.at)))
  } else {
    // Parts set at sowing (canes, twine) are simply there.
    style['--s'] = part.at === 0 ? 1 : step((progress - part.at) / 0.06)
  }
  if (part.ripeAt !== undefined) {
    const span = Math.max(0.01, part.ripeAt - part.at)
    style['--size'] = 0.3 + 0.7 * step((progress - part.at) / span)
    style['--ripe'] = step((progress - (part.ripeAt - 0.12)) / 0.12)
  }
  return style as CSSProperties
}

/** A plant drawn at its current growth. Decorative: the plot it stands in carries the words. */
export const Plant = memo(function Plant({ crop, progress, wilted, seed }: PlantProps) {
  const parts = useMemo(() => plantParts(crop, seed), [crop, seed])
  return (
    <span className={`kipos-plant kipos-plant--${crop}${wilted ? ' kipos-plant--wilted' : ''}`} aria-hidden="true">
      <i className="kipos-plant__shadow" style={{ '--spread': step(progress) } as CSSProperties} />
      <i className="kipos-plant__mound" />
      {parts.map((part, index) => {
        const style = partStyle(part, progress)
        if (!style) return null
        const across = part.grows && part.w > part.h ? ' kipos-part--across' : ''
        return <i key={index} className={`kipos-part kipos-part--${part.kind}${across} ${spriteFor(part, crop)}`} style={style} />
      })}
    </span>
  )
})
