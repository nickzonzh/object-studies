import { useId } from 'react'
import { centre, corner, type Carving } from './carvingGeometry.js'

type Vec = readonly [number, number]

interface Placement {
  name: string
  /** The CSS reflection the element is drawn under. */
  fx: 1 | -1
  fy: 1 | -1
  /** Vertical rails transpose the top-rail drawing, as a mitre turns it. */
  across: boolean
  geometry: Carving
  viewBox: string
}

const placements: readonly Placement[] = [
  ...(['tl', 'tr', 'bl', 'br'] as const).map(p => ({
    name: p, fx: p.endsWith('r') ? -1 : 1, fy: p.startsWith('b') ? -1 : 1, across: false, geometry: corner, viewBox: '-8 -8 160 160',
  }) as const),
  { name: 'top', fx: 1, fy: 1, across: false, geometry: centre, viewBox: '-50 -4 100 30' },
  { name: 'bottom', fx: 1, fy: -1, across: false, geometry: centre, viewBox: '-50 -4 100 30' },
  { name: 'left', fx: 1, fy: 1, across: true, geometry: centre, viewBox: '-4 -50 30 100' },
  { name: 'right', fx: -1, fy: 1, across: true, geometry: centre, viewBox: '-4 -50 30 100' },
]

/** Maps a world-space vector into the drawing's own space, undoing the reflection and the transpose. */
const local = ({ fx, fy, across }: Placement, [x, y]: Vec): Vec => across ? [fy * y, fx * x] : [fx * x, fy * y]
const shift = (p: Placement, v: Vec) => { const [x, y] = local(p, v); return `translate(${x} ${y})` }
/** Gradient endpoints for a world direction, in each shape's bounding box. */
const along = (p: Placement, v: Vec) => {
  const [x, y] = local(p, v)
  const x1 = x < 0 ? 1 : 0
  const y1 = y < 0 ? 1 : 0
  return { x1, y1, x2: x1 + x, y2: y1 + y }
}

/**
 * Acanthus clasps at the corners and at the middle of every rail, carved in
 * the solid and lapped over the running torus. Every layer that implies a
 * light direction is offset in world space, so all eight read lit from the
 * upper left whichever way the placement is reflected.
 */
export function OakCarving() {
  const id = `oak-${useId()}`
  return <>
    <svg className="korniza-oak-defs" aria-hidden="true" focusable="false">
      <defs>
        {(['corner', 'centre'] as const).map(name => {
          const g = name === 'corner' ? corner : centre
          return <g key={name}>
            <g id={`${id}-${name}-masses`}>{g.masses.map((d, i) => <path key={i} d={d} />)}</g>
            <g id={`${id}-${name}-folds`}>{g.folds.map((d, i) => <path key={i} d={d} />)}</g>
            <g id={`${id}-${name}-eyes`}>{g.eyes.map((d, i) => <path key={i} d={d} />)}</g>
            <g id={`${id}-${name}-veins`}>{g.veins.map((d, i) => <path key={i} d={d} />)}</g>
          </g>
        })}
      </defs>
    </svg>
    {placements.map(p => {
      const kind = p.geometry === corner ? 'corner' : 'centre'
      const ref = (part: string) => `#${id}-${kind}-${part}`
      const paint = `${id}-${p.name}`
      const inner = <>
        <defs>
          {/* Waxed oak lit from the upper left: the same ramp the torus is
              painted with, from its lit crest down to the wax in the quirk. */}
          <linearGradient id={`${paint}-body`} {...along(p, [.8, 1])}>
            <stop stopColor="#b08a5e" /><stop offset=".3" stopColor="#8f6b44" />
            <stop offset=".62" stopColor="#6e4f30" /><stop offset="1" stopColor="#452f1a" />
          </linearGradient>
          <linearGradient id={`${paint}-fold`} {...along(p, [1, .6])}>
            <stop stopColor="#efdcb6" stopOpacity=".55" /><stop offset=".6" stopColor="#c9a87e" stopOpacity=".18" />
            <stop offset="1" stopColor="#3a2614" stopOpacity=".26" />
          </linearGradient>
        </defs>
        <use href={ref('masses')} transform={shift(p, [2.2, 3.2])} fill="#1c1107" opacity=".22" />
        <use href={ref('masses')} transform={shift(p, [1, 1.5])} fill="#1c1107" opacity=".45" />
        <use href={ref('masses')} transform={shift(p, [-.5, -.7])} fill="#ecd0a2" opacity=".36" />
        <use href={ref('masses')} fill={`url(#${paint}-body)`} />
        <use href={ref('eyes')} fill="#1a0f06" opacity=".8" />
        <use href={ref('folds')} transform={shift(p, [.5, .7])} fill="#1c1107" opacity=".22" />
        <use href={ref('folds')} fill={`url(#${paint}-fold)`} />
        <use href={ref('veins')} transform={shift(p, [.35, .5])} fill="none"
          stroke="#1f1308" strokeOpacity=".5" strokeWidth=".7" strokeLinecap="round" />
        <use className="korniza-oak__light" href={ref('veins')} transform={shift(p, [-.25, -.35])} fill="none"
          stroke="#f2e0bc" strokeWidth=".5" strokeLinecap="round" />
      </>
      return <svg key={p.name} className={`korniza-oak korniza-oak--${p.name}`} viewBox={p.viewBox} aria-hidden="true" focusable="false">
        {p.across ? <g transform="matrix(0 1 1 0 0 0)">{inner}</g> : inner}
      </svg>
    })}
  </>
}
