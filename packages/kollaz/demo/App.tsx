import type { CSSProperties } from 'react'
import { CraftPaper, CraftTable, GooglyEye } from '../src/index.js'

export default function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">ASPRO CRAFT</p>
          <h1>Glue first, then glitter.</h1>
        </div>
        <p className="app-note">
          A little craft table that behaves like the real thing. Purple glue dries clear, and glitter only sticks while it is still purple.
        </p>
      </header>

      <CraftTable />

      <section className="dropins" aria-labelledby="dropins-title">
        <p className="eyebrow">DROP-INS</p>
        <h2 id="dropins-title">Use the pieces anywhere.</h2>
        <div className="dropins__grid">
          <div className="dropin-wrap">
            <span className="tape" style={{ '--tape-tilt': '-4deg' } as CSSProperties} />
            <CraftPaper className="dropin" color="#c7433a" seed={21} torn={['top', 'bottom']}>
              <div className="dropin__eyes">
                <GooglyEye size={54} />
                <GooglyEye size={42} />
              </div>
              <p>Scroll the page. The pupils lag behind and rattle.</p>
              <code>{'<GooglyEye size={54} />'}</code>
            </CraftPaper>
          </div>
          <div className="dropin-wrap">
            <span className="tape" style={{ '--tape-tilt': '3deg' } as CSSProperties} />
            <CraftPaper className="dropin dropin--light" color="#e6b23a" seed={34} torn={['left', 'right', 'bottom']}>
              <div className="dropin__eyes">
                <GooglyEye size={48} track />
                <GooglyEye size={48} track />
              </div>
              <p>These two watch your cursor instead.</p>
              <code>{'<GooglyEye track />'}</code>
            </CraftPaper>
          </div>
          <div className="dropin-wrap">
            <span className="tape" style={{ '--tape-tilt': '-2deg' } as CSSProperties} />
            <CraftPaper className="dropin" color="#2f4f9e" seed={55} torn={['top']}>
              <p className="dropin__title">Torn paper for any container.</p>
              <p>Pick which edges tear. Cut edges stay clean, and the same seed always tears the same way.</p>
              <code>{"<CraftPaper torn={['top']} />"}</code>
            </CraftPaper>
          </div>
        </div>
      </section>
    </main>
  )
}
