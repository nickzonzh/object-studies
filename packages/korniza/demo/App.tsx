import { useState } from 'react'
import { Frame, FrameImage, frameVariants } from '../src/index.js'
import './demo.css'

const asset = (name: string) => `${import.meta.env.BASE_URL}${name}`
const ratios = [{ value: '3824 / 2999', label: 'Painting · original' }, { value: '4 / 5', label: 'Portrait · 4:5' }, { value: '1', label: 'Square · 1:1' }, { value: '3 / 2', label: 'Landscape · 3:2' }]
const painting = {
  src: asset('wheat-field-with-cypresses-800.jpg'),
  srcSet: `${asset('wheat-field-with-cypresses-800.jpg')} 800w, ${asset('wheat-field-with-cypresses-1600.jpg')} 1600w`,
  sizes: '(max-width: 680px) 92vw, (max-width: 1000px) 46vw, 31vw',
  alt: 'Wheat Field with Cypresses, 1889, Vincent van Gogh. Golden fields below cypresses, mountains and swirling clouds.',
}

function LivingStudy() {
  const [count, setCount] = useState(0)
  return <div className="living-study"><span className="eyebrow">A living canvas</span><p>Something<br /><em>to return to.</em></p><button onClick={() => setCount(count + 1)}>Leave a mark <span aria-hidden="true">↗</span></button><output aria-live="polite">{count === 0 ? 'Make yourself part of the picture.' : `${count} ${count === 1 ? 'mark' : 'marks'} left here.`}</output></div>
}

function Content({ kind }: { kind: string }) {
  if (kind === 'children') return <LivingStudy />
  if (kind === 'painting') return <FrameImage {...painting} />
  if (kind === 'photo') return <FrameImage src={asset('blue-marble.jpg')} alt="Earth photographed by the Apollo 17 crew: clouds over Africa and Antarctica." />
  return <FrameImage src={asset('still-land.svg')} alt="Graphic landscape: a pale sun above sage hills and an ochre shoreline." />
}

export function App() {
  const [ratio, setRatio] = useState(ratios[0].value)
  const [content, setContent] = useState('painting')
  const [light, setLight] = useState(true)
  const [mat, setMat] = useState(false)
  const [glazing, setGlazing] = useState(false)
  return <>
    <header><a className="wordmark" href="#main">KORNIZA</a><nav aria-label="Page"><a href="#collection">Collection</a><a href="#examples">Examples</a></nav></header>
    <main id="main">
      <section id="collection" aria-labelledby="collection-title">
        <div className="sheet-heading"><div><p className="eyebrow">The collection / No. 01</p><h1 id="collection-title">Six frames. {content === 'painting' ? 'One painting.' : 'One canvas.'}</h1></div><p className="intro-note">Six materials, a shared light.<br />An opening for anything.</p></div>
        <div className="controls" aria-label="Comparison settings">
          <label>Content<select aria-label="Content" value={content} onChange={event => setContent(event.target.value)}><option value="painting">Painting</option><option value="photo">Photograph</option><option value="graphic">Graphic</option><option value="children">React children</option></select></label>
          <label>Opening<select aria-label="Opening" value={ratio} onChange={event => setRatio(event.target.value)}>{ratios.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <div className="switches">
            <label><input type="checkbox" checked={mat} onChange={event => setMat(event.target.checked)} /> Mat</label>
            <label><input type="checkbox" checked={glazing} onChange={event => setGlazing(event.target.checked)} /> Glazing</label>
            <label><input type="checkbox" checked={light} onChange={event => setLight(event.target.checked)} /> Pointer light</label>
          </div>
        </div>
        <div className="sheet-grid">{frameVariants.map((item, index) => <figure key={item.variant}>
          <Frame variant={item.variant} aspectRatio={ratio} interactiveLight={light} mat={mat} glazing={glazing}><Content kind={content} /></Frame>
          <figcaption><span className="ordinal">0{index + 1}</span><div><h2>{item.name}</h2><p>{item.description}</p></div></figcaption>
        </figure>)}</div>
        <p className="credit">{content === 'painting' ? <><cite>Wheat Field with Cypresses</cite>, 1889 · Vincent van Gogh · <a href="https://www.metmuseum.org/art/collection/search/436535">The Metropolitan Museum of Art</a> · Open Access, CC0</> : content === 'photo' ? <><a href="https://www.nasa.gov/image-article/apollo-17-blue-marble/">The Blue Marble</a> · Apollo 17 crew / NASA · 1972</> : content === 'graphic' ? 'Still Land · original SVG study for KORNIZA' : 'Live React content · buttons, state and semantics stay yours.'}</p>
      </section>
      <section id="examples" aria-labelledby="examples-title"><div className="section-heading"><p className="eyebrow">In practice</p><h2 id="examples-title">The content stays yours.</h2><p>Images, typography and working interfaces. The opening owns the ratio;<br />your content owns its layout, meaning and interaction.</p></div>
        <div className="examples-grid">
          <article><Frame variant="dark-walnut" aspectRatio="3824 / 2999" mat glazing><FrameImage {...painting} /></Frame><h3>Mat and glazing</h3><p>A bevelled board around the painting, behind faint glass.</p><code>&lt;Frame variant="dark-walnut" mat glazing&gt;</code></article>
          <article id="child-example"><Frame variant="carved-oak" aspectRatio="1"><LivingStudy /></Frame><h3>Arbitrary children</h3><p>A live card with a keyboard-accessible button.</p><code>&lt;Frame variant="carved-oak"&gt;&lt;YourCard /&gt;&lt;/Frame&gt;</code></article>
          <article><Frame variant="champagne-rococo" aspectRatio="4 / 5" mat={{ width: '7%', color: '#f3ece0' }}><div className="type-study"><span>Field notes / 01</span><p>Give the<br /><em>ordinary</em><br />a little room.</p><span>Typography, held in light.</span></div></Frame><h3>A typography study</h3><p>Unmodified HTML on a narrower, warmer mat.</p><code>&lt;Frame mat=&#123;&#123; width: '7%' &#125;&#125;&gt;…&lt;/Frame&gt;</code></article>
        </div>
      </section>
    </main>
    <footer><span>KORNIZA <span lang="el">/ κορνίζα</span></span><span>Six frames · One collection</span></footer>
  </>
}
