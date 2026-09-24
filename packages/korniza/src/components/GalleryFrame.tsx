import type { CSSProperties, ComponentPropsWithRef, ReactNode } from 'react'
import './gallery-frame.css'
import { usePointerLight } from './usePointerLight.js'
import type { FrameVariant } from '../variants.js'

/** `true` uses the defaults; an object overrides board width and colour. */
export type FrameMat = boolean | { width?: string; color?: string }

export type GalleryFrameProps = ComponentPropsWithRef<'div'> & {
  variant: FrameVariant
  /** Aspect ratio of the content opening, excluding the frame. */
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
  const wrapperStyle = typeof mat === 'object'
    ? { ...style, '--korniza-mat-width': mat.width, '--korniza-mat-color': mat.color } as CSSProperties
    : style
  return (
    <div {...props} className={`korniza ${className}`.trimEnd()} style={wrapperStyle}
      onPointerMove={event => { onPointerMove?.(event); move(event) }}
      onPointerLeave={event => { reset(); onPointerLeave?.(event) }}
      onPointerCancel={event => { reset(); onPointerCancel?.(event) }}>
    <div ref={frameRef} className="korniza-frame" data-variant={variant}>
      {slices.map(slice => <span key={slice} aria-hidden="true" className={`korniza-frame__slice korniza-frame__${slice}`} />)}
      <div className={mat === false ? 'korniza-frame__opening' : 'korniza-frame__opening korniza-mat'} style={{ aspectRatio }}>
        {mat === false ? children : <div className="korniza-frame__window">{children}</div>}
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
