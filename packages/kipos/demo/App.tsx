import { useState } from 'react'
import { Bed, type Light, Teneke } from '../src/index.js'

const SPEEDS = [
  { label: 'Real time', value: 1 },
  { label: 'A day a minute', value: 1440 },
]
const LIGHTS: (Light | 'auto')[] = ['auto', 'morning', 'midday', 'afternoon', 'dusk', 'night']

export default function App() {
  const [speed, setSpeed] = useState(1440)
  const [light, setLight] = useState<Light | 'auto'>('auto')
  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">KIPOS · κήπος</p>
          <h1>Water it tomorrow, too.</h1>
        </div>
        <p className="app-note">
          A raised bed in yiayia&rsquo;s yard. Sow a packet, water it, and come back. Plants grow over real days while the
          soil is wet, wilt when you forget them, and perk up again when you water.
        </p>
      </header>

      <div className="controls" role="group" aria-label="Demo controls">
        <label>
          Time
          <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
            {SPEEDS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Light
          <select value={light} onChange={(event) => setLight(event.target.value as Light | 'auto')}>
            {LIGHTS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Bed speed={speed} light={light} persistence={{ key: 'kipos-demo:bed' }} />

      <section className="tins" aria-labelledby="tins-title">
        <p className="eyebrow">TENEKEDES</p>
        <h2 id="tins-title">A tin for the sidebar.</h2>
        <div className="tins__row">
          <Teneke plant="basil" speed={speed} light={light} showStatus persistence={{ key: 'kipos-demo:basil' }} />
          <Teneke plant="geranium" speed={speed} light={light} showStatus persistence={{ key: 'kipos-demo:geranium' }} />
        </div>
      </section>
    </main>
  )
}
