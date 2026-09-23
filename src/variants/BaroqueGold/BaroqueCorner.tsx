import { useId } from 'react'
import { masses, folds, cuts, edges } from './cornerGeometry'

/** One top-left study. SVG IDs remain unique when several frames share a page. */
export function BaroqueCorner() {
  const id = `carving-${useId().replace(/:/g, '')}`
  const paint = (name: string) => `url(#${id}-${name})`
  return <svg className="baroque-corner" viewBox="-8 -8 160 160" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-gold`} x1="0" y1="0" x2=".8" y2="1">
        <stop stopColor="#f1d98d"/><stop offset=".18" stopColor="#c3a662"/>
        <stop offset=".38" stopColor="#98703a"/><stop offset=".5" stopColor="#d8bc78"/>
        <stop offset=".66" stopColor="#a18148"/><stop offset=".84" stopColor="#86602b"/><stop offset="1" stopColor="#49301d"/>
      </linearGradient>
      <linearGradient id={`${id}-fold`} x1="0" y1="0" x2="1" y2=".35">
        <stop stopColor="#634021"/><stop offset=".28" stopColor="#ac8039"/>
        <stop offset=".48" stopColor="#efdaa0"/><stop offset=".64" stopColor="#c0a05a"/><stop offset="1" stopColor="#6b4828"/>
      </linearGradient>
      <g id={`${id}-body`}>{masses.map((d, i) => <path key={i} d={d}/>)}</g>
      <g id={`${id}-edges`}>{edges.map((d, i) => <path key={i} d={d}/>)}</g>
    </defs>
    {/* Solid offset geometry supplies directional contact, never a halo/filter. */}
    <use href={`#${id}-body`} transform="translate(.9 1.5)" fill="#302118" opacity=".65"/>
    <use href={`#${id}-body`} transform="translate(-.35 -.45)" fill="#dfc894" opacity=".55"/>
    <g fill={paint('gold')} stroke="#6b4828" strokeWidth=".45" strokeLinejoin="round">
      {masses.map((d, i) => <path key={i} d={d}/>)}
    </g>
    <g fill={paint('fold')}>{folds.map((d, i) => <path key={i} d={d}/>)}</g>
    <g fill="none" stroke="#49301d" strokeWidth=".85" strokeLinecap="round" opacity=".8">
      {cuts.map((d, i) => <path key={i} d={d}/>)}
    </g>
    <use className="baroque-corner__light" href={`#${id}-edges`} fill="none" stroke="#fff0bb" strokeWidth=".85" strokeLinecap="round"/>
    <use className="baroque-corner__return" href={`#${id}-edges`} transform="translate(.55 .8)" fill="none" stroke="#efc878" strokeWidth=".65"/>
    {/* Sparse bole only on exposed crown tips; cavities keep their stable brown. */}
    <path className="baroque-corner__micro" d="M10 0 l2 2 M5 21 l1.5 1.2 M45 13 l-1.4 1.3" fill="none" stroke="#794630" strokeWidth=".65" opacity=".65"/>
  </svg>
}
