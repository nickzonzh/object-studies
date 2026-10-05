/**
 * Water from the can's rose, fanning out as it falls and splashing where it
 * lands; or, for `seeds`, a few seeds tipped from a packet. Decorative, and
 * remounted (by key) for each pour so the animation runs from the start.
 */
export function Pour({ seeds = false }: { seeds?: boolean }) {
  return (
    <span className={`kipos-pour${seeds ? ' kipos-pour--seeds' : ''}`} aria-hidden="true">
      {Array.from({ length: seeds ? 5 : 12 }, (_, i) => (
        <i key={i} />
      ))}
      {!seeds && Array.from({ length: 3 }, (_, i) => <b key={i} />)}
    </span>
  )
}
