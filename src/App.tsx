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
      <figure className="object-study">
        <Chalkboard />
        <figcaption>
          <span className="material-note">
            <span className="material-swatch" />
            Dark slate. Aged oak.
          </span>
          <span className="study-note">A still life, for now.</span>
        </figcaption>
      </figure>
      <footer className="showcase-footer">
        <span>κιμωλία</span> Greek for chalk.
      </footer>
    </main>
  )
}
