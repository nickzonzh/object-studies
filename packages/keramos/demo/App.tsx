import { useState } from 'react'
import { SHAPES, STYLES, Vase, type ShapeId, type StyleId } from '../src/index.js'

type Piece = { shape: ShapeId; style: StyleId; palette: string; seed: number }

const WALL: Piece[] = [
  { shape: 'plate', style: 'ikaros', palette: 'folk', seed: 4 },
  { shape: 'plate', style: 'ikaros', palette: 'cobalt-gold', seed: 3 },
  { shape: 'plate', style: 'red-figure', palette: 'attic', seed: 9 },
]

const IKAROS_SHELF: Piece[] = [
  { shape: 'baluster', style: 'ikaros', palette: 'lindos', seed: 11 },
  { shape: 'mug', style: 'ikaros', palette: 'folk', seed: 3 },
  { shape: 'rhodos', style: 'ikaros', palette: 'cobalt-gold', seed: 21 },
  { shape: 'mug', style: 'ikaros', palette: 'folk', seed: 8 },
  { shape: 'jug', style: 'ikaros', palette: 'midnight', seed: 9 },
]

const GREEK_SHELF: Piece[] = [
  { shape: 'lekythos', style: 'red-figure', palette: 'attic', seed: 6 },
  { shape: 'amphora', style: 'black-figure', palette: 'attic', seed: 3 },
  { shape: 'jug', style: 'black-figure', palette: 'corinthian', seed: 5 },
]

const paletteLabel = (style: StyleId, id: string) =>
  STYLES.find((s) => s.id === style)?.palettes.find((p) => p.id === id)?.label ?? id

function Debug() {
  const q = new URLSearchParams(location.search)
  const grid = q.get('grid')!
  const items = grid.split(';').map((s) => s.split(','))
  return (
    <main style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, 1fr)`, gap: 8, padding: 8, alignItems: 'end' }}>
      {items.map(([shape, style, palette, seed, angle], i) => (
        <Vase key={i} shape={shape as ShapeId} vaseStyle={style as StyleId} palette={palette} seed={Number(seed ?? 7)} angle={Number(angle ?? 0)} turntable={false} />
      ))}
    </main>
  )
}

function Wall({ pieces, onPick }: { pieces: Piece[]; onPick: (p: Piece) => void }) {
  return (
    <section className="wall" aria-label="Wall plates">
      {pieces.map((p) => (
        <figure className="wall-plate" key={`${p.shape}-${p.palette}-${p.seed}`}>
          <span className="wall-hook" aria-hidden="true" />
          <Vase mode="still" shape={p.shape} vaseStyle={p.style} palette={p.palette} seed={p.seed} maxFps={30} />
          <figcaption>
            <button type="button" onClick={() => onPick(p)}>
              <span>{SHAPES[p.shape].label}</span>
              <small>{p.style === 'ikaros' ? paletteLabel(p.style, p.palette) : STYLES.find((s) => s.id === p.style)!.label}</small>
            </button>
          </figcaption>
        </figure>
      ))}
    </section>
  )
}

function Shelf({ pieces, onPick, label }: { pieces: Piece[]; onPick: (p: Piece) => void; label: string }) {
  return (
    <section className="shelf" aria-label={label}>
      <div className="shelf-row">
        {pieces.map((p, i) => (
          <figure className={`shelf-piece shelf-piece--${p.shape}`} key={`${p.shape}-${p.palette}-${p.seed}`}>
            <Vase mode="still" shape={p.shape} vaseStyle={p.style} palette={p.palette} seed={p.seed} angle={i * 1.3 + (p.shape === 'mug' ? 1.2 : 0)} spin={0.9} maxFps={40} />
            <figcaption>
              <button type="button" onClick={() => onPick(p)}>
                <span>{SHAPES[p.shape].label}</span>
                <small>{paletteLabel(p.style, p.palette)}</small>
              </button>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="shelf-ledge" aria-hidden="true" />
    </section>
  )
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { id: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="control">
      <span className="control-label">{label}</span>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button type="button" role="radio" aria-checked={o.id === value} key={o.id} onClick={() => onChange(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  if (new URLSearchParams(location.search).get('grid')) return <Debug />
  return <Showroom />
}

function Showroom() {
  const [piece, setPiece] = useState<Piece>({ shape: 'rhodos', style: 'ikaros', palette: 'cobalt-gold', seed: 42 })
  const [turntable, setTurntable] = useState(true)
  const style = STYLES.find((s) => s.id === piece.style)!

  const pick = (p: Piece) => {
    setPiece(p)
    document.getElementById('bench')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const setStyle = (id: StyleId) => {
    const next = STYLES.find((s) => s.id === id)!
    setPiece((p) => ({ ...p, style: id, palette: next.palettes.some((x) => x.id === p.palette) ? p.palette : next.palettes[0].id }))
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">KERAMOS</p>
          <h1>Painted by hand, one of one.</h1>
        </div>
        <p className="app-note">Glazed vessels that turn on the shelf and catch the light as you move. Every seed paints a new piece.</p>
      </header>

      <Wall pieces={WALL} onPick={pick} />
      <Shelf pieces={IKAROS_SHELF} onPick={pick} label="Ikaros pieces" />

      <section className="bench" id="bench" aria-label="Potter's bench">
        <div className="bench-stage">
          <Vase
            shape={piece.shape}
            vaseStyle={piece.style}
            palette={piece.palette}
            seed={piece.seed}
            turntable={turntable}
            className="bench-vase"
          />
          <div className="bench-ledge" aria-hidden="true" />
        </div>
        <div className="bench-controls">
          <p className="eyebrow">THE BENCH</p>
          <h2>
            {SHAPES[piece.shape].label}
            <span> · {style.label}</span>
          </h2>
          <p className="bench-note">{SHAPES[piece.shape].note}. Drag the piece to turn it, or use the arrow keys.</p>
          <Segmented
            label="Shape"
            value={piece.shape}
            options={Object.values(SHAPES).map((s) => ({ id: s.id, label: s.label }))}
            onChange={(shape) => setPiece((p) => ({ ...p, shape }))}
          />
          <Segmented label="Style" value={piece.style} options={STYLES.map((s) => ({ id: s.id, label: s.label }))} onChange={setStyle} />
          <Segmented
            label="Palette"
            value={piece.palette}
            options={style.palettes}
            onChange={(palette) => setPiece((p) => ({ ...p, palette }))}
          />
          <div className="utility-bar">
            <button type="button" onClick={() => setPiece((p) => ({ ...p, seed: Math.floor(Math.random() * 99999) }))}>
              Paint another
            </button>
            <span className="utility-divider" aria-hidden="true" />
            <button type="button" aria-pressed={turntable} onClick={() => setTurntable((t) => !t)}>
              {turntable ? 'Stop turntable' : 'Start turntable'}
            </button>
          </div>
          <p className="seed">Piece no. {String(piece.seed).padStart(5, '0')}</p>
        </div>
      </section>

      <Shelf pieces={GREEK_SHELF} onPick={pick} label="Black-figure and red-figure pieces" />

      <footer className="app-footer">
        <p>Rendered live in WebGL. Each surface is painted stroke by stroke on the wall of the pot, then glazed.</p>
      </footer>
    </main>
  )
}
