import { useEffect, useRef } from 'react'
import { GalleryFrame, type GalleryFrameProps } from '../../components/GalleryFrame'
import './baroque.css'

/** A stationary shell: only the raised gilding responds to a fine pointer. */
export function BaroqueGold({ onPointerMove, onPointerLeave, onPointerCancel, ...props }: Omit<GalleryFrameProps, 'variant'>) {
  const pending = useRef<number | null>(null)
  const reset = (element: HTMLDivElement) => {
    if (pending.current !== null) cancelAnimationFrame(pending.current)
    pending.current = null
    element.style.removeProperty('--light-x')
    element.style.removeProperty('--light-y')
  }
  useEffect(() => () => { if (pending.current !== null) cancelAnimationFrame(pending.current) }, [])
  return <GalleryFrame {...props} variant="baroque-gold"
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
