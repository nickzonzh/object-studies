type ChalkPieceProps = { color: 'white' | 'yellow' | 'blue' | 'pink' }

// Shared material geometry for the parked tool and its moving counterpart.
export function ChalkPiece({ color }: ChalkPieceProps) {
  return (
    <div className={`tool-art chalk-piece chalk-piece--${color}`}>
      <div className="chalk-body" />
    </div>
  )
}
