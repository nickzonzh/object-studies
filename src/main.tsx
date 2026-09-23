import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { GalleryArtwork, GalleryFrame } from './components'
import './style.css'
import { DarkWalnut } from './variants/DarkWalnut/DarkWalnut'
import { CarvedOak } from './variants/CarvedOak/CarvedOak'
import { BaroqueGold } from './variants/BaroqueGold/BaroqueGold'

function LivingStudy() {
  const [count, setCount] = useState(0)
  return <div className="living-study"><span className="eyebrow">A living canvas</span><p>Something<br /><em>to return to.</em></p><button onClick={() => setCount(count + 1)}>Leave a mark <span aria-hidden="true">↗</span></button><output aria-live="polite">{count === 0 ? 'Make yourself part of the picture.' : `${count} ${count === 1 ? 'mark' : 'marks'} left here.`}</output></div>
}

function App() {
  return <>
    <header><a className="wordmark" href="#main" aria-label="Korniza home">KORNIZA</a><span className="edition">Studies in framing <span>—</span> No. 01</span></header>
    <main id="main">
      <section className="intro"><p className="eyebrow">A collection in the making</p><h1>Frames for things<br />worth looking at.</h1><p className="intro-note">A quiet study in proportion, light and depth.<br />One frame. Three ways of seeing.</p></section>
      <section className="gallery" aria-label="Prototype frame in three proportions">
        {([{ name: 'Portrait', ratio: '4 / 5', label: '4:5' }, { name: 'Square', ratio: '1 / 1', label: '1:1' }, { name: 'Landscape', ratio: '3 / 2', label: '3:2' }]).map((item, i) => <figure key={item.name} className={`study study--${item.name.toLowerCase()}`}><GalleryFrame ratio={item.ratio}><GalleryArtwork src={`${import.meta.env.BASE_URL}still-land.svg`} alt="Abstract landscape: a pale sun above layered sage hills and a still, ochre shoreline." /></GalleryFrame><figcaption><span><small>0{i + 1}</small>{item.name}</span><span>{item.label}</span></figcaption></figure>)}
      </section>
      <section className="gold-study" aria-labelledby="gold-title">
        <div className="material-intro"><p className="eyebrow">Baroque Gold · 02</p><h2 id="gold-title">A little history<br />in the light.</h2><p>Carved corners. Quiet leafwork. Antique gold.<br />Move across the frame to catch the light.</p></div>
        <div className="gallery" aria-label="Baroque Gold in three proportions">
          {([{ name: 'Portrait', ratio: '4 / 5', label: '4:5' }, { name: 'Square', ratio: '1 / 1', label: '1:1' }, { name: 'Landscape', ratio: '3 / 2', label: '3:2' }]).map(item => <figure key={item.name} className={`study study--${item.name.toLowerCase()}`}><BaroqueGold ratio={item.ratio}><GalleryArtwork src={`${import.meta.env.BASE_URL}still-land.svg`} alt="Abstract landscape: a pale sun above layered sage hills and a still, ochre shoreline." /></BaroqueGold><figcaption><span>Baroque Gold · {item.name}</span><span>{item.label}</span></figcaption></figure>)}
        </div>
      </section>
      <section className="oak-study" aria-labelledby="oak-title">
        <div className="material-intro"><p className="eyebrow">Carved Oak · 03</p><h2 id="oak-title">The warmth<br />of a quieter craft.</h2><p>Oiled oak. Shaped edges. A fine inner reed.<br />A study in timber, held in the light.</p></div>
        <div className="gallery" aria-label="Carved Oak in three proportions">
          {([{ name: 'Portrait', ratio: '4 / 5', label: '4:5' }, { name: 'Square', ratio: '1 / 1', label: '1:1' }, { name: 'Landscape', ratio: '3 / 2', label: '3:2' }]).map(item => <figure key={item.name} className={`study study--${item.name.toLowerCase()}`}><CarvedOak ratio={item.ratio}><GalleryArtwork src={`${import.meta.env.BASE_URL}still-land.svg`} alt="Abstract landscape: a pale sun above layered sage hills and a still, ochre shoreline." /></CarvedOak><figcaption><span>Carved Oak · {item.name}</span><span>{item.label}</span></figcaption></figure>)}
        </div>
      </section>
      <section className="walnut-study" aria-labelledby="walnut-title">
        <div className="material-intro"><p className="eyebrow">Dark Walnut · 04</p><h2 id="walnut-title">A deeper tone.<br />A quieter grandeur.</h2><p>Burnished walnut. Deep channels. A thread of old gold.<br />Weight and warmth, gathered in the shadows.</p></div>
        <div className="gallery" aria-label="Dark Walnut in three proportions">
          {([{ name: 'Portrait', ratio: '4 / 5', label: '4:5' }, { name: 'Square', ratio: '1 / 1', label: '1:1' }, { name: 'Landscape', ratio: '3 / 2', label: '3:2' }]).map(item => <figure key={item.name} className={`study study--${item.name.toLowerCase()}`}><DarkWalnut ratio={item.ratio}><GalleryArtwork src={`${import.meta.env.BASE_URL}still-land.svg`} alt="Abstract landscape: a pale sun above layered sage hills and a still, ochre shoreline." /></DarkWalnut><figcaption><span>Dark Walnut · {item.name}</span><span>{item.label}</span></figcaption></figure>)}
        </div>
      </section>
      <section className="content-study" aria-labelledby="content-title"><div className="content-copy"><p className="eyebrow">Beyond the still image</p><h2 id="content-title">An opening<br />for anything.</h2><p>A photograph, a moving image, a small idea.<br />The frame holds it. The content stays yours.</p><p className="study-note">Try leaving a mark in this little live canvas.</p></div><div className="live-frame"><GalleryFrame ratio="3 / 2"><LivingStudy /></GalleryFrame></div></section>
    </main>
    <footer><span>KORNIZA <span className="greek" lang="el">/ κορνίζα</span></span><span>Prototype 01 · Form before ornament</span></footer>
  </>
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
