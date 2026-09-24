import { useId } from 'react'

// A rounded scallop with a pinched hinge, not a pointed leaf cluster. One
// open horizontal C-ribbon balances a finer descending S-tendril; the unequal
// arms repeat coherently around the frame without a pair of heraldic volutes.
const shell = 'M27 32 C23 29 12 27 7 23 C2 20 3 15 8 14 C3 9 7 4 13 7 C12 1 19 -1 22 5 C26 0 32 3 31 9 C37 6 41 12 36 17 C42 18 39 24 34 26 L31 32 Q29 35 27 32 Z'
const scrolls = [
  'M29 29 C42 31 42 5 57 5 C68 4 76 15 69 22 C66 25 60 25 57 22 C63 25 70 20 68 15 C64 7 53 8 50 16 C48 21 46 22 44 26 C41 32 35 35 30 33 Z',
  'M27 28 C25 38 7 34 8 49 C9 55 21 59 20 68 C20 74 15 79 12 77 C17 77 18 71 16 67 C14 63 9 62 6 56 C3 52 3 46 6 42 C10 35 22 34 23 27 Z',
  'M67 24 C78 21 80 12 88 13 C94 12 98 18 106 15 C98 21 94 17 89 16 C84 15 82 19 79 22 C75 25 71 26 67 26 Z',
  'M16 76 C12 85 14 92 16 97 Q19 104 16 108 C17 101 11 98 11 90 Q9 82 14 76 Z',
]
const ribs = [
  'M28 30 Q14 25 7 19', 'M28 30 Q14 18 10 9',
  'M28 30 Q20 16 18 5', 'M29 30 Q27 17 27 7',
  'M30 30 Q32 22 35 13', 'M30 30 Q35 26 37 21',
]
const crests = [
  'M33 31 C45 30 44 8 57 7 C67 6 73 15 68 21',
  'M24 31 C22 37 5 36 6 49 C6 59 18 62 18 69',
  'M70 24 C79 21 81 14 88 14 C95 14 98 19 104 16',
  'M14 80 C10 90 15 96 16 102',
  'M7 22 Q2 18 8 16 M8 11 Q6 5 12 7 M16 5 Q20 1 22 7 M25 5 Q30 2 30 9 M34 11 Q39 10 36 16',
]

export function RococoOrnament() {
  const id = `rococo-${useId().replace(/:/g, '')}`
  return <>
    <svg className="rococo-defs" aria-hidden="true" focusable="false"><defs>
      <g id={`${id}-body`}><path d={shell} />{scrolls.map((d, i) => <path key={i} d={d} />)}</g>
      <g id={`${id}-ribs`}>{ribs.map((d, i) => <path key={i} d={d} />)}</g>
      <g id={`${id}-crests`}>{crests.map((d, i) => <path key={i} d={d} />)}</g>
    </defs></svg>
    {(['tl', 'tr', 'bl', 'br'] as const).map(position => {
      const sx = position.endsWith('r') ? -1 : 1
      const sy = position.startsWith('b') ? -1 : 1
      return <svg key={position} className={`rococo-ornament rococo-ornament--${position}`} viewBox="-3 -3 114 114" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${id}-${position}`} x1={sx < 0 ? 1 : 0} y1={sy < 0 ? 1 : 0} x2={sx < 0 ? 0 : 1} y2={sy < 0 ? 0 : 1}>
            <stop stopColor="#f2e2bc" /><stop offset=".22" stopColor="#ddc38d" />
            <stop offset=".42" stopColor="#bc9563" /><stop offset=".56" stopColor="#ebd7a8" />
            <stop offset=".78" stopColor="#c2a071" /><stop offset="1" stopColor="#9c7550" />
          </linearGradient>
        </defs>
        <use href={`#${id}-body`} transform={`translate(${sx * .55} ${sy * .85})`} fill="#634631" opacity=".7" />
        <use href={`#${id}-body`} transform={`translate(${sx * -.3} ${sy * -.4})`} fill="#fff0cd" opacity=".65" />
        <use href={`#${id}-body`} fill={`url(#${id}-${position})`} stroke="#a17e56" strokeWidth=".35" strokeLinejoin="round" />
        <use href={`#${id}-ribs`} fill="none" stroke="#906748" strokeWidth="1.35" strokeLinecap="round" />
        <use href={`#${id}-ribs`} transform={`translate(${sx * -.65} ${sy * -.5})`} fill="none" stroke="#f7e8c7" strokeWidth=".95" strokeLinecap="round" opacity=".88" />
        {/* A small turned hinge seats the shell across its two emerging stems. */}
        <path d="M25 30 Q29 32 33 29 L32 34 Q28 37 25 33 Z" fill={`url(#${id}-${position})`} stroke="#936c4b" strokeWidth=".55" />
        <path d="M25 34 Q29 37 33 33 M32 29 Q36 30 39 26" fill="none" stroke="#806044" strokeWidth=".7" opacity=".65" />
        {/* Two shallow carved folds within the existing stems, not extra ornament. */}
        <path d="M43 24 Q46 22 48 21 L46 25 Q44 27 42 28 Z M6 51 Q8 55 12 58 L10 60 Q6 57 6 51 Z" fill="#876044" opacity=".48" />
        <path d="M43 24 Q46 23 47 22 M6 51 Q8 55 12 58" transform={`translate(${sx * -.25} ${sy * -.3})`} fill="none" stroke="#f7e8c7" strokeWidth=".65" opacity=".72" />
        <use className="rococo-ornament__light" href={`#${id}-crests`} fill="none" stroke="#fff2d3" strokeWidth="1" strokeLinecap="round" />
        <use className="rococo-ornament__return" href={`#${id}-crests`} transform={`translate(${sx * .5} ${sy * .5})`} fill="none" stroke="#ebd0a2" strokeWidth=".7" />
        <path className="rococo-ornament__micro" d="M17 5l1 .5 M8 22l1 .5 M58 7l2 .3" fill="none" stroke="#956b52" strokeWidth=".55" opacity=".4" />
      </svg>
    })}
  </>
}
