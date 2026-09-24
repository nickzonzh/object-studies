import { useId } from 'react'

/** Short shallow shoots emerge beneath the master scrolls, then taper away.
 * Fixed-size ends are clipped by their half-rail, never stretched or tiled. */
export function BaroqueRails() {
  const id = `rail-${useId().replace(/:/g, '')}`
  return <>
    <svg className="baroque-defs" aria-hidden="true" focusable="false"><defs>
      <path id={`${id}-shoot`} d="M0 21 C12 21 16 13 28 14 C40 15 44 21 57 18 C70 15 81 14 98 15 C77 16 69 18 58 20 C43 24 36 17 28 17 C17 16 14 25 0 24 Z M23 16 C28 9 37 9 43 11 C40 16 33 19 23 16 Z M48 20 C53 24 63 25 69 21 C62 17 55 17 48 20 Z"/>
      <path id={`${id}-vein`} d="M1 22 Q14 22 23 16 Q32 12 39 12 M29 16 Q43 23 55 20 Q64 17 88 15 M52 20 Q59 23 65 21"/>
    </defs></svg>
    {(['top', 'right', 'bottom', 'left'] as const).map(side => <div key={side} className={`baroque-rail baroque-rail--${side}`} aria-hidden="true">
      {[0, 1].map(end => <div key={end} className={`baroque-rail__end baroque-rail__end--${end}`}>
        <svg viewBox="0 0 100 50" focusable="false">
          {/* Offset signs compensate the end reflection and rail rotation. */}
          <use href={`#${id}-shoot`} transform={`translate(${(end ? -1 : 1) * (side === 'left' || side === 'right' ? .65 : .4)} ${side === 'top' ? .65 : side === 'bottom' ? -.65 : side === 'left' ? .4 : -.4})`} fill="#49301d" opacity=".48"/>
          <use href={`#${id}-shoot`} fill="#b49755"/>
          <use href={`#${id}-vein`} fill="none" stroke="#dfc894" strokeWidth=".65" className="baroque-rail__light"/>
        </svg>
      </div>)}
    </div>)}
  </>
}
