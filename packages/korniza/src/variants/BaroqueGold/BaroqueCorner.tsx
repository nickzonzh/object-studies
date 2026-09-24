import { useId } from 'react'
import { masses, folds, cuts, edges, undercuts } from './cornerGeometry.js'

/** One geometry library per frame; reflected carving retains world-space light. */
export function BaroqueCorner() {
  const id = `carving-${useId()}`
  return <>
  <svg className="korniza-baroque-defs" aria-hidden="true" focusable="false">
    <defs>
      <g id={`${id}-body`}>{masses.map((d, i) => <path key={i} d={d}/>)}</g>
      <g id={`${id}-edges`}>{edges.map((d, i) => <path key={i} d={d}/>)}</g>
      <g id={`${id}-folds`}>{folds.map((d, i) => <path key={i} d={d}/>)}</g>
      <g id={`${id}-cuts`}>{cuts.map((d, i) => <path key={i} d={d}/>)}</g>
      <g id={`${id}-undercuts`}>{undercuts.map((d, i) => <path key={i} d={d}/>)}</g>
    </defs>
  </svg>
  {(['tl', 'tr', 'bl', 'br'] as const).map(position => {
    const sx = position.endsWith('r') ? -1 : 1
    const sy = position.startsWith('b') ? -1 : 1
    const paint = (name: string) => `url(#${id}-${position}-${name})`
    return <svg key={position} className={`korniza-baroque korniza-baroque--${position}`} viewBox="-8 -8 160 160" aria-hidden="true" focusable="false">
    <defs>
      {/* The body takes the ogee's own stops, so carving and rail are one gilt. */}
      <linearGradient id={`${id}-${position}-gold`} x1={sx < 0 ? 1 : 0} y1={sy < 0 ? 1 : 0} x2={sx < 0 ? .2 : .8} y2={sy < 0 ? 0 : 1}>
        <stop stopColor="#f6e7b6"/><stop offset=".13" stopColor="#dfc894"/>
        <stop offset=".28" stopColor="#c3a662"/><stop offset=".42" stopColor="#a18148"/>
        <stop offset=".56" stopColor="#d0b16b"/><stop offset=".7" stopColor="#98733b"/>
        <stop offset=".86" stopColor="#6b4828"/><stop offset="1" stopColor="#3c281b"/>
      </linearGradient>
      <linearGradient id={`${id}-${position}-fold`} x1={sx < 0 ? 1 : 0} y1={sy < 0 ? 1 : 0} x2={sx < 0 ? 0 : 1} y2={sy < 0 ? .65 : .35}>
        <stop stopColor="#5d3a20"/><stop offset=".26" stopColor="#ad8746"/>
        <stop offset=".47" stopColor="#efdaa0"/><stop offset=".64" stopColor="#c0a05a"/><stop offset="1" stopColor="#6b4828"/>
      </linearGradient>
    </defs>
    {/* Two solid offset copies read as a softening cast shadow, not a filter;
        an offset bounce copy supplies the lit rim on the upper-left side. */}
    <use href={`#${id}-body`} transform={`translate(${sx * 2.2} ${sy * 3.6})`} fill="#2b1d12" opacity=".3"/>
    <use href={`#${id}-body`} transform={`translate(${sx * 1.05} ${sy * 1.75})`} fill="#302118" opacity=".58"/>
    <use href={`#${id}-body`} transform={`translate(${sx * -.55} ${sy * -.7})`} fill="#e9d4a1" opacity=".5"/>
    <use href={`#${id}-body`} fill={paint('gold')}/>
    <use href={`#${id}-undercuts`} fill="#4a3018" opacity=".6"/>
    <use href={`#${id}-folds`} fill={paint('fold')}/>
    {/* Cuts are shallow shadowed grooves in the gilt, not drawn contours. */}
    <g fill="none" stroke="#5b3b21" strokeWidth=".6" strokeLinecap="round" opacity=".52">
      <use href={`#${id}-cuts`}/>
    </g>
    <use className="korniza-baroque__light" href={`#${id}-edges`} fill="none" stroke="#fff3cd" strokeWidth=".8" strokeLinecap="round"/>
    <use className="korniza-baroque__return" href={`#${id}-edges`} transform={`translate(${sx * .55} ${sy * .8})`} fill="none" stroke="#e8c98a" strokeWidth=".6"/>
    {/* Sparse bole only on exposed crown tips; cavities keep their stable brown. */}
    <path className="korniza-baroque__micro" d="M10 0 l2 2 M5 21 l1.5 1.2 M45 13 l-1.4 1.3 M61 36 l-1 .8 M26 54 l.8 1" fill="none" stroke="#794630" strokeWidth=".6" opacity=".55"/>
  </svg>
  })}
  </>
}
