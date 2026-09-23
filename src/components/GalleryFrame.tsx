import type { CSSProperties, ComponentPropsWithoutRef } from 'react'
import './gallery-frame.css'

export type GalleryFrameProps = ComponentPropsWithoutRef<'div'> & {
  variant?: 'prototype' | 'baroque-gold'
  /** Aspect ratio of the content opening, excluding the frame. */
  ratio?: CSSProperties['aspectRatio']
}

const slices = ['tl', 'top', 'tr', 'left', 'right', 'bl', 'bottom', 'br'] as const

/** Eight decorative slices and one unmodified, semantic DOM content slot. */
export function GalleryFrame({ variant = 'prototype', ratio = '4 / 5', children, className = '', style, ...props }: GalleryFrameProps) {
  return (
    <div {...props} className={`gallery-frame ${className}`} data-variant={variant} style={style}>
      {slices.map(slice => <span key={slice} aria-hidden="true" className={`gallery-frame__slice gallery-frame__${slice}`} />)}
      <div className="gallery-frame__opening" style={{ aspectRatio: ratio }}>{children}</div>
    </div>
  )
}

/** Optional image fitting; GalleryFrame itself never styles its children. */
export function GalleryArtwork({ className = '', ...props }: ComponentPropsWithoutRef<'img'>) {
  return <img {...props} className={`gallery-artwork ${className}`} />
}
