const sides = ['top', 'right', 'bottom', 'left'] as const

/** Full-length material boards: one texture carried across the mitres. */
export function FrameBoards() {
  return <div className="korniza-boards" aria-hidden="true">
    {sides.map(side => <span key={side} className={`korniza-board korniza-board--${side}`} />)}
  </div>
}

/** A repeating carved band inset into the moulding, mitred at the corners. */
export function FrameBands() {
  return <div className="korniza-bands" aria-hidden="true">
    {sides.map(side => <span key={side} className={`korniza-band korniza-band--${side}`} />)}
  </div>
}
