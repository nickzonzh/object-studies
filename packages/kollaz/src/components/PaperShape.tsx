import { type CSSProperties, type ReactNode, useMemo } from 'react'
import { type PaperShape as Shape, shapeMask } from '../lib/cut.js'

type Box = { x: number; y: number; width: number; height: number }

/**
 * A sheet (or piece) of paper with any outline, including holes, defined in table
 * units. Each layer is shaped by an SVG mask sized to its box, so it scales with the
 * mat for free. The pale torn core sits under the coloured face; where both layers
 * share an edge (a scissor cut) no rim shows, exactly like real cut paper.
 */
export function PaperShapeView({ shape, color, box, className = '', style, children }: {
  shape: Shape
  color: string
  box: Box
  className?: string
  style?: CSSProperties
  children?: ReactNode
}) {
  const masks = useMemo(() => ({ outer: shapeMask(shape.outer, box), inner: shapeMask(shape.inner, box) }), [shape, box])
  return (
    <div className={`kollaz-paper-shape ${className}`} style={{ ...style, '--paper': color } as CSSProperties}>
      <div className="kollaz-paper__core" style={{ maskImage: masks.outer, WebkitMaskImage: masks.outer }} />
      <div className="kollaz-paper__face" style={{ maskImage: masks.inner, WebkitMaskImage: masks.inner }} />
      {children}
    </div>
  )
}
