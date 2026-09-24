import { forwardRef } from 'react'
import { createPortal } from 'react-dom'
import { toolIds } from '../../tools/types'
import { ChalkPiece } from './ChalkPiece'
import { Duster } from './Duster'

export const ActiveTools = forwardRef<HTMLDivElement>(
  function ActiveTools(_props, ref) {
    return createPortal(
      <div ref={ref} className="active-tools" aria-hidden="true">
        {toolIds.map((id) => (
          <div
            className={`tool-flight tool-flight--${id === 'duster' ? 'duster' : 'chalk'}`}
            data-flight={id}
            key={id}
            hidden
          >
            <div className="tool-lift">
              <div className="tool-rotation">
                {id === 'duster' ? <Duster /> : <ChalkPiece color={id} />}
              </div>
            </div>
          </div>
        ))}
      </div>,
      document.body,
    )
  },
)
