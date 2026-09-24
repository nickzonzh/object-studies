const sides = ['top', 'right', 'bottom', 'left'] as const

/** Full-length material boards: one texture carried across the mitres. */
export function FrameBoards() {
  return <div className="korniza-boards" aria-hidden="true">
    {sides.map(side => <span key={side} className={`korniza-board korniza-board--${side}`} />)}
  </div>
}

/**
 * A repeating carved band inset into the moulding, mitred at the corners.
 * `member` names a second band on the same frame; a variant re-scopes the
 * --band custom properties on `.korniza-bands--<member>` to place it.
 */
export function FrameBands({ member }: { member?: string }) {
  return <div className={member ? `korniza-bands korniza-bands--${member}` : 'korniza-bands'} aria-hidden="true">
    {sides.map(side => <span key={side} className={`korniza-band korniza-band--${side}`} />)}
  </div>
}
