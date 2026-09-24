const sides = ['top', 'right', 'bottom', 'left'] as const

/**
 * Full-length material boards: one texture carried across the mitres. Each
 * carries a graze layer, the fibres the travelling light raises from the face.
 */
export function FrameBoards() {
  return <div className="korniza-boards" aria-hidden="true">
    {sides.map(side => <span key={side} className={`korniza-board korniza-board--${side}`}>
      <span className="korniza-graze korniza-lit"><span /></span>
    </span>)}
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

/** The catch on a gilt slip or lip: the leaf's own narrow response to the travelling light. */
export function FrameGlint() {
  return <span className="korniza-glint korniza-lit" aria-hidden="true" />
}

/** Placements of a baked ornament and the layers each draws; generated with the sprites. */
export interface OrnamentLayout {
  placements: readonly string[]
  /** Pointer-lit layers (light, return), each following its --relief-* opacity. */
  relief: Readonly<Record<string, readonly string[]>>
  micro?: readonly string[]
}

/**
 * Carving baked into sprites by scripts/generate-ornaments.mjs: one empty span
 * per placement and layer, each painting a cell of a sheet the browser
 * rasterizes once. The pointer-lit layers live in their own container, the
 * only element usePointerLight writes relief values to.
 */
export function FrameOrnament({ layout }: { layout: OrnamentLayout }) {
  return <>
    <div className="korniza-ornament" aria-hidden="true">
      {layout.placements.map(name => <span key={name} className={`korniza-orn korniza-orn--${name}`} />)}
      {layout.micro?.map(name => <span key={`${name}-micro`} className={`korniza-orn korniza-orn--${name} korniza-orn--micro`} />)}
    </div>
    <div className="korniza-relief" aria-hidden="true">
      {Object.entries(layout.relief).flatMap(([layer, names]) => names.map(name =>
        <span key={`${name}-${layer}`} className={`korniza-orn korniza-orn--${name} korniza-orn--${layer}`} />))}
    </div>
  </>
}
