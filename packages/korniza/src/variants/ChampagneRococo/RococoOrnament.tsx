import { useId } from 'react'
import { masses, folds, undercuts, edges, cuts } from './cartoucheGeometry.js'

/** One geometry library per frame; reflected carving retains world-space light. */
export function RococoOrnament() {
  const id = `rocaille-${useId()}`
  return <>
    <svg className="korniza-rococo-defs" aria-hidden="true" focusable="false">
      <defs>
        <g id={`${id}-body`}>{masses.map((d, i) => <path key={i} d={d} />)}</g>
        <g id={`${id}-folds`}>{folds.map((d, i) => <path key={i} d={d} />)}</g>
        <g id={`${id}-undercuts`}>{undercuts.map((d, i) => <path key={i} d={d} />)}</g>
        <g id={`${id}-edges`}>{edges.map((d, i) => <path key={i} d={d} />)}</g>
        <g id={`${id}-cuts`}>{cuts.map((d, i) => <path key={i} d={d} />)}</g>
      </defs>
    </svg>
    {(['tl', 'tr', 'bl', 'br'] as const).map(position => {
      const sx = position.endsWith('r') ? -1 : 1
      const sy = position.startsWith('b') ? -1 : 1
      const paint = (name: string) => `url(#${id}-${position}-${name})`
      return <svg key={position} className={`korniza-rococo korniza-rococo--${position}`} viewBox="-8 -8 160 160" aria-hidden="true" focusable="false">
        <defs>
          {/* Pale champagne water gilding: the crest is near-white gesso with the
              gold worn thin over it, the flats a greyed ochre and the hollows a
              warm brown — never the saturated yellow the Baroque ogee carries.
              Counter-reflected per position so the key stays above and left. */}
          <linearGradient id={`${id}-${position}-gilt`} x1={sx < 0 ? 1 : 0} y1={sy < 0 ? 1 : 0} x2={sx < 0 ? .18 : .82} y2={sy < 0 ? 0 : 1}>
            <stop stopColor="#f7efd9" /><stop offset=".12" stopColor="#e6d5ad" />
            <stop offset=".26" stopColor="#cbb083" /><stop offset=".4" stopColor="#a78a5f" />
            <stop offset=".52" stopColor="#dfcb9f" /><stop offset=".66" stopColor="#977a52" />
            <stop offset=".82" stopColor="#6b5238" /><stop offset="1" stopColor="#3d2e1e" />
          </linearGradient>
          <linearGradient id={`${id}-${position}-fold`} x1={sx < 0 ? 1 : 0} y1={sy < 0 ? 1 : 0} x2={sx < 0 ? 0 : 1} y2={sy < 0 ? .65 : .35}>
            <stop stopColor="#5b4229" /><stop offset=".24" stopColor="#a98e66" />
            <stop offset=".46" stopColor="#f4e8c6" /><stop offset=".66" stopColor="#bda278" /><stop offset="1" stopColor="#675034" />
          </linearGradient>
        </defs>
        {/* Three solid offset copies read as a softening cast shadow, not a
            filter; an offset bounce copy supplies the lit rim on the upper-left
            side. On champagne gilding that rim is chalky, because the bole under
            it is white gesso rather than the red clay a Baroque frame is laid
            over, and the sockets below stay the darkest thing on the frame. */}
        <use href={`#${id}-body`} transform={`translate(${sx * 4.4} ${sy * 6.8})`} fill="#2c1e0b" opacity=".2" />
        <use href={`#${id}-body`} transform={`translate(${sx * 2.6} ${sy * 4.1})`} fill="#2c1e0b" opacity=".38" />
        <use href={`#${id}-body`} transform={`translate(${sx * 1.15} ${sy * 1.9})`} fill="#332512" opacity=".68" />
        <use href={`#${id}-body`} transform={`translate(${sx * -.75} ${sy * -1})`} fill="#f8eed2" opacity=".46" />
        <use href={`#${id}-body`} fill={paint('gilt')} />
        <use href={`#${id}-undercuts`} fill="#33220e" opacity=".82" />
        <use href={`#${id}-folds`} fill={paint('fold')} opacity=".88" />
        <use href={`#${id}-cuts`} transform={`translate(${sx * .5} ${sy * .7})`} fill="none"
          stroke="#5c4327" strokeOpacity=".46" strokeWidth="1" strokeLinecap="round" />
        {/* The crest shadow is fixed — a gouge is dark whatever the light does.
            Only the catch on the arris and the bounce returning into its shaded
            side travel with the pointer, over the range usePointerLight drives. */}
        <use href={`#${id}-edges`} transform={`translate(${sx * .95} ${sy * 1.3})`} fill="none"
          stroke="#5c4327" strokeOpacity=".34" strokeWidth="1.6" strokeLinecap="round" />
        <use className="korniza-rococo__light" href={`#${id}-edges`} fill="none"
          stroke={sy * sx < 0 ? '#f6ead0' : sy < 0 ? '#e8dabb' : '#fff8e6'} strokeWidth="1.15" strokeLinecap="round" />
        <use className="korniza-rococo__return" href={`#${id}-edges`} transform={`translate(${sx * 1.5} ${sy * 2})`}
          fill="none" stroke="#ecd8b0" strokeWidth=".8" strokeLinecap="round" />
        {/* Bole wear: on a champagne frame the gold has rubbed back to white
            gesso on the highest points, not down to red clay. */}
        <path className="korniza-rococo__micro" d="M13 5l2 1.6M4 14l1.6 1.3M34 3l-1.8 1.4M48 9l-1.4 1.2M9 48l1.2 1.5M26 30l-1.5 1.2"
          fill="none" stroke="#fbf4e2" strokeWidth=".9" strokeLinecap="round" opacity=".5" />
      </svg>
    })}
  </>
}
