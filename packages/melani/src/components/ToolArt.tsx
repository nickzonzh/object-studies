import type { CSSProperties } from 'react'
import type { Marker } from '../types.js'

/**
 * Both tools are laid out inside their own container box, so one piece of
 * artwork serves the tray at any width and the held copy at any scale.
 */
export function MarkerArt({ marker, brand }: { marker: Marker; brand: string }) {
  return (
    <span className="melani-marker" style={{ '--melani-tool-colour': marker.color } as CSSProperties} aria-hidden="true">
      <span className="melani-marker-nib" />
      <span className="melani-marker-neck" />
      <span className="melani-marker-barrel">
        {brand ? <span className="melani-marker-brand">{brand}</span> : null}
        <span className="melani-marker-band" />
      </span>
      <span className="melani-marker-cap" />
    </span>
  )
}

export function EraserArt({ brand }: { brand: string }) {
  return (
    <span className="melani-eraser" aria-hidden="true">
      <span className="melani-eraser-felt" />
      <span className="melani-eraser-shell">{brand}</span>
    </span>
  )
}
