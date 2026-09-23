type ChalkPieceProps = { color: 'white' | 'yellow' | 'blue' | 'pink' }

// K1 objects are decorative. Semantic buttons belong with the K2 tool behavior.
export function ChalkPiece({ color }: ChalkPieceProps) {
  return (
    <div className={`chalk-piece chalk-piece--${color}`}>
      <div className="chalk-body" />
    </div>
  )
}
