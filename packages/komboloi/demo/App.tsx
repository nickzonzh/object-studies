import { useState } from 'react'
import { Komboloi, MATERIALS, MATERIAL_IDS, type MaterialId } from '../src/index.js'

type Strand = { material: MaterialId; beads: number; seed: number; tassel?: string }

// The collection, hanging along the wall.
const RACK: Strand[] = [
  { material: 'amber', beads: 21, seed: 4 },
  { material: 'olive-wood', beads: 17, seed: 9 },
  { material: 'mati', beads: 23, seed: 2 },
  { material: 'cherry-amber', beads: 19, seed: 11 },
  { material: 'ox-bone', beads: 25, seed: 6 },
  { material: 'onyx', beads: 29, seed: 3 },
]

const COUNTS = [13, 17, 21, 25, 33]

function Segmented<T extends string | number>({
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
          <button type="button" role="radio" aria-checked={o.id === value} key={String(o.id)} onClick={() => onChange(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [held, setHeld] = useState<Strand>({ material: 'amber', beads: 21, seed: 42 })
  const [sound, setSound] = useState(true)
  const material = MATERIALS[held.material]

  const pick = (s: Strand) => {
    setHeld(s)
    document.getElementById('bench')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">KOMBOLOI</p>
          <h1>Something to do with your hands.</h1>
        </div>
        <p className="app-note">
          Worry beads on a brass peg. Lift one by a bead and let it swing, or tap a bead and listen to it knock into the others.
        </p>
      </header>

      <section className="rack" aria-label="The collection">
        <div className="rack-rail" aria-hidden="true" />
        <div className="rack-row">
          {RACK.map((s) => (
            <figure className="rack-piece" key={`${s.material}-${s.seed}`}>
              <Komboloi material={s.material} beads={s.beads} seed={s.seed} sound={sound} />
              <figcaption>
                <button type="button" onClick={() => pick(s)}>
                  <span>{MATERIALS[s.material].label}</span>
                  <small lang="el">{MATERIALS[s.material].greek}</small>
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="bench" id="bench" aria-label="Stringing bench">
        <div className="bench-stage">
          <Komboloi
            material={held.material}
            beads={held.beads}
            seed={held.seed}
            tassel={held.tassel}
            sound={sound}
            className="bench-strand"
          />
        </div>
        <div className="bench-controls">
          <p className="eyebrow">THE BENCH</p>
          <h2>
            {material.label}
            <span> · {held.beads} beads</span>
          </h2>
          <p className="bench-note">
            Drag any bead to lift the strand. Tap a bead to flick it along the cord. With the strand focused, Space flicks the next bead
            across and the arrow keys swing it.
          </p>
          <Segmented
            label="Material"
            value={held.material}
            options={MATERIAL_IDS.map((id) => ({ id, label: MATERIALS[id].label }))}
            onChange={(m) => setHeld((h) => ({ ...h, material: m, tassel: undefined }))}
          />
          <Segmented
            label="Beads"
            value={held.beads}
            options={COUNTS.map((n) => ({ id: n, label: String(n) }))}
            onChange={(beads) => setHeld((h) => ({ ...h, beads }))}
          />
          <div className="control">
            <span className="control-label">Tassel</span>
            <div className="swatches" role="radiogroup" aria-label="Tassel">
              {material.tassels.map((colour, i) => (
                <button
                  type="button"
                  role="radio"
                  key={colour}
                  aria-label={`Tassel ${i + 1}`}
                  aria-checked={(held.tassel ?? material.tassels[0]) === colour}
                  style={{ background: colour }}
                  onClick={() => setHeld((h) => ({ ...h, tassel: colour }))}
                />
              ))}
            </div>
          </div>
          <div className="utility-bar">
            <button type="button" onClick={() => setHeld((h) => ({ ...h, seed: Math.floor(Math.random() * 99999) }))}>
              String another
            </button>
            <span className="utility-divider" aria-hidden="true" />
            <button type="button" aria-pressed={sound} onClick={() => setSound((s) => !s)}>
              {sound ? 'Mute' : 'Sound on'}
            </button>
          </div>
          <p className="seed">Strand no. {String(held.seed).padStart(5, '0')}</p>
        </div>
      </section>

      <footer className="app-footer">
        <p>Simulated in two dimensions: a silk loop over a peg, beads that slide and knock, and a tassel that swings. The clicks are synthesised, nothing is recorded.</p>
      </footer>
    </main>
  )
}
