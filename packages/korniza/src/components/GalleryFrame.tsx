import type { CSSProperties, ComponentPropsWithoutRef, ReactNode } from 'react'
import './gallery-frame.css'
import { usePointerLight } from './usePointerLight'
import type { FrameVariant } from '../variants'

export type GalleryFrameProps = ComponentPropsWithoutRef<'div'> & {
  variant: FrameVariant
  /** Aspect ratio of the content opening, excluding the frame. */
  aspectRatio?: CSSProperties['aspectRatio']
  interactiveLight?: boolean
  /** Decorative overlay; outside the content slot and independent of grid sizing. */
  decoration?: ReactNode
}

const slices = ['tl', 'top', 'tr', 'left', 'right', 'bl', 'bottom', 'br'] as const

/** Eight decorative slices and one unmodified, semantic DOM content slot. */
export function GalleryFrame({ variant, aspectRatio = '4 / 5', interactiveLight = true, children, decoration, className = '', style, onPointerMove, onPointerLeave, onPointerCancel, ...props }: GalleryFrameProps) {
  const light = usePointerLight(interactiveLight, variant)
  return (
    <div {...props} className={`korniza ${className}`} style={style}
      onPointerMove={event => { onPointerMove?.(event); light.move(event) }}
      onPointerLeave={event => { light.reset(); onPointerLeave?.(event) }}
      onPointerCancel={event => { light.reset(); onPointerCancel?.(event) }}>
    <div ref={light.ref} className="gallery-frame" data-variant={variant}>
      {slices.map(slice => <span key={slice} aria-hidden="true" className={`gallery-frame__slice gallery-frame__${slice}`} />)}
      <div className="gallery-frame__opening" style={{ aspectRatio }}>{children}</div>
      {decoration}
    </div>
    </div>
  )
}

/** Optional image fitting; GalleryFrame itself never styles its children. */
export function GalleryArtwork({ className = '', ...props }: ComponentPropsWithoutRef<'img'> & { alt: string }) {
  return <img {...props} className={`gallery-artwork ${className}`} />
}
