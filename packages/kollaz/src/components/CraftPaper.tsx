import { type CSSProperties, type ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { type Edge, toClipPath, tornOutline } from '../lib/tornEdge.js'
import '../styles.css'

export type CraftPaperProps = {
  /** Construction paper colour. */
  color?: string
  /** Changes the tear. The same seed always tears the same way. */
  seed?: number
  /** Which edges are torn. The rest are clean cuts. */
  torn?: Edge[]
  /** How deep the tear wanders, in px. */
  roughness?: number
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

export function CraftPaper({
  color = '#2f4f9e',
  seed = 1,
  torn = ['top', 'right', 'bottom', 'left'],
  roughness = 9,
  className = '',
  style,
  children,
}: CraftPaperProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ width: 400, height: 300 })

  useLayoutEffect(() => {
    const element = ref.current!
    const measure = () => {
      // Round so tiny layout jitter doesn't re-tear the sheet.
      const width = Math.max(40, Math.round(element.clientWidth / 8) * 8)
      const height = Math.max(40, Math.round(element.clientHeight / 8) * 8)
      setBox((b) => (b.width === width && b.height === height ? b : { width, height }))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const tornKey = torn.join(',')
  const clips = useMemo(() => {
    // Rebuilt from the key, so a fresh array naming the same edges doesn't re-tear the sheet.
    const edges = (tornKey ? tornKey.split(',') : []) as Edge[]
    const { outer, inner } = tornOutline(box.width, box.height, seed, edges, roughness)
    return { outer: toClipPath(outer, box.width, box.height), inner: toClipPath(inner, box.width, box.height) }
  }, [box.width, box.height, seed, tornKey, roughness])

  return (
    <div ref={ref} className={`kollaz-paper ${className}`} style={{ ...style, '--paper': color } as CSSProperties}>
      <div className="kollaz-paper__core" style={{ clipPath: clips.outer }} />
      <div className="kollaz-paper__face" style={{ clipPath: clips.inner }}>
        {children}
      </div>
    </div>
  )
}
