import { Chalkboard } from '../src/index.js'
import './app.css'

export default function App() {
  return (
    <main className="showcase">
      <header className="showcase-header">
        <div>
          <h1>
            KIMOLIA<span className="wordmark-dot">.</span>
          </h1>
          <p>Chalk, dust &amp; a little bit of quiet.</p>
        </div>
        <p className="edition">
          THE OBJECT STUDIES<span>No. 01 — Slate &amp; oak</span>
        </p>
      </header>
      {/* The demo opts into on-device saving; the component never does. */}
      <Chalkboard persistence={{ key: 'kimolia:board:v1' }} />
      <footer className="showcase-footer">
        <span>κιμωλία</span> Greek for chalk.
      </footer>
    </main>
  )
}
