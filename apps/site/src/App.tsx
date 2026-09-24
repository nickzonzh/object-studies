import { Whiteboard } from 'aspro'
import { Chalkboard } from 'kimolia'
import { Frame, FrameImage } from 'korniza'
import type { ReactNode } from 'react'

const repo = 'https://github.com/nickzonzh/object-studies'
const asset = (name: string) => `${import.meta.env.BASE_URL}${name}`
const painting = {
  src: asset('wheat-field-with-cypresses-1600.jpg'),
  srcSet: `${asset('wheat-field-with-cypresses-800.jpg')} 800w, ${asset('wheat-field-with-cypresses-1600.jpg')} 1600w`,
  sizes: '(max-width: 860px) 90vw, 28vw',
  alt: 'Wheat Field with Cypresses by Vincent van Gogh: a golden field under swirling clouds, dark cypresses on the right.',
}

export function App() {
  return (
    <main className="site">
      <header className="site-header">
        <p className="site-eyebrow">The Object Studies</p>
        <h1>Real objects, rebuilt for the web.</h1>
        <p className="site-lede">
          Open-source React components that behave like the things they are named after. Pick up
          the chalk. Uncap a marker. Hang a painting.
        </p>
        <nav className="site-nav" aria-label="Studies">
          <a href="#kimolia">Kimolia</a>
          <a href="#aspro">Aspro</a>
          <a href="#korniza">Korniza</a>
        </nav>
      </header>

      <Study
        id="kimolia"
        number="01"
        name="Kimolia"
        greek="κιμωλία — chalk"
        summary="A slate chalkboard in an oak frame. Textured chalk that catches the grain, and a felt duster that lifts rather than deletes."
      >
        <Chalkboard persistence={{ key: 'object-studies:kimolia' }} />
      </Study>

      <Study
        id="aspro"
        number="02"
        name="Aspro"
        greek="άσπρο — white"
        summary="An aluminium-framed whiteboard. Four markers and an eraser wait in the tray; the ink pools, streaks and ghosts like the real thing."
      >
        <Whiteboard persistence={{ key: 'object-studies:aspro' }} />
      </Study>

      <Study
        id="korniza"
        number="03"
        name="Korniza"
        greek="κορνίζα — frame"
        summary="Six dimensional frames for images or any React content, with an optional bevelled mat and glazing, lit by your pointer."
      >
        <div className="site-gallery">
          <figure>
            <Frame variant="baroque-gold" aspectRatio="3824 / 2999">
              <FrameImage {...painting} />
            </Frame>
            <figcaption>baroque-gold</figcaption>
          </figure>
          <figure>
            <Frame variant="dark-walnut" aspectRatio="3824 / 2999" mat glazing>
              <FrameImage {...painting} />
            </Frame>
            <figcaption>dark-walnut · mat · glazing</figcaption>
          </figure>
          <figure>
            <Frame variant="modern-black" aspectRatio="4 / 5">
              <div className="site-card">
                <p>Any content.</p>
                <p className="site-card-note">
                  The opening owns the ratio; your content owns everything else.
                </p>
              </div>
            </Frame>
            <figcaption>modern-black · React children</figcaption>
          </figure>
        </div>
        <p className="site-credit">
          <i>Wheat Field with Cypresses</i>, 1889, Vincent van Gogh. The Metropolitan Museum of
          Art, Open Access (CC0).
        </p>
      </Study>

      <footer className="site-footer">
        <span>MIT licensed.</span>
        <a href={repo}>Source on GitHub</a>
      </footer>
    </main>
  )
}

type StudyProps = {
  id: 'kimolia' | 'aspro' | 'korniza'
  number: string
  name: string
  greek: string
  summary: string
  children: ReactNode
}

function Study({ id, number, name, greek, summary, children }: StudyProps) {
  return (
    <section className="site-study" id={id} aria-labelledby={`${id}-title`}>
      <div className="site-study-head">
        <p className="site-number">No. {number}</p>
        <h2 id={`${id}-title`}>{name}</h2>
        <p className="site-greek" lang="el">
          {greek}
        </p>
        <p className="site-summary">{summary}</p>
        <pre className="site-install">
          <code>{`npm install ${id}\n\nimport '${id}/style.css'`}</code>
        </pre>
        <a className="site-docs" href={`${repo}/tree/main/packages/${id}#readme`}>
          Documentation →
        </a>
      </div>
      <div className="site-study-stage">{children}</div>
    </section>
  )
}
