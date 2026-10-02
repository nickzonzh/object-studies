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

function partStyle(part: Part, progress: number): CSSProperties | null {
  if (progress < part.at) return null
  const style: Record<string, string | number> = {
    left: u(part.x - part.w / 2),
    bottom: u(part.y),
    width: u(part.w),
    height: u(part.h),
    '--r': `${part.r}deg`,
    '--side': part.side,
  }
  if (part.origin) style.transformOrigin = part.origin
  if (part.grows) {
    style['--grow'] = Math.max(0.04, step((progress - part.at) / Math.max(0.05, 0.78 - part.at)))
  } else {
    // Parts set at sowing (canes, twine) are simply there.
    style['--s'] = part.at === 0 ? 1 : step((progress - part.at) / 0.06)
  }
  if (part.ripeAt !== undefined) {
    const span = Math.max(0.01, part.ripeAt - part.at)
    style['--size'] = 0.32 + 0.68 * step((progress - part.at) / span)
    style['--ripe'] = step((progress - (part.ripeAt - 0.14)) / 0.14)
  }
  return style as CSSProperties
}

/** A plant drawn at its current growth. Decorative: the plot it stands in carries the words. */
export const Plant = memo(function Plant({ crop, progress, wilted, seed }: PlantProps) {
  const parts = useMemo(() => plantParts(crop, seed), [crop, seed])
  return (
    <span className={`kipos-plant kipos-plant--${crop}${wilted ? ' kipos-plant--wilted' : ''}`} aria-hidden="true">
      <i className="kipos-plant__mound" />
      {parts.map((part, index) => {
        const style = partStyle(part, progress)
        if (!style) return null
        const direction = part.grows && part.w > part.h ? ' kipos-part--across' : ''
        return <i key={index} className={`kipos-part kipos-part--${part.kind}${direction}`} style={style} />
      })}
    </span>
  )
})
