import { Whiteboard } from '../src/index.js'
import './app.css'

export default function App() {
  return (
    <main className="demo">
      <header className="demo-header">
        <div>
          <p className="demo-eyebrow">MELANI</p>
          <h1>Pick up a marker.</h1>
        </div>
        <p className="demo-note">A tiny whiteboard that behaves like the real thing.</p>
      </header>
      <Whiteboard className="demo-board" persistence={{ key: 'melani:whiteboard:v2' }} />
      <p className="demo-hint">Pick a marker from the tray, then draw directly on the board.</p>
    </main>
  )
}
