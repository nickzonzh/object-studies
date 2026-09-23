import { useId } from 'react'
import { masses, folds, cuts, edges, undercuts } from './cornerGeometry'

/** One geometry library per frame; reflected carving retains world-space light. */
export function BaroqueCorner() {
  const id = `carving-${useId().replace(/:/g, '')}`
  return <>
  <svg className="baroque-defs" aria-hidden="true" focusable="false">
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
    return <svg key={position} className={`baroque-corner baroque-corner--${position}`} viewBox="-8 -8 160 160" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-${position}-gold`} x1={sx < 0 ? 1 : 0} y1={sy < 0 ? 1 : 0} x2={sx < 0 ? .2 : .8} y2={sy < 0 ? 0 : 1}>
        <stop stopColor="#f1d98d"/><stop offset=".18" stopColor="#bea05b"/>
        <stop offset=".38" stopColor="#946b35"/><stop offset=".5" stopColor="#ceb06c"/>
        <stop offset=".66" stopColor="#99763e"/><stop offset=".84" stopColor="#86602b"/><stop offset="1" stopColor="#49301d"/>
      </linearGradient>
      <linearGradient id={`${id}-${position}-fold`} x1={sx < 0 ? 1 : 0} y1={sy < 0 ? 1 : 0} x2={sx < 0 ? 0 : 1} y2={sy < 0 ? .65 : .35}>
        <stop stopColor="#634021"/><stop offset=".28" stopColor="#ac8039"/>
        <stop offset=".48" stopColor="#e5cc8e"/><stop offset=".64" stopColor="#b99852"/><stop offset="1" stopColor="#6b4828"/>
      </linearGradient>
    </defs>
    {/* Solid offset geometry supplies directional contact, never a halo/filter. */}
    <use href={`#${id}-body`} transform={`translate(${sx * 1.05} ${sy * 1.75})`} fill="#302118" opacity=".65"/>
    <use href={`#${id}-body`} transform={`translate(${sx * -.35} ${sy * -.45})`} fill="#dfc894" opacity=".55"/>
    <g fill={paint('gold')} stroke="#6b4828" strokeWidth=".45" strokeLinejoin="round">
      <use href={`#${id}-body`}/>
    </g>
    <use href={`#${id}-undercuts`} fill="#49301d" opacity=".72"/>
    <use href={`#${id}-folds`} fill={paint('fold')}/>
    <g fill="none" stroke="#49301d" strokeWidth=".85" strokeLinecap="round" opacity=".8">
      <use href={`#${id}-cuts`}/>
    </g>
    <use className="baroque-corner__light" href={`#${id}-edges`} fill="none" stroke="#fff0bb" strokeWidth=".85" strokeLinecap="round"/>
    <use className="baroque-corner__return" href={`#${id}-edges`} transform={`translate(${sx * .55} ${sy * .8})`} fill="none" stroke="#efc878" strokeWidth=".65"/>
    {/* Sparse bole only on exposed crown tips; cavities keep their stable brown. */}
    <path className="baroque-corner__micro" d="M10 0 l2 2 M5 21 l1.5 1.2 M45 13 l-1.4 1.3 M61 36 l-1 .8 M26 54 l.8 1" fill="none" stroke="#794630" strokeWidth=".65" opacity=".65"/>
  </svg>
  })}
  </>
}
