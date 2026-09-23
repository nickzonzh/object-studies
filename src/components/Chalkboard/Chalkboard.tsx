import { ChalkRail } from './ChalkRail'
import '../../styles/chalkboard.css'
import '../../styles/timber.css'
import '../../styles/chalk.css'
import '../../styles/duster.css'

export function Chalkboard() {
  return (
    <div
      className="chalkboard"
      role="img"
      aria-label="An empty dark slate chalkboard recessed in an aged oak frame. A projecting timber rail holds white, pale yellow, dusty blue and faded pink chalk, and a wooden duster with charcoal felt. Static object study."
    >
      <div className="board-construction" aria-hidden="true">
        <div className="frame-plank frame-plank--top" />
        <div className="frame-plank frame-plank--right" />
        <div className="frame-plank frame-plank--bottom" />
        <div className="frame-plank frame-plank--left" />
        <div className="slate-recess">
          <div className="slate-surface">
            <div className="slate-residue" />
          </div>
        </div>
        <ChalkRail />
      </div>
    </div>
  )
}
