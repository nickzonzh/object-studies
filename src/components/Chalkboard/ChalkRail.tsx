import { ChalkPiece } from './ChalkPiece'
import { Duster } from './Duster'

const chalkColors = ['white', 'yellow', 'blue', 'pink'] as const

export function ChalkRail() {
  return (
    <div className="chalk-rail">
      <div className="rail-bed" />
      <div className="rail-groove" />
      <div className="rail-dust" />
      <div className="chalk-set">
        {chalkColors.map((color) => (
          <ChalkPiece key={color} color={color} />
        ))}
      </div>
      <Duster />
      <div className="rail-lip">
        <span className="rail-brand">KIMOLIA</span>
      </div>
    </div>
  )
}
