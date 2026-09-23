import { useEffect, useRef } from 'react'
import { GalleryFrame, type GalleryFrameProps } from '../../components/GalleryFrame'
import './walnut.css'

/** Same event-driven light architecture as gold, with burnished walnut high points. */
export function DarkWalnut({ onPointerMove, onPointerLeave, onPointerCancel, ...props }: Omit<GalleryFrameProps, 'variant' | 'decoration'>) {
  const pending = useRef<number | null>(null)
  const reset = (element: HTMLDivElement) => {
    if (pending.current !== null) cancelAnimationFrame(pending.current)
    pending.current = null
    element.style.removeProperty('--light-x')
    element.style.removeProperty('--light-y')
  }
  useEffect(() => () => { if (pending.current !== null) cancelAnimationFrame(pending.current) }, [])
  return <GalleryFrame {...props} variant="dark-walnut"
    decoration={<div className="walnut-material" aria-hidden="true">{['top', 'right', 'bottom', 'left'].map(side => <span key={side} className={`walnut-board walnut-board--${side}`} />)}</div>}
    onPointerMove={event => {
      onPointerMove?.(event)
      if (event.defaultPrevented || event.pointerType === 'touch' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const element = event.currentTarget
      const { left, top, width, height } = element.getBoundingClientRect()
      const x = Math.max(0, Math.min(1, (event.clientX - left) / width))
      const y = Math.max(0, Math.min(1, (event.clientY - top) / height))
      if (pending.current !== null) cancelAnimationFrame(pending.current)
      pending.current = requestAnimationFrame(() => {
        element.style.setProperty('--light-x', `${18 + x * 46}%`)
        element.style.setProperty('--light-y', `${8 + y * 44}%`)
        pending.current = null
      })
    }}
    onPointerLeave={event => { reset(event.currentTarget); onPointerLeave?.(event) }}
    onPointerCancel={event => { reset(event.currentTarget); onPointerCancel?.(event) }}
  />
}

