import type { ChalkColor } from '../../drawing/types.js'

/** Shared material geometry for the parked stick and its moving counterpart. */
export function ChalkPiece({ color }: { color: ChalkColor }) {
  return (
    <div className={`kimolia-tool-art kimolia-chalk kimolia-chalk--${color}`}>
      <div className="kimolia-chalk-body" />
    </div>
  )
}
