import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Frame, FrameImage, frameVariants } from './index'
import './style.css'

const asset = (name: string) => `${import.meta.env.BASE_URL}${name}`
const ratios = [{ value: '93.4 / 73.2', label: 'Painting · original' }, { value: '4 / 5', label: 'Portrait · 4:5' }, { value: '1', label: 'Square · 1:1' }, { value: '3 / 2', label: 'Landscape · 3:2' }]

function LivingStudy() {
  const [count, setCount] = useState(0)
  return <div className="living-study"><span className="eyebrow">A living canvas</span><p>Something<br /><em>to return to.</em></p><button onClick={() => setCount(count + 1)}>Leave a mark <span aria-hidden="true">↗</span></button><output aria-live="polite">{count === 0 ? 'Make yourself part of the picture.' : `${count} ${count === 1 ? 'mark' : 'marks'} left here.`}</output></div>
}

function Content({ kind }: { kind: string }) {
  if (kind === 'children') return <LivingStudy />
  const image = kind === 'photo' ? ['blue-marble.jpg', 'Earth photographed by the Apollo 17 crew: clouds over Africa and Antarctica.'] : kind === 'graphic' ? ['still-land.svg', 'Graphic landscape: a pale sun above sage hills and an ochre shoreline.'] : ['wheat-field-with-cypresses.jpg', 'Wheat Field with Cypresses, 1889, Vincent van Gogh. Golden fields below cypresses, mountains and swirling clouds.']
  const img = <FrameImage src={asset(image[0])} alt={image[1]} />
  return kind === 'painting' ? <div className="painting-crop">{img}</div> : img
}

function App() {
  const [ratio, setRatio] = useState(ratios[0].value)
  const [content, setContent] = useState('painting')
  const [light, setLight] = useState(true)
  return <>
    <header><a className="wordmark" href="#main">KORNIZA</a><nav aria-label="Page"><a href="#collection">Collection</a><a href="#examples">Examples</a></nav></header>
    <main id="main">
      <section id="collection" aria-labelledby="collection-title">
        <div className="sheet-heading"><div><p className="eyebrow">The collection / No. 01</p><h1 id="collection-title">Six frames. {content === 'painting' ? 'One painting.' : 'One canvas.'}</h1></div><p className="intro-note">Six materials, a shared light.<br />An opening for anything.</p></div>
        <div className="controls" aria-label="Comparison settings">
          <label>Content<select aria-label="Content" value={content} onChange={event => setContent(event.target.value)}><option value="painting">Painting</option><option value="photo">Photograph</option><option value="graphic">Graphic</option><option value="children">React children</option></select></label>
          <label>Opening<select aria-label="Opening" value={ratio} onChange={event => setRatio(event.target.value)}>{ratios.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="light-toggle"><input type="checkbox" checked={light} onChange={event => setLight(event.target.checked)} /> Pointer light</label>
        </div>
        <div className="sheet-grid">{frameVariants.map((item, index) => <figure key={item.variant}>
          <Frame variant={item.variant} aspectRatio={ratio} interactiveLight={light}><Content kind={content} /></Frame>
          <figcaption><span className="ordinal">0{index + 1}</span><div><h2>{item.name}</h2><p>{item.description}</p></div></figcaption>
        </figure>)}</div>
        <p className="credit">{content === 'painting' ? <><cite>Wheat Field with Cypresses</cite>, 1889 · Vincent van Gogh · <a href="https://www.metmuseum.org/art/collection/search/436535">The Metropolitan Museum of Art</a> · Public domain</> : content === 'photo' ? <><a href="https://www.nasa.gov/image-article/apollo-17-blue-marble/">The Blue Marble</a> · Apollo 17 crew / NASA · 1972</> : content === 'graphic' ? 'Still Land · original SVG study for KORNIZA' : 'Live React content · buttons, state and semantics stay yours.'}</p>
      </section>
      <section id="examples" aria-labelledby="examples-title"><div className="section-heading"><p className="eyebrow">In practice</p><h2 id="examples-title">The content stays yours.</h2><p>Images, typography and working interfaces. The opening owns the ratio;<br />your content owns its layout, meaning and interaction.</p></div>
        <div className="examples-grid">
          <article><Frame variant="modern-black" aspectRatio="3 / 2"><Content kind="photo" /></Frame><h3>A single image</h3><p>Full-bleed photography, fitted to the opening.</p><code>&lt;Frame variant="modern-black"&gt;</code></article>
          <article id="child-example"><Frame variant="carved-oak" aspectRatio="1"><LivingStudy /></Frame><h3>Arbitrary children</h3><p>A live card with a keyboard-accessible button.</p><code>&lt;Frame variant="carved-oak"&gt;&lt;YourCard /&gt;&lt;/Frame&gt;</code></article>
          <article><Frame variant="champagne-rococo" aspectRatio="4 / 5"><div className="type-study"><span>Field notes / 01</span><p>Give the<br /><em>ordinary</em><br />a little room.</p><span>Typography, held in light.</span></div></Frame><h3>A typography study</h3><p>Unmodified HTML with its own spacing and type.</p><code>&lt;Frame variant="champagne-rococo"&gt;…&lt;/Frame&gt;</code></article>
        </div>
      </section>
    </main>
    <footer><span>KORNIZA <span lang="el">/ κορνίζα</span></span><span>Six frames · One collection</span></footer>
  </>
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
