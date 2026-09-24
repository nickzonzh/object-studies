import type { CSSProperties } from 'react'
import type { Marker } from '../types.js'

/**
 * Both tools are laid out inside their own container box, so one piece of
 * artwork serves the tray at any width and the held copy at any scale.
 */
export function MarkerArt({ marker, brand }: { marker: Marker; brand: string }) {
  return (
    <span className="aspro-marker" style={{ '--aspro-tool-colour': marker.color } as CSSProperties} aria-hidden="true">
      <span className="aspro-marker-nib" />
      <span className="aspro-marker-neck" />
      <span className="aspro-marker-barrel">
        {brand ? <span className="aspro-marker-brand">{brand}</span> : null}
        <span className="aspro-marker-band" />
      </span>
      <span className="aspro-marker-cap" />
    </span>
  )
}

export function EraserArt({ brand }: { brand: string }) {
  return (
    <span className="aspro-eraser" aria-hidden="true">
      <span className="aspro-eraser-felt" />
      <span className="aspro-eraser-shell">{brand}</span>
    </span>
  )
}
