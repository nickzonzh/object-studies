import { Whiteboard } from 'melani'
import { Chalkboard } from 'kimolia'
import { Frame, FrameImage, type FrameMat, type FrameVariant, frameVariants } from 'korniza'
import { Vase, type GreekPaletteId, type IkarosPaletteId, type ShapeId, type StyleId } from 'keramos'
import { CraftTable } from 'kollaz'
import { type ReactNode, useState } from 'react'

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
    <main className="site-page">
      <div className="site">
        <header className="site-header">
          <p className="site-eyebrow">The Object Studies</p>
          <h1>Real objects, rebuilt for the web.</h1>
          <p className="site-lede">
            Open-source React components that behave like the things they are named after. Pick up
            the chalk. Uncap a marker. Hang a painting. Turn a painted vase to the light. Glue
            first, then glitter.
          </p>
          <nav className="site-nav" aria-label="Studies">
            <a href="#kimolia">Kimolia</a>
            <a href="#melani">Melani</a>
            <a href="#korniza">Korniza</a>
            <a href="#wall">Gallery wall</a>
            <a href="#keramos">Keramos</a>
            <a href="#kollaz">Kollaz</a>
          </nav>
        </header>

        <Study
          id="kimolia"
          number="01"
          name="Kimolia"
          greek="κιμωλία, chalk"
          summary="A slate chalkboard in an oak frame. Textured chalk that catches the grain, and a felt duster that lifts rather than deletes."
        >
          <Chalkboard persistence={{ key: 'object-studies:kimolia' }} />
        </Study>

        <Study
          id="melani"
          number="02"
          name="Melani"
          greek="μελάνι, ink"
          summary="An aluminium-framed whiteboard. Four markers and an eraser wait in the tray; the ink pools, streaks and ghosts like the real thing."
        >
          <Whiteboard persistence={{ key: 'object-studies:melani' }} />
        </Study>

        <Study
          id="korniza"
          number="03"
          name="Korniza"
          greek="κορνίζα, frame"
          summary="Six dimensional frames for images or any React content, with an optional bevelled mat and glazing, lit by your pointer."
        >
          <KornizaGallery />
          <p className="site-credit">
            <i>Wheat Field with Cypresses</i>, 1889, Vincent van Gogh. The Metropolitan Museum of
            Art, Open Access (CC0).
          </p>
        </Study>
      </div>

      <GalleryWall />

      <div className="site">
        <Study
          id="keramos"
          number="04"
          name="Keramos"
          greek="κέραμος, potter's clay"
          summary="Hand-painted Greek pottery, glazed and lit by your pointer. Every seed paints a different piece, stroke by stroke, in the Rhodian, black-figure or red-figure tradition. Drag a piece to turn it."
        >
          <KeramosBench />
        </Study>

        <Study
          id="kollaz"
          number="05"
          name="Kollaz"
          greek="κολάζ, collage"
          summary="A craft table. Purple glue that dries clear, glitter that only sticks while it is wet, scissors that cut everything under the blades, tape, pom poms and googly eyes."
        >
          <CraftTable />
        </Study>

        <footer className="site-footer">
          <span>MIT licensed.</span>
          <a href={repo}>Source on GitHub</a>
        </footer>
      </div>
    </main>
  )
}

type StudyProps = {
  id: 'kimolia' | 'melani' | 'korniza' | 'keramos' | 'kollaz'
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

// `angle` poses the still: a vessel turned a little to show its handles, a plate hung level.
type Piece = { shape: ShapeId; style: StyleId; palette: IkarosPaletteId | GreekPaletteId; seed: number; angle: number; label: string }

// One of each tradition to pick from; the chosen piece is shown live on the bench.
const PIECES: Piece[] = [
  { shape: 'rhodos', style: 'ikaros', palette: 'cobalt-gold', seed: 42, angle: 0.2, label: 'Rhodos bottle, cobalt and gold' },
  { shape: 'plate', style: 'ikaros', palette: 'folk', seed: 4, angle: 0, label: 'Wall plate, folk' },
  { shape: 'amphora', style: 'black-figure', palette: 'attic', seed: 3, angle: 0.2, label: 'Neck amphora, black-figure' },
  { shape: 'lekythos', style: 'red-figure', palette: 'attic', seed: 6, angle: -0.35, label: 'Lekythos, red-figure' },
]

function KeramosBench() {
  const [chosen, setChosen] = useState(0)
  const [seed, setSeed] = useState(PIECES[0].seed)
  const piece = PIECES[chosen]
  const choose = (index: number) => {
    setChosen(index)
    setSeed(PIECES[index].seed)
  }
  return (
    <div className="site-keramos">
      <div className="site-keramos-bench">
        <Vase shape={piece.shape} vaseStyle={piece.style} palette={piece.palette} seed={seed} className="site-keramos-live" />
        <button type="button" className="site-button" onClick={() => setSeed((s) => (s * 7919 + 13) % 99991)}>
          Paint another
        </button>
      </div>
      <div className="site-keramos-picks" role="group" aria-label="Pieces">
        {PIECES.map((p, index) => (
          <button key={p.label} type="button" className="site-keramos-pick" aria-pressed={index === chosen} aria-label={p.label} onClick={() => choose(index)}>
            <Vase mode="still" shape={p.shape} vaseStyle={p.style} palette={p.palette} seed={p.seed} draggable={false} angle={p.angle} />
          </button>
        ))}
      </div>
    </div>
  )
}

function KornizaGallery() {
  const [mat, setMat] = useState(false)
  const [glazing, setGlazing] = useState(false)
  return (
    <>
      <div className="site-toggles">
        <label>
          <input type="checkbox" checked={mat} onChange={(event) => setMat(event.target.checked)} />
          Mat
        </label>
        <label>
          <input
            type="checkbox"
            checked={glazing}
            onChange={(event) => setGlazing(event.target.checked)}
          />
          Glazing
        </label>
      </div>
      <div className="site-gallery">
        {frameVariants.map(({ variant, name, description }) => (
          <figure key={variant}>
            <Frame variant={variant} aspectRatio="3824 / 2999" mat={mat} glazing={glazing}>
              <FrameImage {...painting} />
            </Frame>
            <figcaption>
              <span className="site-frame-name">{name}</span>
              <span>{description}</span>
              <code>{variant}</code>
            </figcaption>
          </figure>
        ))}
      </div>
    </>
  )
}

/**
 * One hung work. `key` doubles as the placement class (`.wall-church`), so the
 * composition lives entirely in CSS and re-hangs itself at each breakpoint;
 * `aspectRatio` is the cropped scan's true ratio, never a rounded stand-in.
 */
type WallWork = {
  key: string
  file: string
  widths: [large: number, small: number]
  title: string
  artist: string
  date: string
  url: string
  aspectRatio: string
  variant: FrameVariant
  mat?: FrameMat
  glazing?: boolean
  sizes: string
  alt: string
}

const met = (id: number) => `https://www.metmuseum.org/art/collection/search/${id}`

const wall: WallWork[] = [
  {
    key: 'hiroshige',
    file: 'wild-geese-full-moon',
    widths: [402, 201],
    title: 'Wild Geese Flying under the Full Moon',
    artist: 'Utagawa Hiroshige',
    date: 'ca. 1833',
    url: met(36742),
    aspectRatio: '1279 / 3818',
    variant: 'ebonised-black',
    mat: { width: '9%' },
    sizes: '(max-width: 860px) 24vw, (max-width: 1199px) 10vw, 7vw',
    alt: 'Two wild geese descending across a pale full moon above deep blue water, in a tall narrow Japanese woodblock print.',
  },
  {
    key: 'vigee',
    file: 'marie-antoinette-in-a-park',
    widths: [828, 414],
    title: 'Marie Antoinette in a Park',
    artist: 'Elisabeth Louise Vigée Le Brun',
    date: 'ca. 1780–81',
    url: met(824771),
    aspectRatio: '2417 / 3501',
    variant: 'champagne-rococo',
    mat: { width: '16%', color: '#f5f0e4' },
    sizes: '(max-width: 860px) 34vw, (max-width: 1199px) 13vw, 9vw',
    alt: 'A black and white chalk drawing of Marie Antoinette standing in a park, in a wide gown and tall feathered coiffure.',
  },
  {
    key: 'church',
    file: 'heart-of-the-andes',
    widths: [1200, 600],
    title: 'Heart of the Andes',
    artist: 'Frederic Edwin Church',
    date: '1859',
    url: met(10481),
    aspectRatio: '3811 / 2099',
    variant: 'baroque-gold',
    sizes: '(max-width: 860px) 72vw, (max-width: 1199px) 46vw, 30vw',
    alt: 'A wide Andean valley in full sunlight: a waterfall and palms in the foreground, forested slopes beyond, snow-capped peaks on the horizon.',
  },
  {
    key: 'vermeer',
    file: 'woman-with-a-water-pitcher',
    widths: [1065, 533],
    title: 'Young Woman with a Water Pitcher',
    artist: 'Johannes Vermeer',
    date: 'ca. 1662',
    url: met(437881),
    aspectRatio: '3406 / 3836',
    variant: 'dark-walnut',
    sizes: '(max-width: 860px) 61vw, (max-width: 1199px) 26vw, 17vw',
    alt: 'A woman in a white linen cap opens a leaded window with one hand and lifts a silver pitcher with the other, in a sunlit Dutch interior.',
  },
  {
    key: 'vollon',
    file: 'still-life-with-cheese',
    widths: [1200, 600],
    title: 'Still Life with Cheese',
    artist: 'Antoine Vollon',
    date: 'probably late 1870s',
    url: met(437916),
    aspectRatio: '3730 / 3506',
    variant: 'carved-oak',
    sizes: '(max-width: 860px) 56vw, (max-width: 1199px) 40vw, 22vw',
    alt: 'A brass pan of cream, a round white cheese, tomatoes and a cabbage leaf heaped on a dark table.',
  },
  {
    key: 'legray',
    file: 'the-great-wave-sete',
    widths: [1200, 600],
    title: 'The Great Wave, Sète',
    artist: 'Gustave Le Gray',
    date: '1857',
    url: met(261941),
    aspectRatio: '1941 / 1610',
    variant: 'modern-black',
    mat: true,
    glazing: true,
    sizes: '(max-width: 860px) 60vw, (max-width: 1199px) 35vw, 20vw',
    alt: 'A long swell breaking against a stone jetty under a heavy bank of cloud, in a warm sepia photographic print.',
  },
  {
    key: 'sargent',
    file: 'madame-x',
    widths: [629, 315],
    title: 'Madame X',
    artist: 'John Singer Sargent',
    date: '1883–84',
    url: met(12127),
    aspectRatio: '1937 / 3695',
    variant: 'ebonised-black',
    sizes: '(max-width: 860px) 36vw, (max-width: 1199px) 19vw, 13vw',
    alt: 'A woman in a black satin evening gown stands in profile against a plain brown ground, one hand resting on a table.',
  },
]

function GalleryWall() {
  return (
    <section className="site-wall" id="wall" aria-labelledby="wall-title">
      <div className="site-wall-inner">
        <div className="site-wall-head">
          <p className="site-number">A salon hang</p>
          <h2 id="wall-title">Gallery wall</h2>
          <p className="site-summary">
            Eight frames at their own sizes and ratios, from a 140-pixel print to a half-metre
            landscape, hung on shared rails. Every moulding is measured against its own frame, so
            the small ones are not thin copies of the large ones. Hover or focus a work for its
            label.
          </p>
        </div>

        <div className="site-wall-hang">
          {wall.map((work) => (
            <figure key={work.key} className={`wall-piece wall-${work.key}`}>
              <Frame
                variant={work.variant}
                aspectRatio={work.aspectRatio}
                mat={work.mat}
                glazing={work.glazing}
              >
                <FrameImage
                  src={asset(`gallery/${work.file}-${work.widths[0]}.jpg`)}
                  srcSet={`${asset(`gallery/${work.file}-${work.widths[1]}.jpg`)} ${work.widths[1]}w, ${asset(`gallery/${work.file}-${work.widths[0]}.jpg`)} ${work.widths[0]}w`}
                  sizes={work.sizes}
                  alt={work.alt}
                  loading="lazy"
                  decoding="async"
                />
              </Frame>
              <figcaption className="wall-label">
                <a href={work.url}>
                  <i>{work.title}</i>
                </a>
                <span>
                  {work.artist} · {work.date}
                </span>
                <code>{work.variant}</code>
              </figcaption>
            </figure>
          ))}

          <figure className="wall-piece wall-card">
            <Frame variant="dark-walnut" aspectRatio="4 / 5">
              <div className="wall-card-panel">
                <p className="wall-card-mark" lang="el">
                  κορνίζα
                </p>
                <p className="wall-card-note">
                  Not a picture. An ordinary <code>div</code> of React content, hung on the same
                  wall as the paintings.
                </p>
                <p className="wall-card-foot">Object study no. 03</p>
              </div>
            </Frame>
            <figcaption className="wall-label">
              <i>Any React content</i>
              <span>korniza · children</span>
              <code>dark-walnut</code>
            </figcaption>
          </figure>
        </div>

        <p className="site-credit">
          Seven works from The Metropolitan Museum of Art, Open Access (CC0):{' '}
          {wall.map((work, index) => (
            <span key={work.key}>
              {index > 0 && '; '}
              <a href={work.url}>
                {work.artist}, <i>{work.title}</i>
              </a>
            </span>
          ))}
          .
        </p>
      </div>
    </section>
  )
}
