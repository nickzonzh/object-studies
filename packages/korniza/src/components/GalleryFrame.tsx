import type { CSSProperties, ComponentPropsWithRef, ReactNode } from 'react'
import './gallery-frame.css'
import { usePointerLight } from './usePointerLight.js'
import type { FrameVariant } from '../variants.js'

/** `true` uses the defaults; an object overrides board width and colour. */
export type FrameMat = boolean | { width?: string; color?: string }

export type GalleryFrameProps = ComponentPropsWithRef<'div'> & {
  variant: FrameVariant
  /**
   * Aspect ratio of the content, excluding the frame: the opening, or with a
   * mat, the window cut into it. A mat widens the frame rather than cropping.
   */
  aspectRatio?: CSSProperties['aspectRatio']
  interactiveLight?: boolean
  /** Bevelled mat board between the moulding and the content. */
  mat?: FrameMat
  /** Faint glass sheen in front of the opening. */
  glazing?: boolean
  /** Decorative overlay; outside the content slot and independent of grid sizing. */
  decoration?: ReactNode
}

/** Props of a single-material frame component, which fixes its own variant. */
export type VariantFrameProps = Omit<GalleryFrameProps, 'variant' | 'decoration'>

const slices = ['tl', 'top', 'tr', 'left', 'right', 'bl', 'bottom', 'br'] as const

/** Eight decorative slices and one unmodified, semantic DOM content slot. */
export function GalleryFrame({ variant, aspectRatio = '4 / 5', interactiveLight = true, mat = false, glazing = false, children, decoration, className = '', style, onPointerMove, onPointerLeave, onPointerCancel, ...props }: GalleryFrameProps) {
  const { ref: frameRef, move, reset } = usePointerLight(interactiveLight, variant)
  // Only the mat values actually given, so an omitted one keeps the consumer's own variable.
  const wrapperStyle = typeof mat === 'object'
    ? {
        ...style,
        ...(mat.width === undefined ? {} : { '--korniza-mat-width': mat.width }),
        ...(mat.color === undefined ? {} : { '--korniza-mat-color': mat.color }),
      } as CSSProperties
    : style
  const matted = mat !== false
  return (
    <div {...props} className={`korniza ${className}`.trimEnd()} style={wrapperStyle}
      onPointerMove={event => { onPointerMove?.(event); move(event) }}
      onPointerLeave={event => { reset(); onPointerLeave?.(event) }}
      onPointerCancel={event => { reset(); onPointerCancel?.(event) }}>
    <div ref={frameRef} className={aspectRatio === 'auto' ? 'korniza-frame korniza-frame--natural' : 'korniza-frame'} data-variant={variant}>
      {slices.map(slice => <span key={slice} aria-hidden="true" className={`korniza-frame__slice korniza-frame__${slice}`} />)}
      {/* The window is always rendered, so toggling the mat never remounts the children. */}
      <div className={matted ? 'korniza-frame__opening korniza-mat' : 'korniza-frame__opening'} style={matted ? undefined : { aspectRatio }}>
        <div className="korniza-frame__window" style={matted ? { aspectRatio } : undefined}>{children}</div>
      </div>
      {decoration}
      {glazing && <span aria-hidden="true" className="korniza-glazing korniza-lit" />}
      <span aria-hidden="true" className="korniza-sheen korniza-lit" />
    </div>
    </div>
  )
}

/** Optional image fitting; GalleryFrame itself never styles its children. */
export function GalleryArtwork({ className = '', ...props }: ComponentPropsWithRef<'img'> & { alt: string }) {
  return <img {...props} className={`korniza-image ${className}`.trimEnd()} />
}
