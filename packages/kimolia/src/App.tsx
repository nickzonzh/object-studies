import { Chalkboard } from './components/Chalkboard/Chalkboard'
import './styles/app.css'

export default function App() {
  return (
    <main className="showcase">
      <header className="showcase-header">
        <div>
          <h1>
            KIMOLIA<span className="wordmark-dot">.</span>
          </h1>
          <p>Chalk, dust & a little bit of quiet.</p>
        </div>
        <p className="edition">
          THE OBJECT STUDIES<span>No. 01 — Slate & oak</span>
        </p>
      </header>
      <Chalkboard />
      <footer className="showcase-footer">
        <span>κιμωλία</span> Greek for chalk.
      </footer>
    </main>
  )
}
