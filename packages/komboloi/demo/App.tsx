import { type KeyboardEvent, useState } from 'react'
import { Komboloi, MATERIALS, type MaterialId } from '../src/index.js'
import { unlockAudio } from '../src/lib/audio.js'

type Piece = { material: MaterialId; beads: number; seed: number; tassel?: string }

/** The six strands on the rail, each a traditional count for its material. */
const RACK: Piece[] = [
  { material: 'amber', beads: 21, seed: 4 },
  { material: 'olive-wood', beads: 17, seed: 9 },
  { material: 'mati', beads: 23, seed: 2 },
  { material: 'cherry-amber', beads: 19, seed: 11 },
  { material: 'ox-bone', beads: 25, seed: 6 },
  { material: 'onyx', beads: 29, seed: 3 },
]
const BENCH_MATERIALS = RACK.map((piece) => piece.material)
const BEAD_COUNTS = [13, 17, 19, 21, 23, 25, 29, 33]

type Option<T> = { id: T; label: string }

/** A radio group with one tab stop; the arrow keys move the choice. */
function Choice<T extends string | number>({
  label,
  value,
  options,
  onChange,
  className = 'segmented',
  swatch = false,
}: {
  label: string
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  className?: string
  swatch?: boolean
}) {
  const selected = Math.max(
    0,
    options.findIndex((option) => option.id === value),
  )
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[event.key]
    let next = selected
    if (step) next = (selected + step + options.length) % options.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = options.length - 1
    else return
    event.preventDefault()
    onChange(options[next].id)
    event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus()
  }
  return (
    <div className="control">
      <span className="control-label" aria-hidden="true">
        {label}
      </span>
      <div className={className} role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
        {options.map((option, i) => (
          <button
            key={String(option.id)}
            type="button"
            role="radio"
            aria-checked={option.id === value}
            aria-label={swatch ? option.label : undefined}
            title={swatch ? option.label : undefined}
            tabIndex={i === selected ? 0 : -1}
            style={swatch ? { background: String(option.id) } : undefined}
            onClick={() => onChange(option.id)}
          >
            {swatch ? null : option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [bench, setBench] = useState<Piece>({ material: 'amber', beads: 21, seed: 42 })
  const [sound, setSound] = useState(true)
  const material = MATERIALS[bench.material]
  const tassel = bench.tassel ?? material.tassels[0].colour

  const toBench = (piece: Piece) => {
    setBench(piece)
    document.getElementById('bench')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">KOMBOLOI</p>
          <h1>Something to do with your hands.</h1>
        </div>
        <p className="app-note">
          Worry beads on a brass peg. Lift one by a bead and let it swing, or tap a bead and listen to it knock into
          the others. Tap a name to take it to the bench.
        </p>
      </header>

      <section className="rack" aria-label="The collection">
        <div className="rack-rail" aria-hidden="true" />
        <div className="rack-row">
          {RACK.map((piece) => {
            const here =
              bench.material === piece.material && bench.beads === piece.beads && bench.seed === piece.seed
            const spec = MATERIALS[piece.material]
            return (
              <figure className="rack-piece" key={`${piece.material}-${piece.seed}`}>
                <Komboloi material={piece.material} beads={piece.beads} seed={piece.seed} sound={sound} />
                <figcaption>
                  <button
                    type="button"
                    aria-current={here ? 'true' : undefined}
                    aria-label={`${spec.label}, ${piece.beads} beads. Take it to the bench`}
                    onClick={() => toBench(piece)}
                  >
                    <span>{spec.label}</span>
                    <small lang="el">{spec.greek}</small>
                  </button>
                </figcaption>
              </figure>
            )
          })}
        </div>
      </section>

      <section className="bench" id="bench" aria-label="Stringing bench">
        <div className="bench-stage">
          <Komboloi
            material={bench.material}
            beads={bench.beads}
            seed={bench.seed}
            tassel={bench.tassel}
            sound={sound}
            className="bench-strand"
          />
        </div>
        <div className="bench-controls">
          <p className="eyebrow">THE BENCH</p>
          <h2>
            {material.label}
            <span> · {bench.beads} beads</span>
          </h2>
          <p className="bench-note">
            Drag any bead to lift the strand. Tap a bead to flick it along the cord. With the strand focused, Space
            flicks the next bead across and the arrow keys swing it.
          </p>
          <Choice
            label="Material"
            value={bench.material}
            className="segmented segmented--materials"
            options={BENCH_MATERIALS.map((id) => ({ id, label: MATERIALS[id].label }))}
            onChange={(id) => setBench((b) => ({ ...b, material: id, tassel: undefined }))}
          />
          <Choice
            label="Beads"
            value={bench.beads}
            className="segmented segmented--count"
            options={BEAD_COUNTS.map((n) => ({ id: n, label: String(n) }))}
            onChange={(n) => setBench((b) => ({ ...b, beads: n }))}
          />
          <Choice
            label="Tassel"
            value={tassel}
            className="swatches"
            swatch
            options={material.tassels.map(({ colour, name }) => ({ id: colour, label: `${name} tassel` }))}
            onChange={(colour) => setBench((b) => ({ ...b, tassel: colour }))}
          />
          <div className="utility-bar">
            <button
              type="button"
              onClick={() => setBench((b) => ({ ...b, seed: Math.floor(Math.random() * 99999) }))}
            >
              String another
            </button>
            <span className="utility-divider" aria-hidden="true" />
            <button
              type="button"
              onClick={() => {
                if (!sound) unlockAudio()
                setSound(!sound)
              }}
            >
              {sound ? 'Mute' : 'Unmute'}
            </button>
          </div>
          <p className="seed">Strand no. {String(bench.seed).padStart(5, '0')}</p>
        </div>
      </section>

      <footer className="app-footer">
        <p>
          Simulated in two dimensions: a silk loop over a peg, beads that slide and knock, and a tassel that swings.
          The clicks are synthesised, nothing is recorded.
        </p>
      </footer>
    </main>
  )
}
