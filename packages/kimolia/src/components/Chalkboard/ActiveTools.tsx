import type { Ref } from 'react'
import { toolIds } from '../../tools/types.js'
import { ChalkPiece } from './ChalkPiece.js'
import { Duster } from './Duster.js'

/**
 * The tools in the air. Rendered into a portal so a scrolling or transformed
 * ancestor cannot clip a stick that is being carried across the page.
 */
export function ActiveTools({ ref }: { ref: Ref<HTMLDivElement> }) {
  return (
    <div ref={ref} className="kimolia-tool-layer" aria-hidden="true">
      {toolIds.map((id) => (
        <div
          className={`kimolia-tool-flight kimolia-tool-flight--${id === 'duster' ? 'duster' : 'chalk'}`}
          data-flight={id}
          key={id}
          hidden
        >
          <div className="kimolia-tool-lift">
            <div className="kimolia-tool-rotation">
              {id === 'duster' ? <Duster /> : <ChalkPiece color={id} />}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
